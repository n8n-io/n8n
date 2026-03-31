/**
 * Plan-with-Agent Orchestration Tool
 *
 * Spawns an **inline** planner sub-agent that reads the conversation history,
 * discovers available nodes/credentials/tables, and produces a typed
 * solution blueprint. The blueprint is deterministically translated to
 * plan() tasks with inferred dependencies.
 *
 * The planner receives the last 5 messages from the thread as primary context,
 * plus an optional guidance string from the orchestrator for ambiguous cases.
 * It can also ask the user questions directly via the ask-user tool.
 */

import { Agent } from '@mastra/core/agent';
import type { ToolsInput } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { PlanningBlueprint, BlueprintDataTableItem } from './blueprint.schema';
import { truncateLabel } from './display-utils';
import { PLANNER_AGENT_PROMPT } from './plan-agent-prompt';
import { createSubmitBlueprintTool } from './submit-blueprint.tool';
import {
	failTraceRun,
	finishTraceRun,
	startSubAgentTrace,
	traceSubAgentTools,
	withTraceRun,
} from './tracing-utils';
import { registerWithMastra } from '../../agent/register-with-mastra';
import { createLlmStepTraceHooks } from '../../runtime/resumable-stream-executor';
import { traceWorkingMemoryContext } from '../../runtime/working-memory-tracing';
import { consumeStreamWithHitl } from '../../stream/consume-with-hitl';
import { getTraceParentRun, withTraceParentContext } from '../../tracing/langsmith-tracing';
import type { OrchestrationContext } from '../../types';

const PLANNER_MAX_STEPS = 15;

/** Number of recent thread messages to include as planner context. */
const MESSAGE_HISTORY_COUNT = 5;

/** Read-only discovery tools the planner gets from domainTools. */
const PLANNER_DOMAIN_TOOL_NAMES = [
	'search-nodes',
	'get-suggested-nodes',
	'get-best-practices',
	'list-credentials',
	'list-data-tables',
	'get-data-table-schema',
	'list-workflows',
	'ask-user',
];

/** Research tools added when available. */
const PLANNER_RESEARCH_TOOL_NAMES = ['web-search', 'fetch-url'];

// ---------------------------------------------------------------------------
// Message history retrieval
// ---------------------------------------------------------------------------

