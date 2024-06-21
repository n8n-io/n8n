import type { ExecutionError, IExecuteResponsePromiseData } from 'n8n-workflow';
import type { Job as BullJob, Queue as BullQueue } from 'bullmq';

export type n8nJobData = {
	executionId: string;
	loadStaticData: boolean;
};

export type n8nJobName = 'execution';

export type n8nJobResult = {
	success: boolean;
	error?: ExecutionError;
};

export type n8nJob = BullJob<n8nJobData, n8nJobResult, 'execution'> & {
	id: string /* @TODO: Is this safe? Why did they make it `undefined`? */;
};

export type n8nQueue = BullQueue<n8nJobData, n8nJobResult, n8nJobName>;

// @TODO: What is this
export type WebhookResponse = {
	executionId: string;
	response: IExecuteResponsePromiseData;
};
