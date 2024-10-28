import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';
import { Logger } from '@/Logger';
import { Push } from '../../../push';
import type { RedisServiceWorkerResponseObject } from '../../redis/RedisServiceCommands';

export async function handleWorkerResponseMessageMain(messageString: string) {
	const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(messageString);
	if (workerResponse) {
		switch (workerResponse.command) {
			case 'getStatus':
				const push = Container.get(Push);
				push.broadcast('sendWorkerStatusMessage', {
					workerId: workerResponse.workerId,
					status: workerResponse.payload,
				});
				break;
			case 'getId':
				break;
			default:
				Container.get(Logger).debug(
					`Received worker response ${workerResponse.command} from ${workerResponse.workerId}`,
				);
		}
	}
	return workerResponse;
}
