import type { IRunData } from 'n8n-workflow';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

export const liteTargetSchema = z.enum(['linux-arm64', 'linux-x64', 'darwin-arm64']);

export type LiteTarget = z.infer<typeof liteTargetSchema>;

function isTaskData(value: unknown) {
	return (
		isRecord(value) &&
		typeof value.startTime === 'number' &&
		typeof value.executionTime === 'number' &&
		typeof value.executionIndex === 'number' &&
		Array.isArray(value.source) &&
		(value.data === undefined || isRecord(value.data))
	);
}

function isRunData(value: unknown): value is IRunData {
	return (
		isRecord(value) &&
		Object.values(value).every((runs) => Array.isArray(runs) && runs.every(isTaskData))
	);
}

export const liteRunReportSchema = z.object({
	workflowId: z.string().min(1),
	status: z.enum(['success', 'error']),
	startedAt: z.string().datetime(),
	stoppedAt: z.string().datetime(),
	lastNodeExecuted: z.string().optional(),
	runData: z.custom<IRunData>(isRunData, { message: 'runData is not in the IRunData shape' }),
	error: z.object({ message: z.string() }).optional(),
});

export type LiteRunReport = z.infer<typeof liteRunReportSchema>;
