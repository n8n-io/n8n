/**
 * Plan-with-Agent Orchestration Tool
 *
 * Spawns an **inline** planner sub-agent that reads the conversation history,
 * discovers available nodes/credentials/tables, and produces a typed
 * solution blueprint. Blueprint items are emitted incrementally via the
 * `add-plan-item` tool — each call publishes a `tasks-update` event so the
 * task checklist populates progressively in the UI.
 *
 * The planner receives the last 5 messages from the thread as primary context,
 * plus an optional guidance string from the orchestrator for ambiguous cases.
 * It can also ask the user questions directly via the ask-user tool.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { DateTime } from 'luxon';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { createAddPlanItemTool, createRemovePlanItemTool } from './add-plan-item.tool';
import { BlueprintAccumulator } from './blueprint-accumulator';
import { truncateLabel } from './display-utils';
import { PLANNER_AGENT_PROMPT } from './plan-agent-prompt';
import { createSubmitPlanTool } from './submit-plan.tool';
import {
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceRun,
} from './tracing-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { MAX_STEPS } from '../../constants/max-steps';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { getTraceParentRun, withTraceParentContext } from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

/** Number of recent thread messages to include as planner context. */
const MESSAGE_HISTORY_COUNT = 5;

/** Read-only discovery tools the planner gets from domainTools. */
const PLANNER_DOMAIN_TOOL_NAMES = [
	'nodes',
	'templates',
	'credentials',
	'data-tables',
	'workflows',
	'ask-user',
];

/** Research tools added when available. */
const PLANNER_RESEARCH_TOOL_NAMES = ['research'];

// ---------------------------------------------------------------------------
// Message history retrieval
// ---------------------------------------------------------------------------

interface FormattedMessage {
	role: string;
	content: string;
}

/** Extract plain text from Mastra memory content (string, array of parts, or {format, parts}). */
function extractTextFromMemoryContent(content: unknown): string {
	if (typeof content === 'string') return content;

	// Mastra format-2 structured content: { format: 2, parts: [{ type: 'text', text: '...' }] }
	if (isStructuredContent(content)) {
		return extractTextParts(content.parts);
	}

	// Array of content parts: [{ type: 'text', text: '...' }]
	if (Array.isArray(content)) {
		return extractTextParts(content);
	}

	return typeof content === 'object' && content !== null ? JSON.stringify(content) : '';
}

function isStructuredContent(value: unknown): value is { format: number; parts: unknown[] } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'parts' in value &&
		Array.isArray((value as Record<string, unknown>).parts)
	);
}

function extractTextParts(parts: unknown[]): string {
	return parts
		.filter(
			(c): c is { type: 'text'; text: string } =>
				typeof c === 'object' && c !== null && 'text' in c,
		)
		.map((c) => c.text)
		.join('\n');
}

async function getRecentMessages(
	context: OrchestrationContext,
	count: number,
): Promise<FormattedMessage[]> {
	const messages: FormattedMessage[] = [];

	// Retrieve previously-saved messages from memory
	if (context.memory) {
		try {
			const result = await context.memory.recall({
				threadId: context.threadId,
				perPage: count,
			});

			for (const m of result.messages) {
				const role = m.role as string;
				const content = extractTextFromMemoryContent(m.content);
				if ((role === 'user' || role === 'assistant') && content.length > 0) {
					messages.push({ role, content });
				}
			}
		} catch {
			// Memory recall failed — continue with just the current message
		}
	}

	// Always append the current in-flight user message (not yet saved to memory)
	if (context.currentUserMessage) {
		messages.push({ role: 'user', content: context.currentUserMessage });
	}

	return messages;
}

function formatMessagesForBriefing(
	messages: FormattedMessage[],
	guidance?: string,
	timeZone?: string,
): string {
	const parts: string[] = [];

	const now = timeZone ? DateTime.now().setZone(timeZone) : DateTime.now();
	const isoNow = now.toISO({ includeOffset: true }) ?? new Date().toISOString();
	parts.push(`<current-datetime>${isoNow}</current-datetime>`);
	if (timeZone) {
		parts.push(`<user-timezone>${timeZone}</user-timezone>`);
	}

	if (messages.length > 0) {
		parts.push('## Recent conversation');
		for (const m of messages) {
			const label = m.role === 'user' ? 'User' : 'Assistant';
			// Truncate very long messages
			const content = m.content.length > 2000 ? m.content.slice(0, 2000) + '...' : m.content;
			parts.push(`**${label}:** ${content}`);
		}
	}

	if (guidance) {
		parts.push(`\n## Orchestrator guidance\n${guidance}`);
	}

	parts.push('\nDesign the solution blueprint based on the conversation above.');

	return parts.join('\n\n');
}

