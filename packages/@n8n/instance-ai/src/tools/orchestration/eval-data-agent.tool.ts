import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { truncateLabel } from './display-utils';
import { createDetachedSubAgentTracing, withTraceContextActor } from './tracing-utils';
import type { BackgroundTaskResult, DataTableColumnInfo, OrchestrationContext } from '../../types';
import {
	analyzeEvalDataRequirements,
	type EvalDataTarget,
} from '../evals/eval-data-requirements.service';
import { generateSampleRows } from '../evals/generate-sample-rows.service';

const DEFAULT_ROW_COUNT = 25;

const evalDataInputSchema = z.object({
	workflowId: z.string().describe('ID of the workflow whose eval DataTable should be populated'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID used to disambiguate the DataTable when available'),
	rowCount: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe('Number of synthetic rows to generate (default 25)'),
	targetAgentNodeName: z
		.string()
		.optional()
		.describe('Optional AI agent node name when the workflow has multiple eval targets'),
});

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	workflowId: z.string(),
	dataTableId: z.string(),
	rowCount: z.number(),
	columns: z.array(z.string()),
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

type EvalDataInput = z.infer<typeof evalDataInputSchema>;
type ResumeData = z.infer<typeof confirmationResumeSchema>;

interface EvalDataRunInput extends EvalDataInput {
	dataTableId: string;
	columns: string[];
	targetAgentNodeName?: string;
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.length > 0))];
}

function selectTarget(targets: EvalDataTarget[], targetAgentNodeName?: string): EvalDataTarget {
	if (!targetAgentNodeName) return targets[0];
	return targets.find((target) => target.targetAgentNodeName === targetAgentNodeName) ?? targets[0];
}

function isGeneratedColumn(target: EvalDataTarget, columnName: string): boolean {
	return !target.actualOutputColumns.includes(columnName) && !columnName.startsWith('actual_');
}

function resolveGenerationColumns(target: EvalDataTarget, schema: DataTableColumnInfo[]): string[] {
	const schemaColumnNames = schema.map((column) => column.name);
	const inferredColumns = unique([...target.inputColumns, ...target.expectedOutputColumns]).filter(
		(column) => schemaColumnNames.includes(column),
	);
	const sourceColumns = inferredColumns.length > 0 ? inferredColumns : schemaColumnNames;
	return unique(sourceColumns.filter((column) => isGeneratedColumn(target, column)));
}

async function getEvalDataRunInput(
	context: OrchestrationContext,
	input: EvalDataInput,
): Promise<EvalDataRunInput | { skipped: true; reason: string }> {
	const domainContext = context.domainContext;
	if (!domainContext) {
		return { skipped: true, reason: 'Domain context is not available.' };
	}

	const workflow = await domainContext.workflowService.getAsWorkflowJSON(input.workflowId);
	const requirements = analyzeEvalDataRequirements(workflow);
	if (requirements.targets.length === 0) {
		return { skipped: true, reason: requirements.reason ?? 'No eval DataTable found.' };
	}

	const target = selectTarget(requirements.targets, input.targetAgentNodeName);
	const schema = await domainContext.dataTableService.getSchema(target.dataTableId, {
		projectId: input.projectId,
	});
	const columns = resolveGenerationColumns(target, schema);
	if (columns.length === 0) {
		return {
			skipped: true,
			reason: `DataTable ${target.dataTableId} has no columns suitable for synthetic eval data.`,
		};
	}

	return {
		...input,
		dataTableId: target.dataTableId,
		columns,
		targetAgentNodeName: input.targetAgentNodeName ?? target.targetAgentNodeName,
	};
}

export async function runEvalDataGeneration(
	context: OrchestrationContext,
	input: EvalDataRunInput,
): Promise<BackgroundTaskResult> {
	const domainContext = context.domainContext;
	if (!domainContext) {
		throw new Error('Domain context is not available.');
	}
	const workflow = await domainContext.workflowService.getAsWorkflowJSON(input.workflowId);
	const rows = await generateSampleRows({
		workflow,
		columns: input.columns,
		rowCount: input.rowCount,
		targetAgentNodeName: input.targetAgentNodeName,
	});
	const result = await domainContext.dataTableService.insertRows(input.dataTableId, rows, {
		projectId: input.projectId,
	});
	return {
		text: `Eval data generated: ${result.insertedCount} rows inserted into DataTable ${input.dataTableId}.`,
		outcome: {
			workflowId: input.workflowId,
			dataTableId: input.dataTableId,
			insertedCount: result.insertedCount,
			columns: input.columns,
		},
	};
}

export interface StartedEvalDataAgentTask {
	result: string;
	taskId: string;
	agentId: string;
}

