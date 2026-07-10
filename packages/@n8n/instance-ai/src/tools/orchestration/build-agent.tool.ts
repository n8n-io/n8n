/**
 * build-agent — orchestration tool that drives the agents-module builder
 * (`AgentsBuilderService`) as an embedded sub-agent, one conversational turn
 * per invocation. Interactive builder questions (HITL confirmations,
 * credential prompts) cascade through this tool's own `ctx.suspend()`, so
 * the orchestrator's own checkpoint survives a process restart; on resume,
 * the builder's open checkpoint is re-located via `findOpenSuspension` —
 * there is no in-memory state carried between suspend and resume.
 *
 * The builder session is keyed to an instance-AI-scoped thread id
 * (`ia-builder:<threadId>:<agentId>`) so nothing appears in the agents-module
 * builder UI — it is a private sub-agent conversation.
 */
import { Tool, type InterruptibleToolContext } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
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
import type {
	BuilderDelegateSession,
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	OrchestrationContext,
	SessionWorkflowRef,
} from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';

/**
 * Mirrors `BUILDER_NOT_CONFIGURED_CODE` in
 * `packages/cli/src/modules/agents/builder/errors.ts`. Instance AI cannot
 * import that class directly (cli depends on this package, not vice versa),
 * so the thrown error is matched by its stable `code` property instead.
 */
const BUILDER_NOT_CONFIGURED_CODE = 'BUILDER_NOT_CONFIGURED';

function isBuilderNotConfiguredError(error: unknown): boolean {
	return isRecord(error) && error.code === BUILDER_NOT_CONFIGURED_CODE;
}

/**
 * Mirrors `BUILDER_TOOL_NAMES.WRITE_CONFIG` / `PATCH_CONFIG` in
 * `packages/cli/src/modules/agents/builder/builder-tool-names.ts` — the only
 * two builder tools that mutate the agent config.
 */
const CONFIG_MUTATION_TOOL_NAMES = new Set(['write_config', 'patch_config']);

