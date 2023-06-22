import Container from 'typedi';
import { Authorized, Post, RestController } from '../decorators';
import { WorkersRequest } from '../requests';
import { RedisServicePublisher } from '../services/RedisServicePublisher';

@Authorized(['global', 'owner'])
@RestController('/orchestrator')
export class OrchestratorController {
	@Post('/command')
	async restartEventBus(req: WorkersRequest.Command) {
		if (!req.body?.command) {
			throw new Error('Invalid request body');
		}
		await Container.get(RedisServicePublisher).publishToCommandChannel(req.body);
	}
}
