import type { IPushData } from '@/Interface';

export type PushMessageQueueItem = {
	message: IPushData;
	retriesLeft: number;
};
