import type { InstanceAiEvent } from '@n8n/api-types';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';

import { extractAgentRequirements } from '../agent-compiler/requirements/extract';
import { createBuildAgentTool } from '../tools/orchestration/build-agent.tool';
import {
	createCompileWorkflowTool,
	selectDecisionService,
} from '../tools/workflows/compile-workflow.tool';
import { slug } from '../tools/workflows/compiler-tool-support';
import type { InstanceAiContext, OrchestrationContext } from '../types';
import type { DecisionService } from '../workflow-compiler/decision/decision-service';
import { isString, valueOf } from '../workflow-compiler/requirements/types';
import { routeIntent } from './router';
import type { IntentRoute, RouteDecision, RouterState } from './schemas';
import {
	readFastPathState,
	toRouterState,
	writeFastPathState,
	type FastPathThreadState,
} from './state';

export interface FastPathInput {
	message: string;
	context: InstanceAiContext;
	orchestrationContext: OrchestrationContext;
	decisions?: DecisionService;
	/** Host-known signals the package cannot read itself (an active plan, for example). */
	state?: Partial<RouterState>;
}

export type FastPathOutcome =
	| {
			handled: true;
			route: IntentRoute;
			decision: RouteDecision;
			toolName: string;
			toolCallId: string;
			reply: string;
			result: Record<string, unknown>;
			latencyMs: number;
	  }
	| {
			handled: false;
			route: IntentRoute;
			decision: RouteDecision;
			reason: string;
			latencyMs: number;
			/** Set when a compiler tool already ran this turn; its events are on the bus. */
			toolCallId?: string;
	  };

type ToolName = 'build-workflow' | 'build-agent';

interface ToolPlan {
	toolName: ToolName;
	input: Record<string, unknown>;
}

/** An event of this turn before the run and agent ids are added. */
type TurnEvent<E = InstanceAiEvent> = E extends InstanceAiEvent
	? Omit<E, 'runId' | 'agentId'>
	: never;

/**
 * Serves a chat turn without the orchestrator when the router is confident:
 * runs the compiler tool directly, publishes the same tool events the agent
 * would, and returns a deterministic reply. Anything the compilers cannot
 * finish (failures, approvals, prerequisite artifacts) hands the turn back
 * so the orchestrator runs with the tool result already on the event log.
 */
export async function runFastPath(input: FastPathInput): Promise<FastPathOutcome> {
	const started = Date.now();
	const { context, orchestrationContext, message } = input;
	const persisted = await readFastPathState(context);
	const state = toRouterState(persisted, context, input.state);
	const decisions = input.decisions ?? selectDecisionService(context);
	const decision = await routeIntent({
		message,
		state,
		decisions,
		abortSignal: orchestrationContext.abortSignal,
	});
	const notHandled = (reason: string, toolCallId?: string): FastPathOutcome => ({
		handled: false,
		route: decision.route,
		decision,
		reason,
		latencyMs: Date.now() - started,
		...(toolCallId ? { toolCallId } : {}),
	});
	if (decision.route === 'orchestrator') return notHandled(decision.reason);

	const plan = planToolCall(decision.route, message, state, persisted, context);
	if (!plan) return notHandled('the route has no executable target in this conversation');

	const toolCallId = `fp_${nanoid(10)}`;
	const { threadId, runId, orchestratorAgentId: agentId, eventBus } = orchestrationContext;
	const publish = (event: TurnEvent) => eventBus.publish(threadId, { ...event, runId, agentId });
	publish({
		type: 'tool-call',
		payload: { toolCallId, toolName: plan.toolName, args: plan.input },
	});
	let result: unknown;
	try {
		result = await runTool(plan, toolCallId, context, orchestrationContext);
	} catch (error) {
		const messageText = getErrorMessage(error);
		publish({ type: 'tool-result', payload: { toolCallId, result: { error: messageText } } });
		return notHandled(`the compiler threw: ${messageText}`, toolCallId);
	}
	publish({ type: 'tool-result', payload: { toolCallId, result } });
	if (!isRecord(result))
		return notHandled('the compiler returned an unexpected result', toolCallId);

	const rendered = renderReply(plan.toolName, result);
	if (!rendered)
		return notHandled(
			`the compiler result (${String(result.status)}) needs the assistant`,
			toolCallId,
		);

	await writeFastPathState(context, (current) => nextState(current, plan, result, decision.route));
	publish({ type: 'text-delta', payload: { text: rendered } });
	return {
		handled: true,
		route: decision.route,
		decision,
		toolName: plan.toolName,
		toolCallId,
		reply: rendered,
		result,
		latencyMs: Date.now() - started,
	};
}