export async function startEvalDataAgentTask(
	context: OrchestrationContext,
	input: EvalDataRunInput,
): Promise<StartedEvalDataAgentTask> {
	if (!context.spawnBackgroundTask) {
		return { result: 'Error: background task support not available.', taskId: '', agentId: '' };
	}

	const subAgentId = `agent-evaldata-${nanoid(6)}`;
	const taskId = `evaldata-${nanoid(8)}`;
	const rowCount = input.rowCount ?? DEFAULT_ROW_COUNT;
	const goal = `Generate ${rowCount} synthetic eval rows for workflow ${input.workflowId} and insert them into DataTable ${input.dataTableId}.`;

	const traceContext = await createDetachedSubAgentTracing(context, {
		agentId: subAgentId,
		role: 'eval-data',
		kind: 'eval-data',
		taskId,
		inputs: input,
	});

	const spawnOutcome = context.spawnBackgroundTask({
		taskId,
		threadId: context.threadId,
		agentId: subAgentId,
		role: 'eval-data',
		traceContext,
		dedupeKey: { role: 'eval-data', workflowId: input.workflowId },
		parentCheckpointId:
			context.isCheckpointFollowUp === true ? context.checkpointTaskId : undefined,
		run: async () =>
			await withTraceContextActor(
				traceContext,
				async () => await runEvalDataGeneration(context, input),
			),
	});

	if (spawnOutcome.status === 'duplicate') {
		return {
			result: `Eval data generation already in progress (task: ${spawnOutcome.existing.taskId}). Wait for the background-task follow-up — do not dispatch again.`,
			taskId: spawnOutcome.existing.taskId,
			agentId: spawnOutcome.existing.agentId,
		};
	}
	if (spawnOutcome.status === 'limit-reached') {
		return {
			result:
				'Could not start eval data generation: concurrent background-task limit reached. Wait for an existing task to finish and try again.',
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
			role: 'eval-data',
			tools: [],
			taskId,
			kind: 'data-table',
			title: 'Generating eval data',
			subtitle: truncateLabel(goal),
			goal,
			targetResource: { type: 'data-table' as const, id: input.dataTableId },
		},
	});

	return {
		result: `Eval data generation started (task: ${taskId}). Do NOT summarize the plan or list details.`,
		taskId,
		agentId: subAgentId,
	};
}

export function createEvalDataAgentTool(context: OrchestrationContext) {
	return createTool({
		id: 'eval-data',
		description:
			'Ask whether to generate synthetic rows for an existing eval DataTable, then start the dedicated eval-data sub-agent. Use after eval nodes exist, including workflows where eval nodes were configured manually.',
		inputSchema: evalDataInputSchema,
		suspendSchema: confirmationSuspendSchema,
		resumeSchema: confirmationResumeSchema,
		outputSchema: z.object({
			success: z.boolean(),
			deferred: z.boolean().optional(),
			skipped: z.boolean().optional(),
			reason: z.string().optional(),
			shouldWaitForEvalDataAgent: z.boolean().optional(),
			result: z.string().optional(),
			taskId: z.string().optional(),
			agentId: z.string().optional(),
			dataTableId: z.string().optional(),
		}),
		execute: async (input: EvalDataInput, ctx) => {
			const resumeData = ctx?.agent?.resumeData as ResumeData | undefined;
			const suspend = ctx?.agent?.suspend as
				| ((payload: z.infer<typeof confirmationSuspendSchema>) => Promise<void>)
				| undefined;

			const runInput = await getEvalDataRunInput(context, input);
			if ('skipped' in runInput) {
				return { success: true, skipped: true, reason: runInput.reason };
			}

			if (resumeData === undefined || resumeData === null) {
				await suspend?.({
					requestId: nanoid(),
					message: `Generate synthetic eval data for this workflow? This will insert ${runInput.rowCount ?? DEFAULT_ROW_COUNT} rows into DataTable ${runInput.dataTableId}.`,
					severity: 'info' as const,
					workflowId: input.workflowId,
					dataTableId: runInput.dataTableId,
					rowCount: runInput.rowCount ?? DEFAULT_ROW_COUNT,
					columns: runInput.columns,
				});
				return { success: false };
			}

			if (!resumeData.approved) {
				return {
					success: true,
					deferred: true,
					reason: 'User skipped synthetic eval data generation.',
				};
			}

			const started = await startEvalDataAgentTask(context, runInput);
			return {
				success: true,
				shouldWaitForEvalDataAgent: Boolean(started.taskId),
				result: started.result,
				taskId: started.taskId,
				agentId: started.agentId,
				dataTableId: runInput.dataTableId,
			};
		},
	});
}
