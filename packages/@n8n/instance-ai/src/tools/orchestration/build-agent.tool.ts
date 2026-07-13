/**
 * build-agent — orchestration tool that drives the agents-module builder
 * (`AgentsBuilderService`) as an embedded sub-agent, one conversational turn
 * per invocation.
 *
 * This is the non-interactive contract: the delegate session excludes every
 * interactive builder tool (`ask_questions`, `ask_credential`,
 * `ask_embedding_credential`, `configure_channel` — see
 * `NON_INTERACTIVE_EXCLUDED_TOOL_NAMES` in the cli delegate adapter), so the
 * builder cannot suspend mid-turn and must complete, error, or be cancelled
 * on every call. Any open questions the builder still has come back as plain
 * text at the end of its reply — the calling assistant relays those to the
 * user and sends the answers back through another `build-agent` call.
 *
 * The builder session is keyed to an instance-AI-scoped thread id
 * (`ia-builder:<threadId>:<agentId>`) so nothing appears in the agents-module
 * builder UI — it is a private sub-agent conversation.
 */
import { Tool } from '@n8n/agents';
import { BUILDER_NOT_CONFIGURED_CODE, CONFIG_MUTATION_TOOL_NAMES } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from './agent-target-binding';
import {
	consumeStreamCascading,
	type ConsumeStreamCascadingResult,
} from '../../stream/consume-with-hitl';
import type { WorkSummary } from '../../stream/work-summary-accumulator';
import type { OrchestrationContext, SessionWorkflowRef } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

function isBuilderNotConfiguredError(error: unknown): boolean {
	return isRecord(error) && error.code === BUILDER_NOT_CONFIGURED_CODE;
}

function didUpdateConfig(workSummary: WorkSummary): boolean {
	const mutationToolNames = new Set<string>(CONFIG_MUTATION_TOOL_NAMES);
	return workSummary.toolCalls.some(
		(call) => call.succeeded && mutationToolNames.has(call.toolName),
	);
}

function formatWorkflowContextEnvelope(workflowContext: SessionWorkflowRef[]): string {
	const lines = workflowContext.map(
		(workflow) =>
			`- ${workflow.name} (id: ${workflow.id})${workflow.description ? `: ${workflow.description}` : ''}`,
	);
	return [
		'<session-workflows>',
		'Workflows built in this session (attachable as {"type":"workflow"} tools):',
		...lines,
		'</session-workflows>',
	].join('\n');
}

function buildOutboundMessage(message: string, workflowContext?: SessionWorkflowRef[]): string {
	if (!workflowContext || workflowContext.length === 0) return message;
	return `${message}\n\n${formatWorkflowContextEnvelope(workflowContext)}`;
}

const buildAgentInputSchema = z.object({
	message: z
		.string()
		.min(1)
		.describe(
			'The instruction or user message to forward to the agent builder. The builder cannot ' +
				'see this chat — include every requirement, decision, and user answer already ' +
				'gathered in this conversation, not just the latest message.',
		),
	name: z.string().optional().describe('Name for a NEW agent (first call only)'),
	agentId: z.string().optional().describe('Existing agent id to edit (first call only)'),
	workflowContext: z
		.array(z.object({ id: z.string(), name: z.string(), description: z.string().optional() }))
		.optional()
		.describe('Workflows built in this session the builder may attach as tools'),
});

const buildAgentOutputSchema = z.object({
	ok: z.boolean(),
	builderReply: z.string().optional(),
	configUpdated: z.boolean().optional(),
	error: z.string().optional(),
});

type BuildAgentOutput = z.infer<typeof buildAgentOutputSchema>;

/**
 * Publish the `agent-spawned` event announcing the builder sub-agent to the FE.
 * Called once per invocation — there is no resume leg to republish from in
 * this non-interactive version, so the FE's agent-spawned handler only ever
 * sees this once per builder target per run.
 */
function publishAgentSpawned(
	context: OrchestrationContext,
	builderAgentId: string,
	target: AgentBuilderTarget,
): void {
	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: builderAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'agent-builder',
			tools: [],
			kind: 'agent-builder',
			title: 'Building agent',
			// name/projectId make the FE render the agent as a conversation artifact
			// (artifact list + preview both require projectId).
			targetResource: {
				type: 'agent',
				id: target.agentId,
				projectId: target.projectId,
				...(target.name ? { name: target.name } : {}),
			},
		},
	});
}

/** Publish the standard failure `agent-completed` event; returns the resolved message. */
function publishAgentBuilderFailure(
	context: OrchestrationContext,
	builderAgentId: string,
	error: unknown,
): string {
	const message = isBuilderNotConfiguredError(error)
		? 'The agent builder model is not configured. Set it up in the agents module settings.'
		: error instanceof Error
			? error.message
			: 'The agent builder run failed unexpectedly.';
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: 'agent-builder', result: '', error: message },
	});
	return message;
}

