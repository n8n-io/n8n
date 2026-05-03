import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';

import { delegateInputSchema, delegateOutputSchema, type DelegateInput } from './delegate.schemas';
import { truncateLabel } from './display-utils';
import {
	createDetachedSubAgentTracing,
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceContextActor,
	withTraceRun,
} from './tracing-utils';
import {
	DELEGATE_DEFAULT_INSTRUCTIONS,
	observeOutcome,
	renderHandoff,
	type DelegateHandoffInput,
	type HandoffRenderers,
	type SubAgentHandoff,
} from '../../agent/handoff';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgent, SUB_AGENT_PROTOCOL } from '../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../constants/max-steps';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { getTraceParentRun, withTraceParentContext } from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

const FORBIDDEN_TOOL_NAMES = new Set(['plan', 'create-tasks', 'delegate']);

function generateAgentId(): string {
	return `agent-${nanoid(6)}`;
}

function buildRoleKey(role: string): string {
	return role
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function resolveDelegateTools(
	context: OrchestrationContext,
	toolNames: string[],
): { validTools: ToolsInput; errors: string[] } {
	const errors: string[] = [];
	const validTools: ToolsInput = {};
	const availableMcpTools = context.mcpTools ?? {};

	for (const name of toolNames) {
		if (FORBIDDEN_TOOL_NAMES.has(name)) {
			errors.push(`"${name}" is an orchestration tool and cannot be delegated`);
		} else if (name in context.domainTools) {
			validTools[name] = context.domainTools[name];
		} else if (name in availableMcpTools) {
			validTools[name] = availableMcpTools[name];
		} else {
			errors.push(`"${name}" is not a registered domain tool`);
		}
	}

	return { validTools, errors };
}

function buildDelegateHandoff(params: {
	role: string;
	instructions: string;
	goal: string;
	toolNames: string[];
	artifacts?: unknown;
	conversationContext?: string;
}): Extract<SubAgentHandoff, { kind: 'delegate' }> {
	const input: DelegateHandoffInput = {
		role: params.role,
		instructions: params.instructions,
		goal: params.goal,
		toolNames: params.toolNames,
		artifacts: params.artifacts as Record<string, unknown> | undefined,
		conversationContext: params.conversationContext,
	};
	return { taskKey: `delegate:${params.role}`, kind: 'delegate', input };
}

/** Merge the delegate's `artifacts` map with resolved resource IDs so the child sees a flat object. */
const delegateRenderers: HandoffRenderers<Extract<SubAgentHandoff, { kind: 'delegate' }>> = {
	buildTaskBlock: (h) => h.input.goal,
	buildArtifacts: (h) => {
		const merged: Record<string, unknown> = { ...(h.input.artifacts ?? {}) };
		if (h.input.resources) {
			for (const [k, v] of Object.entries(h.input.resources)) {
				if (v !== undefined) merged[k] = v;
			}
		}
		return Object.keys(merged).length > 0 ? merged : undefined;
	},
};

async function renderDelegateBriefing(
	context: OrchestrationContext,
	handoff: Extract<SubAgentHandoff, { kind: 'delegate' }>,
): Promise<string> {
	const briefing = await renderHandoff(handoff, context, delegateRenderers);
	return `${briefing}\n\nRemember: ${SUB_AGENT_PROTOCOL}`;
}

export interface DetachedDelegateTaskInput {
	title: string;
	spec: string;
	tools: string[];
	artifacts?: unknown;
	conversationContext?: string;
	taskId?: string;
	agentId?: string;
	plannedTaskId?: string;
}

export interface DetachedDelegateTaskResult {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startDetachedDelegateTask(
	context: OrchestrationContext,
	input: DetachedDelegateTaskInput,
): Promise<DetachedDelegateTaskResult> {
	if (input.tools.length === 0) {
		return {
			result: 'Delegation failed: "tools" must contain at least one tool name',
			taskId: '',
			agentId: '',
		};
	}

	const { validTools, errors } = resolveDelegateTools(context, input.tools);
	if (errors.length > 0) {
		return {
			result: `Delegation failed: ${errors.join('; ')}`,
			taskId: '',
			agentId: '',
		};
	}

	if (!context.spawnBackgroundTask) {
		return {
			result: 'Delegation failed: background task support not available.',
			taskId: '',
			agentId: '',
		};
	}

	const role = buildRoleKey(input.title) || 'delegate-worker';
	const subAgentId = input.agentId ?? `agent-delegate-${nanoid(6)}`;
	const taskId = input.taskId ?? `delegate-${nanoid(8)}`;

	const handoff = buildDelegateHandoff({
		role,
		instructions: DELEGATE_DEFAULT_INSTRUCTIONS,
		goal: input.spec,
		toolNames: input.tools,
		artifacts: input.artifacts,
		conversationContext: input.conversationContext,
	});
	const briefingMessage = await renderDelegateBriefing(context, handoff);
	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role,
		kind: 'delegate',
		taskId,
		plannedTaskId: input.plannedTaskId,
		inputs: {
			title: input.title,
			briefing: input.spec,
			tools: input.tools,
			conversationContext: input.conversationContext,
		},
	});
	const tracedTools = traceSubAgentTools(context, validTools, role);

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role,
		traceContext,
		plannedTaskId: input.plannedTaskId,
		dedupeKey: { role, plannedTaskId: input.plannedTaskId },
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async (signal, drainCorrections, waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = createSubAgent({
					agentId: subAgentId,
					role,
					instructions: DELEGATE_DEFAULT_INSTRUCTIONS,
					tools: tracedTools,
					modelId: context.modelId,
					traceRun: traceContext?.actorRun,
					timeZone: context.timeZone,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const traceParent = getTraceParentRun();
				return await withTraceParentContext(traceParent, async () => {
					const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
					const stream = await subAgent.stream(briefingMessage, {
						maxSteps: context.subAgentMaxSteps ?? MAX_STEPS.DELEGATE_FALLBACK,
						abortSignal: signal,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
						...(llmStepTraceHooks?.executionOptions ?? {}),
					});

					const result = await consumeStreamWithHitl({
						agent: subAgent,
						stream: stream as {
							runId?: string;
							fullStream: AsyncIterable<unknown>;
							text: Promise<string>;
						},
						runId: context.runId,
						agentId: subAgentId,
						eventBus: context.eventBus,
						logger: context.logger,
						threadId: context.threadId,
						abortSignal: signal,
						waitForConfirmation: context.waitForConfirmation,
						drainCorrections,
						waitForCorrection,
						llmStepTraceHooks,
					});

					return await result.text;
				});
			});
		},
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `Delegation already in progress (task: ${spawnOutcome.existing.taskId}). Wait for the planned-task-follow-up — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start delegation: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
			taskId: '',
			agentId: '',
		};
	}

	// Spawn confirmed — publish the UI event now so duplicate/limit-reached
	// rejections above don't leave a phantom card on the chat surface.
	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role,
			tools: input.tools,
			taskId,
			kind: 'delegate',
			title: input.title,
			subtitle: truncateLabel(input.spec),
			goal: input.spec,
		},
	});

	return {
		result: `Delegation started (task: ${taskId}). Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export function createDelegateTool(context: OrchestrationContext) {
	return createTool({
		id: 'delegate',
		description:
			'Spawn a focused sub-agent to handle a specific subtask. Specify the ' +
			'role, a task-specific system prompt, the tool subset needed, and a ' +
			'detailed briefing. The sub-agent executes independently and returns ' +
			'a synthesized result. Use for complex multi-step operations that ' +
			'benefit from a clean context window.',
		inputSchema: delegateInputSchema,
		outputSchema: delegateOutputSchema,
		execute: async (input: DelegateInput) => {
			if (input.tools.length === 0) {
				return { result: 'Delegation failed: "tools" must contain at least one tool name' };
			}

			const { validTools, errors } = resolveDelegateTools(context, input.tools);

			if (errors.length > 0) {
				return { result: `Delegation failed: ${errors.join('; ')}` };
			}

			const subAgentId = generateAgentId();
			const startTime = Date.now();

			// 2. Publish agent-spawned
			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: input.role,
					tools: input.tools,
					kind: 'delegate',
					subtitle: truncateLabel(input.briefing),
					goal: input.briefing,
				},
			});
			const traceRun = await startSubAgentTrace(context, {
				agentId: subAgentId,
				role: input.role,
				kind: 'delegate',
				inputs: {
					briefing: input.briefing,
					instructions: input.instructions,
					tools: input.tools,
					conversationContext: input.conversationContext,
				},
			});
			const tracedTools = traceSubAgentTools(context, validTools, input.role);

			try {
				// 3. Create sub-agent
				const subAgent = createSubAgent({
					agentId: subAgentId,
					role: input.role,
					instructions: input.instructions,
					tools: tracedTools,
					modelId: context.modelId,
					traceRun,
					timeZone: context.timeZone,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const handoff = buildDelegateHandoff({
					role: input.role,
					instructions: input.instructions,
					goal: input.briefing,
					toolNames: input.tools,
					artifacts: input.artifacts,
					conversationContext: input.conversationContext,
				});
				const briefingMessage = await renderDelegateBriefing(context, handoff);

				// 4. Stream sub-agent with HITL support
				const consumeResult = await withTraceRun(context, traceRun, async () => {
					const traceParent = getTraceParentRun();
					return await withTraceParentContext(traceParent, async () => {
						const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
						const stream = await subAgent.stream(briefingMessage, {
							maxSteps: context.subAgentMaxSteps ?? MAX_STEPS.DELEGATE_FALLBACK,
							abortSignal: context.abortSignal,
							providerOptions: {
								anthropic: { cacheControl: { type: 'ephemeral' } },
							},
							...(llmStepTraceHooks?.executionOptions ?? {}),
						});

						return await consumeStreamWithHitl({
							agent: subAgent,
							stream: stream as {
								runId?: string;
								fullStream: AsyncIterable<unknown>;
								text: Promise<string>;
							},
							runId: context.runId,
							agentId: subAgentId,
							eventBus: context.eventBus,
							logger: context.logger,
							threadId: context.threadId,
							abortSignal: context.abortSignal,
							waitForConfirmation: context.waitForConfirmation,
							llmStepTraceHooks,
						});
					});
				});

				const resultText = await consumeResult.text;
				const observation = observeOutcome({
					taskKey: handoff.taskKey,
					workSummary: consumeResult.workSummary,
					resultText,
					startTime,
				});

				await finishTraceRun(context, traceRun, {
					outputs: {
						result: resultText,
						agentId: subAgentId,
						role: input.role,
						toolCallCount: observation.toolCallCount,
						toolErrorCount: observation.toolErrorCount,
						durationMs: observation.durationMs,
					},
				});

				// 7. Publish agent-completed
				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: input.role,
						result: resultText,
					},
				});

				return {
					result: resultText,
					toolCallCount: observation.toolCallCount,
					toolErrorCount: observation.toolErrorCount,
					durationMs: observation.durationMs,
					blockers: observation.blockers,
				};
			} catch (error) {
				// 8. Publish agent-completed with error
				const errorMessage = error instanceof Error ? error.message : String(error);
				await failTraceRun(context, traceRun, error, {
					agent_id: subAgentId,
					agent_role: input.role,
				});

				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: input.role,
						result: '',
						error: errorMessage,
					},
				});

				return { result: `Sub-agent error: ${errorMessage}` };
			}
		},
	});
}
