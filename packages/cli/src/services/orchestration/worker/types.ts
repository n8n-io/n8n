import type { RunningJobSummary } from '@n8n/api-types';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

export interface WorkerCommandReceivedHandlerOptions {
	queueModeId: string;
	publisher: Publisher;
	getRunningJobIds: () => Array<string | number>;
	getRunningJobsSummary: () => RunningJobSummary[];
}
