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
import {
	ASK_CREDENTIAL_TOOL_NAME,
	ASK_EMBEDDING_CREDENTIAL_TOOL_NAME,
	ASK_LLM_TOOL_NAME,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import {
	consumeStreamCascading,
	type ConsumeStreamCascadingResult,
} from '../../stream/consume-with-hitl';
import type { WorkSummary } from '../../stream/work-summary-accumulator';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
	SessionWorkflowRef,
} from '../../types';
import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
	type AgentBuilderTarget,
} from '../agent-builder/agent-target-binding';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';
import {
	builderCancellationResume,
	mapBuilderSuspendPayload,
	translateConfirmToBuilderResume,
	type AskCredentialSuspendEnrichment,
} from './builder-interaction-mapping';

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

/** True for the two builder tools whose confirm/suspend payloads carry a credential. */
function isCredentialToolName(toolName: string): boolean {
	return toolName === ASK_CREDENTIAL_TOOL_NAME || toolName === ASK_EMBEDDING_CREDENTIAL_TOOL_NAME;
}

/**
 * The builder's ask_credential suspend payload (and the delegate's stored
 * open-suspension record) embed the tool input directly — see
 * `parseSuspendInput` in builder-interaction-mapping.ts for the same
 * defensive-nesting precedent.
 */
function extractCredentialType(payload: Record<string, unknown>): string | undefined {
	if (typeof payload.credentialType === 'string') return payload.credentialType;
	const nested = payload.input;
	return isRecord(nested) && typeof nested.credentialType === 'string'
		? nested.credentialType
		: undefined;
}

/**
 * Look up credentials of the requested type for the enrichment payload and
 * for resolving a credential's display name on resume. Scoped to the target
 * agent's project, matching what the editor's own credential picker would
 * offer. Never throws — a lookup failure degrades to an empty list rather
 * than failing the suspension/resume.
 */
async function lookupExistingCredentials(
	domainContext: InstanceAiContext,
	projectId: string,
	credentialType: string,
): Promise<Array<{ id: string; name: string }>> {
	try {
		const credentials = await domainContext.credentialService.list({
			type: credentialType,
			projectId,
		});
		if (!Array.isArray(credentials)) return [];
		return credentials.map((credential) => ({ id: credential.id, name: credential.name }));
	} catch (error) {
		domainContext.logger.warn('Failed to look up existing credentials for a builder suspension', {
			credentialType,
			error: error instanceof Error ? error.message : String(error),
		});
		return [];
	}
}

/** Enrichment for `mapBuilderSuspendPayload`'s ask_credential branch — empty for every other tool. */
async function buildCredentialEnrichment(
	domainContext: InstanceAiContext,
	projectId: string,
	toolName: string,
	suspendPayload: Record<string, unknown>,
): Promise<AskCredentialSuspendEnrichment> {
	if (!isCredentialToolName(toolName)) return {};

	const credentialType = extractCredentialType(suspendPayload);
	if (!credentialType) return {};

	return {
		existingCredentials: await lookupExistingCredentials(domainContext, projectId, credentialType),
	};
}

/**
 * Normalize the FE's credentialRequests confirm payload — `{ credentials:
 * Record<credentialType, credentialId> }`, no name — into the
 * `{ credentialId, credentialName }` shape `translateConfirmToBuilderResume`
 * expects. Any other confirm shape (dismissal, approval) passes through
 * unchanged. Falls back to the id as the name if it can't be resolved.
 */
async function normalizeCredentialConfirmPayload(
	domainContext: InstanceAiContext,
	projectId: string,
	toolName: string,
	suspendPayload: Record<string, unknown>,
	confirmPayload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (!isCredentialToolName(toolName)) return confirmPayload;

	const credentials = confirmPayload.credentials;
	if (!isRecord(credentials)) return confirmPayload;

	const credentialType = extractCredentialType(suspendPayload);
	const credentialId = credentialType ? credentials[credentialType] : undefined;
	if (typeof credentialId !== 'string') return confirmPayload;

	const existingCredentials = credentialType
		? await lookupExistingCredentials(domainContext, projectId, credentialType)
		: [];
	const match = existingCredentials.find((credential) => credential.id === credentialId);
	return { credentialId, credentialName: match?.name ?? credentialId };
}