/** Publish the terminal `agent-completed` event and map the result to the tool output. */
async function finishTurn(
	context: OrchestrationContext,
	builderAgentId: string,
	result: Extract<ConsumeStreamCascadingResult, { status: 'completed' | 'cancelled' | 'errored' }>,
): Promise<BuildAgentOutput> {
	if (result.status === 'completed') {
		const text = await result.text;
		const configUpdated = didUpdateConfig(result.workSummary);
		context.eventBus.publish(context.threadId, {
			type: 'agent-completed',
			runId: context.runId,
			agentId: builderAgentId,
			payload: { role: 'agent-builder', result: text.slice(0, 200) },
		});
		return { ok: true, builderReply: text, configUpdated };
	}

	const error = `The agent builder run ${result.status}.`;
	context.eventBus.publish(context.threadId, {
		type: 'agent-completed',
		runId: context.runId,
		agentId: builderAgentId,
		payload: { role: 'agent-builder', result: '', error },
	});
	return { ok: false, error };
}

export function createBuildAgentTool(context: OrchestrationContext) {
	return new Tool(ORCHESTRATION_TOOL_IDS.BUILD_AGENT)
		.description(
			'Delegate agent building to the agents-module builder, running as a sub-agent. ' +
				'Pass `name` to start a new agent or `agentId` to edit an existing one on the first ' +
				'call; subsequent calls keep editing the same agent. Returns the builder’s reply and ' +
				'whether it updated the agent config.',
		)
		.input(buildAgentInputSchema)
		.output(buildAgentOutputSchema)
		.handler(async (input: z.infer<typeof buildAgentInputSchema>) => {
			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate) {
				return { ok: false, error: 'Agent building is not available on this instance.' };
			}

			let target = await resolveAgentBuilderTarget(domainContext);
			// Deferred for the agentId path: binding before the builder run settles
			// would let a hallucinated/forbidden/missing agentId permanently poison
			// the thread (no unbind path exists). The name path binds immediately
			// below since `createAgent` already proves the agent exists.
			let bindAfterTurn = false;
			if (!target) {
				if (input.name) {
					const created = await delegate.createAgent(input.name);
					target = { agentId: created.agentId, projectId: created.projectId, name: input.name };
					domainContext.agentBuilderTarget = target;
					await saveAgentBuilderTarget(domainContext, target);
				} else if (input.agentId) {
					if (!domainContext.projectId) {
						return {
							ok: false,
							error:
								'Cannot bind to agentId without an active project context. Start this conversation from within a project.',
						};
					}
					target = { agentId: input.agentId, projectId: domainContext.projectId };
					bindAfterTurn = true;
				} else {
					return {
						ok: false,
						error: 'Pass name to create a new agent or agentId to edit an existing one.',
					};
				}
			}

			const session = {
				threadId: `ia-builder:${context.threadId}:${target.agentId}`,
				modelConfig: context.modelId,
			};
			const outboundMessage = buildOutboundMessage(input.message, input.workflowContext);
			const builderAgentId = `agent-builder:${target.agentId}`;

			publishAgentSpawned(context, builderAgentId, target);

			let turn;
			try {
				turn = await delegate.streamBuild(target.agentId, outboundMessage, session);
			} catch (error) {
				const message = publishAgentBuilderFailure(context, builderAgentId, error);
				if (isBuilderNotConfiguredError(error)) {
					return { ok: false, error: message };
				}
				throw error;
			}

			let result: ConsumeStreamCascadingResult;
			try {
				result = await consumeStreamCascading({
					agent: undefined,
					stream: turn,
					runId: context.runId,
					agentId: builderAgentId,
					eventBus: context.eventBus,
					logger: context.logger,
					threadId: context.threadId,
					abortSignal: context.abortSignal,
				});
			} catch (error) {
				publishAgentBuilderFailure(context, builderAgentId, error);
				throw error;
			}

			// Reaching a settled stream result (any status, including the
			// defensive `suspended` case below) means the builder agent was
			// constructed — scope check and existence check both passed — so the
			// deferred agentId-path bind is now safe to persist.
			if (bindAfterTurn) {
				domainContext.agentBuilderTarget = target;
				await saveAgentBuilderTarget(domainContext, target);
			}

			if (result.status !== 'suspended') return await finishTurn(context, builderAgentId, result);

			// Unreachable in practice — interactive tools are excluded from the
			// builder's session, so it cannot suspend. Handled defensively rather
			// than throwing out of the tool handler.
			const message =
				'The agent builder run suspended unexpectedly; interactive tools are not available in this chat.';
			publishAgentBuilderFailure(context, builderAgentId, new Error(message));
			return { ok: false, error: message };
		})
		.build();
}
