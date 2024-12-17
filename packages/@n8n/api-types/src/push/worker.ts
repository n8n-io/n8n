import type { WorkerStatus } from '../scaling';

export type SendWorkerStatusMessage = {
	type: 'sendWorkerStatusMessage';
	data: {
		workerId: string;
		status: WorkerStatus;
	};
};

export type WorkerPushMessage = SendWorkerStatusMessage;
