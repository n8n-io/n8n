import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';

import { getSubAgentPersistence } from './agent-persistence';
import { delegateInputSchema, delegateOutputSchema, type DelegateInput } from './delegate.schemas';
import { truncateLabel } from './display-utils';
import {
	createDetachedSubAgentTraceFactory,
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceContextActor,
	withTraceRun,
} from './tracing-utils';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { buildDebriefing } from '../../agent/sub-agent-debriefing';
import { createSubAgent, SUB_AGENT_PROTOCOL } from '../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { createToolRegistry } from '../../tool-registry';
import type { InstanceAiToolRegistry, OrchestrationContext } from '../../types';

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
): { validTools: InstanceAiToolRegistry; errors: string[] } {
	const errors: string[] = [];
	const validTools = createToolRegistry();
	const availableMcpTools = context.mcpTools ?? createToolRegistry();

	for (const name of toolNames) {
		if (FORBIDDEN_TOOL_NAMES.has(name)) {
			errors.push(`"${name}" is an orchestration tool and cannot be delegated`);
			continue;
		}

		const domainTool = context.domainTools.get(name);
		if (domainTool) {
			validTools.set(name, domainTool);
			continue;
		}

		const mcpTool = availableMcpTools.get(name);
		if (mcpTool) {
			validTools.set(name, mcpTool);
		} else {
			errors.push(`"${name}" is not a registered domain tool`);
		}
	}

	return { validTools, errors };
}

async function buildDelegateBriefing(
	context: OrchestrationContext,
	role: string,
	briefing: string,
	artifacts?: unknown,
	conversationContext?: string,
): Promise<string> {
	const structured = await buildSubAgentBriefing({
		task: briefing,
		conversationContext,
		artifacts: artifacts as Record<string, unknown> | undefined,
		iteration: context.iterationLog
			? { log: context.iterationLog, threadId: context.threadId, taskKey: `delegate:${role}` }
			: undefined,
		runningTasks: context.getRunningTaskSummaries?.(),
	});

	return `${structured}\n\nRemember: ${SUB_AGENT_PROTOCOL}`;
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

	const briefingMessage = await buildDelegateBriefing(
		context,
		role,
		input.spec,
		input.artifacts,
		input.conversationContext,
	);
	const createTraceContext = createDetachedSubAgentTraceFactory(context, {
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
		createTraceContext,
		plannedTaskId: input.plannedTaskId,
		dedupeKey: { role, plannedTaskId: input.plannedTaskId },
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async (signal, drainCorrections, waitForCorrection, { traceContext }) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = createSubAgent({
					agentId: subAgentId,
					role,
					instructions:
						'Complete the delegated task using the provided tools. Return concrete results only.',
					tools: tracedTools,
					modelId: context.modelId,
					traceRun: traceContext?.actorRun,
					tracing: traceContext,
					timeZone: context.timeZone,
					checkpointStore: context.checkpointStore,
				});

				const maxIterations = context.subAgentMaxSteps ?? MAX_STEPS.DELEGATE_FALLBACK;
				const persistence = getSubAgentPersistence(context);
				const stream = await subAgent.stream(briefingMessage, {
					maxIterations,
					abortSignal: signal,
					persistence,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
				});

				const result = await consumeStreamWithHitl({
					agent: subAgent,
					stream,
					runId: context.runId,
					agentId: subAgentId,
					eventBus: context.eventBus,
					logger: context.logger,
					threadId: context.threadId,
					abortSignal: signal,
					waitForConfirmation: context.waitForConfirmation,
					drainCorrections,
					waitForCorrection,
					maxIterations,
					persistence,
				});

				return await result.text;
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
	return new Tool('delegate')
		.description(
			'Spawn a focused sub-agent to handle a specific subtask. Specify the ' +
				'role, a task-specific system prompt, the tool subset needed, and a ' +
				'detailed briefing. The sub-agent executes independently and returns ' +
				'a synthesized result. Use for complex multi-step operations that ' +
				'benefit from a clean context window.',
		)
		.input(delegateInputSchema)
		.output(delegateOutputSchema)
		.handler(async (input: DelegateInput) => {
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
					tracing: context.tracing,
					timeZone: context.timeZone,
					checkpointStore: context.checkpointStore,
				});

				const briefingMessage = await buildDelegateBriefing(
					context,
					input.role,
					input.briefing,
					input.artifacts,
					input.conversationContext,
				);

				// 4. Stream sub-agent with HITL support
				const consumeResult = await withTraceRun(context, traceRun, async () => {
					const maxIterations = context.subAgentMaxSteps ?? MAX_STEPS.DELEGATE_FALLBACK;
					const persistence = getSubAgentPersistence(context);
					const stream = await subAgent.stream(briefingMessage, {
						maxIterations,
						abortSignal: context.abortSignal,
						persistence,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					});

					return await consumeStreamWithHitl({
						agent: subAgent,
						stream,
						runId: context.runId,
						agentId: subAgentId,
						eventBus: context.eventBus,
						logger: context.logger,
						threadId: context.threadId,
						abortSignal: context.abortSignal,
						waitForConfirmation: context.waitForConfirmation,
						maxIterations,
						persistence,
					});
				});

				const resultText = await consumeResult.text;
				const debriefing = buildDebriefing({
					agentId: subAgentId,
					role: input.role,
					result: resultText,
					workSummary: consumeResult.workSummary,
					startTime,
				});

				await finishTraceRun(context, traceRun, {
					outputs: {
						result: resultText,
						agentId: subAgentId,
						role: input.role,
						toolCallCount: debriefing.toolCallCount,
						toolErrorCount: debriefing.toolErrorCount,
						durationMs: debriefing.durationMs,
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
					toolCallCount: debriefing.toolCallCount,
					toolErrorCount: debriefing.toolErrorCount,
					durationMs: debriefing.durationMs,
					blockers: debriefing.blockers,
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
		})
		.build();
}
