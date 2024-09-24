import type { WorkerStatus } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';

import { Logger } from '@/logger';
import { WORKER_RESPONSE_PUBSUB_CHANNEL } from '@/scaling/constants';

import type { MainResponseReceivedHandlerOptions } from './types';
import { Push } from '../../../push';
import type { RedisServiceWorkerResponseObject } from '../../../scaling/redis/redis-service-commands';

export async function handleWorkerResponseMessageMain(
	messageString: string,
	options: MainResponseReceivedHandlerOptions,
) {
	const workerResponse = jsonParse<RedisServiceWorkerResponseObject | null>(messageString, {
		fallbackValue: null,
	});

	if (!workerResponse) {
		Container.get(Logger).debug(
			`Received invalid message via channel ${WORKER_RESPONSE_PUBSUB_CHANNEL}: "${messageString}"`,
		);
		return;
	}

	if (workerResponse.targets && !workerResponse.targets.includes(options.queueModeId)) return;

	switch (workerResponse.command) {
		case 'getStatus':
			Container.get(Push).broadcast('sendWorkerStatusMessage', {
				workerId: workerResponse.workerId,
				status: workerResponse.payload as WorkerStatus,
			});
			break;
		case 'getId':
			break;
		default:
			Container.get(Logger).debug(
				`Received worker response ${workerResponse.command} from ${workerResponse.workerId}`,
			);
	}

	return workerResponse;
}
