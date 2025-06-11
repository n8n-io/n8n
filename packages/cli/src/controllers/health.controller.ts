import { Logger } from '@n8n/backend-common';
import { Get, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';

import config from '@/config';
import { DbConnection } from '@/databases/db-connection';
import { RedisClientService } from '@/services/redis-client.service';

@RestController('/healthz', { skipPrefix: true })
export class HealthController {
	constructor(
		private readonly logger: Logger,
		private readonly dbConnection: DbConnection,
		private readonly redisClientService: RedisClientService,
	) {}

	@Get('/', { skipAuth: true })
	healthz(_: Request, res: Response) {
		res.send({ status: 'ok' });
	}

	@Get('/readiness', { skipAuth: true })
	readiness(_: Request, res: Response) {
		const { connected, migrated } = this.dbConnection.connectionState;

		let ready = true;

		if (!connected) {
			ready = false;
			this.logger.warn('Not connected to the database');
		}

		if (!migrated) {
			ready = false;
			this.logger.warn('Database not migrated yet');
		}

		if (config.getEnv('executions.mode') === 'queue' && !this.redisClientService.isConnected()) {
			ready = false;
			this.logger.warn('Not connected to redis');
		}

		if (!ready) {
			res.status(503).send({ status: 'error' });
		} else {
			res.status(200).send({ status: 'ok' });
		}
	}
}