const buildAgentInputSchema = z.object({
	message: z
		.string()
		.min(1)
		.describe('The instruction or user message to forward to the agent builder'),
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
			targetResource: { type: 'agent', id: target.agentId },
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
 * Cap on ask_llm cancellation bounces (see below) per invocation of the
 * consume loop. Guards against a builder that keeps re-suspending ask_llm
 * (e.g. it never accepts the "ask in plain text" cancellation) bouncing
 * forever instead of terminating the turn.
 */
const ASK_LLM_BOUNCE_LIMIT = 3;

/**
 * Drain one builder turn, cascading any interactive suspension into this
 * tool's own `ctx.suspend()`. Shared by the first-call and resume legs so
 * both loop until the builder either finishes or asks the user something.
 */
async function runBuilderConsumeLoop(params: {
	context: OrchestrationContext;
	domainContext: InstanceAiContext;
	delegate: InstanceAiBuilderDelegate;
	ctx: BuildAgentToolContext;
	target: AgentBuilderTarget;
	session: { threadId: string };
	builderAgentId: string;
	initialTurn: BuilderTurnStream;
}): Promise<BuildAgentOutput> {
	const { context, domainContext, delegate, ctx, target, session, builderAgentId } = params;
	let turn = params.initialTurn;
	let askLlmBounceCount = 0;

	for (;;) {
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

		const toolName = result.suspension.toolName ?? '';
		if (toolName === ASK_LLM_TOOL_NAME) {
			askLlmBounceCount += 1;
			if (askLlmBounceCount > ASK_LLM_BOUNCE_LIMIT) {
				const message =
					'The agent builder repeatedly requested a model picker this chat cannot show. ' +
					'Tell the user to configure the builder model in the agents module settings.';
				publishAgentBuilderFailure(context, builderAgentId, new Error(message));
				return { ok: false, error: message };
			}

			// The stream never carries a real runId for builder turns (see
			// resumable-stream-executor.ts), so resume routing must go through the
			// same server-side checkpoint lookup the resume leg uses, not
			// `result.agentRunId` (always `''`).
			const open = await delegate.findOpenSuspension(target.agentId, session);
			if (!open) {
				const message = "The builder's question could not be recovered; the build turn was lost.";
				publishAgentBuilderFailure(context, builderAgentId, new Error(message));
				return { ok: false, error: message };
			}

			// Temporary until the llm-picker FE kind ships: bounce back into the
			// builder so it asks conversationally instead of dead-ending.
			turn = await delegate.resumeBuild(
				target.agentId,
				{
					runId: open.runId,
					toolCallId: open.toolCallId,
					resumeData: builderCancellationResume(
						'This chat cannot show the model picker; ask for provider, model, and credential in plain text.',
					),
				},
				session,
			);
			continue;
		}

		const enrichment = await buildCredentialEnrichment(
			domainContext,
			target.projectId,
			toolName,
			result.suspension.suspendPayload,
		);
		return await ctx.suspend(
			buildAgentSuspendSchema.parse(
				mapBuilderSuspendPayload(toolName, result.suspension.suspendPayload, nanoid(), enrichment),
			),
		);
	}
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

				const session = { threadId: `ia-builder:${context.threadId}:${target.agentId}` };
				const open = await delegate.findOpenSuspension(target.agentId, session);
				if (!open) {
					return { ok: false, error: 'The builder question this answered is no longer open.' };
				}

				const confirmPayload = await normalizeCredentialConfirmPayload(
					domainContext,
					target.projectId,
					open.toolName,
					open.suspendPayload,
					ctx.resumeData,
				);
				const translation = translateConfirmToBuilderResume(open.toolName, confirmPayload);
				if (!translation.ok) {
					return { ok: false, error: translation.reason };
				}

				const builderAgentId = `agent-builder:${target.agentId}`;
				const turn = await delegate.resumeBuild(
					target.agentId,
					{ runId: open.runId, toolCallId: open.toolCallId, resumeData: translation.resumeData },
					session,
				);
				// Idempotent republish — protects the rebuilt-state/replay edge case
				// where the FE lost the builder node from the original invocation.
				publishAgentSpawned(context, builderAgentId, target);
				return await runBuilderConsumeLoop({
					context,
					domainContext,
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
					target = { agentId: created.agentId, projectId: created.projectId };
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

			const session = { threadId: `ia-builder:${context.threadId}:${target.agentId}` };
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
				domainContext,
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
