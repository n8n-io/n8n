import { jsonParse } from 'n8n-workflow';
import Container from 'typedi';
import { Logger } from '@/Logger';
import type { RedisServiceWorkerResponseObject } from '../../redis/RedisServiceCommands';

export async function handleWorkerResponseMessageMain(messageString: string) {
	const workerResponse = jsonParse<RedisServiceWorkerResponseObject>(messageString);
	if (workerResponse) {
		// TODO: Handle worker response
		Container.get(Logger).debug(
			`Received worker response ${workerResponse.command} from ${workerResponse.workerId}`,
		);
	}
	return workerResponse;
}
