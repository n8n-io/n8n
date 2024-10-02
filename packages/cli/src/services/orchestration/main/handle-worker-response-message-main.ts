import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';

import { Logger } from '@/logging/logger.service';
import { WORKER_RESPONSE_PUBSUB_CHANNEL } from '@/scaling/constants';
import type { PubSub } from '@/scaling/pubsub/pubsub.types';

import type { MainResponseReceivedHandlerOptions } from './types';
import { Push } from '../../../push';

export async function handleWorkerResponseMessageMain(
	messageString: string,
	options: MainResponseReceivedHandlerOptions,
) {
	const workerResponse = jsonParse<PubSub.WorkerResponse | null>(messageString, {
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
		case 'get-worker-status':
			Container.get(Push).broadcast('sendWorkerStatusMessage', {
				workerId: workerResponse.workerId,
				status: workerResponse.payload,
			});
			break;
		case 'get-worker-id':
			break;
		default:
			Container.get(Logger).debug(
				`Received worker response ${workerResponse.command} from ${workerResponse.workerId}`,
			);
	}

	return workerResponse;
}
