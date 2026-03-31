/**
 * Plan-with-Agent Orchestration Tool
 *
 * Spawns an **inline** planner sub-agent that analyses the user's request,
 * discovers available nodes/credentials/tables, and produces a typed
 * solution blueprint. The blueprint is returned directly to the orchestrator
 * as the tool result — the orchestrator then translates it into a `plan()`
 * call.
 *
 * Runs synchronously (like the inline `delegate` tool) — the orchestrator
 * waits while the planner streams its reasoning. The user sees real-time
 * progress via SSE events from `consumeStreamWithHitl`.
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

const PLANNER_MAX_STEPS = 10;

/** Read-only discovery tools the planner gets from domainTools. */
const PLANNER_DOMAIN_TOOL_NAMES = [
	'search-nodes',
	'get-suggested-nodes',
	'get-best-practices',
	'list-credentials',
	'list-data-tables',
	'get-data-table-schema',
	'list-workflows',
];

/** Research tools added when available. */
const PLANNER_RESEARCH_TOOL_NAMES = ['web-search', 'fetch-url'];

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

	// Index tables by ID for dependency lookup
	const tablesById = new Map(bp.dataTables.map((dt) => [dt.id, dt]));

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

		// Append schemas of data tables this workflow depends on
		const depTables = wf.dependsOn
			.map((depId) => tablesById.get(depId))
			.filter((dt): dt is BlueprintDataTableItem => dt !== undefined);
		if (depTables.length > 0) {
			specParts.push('\nData table schemas:');
			for (const dt of depTables) {
				specParts.push(`- ${formatTableSchema(dt)}`);
			}
		}

		tasks.push({
			id: wf.id,
			title: `Build '${wf.name}' workflow`,
			kind: 'build-workflow',
			spec: specParts.join('\n'),
			deps: wf.dependsOn,
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
			'for a multi-step request. The planner discovers available nodes, credentials, ' +
			'and data tables, then returns a pre-translated tasks array. ' +
			'Use when the request requires 2 or more tasks with dependencies (e.g. data ' +
			'table setup + multiple workflows, parallel builds). The planner streams its ' +
			'reasoning visibly while you wait. After receiving the result, pass the tasks ' +
			'array directly to plan() without modification.',
		inputSchema: z.object({
			goal: z
				.string()
				.describe(
					'What the user wants to achieve, e.g. "Build a Shopify order sync ' +
						'that writes orders to a data table and sends a daily Slack summary"',
				),
			conversationContext: z
				.string()
				.optional()
				.describe(
					'Brief summary of the conversation so far — what was discussed, decisions made, ' +
						'and information gathered (credentials found, user preferences, etc.).',
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

			// ── IDs & events ──────────────────────────────────────────────
			const subAgentId = `agent-planner-${nanoid(6)}`;

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
					subtitle: truncateLabel(input.goal),
					goal: input.goal,
				},
			});

			// ── Briefing ──────────────────────────────────────────────────
			const conversationCtx = input.conversationContext
				? `\n\n[CONVERSATION CONTEXT: ${input.conversationContext}]`
				: '';
			const briefing = `${input.goal}${conversationCtx}`;

			// ── Tracing ───────────────────────────────────────────────────
			const traceRun = await startSubAgentTrace(context, {
				agentId: subAgentId,
				role: 'planner',
				kind: 'planner',
				inputs: {
					goal: input.goal,
					conversationContext: input.conversationContext,
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
