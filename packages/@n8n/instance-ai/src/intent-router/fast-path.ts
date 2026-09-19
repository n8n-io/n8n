import { nanoid } from 'nanoid';

import { extractAgentRequirements } from '../agent-compiler/requirements/extract';
import { createBuildAgentTool } from '../tools/orchestration/build-agent.tool';
import {
	createBuildWorkflowTool,
	selectDecisionService,
} from '../tools/workflows/build-workflow.tool';
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

type ToolInput = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function slug(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'agent'
	);
}

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
	const { threadId, runId, orchestratorAgentId, eventBus } = orchestrationContext;
	eventBus.publish(threadId, {
		type: 'tool-call',
		runId,
		agentId: orchestratorAgentId,
		payload: { toolCallId, toolName: plan.toolName, args: plan.input },
	});
	let result: unknown;
	try {
		const tool =
			plan.toolName === 'build-workflow'
				? createBuildWorkflowTool(context)
				: createBuildAgentTool(orchestrationContext);
		const parsed =
			tool.inputSchema && 'safeParse' in tool.inputSchema
				? tool.inputSchema.safeParse(plan.input)
				: undefined;
		if (parsed && !parsed.success)
			throw new Error(
				`fast-path input rejected: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
			);
		if (!tool.handler) throw new Error(`${plan.toolName} has no handler`);
		result = await tool.handler(parsed?.success ? parsed.data : plan.input, {
			toolCallId,
			toolName: plan.toolName,
			runId,
			abortSignal: orchestrationContext.abortSignal,
		});
	} catch (error) {
		const messageText = error instanceof Error ? error.message : String(error);
		eventBus.publish(threadId, {
			type: 'tool-result',
			runId,
			agentId: orchestratorAgentId,
			payload: { toolCallId, result: { error: messageText } },
		});
		return notHandled(`the compiler threw: ${messageText}`, toolCallId);
	}
	eventBus.publish(threadId, {
		type: 'tool-result',
		runId,
		agentId: orchestratorAgentId,
		payload: { toolCallId, result },
	});
	if (!isRecord(result))
		return notHandled('the compiler returned an unexpected result', toolCallId);

	const rendered = renderReply(plan.toolName, result);
	if (!rendered)
		return notHandled(
			`the compiler result (${String(result.status)}) needs the assistant`,
			toolCallId,
		);

	await writeFastPathState(context, (current) => nextState(current, plan, result, decision.route));
	eventBus.publish(threadId, {
		type: 'text-delta',
		runId,
		agentId: orchestratorAgentId,
		payload: { text: rendered },
	});
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

interface ToolPlan {
	toolName: 'build-workflow' | 'build-agent';
	input: ToolInput;
}

function planToolCall(
	route: IntentRoute,
	message: string,
	state: RouterState,
	persisted: FastPathThreadState,
	context: InstanceAiContext,
): ToolPlan | undefined {
	switch (route) {
		case 'workflow.create':
			return { toolName: 'build-workflow', input: { action: 'create', request: message } };
		case 'workflow.edit':
			return state.boundWorkflowId
				? {
						toolName: 'build-workflow',
						input: { action: 'edit', workflowId: state.boundWorkflowId, request: message },
					}
				: undefined;
		case 'workflow.debug':
			return state.boundWorkflowId
				? {
						toolName: 'build-workflow',
						input: { action: 'debug', workflowId: state.boundWorkflowId, request: message },
					}
				: undefined;
		case 'agent.create': {
			const requirements = extractAgentRequirements(message);
			const name = valueOf(requirements.name, isString) ?? 'New Agent';
			return {
				toolName: 'build-agent',
				input: {
					action: 'create',
					request: message,
					name,
					agentRef: slug(name),
					...(context.agentBuilderTarget ? { createNew: true } : {}),
				},
			};
		}
		case 'agent.edit':
			return state.boundAgentRef
				? {
						toolName: 'build-agent',
						input: { action: 'edit', request: message, agentRef: state.boundAgentRef },
					}
				: undefined;
		case 'agent.verify':
			return state.boundAgentRef && persisted.lastAgentSessionId
				? {
						toolName: 'build-agent',
						input: {
							action: 'verify',
							agentRef: state.boundAgentRef,
							sessionId: persisted.lastAgentSessionId,
						},
					}
				: undefined;
		case 'answer': {
			const pending = state.pendingSession;
			if (!pending) return undefined;
			return pending.kind === 'workflow'
				? {
						toolName: 'build-workflow',
						input: { action: 'answer', sessionId: pending.sessionId, request: message },
					}
				: {
						toolName: 'build-agent',
						input: {
							action: 'answer',
							sessionId: pending.sessionId,
							request: message,
							...(state.boundAgentRef ? { agentRef: state.boundAgentRef } : {}),
						},
					};
		}
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
	const next: FastPathThreadState = { ...current, previousRoute: route };
	delete next.pendingSession;
	if (status === 'needs_clarification' && sessionId) {
		const questions = Array.isArray(result.questions) ? result.questions : [];
		const fields = questions.flatMap((question) =>
			isRecord(question) && Array.isArray(question.fields)
				? question.fields.filter((field): field is string => typeof field === 'string')
				: [],
		);
		next.pendingSession = {
			kind: plan.toolName === 'build-workflow' ? 'workflow' : 'agent',
			sessionId,
			fields,
		};
	}
	if (
		plan.toolName === 'build-workflow' &&
		status === 'compiled' &&
		typeof result.workflowId === 'string'
	)
		next.boundWorkflowId = result.workflowId;
	if (
		plan.toolName === 'build-agent' &&
		(status === 'compiled' || status === 'verified') &&
		sessionId
	)
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

/** Deterministic assistant reply for a compiler result; undefined means the orchestrator must take over. */
export function renderReply(
	toolName: ToolPlan['toolName'],
	result: Record<string, unknown>,
): string | undefined {
	const status = typeof result.status === 'string' ? result.status : '';
	const message = typeof result.message === 'string' ? result.message : '';
	const summary = typeof result.summary === 'string' ? result.summary : '';
	if (status === 'needs_clarification')
		return message || 'I need one more detail before I can build this.';
	if (status === 'needs_setup') return message || summary;
	if (toolName === 'build-workflow' && status === 'compiled') {
		const name =
			typeof result.workflowName === 'string' ? `"${result.workflowName}"` : 'the workflow';
		const lines = [`I built and saved ${name}.`];
		const paths = Array.isArray(result.executionPaths) ? result.executionPaths.length : 0;
		if (paths > 0) lines.push(`It has ${paths} execution path${paths === 1 ? '' : 's'} to test.`);
		const levels = levelsLine(result.verification);
		if (levels) lines.push(levels);
		if (typeof result.credentialResolutionNote === 'string' && result.credentialResolutionNote)
			lines.push(result.credentialResolutionNote);
		const setup = result.setupRequirement;
		if (isRecord(setup) && setup.status === 'needs_setup')
			lines.push('Some nodes still need credentials or values; open the workflow to finish setup.');
		lines.push(
			'Static checks passed; it has not been executed yet. Ask me to test it to run it with sample data.',
		);
		return lines.join(' ');
	}
	if (toolName === 'build-agent' && (status === 'compiled' || status === 'verified')) {
		const lines = [summary || message];
		if (status === 'compiled') {
			const levels = levelsLine(result.verification);
			if (levels) lines.push(levels);
		}
		return lines.filter(Boolean).join(' ');
	}
	return undefined;
}