interface FormattedMessage {
	role: string;
	content: string;
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
				const content =
					typeof m.content === 'string'
						? m.content
						: Array.isArray(m.content)
							? m.content
									.filter(
										(c): c is { type: 'text'; text: string } =>
											typeof c === 'object' && c !== null && 'text' in c,
									)
									.map((c) => c.text)
									.join('\n')
							: JSON.stringify(m.content);
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

function formatMessagesForBriefing(messages: FormattedMessage[], guidance?: string): string {
	const parts: string[] = [];

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

// ---------------------------------------------------------------------------
// Blueprint → task array (deterministic, no LLM needed)
// ---------------------------------------------------------------------------

interface PlannedTaskInput {
	id: string;
	title: string;
	kind: string;
	spec: string;
	deps: string[];
	tools?: string[];
	workflowId?: string;
}

/** Format a data table schema as a compact string for builder context. */
function formatTableSchema(dt: BlueprintDataTableItem): string {
	const cols = dt.columns.map((c) => `${c.name} (${c.type})`).join(', ');
	return `Table '${dt.name}': ${cols}`;
}

function blueprintToTasks(bp: PlanningBlueprint): PlannedTaskInput[] {
	const tasks: PlannedTaskInput[] = [];

	// Index table IDs for dependency inference
	const tableIds = new Set(bp.dataTables.map((dt) => dt.id));

	for (const dt of bp.dataTables) {
		const columnList = dt.columns.map((c) => `${c.name} (${c.type})`).join(', ');
		tasks.push({
			id: dt.id,
			title: `Create '${dt.name}' data table`,
			kind: 'manage-data-tables',
			spec: `Create a data table named '${dt.name}'. Purpose: ${dt.purpose}\nColumns: ${columnList}`,
			deps: dt.dependsOn,
		});
	}

	for (const wf of bp.workflows) {
		const specParts = [wf.purpose];
		if (wf.triggerDescription) specParts.push(`Trigger: ${wf.triggerDescription}`);
		if (wf.integrations.length > 0) specParts.push(`Integrations: ${wf.integrations.join(', ')}`);

		// Infer missing table dependencies by checking if the workflow's
		// purpose or integrations mention any table name. The planner should
		// set these explicitly, but this catches omissions.
		const explicitDeps = new Set(wf.dependsOn);
		const inferredDeps = [...explicitDeps];
		const wfText = `${wf.purpose} ${wf.integrations.join(' ')}`.toLowerCase();
		for (const dt of bp.dataTables) {
			if (!explicitDeps.has(dt.id) && wfText.includes(dt.name.toLowerCase())) {
				inferredDeps.push(dt.id);
			}
		}

		// Append schemas of tables this workflow depends on (explicit + inferred)
		const depTableIds = new Set(inferredDeps.filter((id) => tableIds.has(id)));
		const depTables = bp.dataTables.filter((dt) => depTableIds.has(dt.id));
		if (depTables.length > 0) {
			specParts.push('\nData table schemas:');
			for (const dt of depTables) {
				specParts.push(`- ${formatTableSchema(dt)}`);
			}
		}

		// Append blueprint assumptions so the builder has design context
		if (bp.assumptions.length > 0) {
			specParts.push('\nAssumptions:');
			for (const a of bp.assumptions) {
				specParts.push(`- ${a}`);
			}
		}

		tasks.push({
			id: wf.id,
			title: `Build '${wf.name}' workflow`,
			kind: 'build-workflow',
			spec: specParts.join('\n'),
			deps: inferredDeps,
			workflowId: wf.existingWorkflowId,
		});
	}

	for (const ri of bp.researchItems) {
		tasks.push({
			id: ri.id,
			title: ri.question,
			kind: 'research',
			spec: ri.constraints ?? ri.question,
			deps: ri.dependsOn,
		});
	}

	for (const di of bp.delegateItems) {
		tasks.push({
			id: di.id,
			title: di.title,
			kind: 'delegate',
			spec: di.description,
			deps: di.dependsOn,
			tools: di.requiredTools,
		});
	}

	return tasks;
}

export function createPlanWithAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'plan-with-agent',
		description:
			'Spawn an inline planner agent to design the solution architecture ' +
			'for a multi-step request. The planner reads the recent conversation ' +
			'history directly and can ask the user questions. It discovers available ' +
			'nodes, credentials, and data tables, then returns a pre-translated tasks ' +
			'array. Use when the request requires 2 or more tasks with dependencies. ' +
			'After receiving the result, pass the tasks array directly to plan() ' +
			'without modification.',
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
			tasks: z.array(z.record(z.unknown())).optional(),
		}),
		execute: async (input) => {
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

			// Mutable ref — written by submit-blueprint, read after stream
			let submittedBlueprint: PlanningBlueprint | undefined;

			const submitTool = createSubmitBlueprintTool();
			const originalExecute = submitTool.execute! as (
				args: Record<string, unknown>,
				ctx: unknown,
			) => Promise<{ result: string }>;
			plannerTools['submit-blueprint'] = {
				...submitTool,
				execute: async (args: Record<string, unknown>, ctx: unknown) => {
					submittedBlueprint = args as unknown as PlanningBlueprint;
					return await originalExecute(args, ctx);
				},
			};

			// ── Retrieve conversation history ─────────────────────────────
			const messages = await getRecentMessages(context, MESSAGE_HISTORY_COUNT);
			const briefing = formatMessagesForBriefing(messages, input.guidance);

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
						const stream = await traceWorkingMemoryContext(
							{
								phase: 'initial',
								agentId: subAgentId,
								agentRole: 'planner',
								threadId: context.threadId,
								input: briefing,
							},
							async () =>
								await subAgent.stream(briefing, {
									maxSteps: PLANNER_MAX_STEPS,
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
						role: 'planner',
						hasBlueprint: !!submittedBlueprint,
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

				// ── Return pre-translated tasks to orchestrator ──────────
				if (submittedBlueprint) {
					const tasks = blueprintToTasks(submittedBlueprint);
					return {
						result: `Blueprint ready (${tasks.length} tasks). Call plan() with the tasks array from this result — do NOT modify or re-derive the tasks.`,
						tasks: tasks as unknown as Array<Record<string, unknown>>,
					};
				}

				return {
					result: `Planner finished without submitting a blueprint. Agent output: ${resultText}`,
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

				return { result: `Planner error: ${errorMessage}` };
			}
		},
	});
}
