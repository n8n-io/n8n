/**
 * Run One-Off Task Tool
 *
 * Spawns a background sub-agent that executes run-once work (create a resource,
 * transfer data, run a report) by writing and running code in the thread's
 * sandbox workspace, inside a per-task directory. The executor LLM loop runs
 * host-side; the sandbox only executes commands. Credentials are injected as
 * env vars into the task's command wrapper by the host — the sub-agent sees
 * env var names, never values.
 */

import { Tool } from '@n8n/agents';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { createSubAgentPersistence } from './agent-persistence';
import { truncateLabel } from './display-utils';
import {
	buildCredentialContext,
	ONE_OFF_TASK_AGENT_INSTRUCTIONS,
} from './one-off-task-agent.prompt';
import {
	createDetachedSubAgentTraceFactory,
	traceSubAgentTools,
	withTraceContextActor,
} from './tracing-utils';
import { buildSubAgentBriefing } from '../../agent/sub-agent-briefing';
import { createSubAgent } from '../../agent/sub-agent-factory';
import { MAX_STEPS } from '../../constants/max-steps';
import { consumeStreamWithHitl, requireCompletedHitlText } from '../../stream/consume-with-hitl';
import { createToolRegistry } from '../../tool-registry';
import type { OneOffTaskWorkspace, OrchestrationContext } from '../../types';
import { createLazyRuntimeWorkspace } from '../../workspace/lazy-runtime-workspace';
import { DOMAIN_TOOL_IDS } from '../tool-ids';

const REPORT_RESULT_TOOL_NAME = 'report-result';

export const oneOffTaskReportSchema = z.object({
	status: z
		.enum(['completed', 'partial', 'failed'])
		.describe('"completed" only when the verification confirmed the goal'),
	summary: z.string().min(1).describe('One-paragraph user-facing outcome'),
	actionsTaken: z
		.array(z.string())
		.describe('External calls made and against what (e.g. "created spreadsheet via Sheets API")'),
	verification: z
		.string()
		.min(1)
		.describe(
			'What was read back after writing and how it matched the goal — a successful status code alone is not verification',
		),
	artifacts: z
		.array(z.object({ label: z.string(), url: z.string() }))
		.default([])
		.describe('Links to created or modified resources'),
});

export type OneOffTaskReport = z.infer<typeof oneOffTaskReportSchema>;

/** Report tool with a closed-over result the task body reads after the stream settles. */
export function createReportResultTool() {
	let report: OneOffTaskReport | undefined;
	const tool = new Tool(REPORT_RESULT_TOOL_NAME)
		.description(
			'Report the final result of the one-off task. Call this exactly once, as your last action — on success, partial success, and failure alike.',
		)
		.input(oneOffTaskReportSchema)
		.output(z.object({ guidance: z.string() }))
		.handler(async (input: OneOffTaskReport) => {
			report = input;
			return await Promise.resolve({
				guidance: 'Report recorded. Stop now — reply with one short sentence.',
			});
		})
		.build();

	return { tool, getReport: () => report };
}

export function formatOneOffTaskReport(report: OneOffTaskReport): string {
	const parts = [
		`Status: ${report.status}`,
		report.summary,
		`Verification: ${report.verification}`,
	];
	if (report.actionsTaken.length > 0) parts.push(`Actions: ${report.actionsTaken.join('; ')}`);
	if (report.artifacts.length > 0) {
		parts.push(
			`Artifacts: ${report.artifacts.map((artifact) => `${artifact.label}: ${artifact.url}`).join(', ')}`,
		);
	}
	return parts.join('\n');
}

export const runOneOffTaskInputSchema = z.object({
	task: z
		.string()
		.min(1)
		.describe(
			'Full task contract: the goal, explicit constraints, and what "verified" means concretely for this task (read-back criteria)',
		),
	credentialIds: z
		.array(z.string())
		.default([])
		.describe(
			'IDs of existing credentials the task needs. Only pass credentials whose use for this task the user has agreed to in this conversation.',
		),
	conversationContext: z
		.string()
		.optional()
		.describe("Summary of the thread so far, especially the user's original request"),
});

export type RunOneOffTaskInput = z.infer<typeof runOneOffTaskInputSchema>;

