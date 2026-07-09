/**
 * build-agent — orchestration tool that drives the agents-module builder
 * (`AgentsBuilderService`) as an embedded sub-agent, one conversational turn
 * per invocation. This covers the non-interactive path only: a builder turn
 * that completes, errors, or is cancelled without asking the user anything.
 * Task 6 adds the suspend/resume branch for interactive builder questions
 * (HITL confirmations, credential prompts) via `ctx.suspend()`.
 *
 * The builder session is keyed to an instance-AI-scoped thread id
 * (`ia-builder:<threadId>:<agentId>`) so nothing appears in the agents-module
 * builder UI — it is a private sub-agent conversation.
 */
import { Tool } from '@n8n/agents';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { consumeStreamCascading } from '../../stream/consume-with-hitl';
import type { WorkSummary } from '../../stream/work-summary-accumulator';
import type { OrchestrationContext, SessionWorkflowRef } from '../../types';
import {
	resolveAgentBuilderTarget,
	saveAgentBuilderTarget,
} from '../agent-builder/agent-target-binding';
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

			let turn;
			try {
				turn = await delegate.streamBuild(target.agentId, outboundMessage, session);
			} catch (error) {
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
				if (isBuilderNotConfiguredError(error)) {
					return { ok: false, error: message };
				}
				throw error;
			}

			const result = await consumeStreamCascading({
				agent: undefined,
				stream: turn,
				runId: context.runId,
				agentId: builderAgentId,
				eventBus: context.eventBus,
				logger: context.logger,
				threadId: context.threadId,
				abortSignal: context.abortSignal,
			});

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

			// `suspended` (interactive builder questions) is handled by Task 6's
			// cascading-suspend branch; until then, surface it as a failure like
			// any other non-completed status.
			const status = result.status === 'suspended' ? 'suspended (unsupported)' : result.status;
			const error = `The agent builder run ${status}.`;
			context.eventBus.publish(context.threadId, {
				type: 'agent-completed',
				runId: context.runId,
				agentId: builderAgentId,
				payload: { role: 'agent-builder', result: '', error },
			});
			return { ok: false, error };
		})
		.build();
}