function didUpdateConfig(workSummary: WorkSummary): boolean {
	return workSummary.toolCalls.some(
		(call) => call.succeeded && CONFIG_MUTATION_TOOL_NAMES.has(call.toolName),
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

const buildAgentSuspendSchema = z
	.object({ requestId: z.string(), message: z.string(), severity: z.literal('info') })
	.passthrough();

const buildAgentResumeSchema = z.object({}).passthrough();

type BuildAgentOutput = z.infer<typeof buildAgentOutputSchema>;
type BuildAgentSuspendPayload = z.infer<typeof buildAgentSuspendSchema>;
type BuildAgentResumeData = z.infer<typeof buildAgentResumeSchema>;
type BuildAgentToolContext = InterruptibleToolContext<
	BuildAgentSuspendPayload,
	BuildAgentResumeData
>;

/**
 * Publish the `agent-spawned` event announcing the builder sub-agent to the FE.
 * Shared by the first-call and resume legs — the FE reducer's agent-spawned
 * handler is idempotent (skips if `agentId` already has a node, see
 * agent-run-reducer.ts), so re-publishing on resume is a safe no-op for the
 * common case and a recovery for the rebuilt-state/replay edge case where the
 * FE never saw the original event.
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

/** Publish the terminal `agent-completed` event and map a non-suspended result to the tool output. */
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

/**
 * Drain one builder turn, cascading any interactive suspension into this
 * tool's own `ctx.suspend()`. Shared by the first-call and resume legs so
 * both loop until the builder either finishes or asks the user something.
 */
async function runBuilderConsumeLoop(params: {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	ctx: BuildAgentToolContext;
	target: AgentBuilderTarget;
	session: BuilderDelegateSession;
	builderAgentId: string;
	initialTurn: BuilderTurnStream;
}): Promise<BuildAgentOutput> {
	const { context, ctx, builderAgentId, initialTurn: turn } = params;

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

	if (result.status !== 'suspended') return await finishTurn(context, builderAgentId, result);

	// Any interactive suspension — including one the FE has no dedicated card
	// for — cascades through the generic passthrough: the suspend payload is
	// forwarded as-is (only the requestId is re-minted at this orchestrator
	// level) and the FE's approval-card fallback renders it. Still validated
	// defensively: a malformed payload fails the turn instead of throwing out
	// of the tool handler.
	const suspendPayload = result.suspension.suspendPayload;
	const parsedSuspend = isRecord(suspendPayload)
		? buildAgentSuspendSchema.safeParse({ ...suspendPayload, requestId: nanoid() })
		: undefined;
	if (!parsedSuspend?.success) {
		const message =
			"The agent builder's confirmation request was malformed; the build turn was lost.";
		publishAgentBuilderFailure(context, builderAgentId, new Error(message));
		return { ok: false, error: message };
	}

	return await ctx.suspend(parsedSuspend.data);
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
		.suspend(buildAgentSuspendSchema)
		.resume(buildAgentResumeSchema)
		.handler(async (input, ctx) => {
			const domainContext = context.domainContext;
			const delegate = domainContext?.builderDelegate;
			if (!domainContext || !delegate) {
				return { ok: false, error: 'Agent building is not available on this instance.' };
			}

			// Resume leg — checked before target resolution/creation, mirroring
			// configure-channel.tool.ts's ordering: a run rebuilt from a checkpoint
			// after a process restart has no in-memory agentBuilderTarget, so this
			// must re-derive the target and re-locate the builder's own open
			// checkpoint rather than relying on anything from the suspended call.
			if (ctx.resumeData !== undefined && ctx.resumeData !== null) {
				const target = await resolveAgentBuilderTarget(domainContext);
				if (!target) {
					return { ok: false, error: 'No agent build in progress for this conversation.' };
				}

				const session = {
					threadId: `ia-builder:${context.threadId}:${target.agentId}`,
					modelConfig: context.modelId,
				};
				const open = await delegate.findOpenSuspension(target.agentId, session);
				if (!open) {
					return { ok: false, error: 'The builder question this answered is no longer open.' };
				}

				// The builder's interactive tools now natively accept the FE confirm
				// shapes, so `ctx.resumeData` passes straight through unchanged.
				const builderAgentId = `agent-builder:${target.agentId}`;
				const turn = await delegate.resumeBuild(
					target.agentId,
					{ runId: open.runId, toolCallId: open.toolCallId, resumeData: ctx.resumeData },
					session,
				);
				// Idempotent republish — protects the rebuilt-state/replay edge case
				// where the FE lost the builder node from the original invocation.
				publishAgentSpawned(context, builderAgentId, target);
				return await runBuilderConsumeLoop({
					context,
					delegate,
					ctx,
					target,
					session,
					builderAgentId,
					initialTurn: turn,
				});
			}

			let target = await resolveAgentBuilderTarget(domainContext);
			if (!target) {
				if (input.name) {
					const created = await delegate.createAgent(input.name);
					target = { agentId: created.agentId, projectId: created.projectId, name: input.name };
				} else if (input.agentId) {
					if (!domainContext.projectId) {
						return {
							ok: false,
							error:
								'Cannot bind to agentId without an active project context. Start this conversation from within a project.',
						};
					}
					target = { agentId: input.agentId, projectId: domainContext.projectId };
				} else {
					return {
						ok: false,
						error: 'Pass name to create a new agent or agentId to edit an existing one.',
					};
				}
				// Hydrate the context so a second build-agent call in the same run
				// (e.g. after a background follow-up) skips the thread-metadata read.
				domainContext.agentBuilderTarget = target;
				await saveAgentBuilderTarget(domainContext, target);
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

			return await runBuilderConsumeLoop({
				context,
				delegate,
				ctx,
				target,
				session,
				builderAgentId,
				initialTurn: turn,
			});
		})
		.build();
}