export interface StartedOneOffTask {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startOneOffTaskAgent(
	context: OrchestrationContext,
	input: RunOneOffTaskInput,
): Promise<StartedOneOffTask> {
	if (!context.oneOffTaskWorkspace || !context.spawnBackgroundTask) {
		return {
			result: 'Error: one-off tasks are not available on this instance.',
			taskId: '',
			agentId: '',
		};
	}

	const taskId = `oneoff-${nanoid(8)}`;
	const subAgentId = `agent-oneoff-${nanoid(6)}`;

	// Resolve eagerly so access/decrypt failures surface here and the OAuth
	// token is fresh at spawn. No refresh happens inside the task.
	let taskWorkspace: OneOffTaskWorkspace | undefined;
	try {
		taskWorkspace = await context.oneOffTaskWorkspace(taskId, input.credentialIds);
	} catch (error) {
		return {
			result: `Error: could not prepare the task workspace: ${error instanceof Error ? error.message : String(error)}`,
			taskId: '',
			agentId: '',
		};
	}
	if (!taskWorkspace) {
		return { result: 'Error: the sandbox workspace is not available.', taskId: '', agentId: '' };
	}
	const { workspace: scopedWorkspace, credentials } = taskWorkspace;

	const subAgentToolNames = [
		REPORT_RESULT_TOOL_NAME,
		...(context.domainTools.has(DOMAIN_TOOL_IDS.RESEARCH) ? [DOMAIN_TOOL_IDS.RESEARCH] : []),
	];

	const createTraceContext = createDetachedSubAgentTraceFactory(context, {
		agentId: subAgentId,
		role: 'one-off-task',
		kind: 'one-off-task',
		taskId,
		inputs: {
			task: input.task,
			credentialIds: input.credentialIds,
			conversationContext: input.conversationContext,
		},
	});

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'one-off-task',
		createTraceContext,
		run: async (signal, drainCorrections, waitForCorrection, { traceContext }) => {
			return await withTraceContextActor(traceContext, async () => {
				const { tool: reportTool, getReport } = createReportResultTool();
				const tools = createToolRegistry([[REPORT_RESULT_TOOL_NAME, reportTool]]);
				const researchTool = context.domainTools.get(DOMAIN_TOOL_IDS.RESEARCH);
				if (researchTool) tools.set(DOMAIN_TOOL_IDS.RESEARCH, researchTool);
				const tracedTools = traceSubAgentTools(context, tools, 'one-off-task');

				// Reuse the lazy wrapper for its workspace-tool allowlist
				// (read/write/str-replace/execute only).
				const workspace = createLazyRuntimeWorkspace({
					id: `one-off-task-workspace-${taskId}`,
					name: 'One-off task workspace',
					sandboxInstructions:
						'Commands run inside your task directory. Do not cd elsewhere; absolute paths outside it are rejected.',
					filesystemInstructions:
						'All paths are relative to your task directory. Never use absolute paths (/tmp, /home, ...) — they are outside your workspace and are rejected.',
					ensureWorkspace: async () => await Promise.resolve(scopedWorkspace),
				});

				const subAgent = createSubAgent({
					agentId: subAgentId,
					role: 'one-off-task',
					instructions: ONE_OFF_TASK_AGENT_INSTRUCTIONS,
					tools: tracedTools,
					modelId: context.modelId,
					checkpointStore: context.checkpointStore,
					tracing: traceContext,
					workspace,
					timeZone: context.timeZone,
				});

				const briefing = await buildSubAgentBriefing({
					task: input.task,
					conversationContext: input.conversationContext,
					additionalContext: buildCredentialContext(credentials),
				});

				const persistence = await createSubAgentPersistence(context, {
					agentKind: 'one-off-task',
				});
				const stream = await subAgent.stream(briefing, {
					maxIterations: MAX_STEPS.ONE_OFF_TASK,
					abortSignal: signal,
					persistence,
					providerOptions: {
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
				});

				const hitlResult = await consumeStreamWithHitl({
					agent: subAgent,
					stream,
					runId: context.runId,
					agentId: subAgentId,
					eventBus: context.eventBus,
					logger: context.logger,
					threadId: context.threadId,
					outputRedaction: context.outputRedaction,
					abortSignal: signal,
					waitForConfirmation: context.waitForConfirmation,
					drainCorrections,
					waitForCorrection,
					maxIterations: MAX_STEPS.ONE_OFF_TASK,
					persistence,
				});

				const text = await requireCompletedHitlText(hitlResult, 'One-off task sub-agent');
				const report = getReport();
				if (!report) {
					return {
						text: `Task ended without a structured report — external state unknown. Last output: ${text}`,
					};
				}
				return { text: formatOneOffTaskReport(report), outcome: report };
			});
		},
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `A one-off task is already in progress (task: ${spawnOutcome.existing.taskId}). Wait for it to finish — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start the one-off task: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
			taskId: '',
			agentId: '',
		};
	}

	context.eventBus.publish(context.threadId, {
		type: 'agent-spawned',
		runId: context.runId,
		agentId: subAgentId,
		payload: {
			parentId: context.orchestratorAgentId,
			role: 'one-off-task',
			tools: subAgentToolNames,
			taskId,
			title: 'Running one-off task',
			subtitle: truncateLabel(input.task),
			goal: input.task,
		},
	});

	return {
		result:
			`One-off task started (task: ${taskId}) and is running in the background — there are NO results yet. ` +
			'Do not state, estimate, or invent any outcome, URL, number, or artifact. ' +
			'Tell the user the task is running and end your turn. The structured report arrives in a <background-task-completed> follow-up; report results only from it.',
		taskId,
		agentId: subAgentId,
	};
}

export function createOneOffTaskAgentTool(context: OrchestrationContext) {
	return new Tool('run-one-off-task')
		.description(
			'Delegate a run-once task (create an external resource, one-time data transfer, report, audit) to a sandboxed coding sub-agent. ' +
				'Not for recurring or triggered work — build a workflow for that. ' +
				'Pass a complete task contract and the IDs of credentials the user agreed to use.',
		)
		.input(runOneOffTaskInputSchema)
		.output(
			z.object({
				result: z.string(),
				taskId: z.string(),
			}),
		)
		.handler(async (input: RunOneOffTaskInput) => {
			const started = await startOneOffTaskAgent(context, input);
			return { result: started.result, taskId: started.taskId };
		})
		.build();
}
