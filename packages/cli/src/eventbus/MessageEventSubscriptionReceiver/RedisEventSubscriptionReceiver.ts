import { parse } from 'node:path';
import { MessageEventSubscriptionReceiver } from './MessageEventSubscriptionReceiver';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RedisOptions } from 'ioredis';

// ---------------------------------------
// * This part runs in the Main Thread ! *
// ---------------------------------------

interface RedisEventSubscriptionReceiverOptions {
	name?: string;
	channelName: string;
	redisOptions?: RedisOptions;
}

export class RedisEventSubscriptionReceiver extends MessageEventSubscriptionReceiver {
	constructor(options?: RedisEventSubscriptionReceiverOptions) {
		super({
			name: options?.name ?? 'RedisEventSubscriptionReceiver',
			workerFile: `../MessageEventSubscriptionReceiver/${parse(__filename).name}Worker`,
		});
	}
}