async function runTool(
	plan: ToolPlan,
	toolCallId: string,
	context: InstanceAiContext,
	orchestrationContext: OrchestrationContext,
): Promise<unknown> {
	const tool =
		plan.toolName === 'build-workflow'
			? createCompileWorkflowTool(context)
			: createBuildAgentTool(orchestrationContext);
	const schema = tool.inputSchema && 'safeParse' in tool.inputSchema ? tool.inputSchema : undefined;
	const parsed = schema?.safeParse(plan.input);
	if (parsed && !parsed.success)
		throw new Error(
			`fast-path input rejected: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
		);
	if (!tool.handler) throw new Error(`${plan.toolName} has no handler`);
	const { runId, abortSignal } = orchestrationContext;
	return await tool.handler(parsed?.success ? parsed.data : plan.input, {
		toolCallId,
		toolName: plan.toolName,
		runId,
		abortSignal,
	});
}

function planToolCall(
	route: IntentRoute,
	message: string,
	state: RouterState,
	persisted: FastPathThreadState,
	context: InstanceAiContext,
): ToolPlan | undefined {
	const { boundWorkflowId, boundAgentRef, pendingSession } = state;
	const workflow = (input: ToolPlan['input']): ToolPlan => ({ toolName: 'build-workflow', input });
	const agent = (input: ToolPlan['input']): ToolPlan => ({ toolName: 'build-agent', input });
	switch (route) {
		case 'workflow.create':
			return workflow({ action: 'create', request: message });
		case 'workflow.edit':
		case 'workflow.debug': {
			const action = route === 'workflow.edit' ? 'edit' : 'debug';
			return boundWorkflowId
				? workflow({ action, workflowId: boundWorkflowId, request: message })
				: undefined;
		}
		case 'agent.create': {
			const name = valueOf(extractAgentRequirements(message).name, isString) ?? 'New Agent';
			return agent({
				action: 'create',
				request: message,
				name,
				agentRef: slug(name, 'agent'),
				...(context.agentBuilderTarget ? { createNew: true } : {}),
			});
		}
		case 'agent.edit':
			return boundAgentRef
				? agent({ action: 'edit', request: message, agentRef: boundAgentRef })
				: undefined;
		case 'agent.verify':
			return boundAgentRef && persisted.lastAgentSessionId
				? agent({
						action: 'verify',
						agentRef: boundAgentRef,
						sessionId: persisted.lastAgentSessionId,
					})
				: undefined;
		case 'answer':
			if (!pendingSession) return undefined;
			return pendingSession.kind === 'workflow'
				? workflow({ action: 'answer', sessionId: pendingSession.sessionId, request: message })
				: agent({
						action: 'answer',
						sessionId: pendingSession.sessionId,
						request: message,
						...(boundAgentRef ? { agentRef: boundAgentRef } : {}),
					});
		case 'orchestrator':
			return undefined;
	}
}

function nextState(
	current: FastPathThreadState,
	plan: ToolPlan,
	result: Record<string, unknown>,
	route: IntentRoute,
): FastPathThreadState {
	const status = typeof result.status === 'string' ? result.status : '';
	const sessionId = typeof result.sessionId === 'string' ? result.sessionId : undefined;
	const isWorkflow = plan.toolName === 'build-workflow';
	const next: FastPathThreadState = { ...current, previousRoute: route };
	delete next.pendingSession;
	if (status === 'needs_clarification' && sessionId) {
		const questions = Array.isArray(result.questions) ? result.questions : [];
		const fields = questions.flatMap((question) =>
			isRecord(question) && Array.isArray(question.fields)
				? question.fields.filter((field): field is string => typeof field === 'string')
				: [],
		);
		next.pendingSession = { kind: isWorkflow ? 'workflow' : 'agent', sessionId, fields };
	}
	if (isWorkflow && status === 'compiled' && typeof result.workflowId === 'string')
		next.boundWorkflowId = result.workflowId;
	if (!isWorkflow && (status === 'compiled' || status === 'verified') && sessionId)
		next.lastAgentSessionId = sessionId;
	return next;
}

function levelsLine(verification: unknown): string {
	if (!isRecord(verification)) return '';
	const parts = Object.entries(verification)
		.filter(([, value]) => typeof value === 'string')
		.map(([key, value]) => `${key}: ${String(value).replace('_', ' ')}`);
	return parts.length > 0 ? `Checks — ${parts.join(', ')}.` : '';
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Deterministic assistant reply for a compiler result; undefined means the orchestrator must take over. */
export function renderReply(
	toolName: ToolPlan['toolName'],
	result: Record<string, unknown>,
): string | undefined {
	const [status, message, summary] = [result.status, result.message, result.summary].map(text);
	if (status === 'needs_clarification')
		return message || 'I need one more detail before I can build this.';
	if (status === 'needs_setup') return message || summary;
	if (toolName === 'build-workflow' && status === 'compiled') {
		const name =
			typeof result.workflowName === 'string' ? `"${result.workflowName}"` : 'the workflow';
		const paths = Array.isArray(result.executionPaths) ? result.executionPaths.length : 0;
		const setup = result.setupRequirement;
		return [
			`I built and saved ${name}.`,
			paths > 0 ? `It has ${paths} execution path${paths === 1 ? '' : 's'} to test.` : '',
			levelsLine(result.verification),
			text(result.credentialResolutionNote),
			isRecord(setup) && setup.status === 'needs_setup'
				? 'Some nodes still need credentials or values; open the workflow to finish setup.'
				: '',
			'Static checks passed; it has not been executed yet. Ask me to test it to run it with sample data.',
		]
			.filter(Boolean)
			.join(' ');
	}
	if (toolName === 'build-agent' && (status === 'compiled' || status === 'verified'))
		return [summary || message, status === 'compiled' ? levelsLine(result.verification) : '']
			.filter(Boolean)
			.join(' ');
	return undefined;
}
