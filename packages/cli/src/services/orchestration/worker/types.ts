import type { RunningJobSummary } from '@n8n/api-types';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

export interface WorkerCommandReceivedHandlerOptions {
	hostId: string;
	publisher: Publisher;
	getRunningJobIds: () => Array<string | number>;
	getRunningJobsSummary: () => RunningJobSummary[];
}
