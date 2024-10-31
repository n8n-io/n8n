import type { PushMessage } from '@n8n/api-types';

export type PushMessageQueueItem = {
	message: PushMessage;
	retriesLeft: number;
};