export const __testFormatMessagesForBriefing = formatMessagesForBriefing;

// ---------------------------------------------------------------------------
// Helper: clear draft checklist from taskStorage
// ---------------------------------------------------------------------------

/** Publish an empty tasks-update so the frontend clears stale plan items. */
function publishClearingEvent(context: OrchestrationContext): void {
	context.eventBus.publish(context.threadId, {
		type: 'tasks-update',
		runId: context.runId,
		agentId: context.orchestratorAgentId,
		payload: { tasks: { tasks: [] }, planItems: [] },
	});
}

async function clearDraftChecklist(context: OrchestrationContext): Promise<void> {
	try {
		await context.taskStorage.save(context.threadId, { tasks: [] });
	} catch {
		// Best-effort — don't let cleanup failures block the return path
	}
}

/**
 * Remove any persisted planned-task graph for this thread *if and only if* it
 * belongs to this planner run's unapproved plan. Called on planner give-up /
 * error paths to prevent a later schedulePlannedTasks() tick from dispatching
 * a plan the user never approved.
 *
 * Guarded because the thread may already carry an unrelated active graph (a
 * prior approved plan with pending checkpoints / in-flight tasks); an
 * unconditional `clear()` here would strand that work. We only touch the graph
 * when its `planRunId` matches this run AND its `status` is `awaiting_approval`
 * — the single window where submit-plan has persisted but approval hasn't
 * happened yet.
 */
export async function __testClearPlannedTaskGraph(context: OrchestrationContext): Promise<void> {
	return await clearPlannedTaskGraph(context);
}

async function clearPlannedTaskGraph(context: OrchestrationContext): Promise<void> {
	if (!context.plannedTaskService) return;
	try {
		const graph = await context.plannedTaskService.getGraph(context.threadId);
		if (!graph) return;
		if (graph.planRunId !== context.runId) return;
		if (graph.status !== 'awaiting_approval') return;
		await context.plannedTaskService.clear(context.threadId);
	} catch {
		// Best-effort — don't let cleanup failures block the return path
	}
}

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

