import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { RedisServiceWorkerResponseObject } from '../../redis/RedisServiceCommands';
import { Push } from '../../../push';
import Container from 'typedi';

export async function handleWorkerResponseMessageMain(messageString: string) {
	const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(messageString);
	if (workerResponse) {
		// TODO: Handle worker response

		switch (workerResponse.command) {
			case 'getStatus':
				const push = Container.get(Push);
				push.send('sendWorkerStatusMessage', {
					workerId: workerResponse.workerId,
					status: workerResponse.payload,
				});
				break;
			case 'getId':
				break;
			default:
				LoggerProxy.debug(
					`Received worker response ${workerResponse.command} from ${workerResponse.workerId}`,
				);
		}
	}
	return workerResponse;
}
