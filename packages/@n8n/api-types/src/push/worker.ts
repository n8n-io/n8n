import type { WorkerStatus } from '../scaling';

export interface WorkerStatusMessage {
	type: 'sendWorkerStatusMessage';
	data: {
		workerId: string;
		status: WorkerStatus;
	};
}

export type WorkerPushMessage = WorkerStatusMessage;