export function createPlanWithAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'plan',
		description:
			'Design and execute a multi-step plan. Spawns a planner agent that reads ' +
			'the conversation history, discovers available credentials, data tables, ' +
			'and best practices, designs the architecture, and shows it to the user ' +
			'for approval. Use when the request requires 2 or more tasks with ' +
			'dependencies. When this tool returns, the plan is already approved ' +
			'and tasks are dispatched — just acknowledge briefly and end your turn.',
		inputSchema: z.object({
			guidance: z
				.string()
				.optional()
				.describe(
					'Optional steering note for the planner — use ONLY when the conversation ' +
						'history alone is ambiguous about what to build. The planner reads the ' +
						'last 5 messages directly, so do NOT rewrite the user request here.',
				),
		}),
		outputSchema: z.object({
			result: z.string(),
		}),
		execute: async (input: { guidance?: string }) => {
			// ── Collect planner tools ──────────────────────────────────────
			const plannerTools: ToolsInput = {};

			for (const name of PLANNER_DOMAIN_TOOL_NAMES) {
				if (name in context.domainTools) {
					plannerTools[name] = context.domainTools[name];
				}
			}

			for (const name of PLANNER_RESEARCH_TOOL_NAMES) {
				if (name in context.domainTools) {
					plannerTools[name] = context.domainTools[name];
				}
			}

			// Incremental plan accumulation + approval tools
			const accumulator = new BlueprintAccumulator();
			plannerTools['add-plan-item'] = createAddPlanItemTool(accumulator, context);
			plannerTools['remove-plan-item'] = createRemovePlanItemTool(accumulator, context);
			plannerTools['submit-plan'] = createSubmitPlanTool(accumulator, context);

			// ── Retrieve conversation history ─────────────────────────────
			const messages = await getRecentMessages(context, MESSAGE_HISTORY_COUNT);
			const briefing = formatMessagesForBriefing(messages, input.guidance, context.timeZone);

			// ── IDs & events ──────────────────────────────────────────────
			const subAgentId = `agent-planner-${nanoid(6)}`;
			const subtitle =
				input.guidance ?? messages.find((m) => m.role === 'user')?.content ?? 'Planning...';

			context.eventBus.publish(context.threadId, {
				type: 'agent-spawned',
				runId: context.runId,
				agentId: subAgentId,
				payload: {
					parentId: context.orchestratorAgentId,
					role: 'planner',
					tools: Object.keys(plannerTools),
					kind: 'planner' as const,
					title: 'Planning',
					subtitle: truncateLabel(subtitle),
					goal: briefing,
				},
			});

			// ── Tracing ───────────────────────────────────────────────────
			const traceRun = await startSubAgentTrace(context, {
				agentId: subAgentId,
				role: 'planner',
				kind: 'planner',
				inputs: {
					guidance: input.guidance,
					messageCount: messages.length,
				},
			});
			const tracedPlannerTools = traceSubAgentTools(context, plannerTools, 'planner');

			try {
				// ── Create & stream sub-agent (inline, blocking) ──────────
				const subAgent = new Agent({
					id: subAgentId,
					name: 'Workflow Planner Agent',
					instructions: {
						role: 'system' as const,
						content: PLANNER_AGENT_PROMPT,
						providerOptions: {
							anthropic: { cacheControl: { type: 'ephemeral' } },
						},
					},
					model: context.modelId,
					tools: tracedPlannerTools,
				});

				registerWithMastra(subAgentId, subAgent, context.storage);

				const resultText = await withTraceRun(context, traceRun, async () => {
					const traceParent = getTraceParentRun();
					return await withTraceParentContext(traceParent, async () => {
						const llmStepTraceHooks = createLlmStepTraceHooks(traceParent);
						const stream = await subAgent.stream(briefing, {
							maxSteps: MAX_STEPS.PLANNER,
							abortSignal: context.abortSignal,
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
							abortSignal: context.abortSignal,
							waitForConfirmation: context.waitForConfirmation,
							llmStepTraceHooks,
							maxSteps: MAX_STEPS.PLANNER,
						});

						return await result.text;
					});
				});

				await finishTraceRun(context, traceRun, {
					outputs: {
						result: resultText,
						agentId: subAgentId,
						role: 'planner',
						hasItems: !accumulator.isEmpty(),
						itemCount: accumulator.getTaskItemsForEvent().length,
					},
				});

				// ── Publish agent-completed ───────────────────────────────
				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: 'planner',
						result: resultText,
					},
				});

				// ── Schedule tasks after planner-driven approval ──────────
				// Only dispatch if submit-plan was called AND the user approved.
				// createPlan persists the graph as `awaiting_approval`; flip it
				// to `active` before scheduling so tick() can dispatch.
				if (accumulator.isApproved()) {
					if (context.plannedTaskService) {
						await context.plannedTaskService.approvePlan(context.threadId);
					}
					if (context.schedulePlannedTasks) {
						await context.schedulePlannedTasks();
					}
					const taskCount = accumulator.getTaskList().length;
					return {
						result: `Plan approved and ${taskCount} task${taskCount === 1 ? '' : 's'} dispatched.`,
					};
				}

				// Planner finished without approval (no submit-plan or user didn't approve)
				publishClearingEvent(context);
				await clearDraftChecklist(context);
				// Clear the persisted planned-task graph too. submit-plan persists
				// it BEFORE user approval (so HITL can display the checklist), so
				// leaving it intact on planner give-up would let a later
				// schedulePlannedTasks() tick pick up and dispatch a rejected plan.
				await clearPlannedTaskGraph(context);
				if (!accumulator.isEmpty()) {
					return {
						result: `Planner added ${accumulator.getTaskList().length} items but did not submit the plan for approval. The plan was not executed.`,
					};
				}
				return {
					result: `Planner finished without producing a plan. Agent output: ${resultText}`,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				await failTraceRun(context, traceRun, error, {
					agent_id: subAgentId,
					agent_role: 'planner',
				});

				context.eventBus.publish(context.threadId, {
					type: 'agent-completed',
					runId: context.runId,
					agentId: subAgentId,
					payload: {
						role: 'planner',
						result: '',
						error: errorMessage,
					},
				});

				// Clear draft checklist and persisted graph on error — same reason
				// as the non-approval path: an error-aborted plan must not later be
				// auto-dispatched by the post-run reschedule. Skip both when the user
				// already approved this plan: the failure is downstream of approval
				// (e.g. approvePlan/schedulePlannedTasks threw), and clearing would
				// drop a plan the user explicitly accepted.
				if (!accumulator.isApproved()) {
					publishClearingEvent(context);
					await clearDraftChecklist(context);
					await clearPlannedTaskGraph(context);
				}

				return { result: `Planner error: ${errorMessage}` };
			}
		},
	});
}
