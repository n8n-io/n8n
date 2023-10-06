import { jsonParse, LoggerProxy } from 'n8n-workflow';
import type { RedisServiceWorkerResponseObject } from '../../redis/RedisServiceCommands';

export async function handleWorkerResponseMessageMain(messageString: string) {
	const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(messageString);
	if (workerResponse) {
		// TODO: Handle worker response
		LoggerProxy.debug('Received worker response', workerResponse);
	}
	return workerResponse;
}
