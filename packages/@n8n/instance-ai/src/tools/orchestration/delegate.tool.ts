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
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createSubAgent, SUB_AGENT_PROTOCOL } from '../../agent/sub-agent-factory';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { traceWorkingMemoryContext } from '../../runtime/working-memory-tracing';
import { formatPreviousAttempts } from '../../storage/iteration-log';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { getTraceParentRun, withTraceParentContext } from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

const FORBIDDEN_TOOL_NAMES = new Set(['plan', 'create-tasks', 'delegate']);

const FALLBACK_MAX_STEPS = 10;

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

async function buildDelegateBriefing(
	context: OrchestrationContext,
	role: string,
	briefing: string,
	artifacts?: unknown,
	conversationContext?: string,
): Promise<string> {
	const serializedArtifacts = artifacts ? `\n\nArtifacts: ${JSON.stringify(artifacts)}` : '';
	const conversationCtx = conversationContext
		? `\n\n[CONVERSATION CONTEXT: ${conversationContext}]`
		: '';

	let iterationContext = '';
	if (context.iterationLog) {
		const taskKey = `delegate:${role}`;
		try {
			const entries = await context.iterationLog.getForTask(context.threadId, taskKey);
			iterationContext = formatPreviousAttempts(entries);
		} catch {
			// Non-fatal — iteration log is best-effort
		}
	}

	return `${briefing}${conversationCtx}${serializedArtifacts}${iterationContext ? `\n\n${iterationContext}` : ''}\n\nRemember: ${SUB_AGENT_PROTOCOL}`;
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

	const briefingMessage = await buildDelegateBriefing(
		context,
		role,
		input.spec,
		input.artifacts,
		input.conversationContext,
	);
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

	context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role,
		traceContext,
		plannedTaskId: input.plannedTaskId,
		run: async (signal, drainCorrections, waitForCorrection) => {
			return await withTraceContextActor(traceContext, async () => {
				const subAgent = createSubAgent({
					agentId: subAgentId,
					role,
					instructions:
						'Complete the delegated task using the provided tools. Return concrete results only.',
					tools: tracedTools,
					modelId: context.modelId,
					traceRun: traceContext?.actorRun,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const traceParent = getTraceParentRun();
				return await withTraceParentContext(traceParent, async () => {
					const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
					const stream = await traceWorkingMemoryContext(
						{
							phase: 'initial',
							agentId: subAgentId,
							agentRole: role,
							threadId: context.threadId,
							input: briefingMessage,
						},
						async () =>
							await subAgent.stream(briefingMessage, {
								maxSteps: context.subAgentMaxSteps ?? FALLBACK_MAX_STEPS,
								abortSignal: signal,
								providerOptions: {
									anthropic: { cacheControl: { type: 'ephemeral' } },
								},
								...(llmStepTraceHooks?.executionOptions ?? {}),
							}),
					);

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
						workingMemoryEnabled: false,
					});

					return await result.text;
				});
			});
		},
	});

	return {
		result: `Delegation started (task: ${taskId}). Reply with one short sentence. Do NOT summarize the plan or list details.`,
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
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const briefingMessage = await buildDelegateBriefing(
					context,
					input.role,
					input.briefing,
					input.artifacts,
					input.conversationContext,
				);

				// 4. Stream sub-agent with HITL support
				const resultText = await withTraceRun(context, traceRun, async () => {
					const traceParent = getTraceParentRun();
					return await withTraceParentContext(traceParent, async () => {
						const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
						const stream = await traceWorkingMemoryContext(
							{
								phase: 'initial',
								agentId: subAgentId,
								agentRole: input.role,
								threadId: context.threadId,
								input: briefingMessage,
							},
							async () =>
								await subAgent.stream(briefingMessage, {
									maxSteps: context.subAgentMaxSteps ?? FALLBACK_MAX_STEPS,
									abortSignal: context.abortSignal,
									providerOptions: {
										anthropic: { cacheControl: { type: 'ephemeral' } },
									},
									...(llmStepTraceHooks?.executionOptions ?? {}),
								}),
						);

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
							abortSignal: context.abortSignal,
							waitForConfirmation: context.waitForConfirmation,
							llmStepTraceHooks,
							workingMemoryEnabled: false,
						});

						return await result.text;
					});
				});
				await finishTraceRun(context, traceRun, {
					outputs: {
						result: resultText,
						agentId: subAgentId,
						role: input.role,
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

				return { result: resultText };
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
