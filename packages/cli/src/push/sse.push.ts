import SSEChannel from 'sse-channel';
import { Service } from 'typedi';
import { Logger } from '@/Logger';
import { AbstractPush } from './abstract.push';
import type { PushRequest, PushResponse } from './types';
import type { User } from '@db/entities/User';
import { OrchestrationService } from '@/services/orchestration.service';

type Connection = { req: PushRequest; res: PushResponse };

@Service()
export class SSEPush extends AbstractPush<Connection> {
	readonly channel = new SSEChannel();

	readonly connections: Record<string, Connection> = {};

	constructor(logger: Logger, orchestrationService: OrchestrationService) {
		super(logger, orchestrationService);

		this.channel.on('disconnect', (_, { req }) => {
			this.remove(req?.query?.pushRef);
		});
	}

	add(pushRef: string, userId: User['id'], connection: Connection) {
		super.add(pushRef, userId, connection);
		this.channel.addClient(connection.req, connection.res);
	}

	protected close({ res }: Connection) {
		res.end();
		this.channel.removeClient(res);
	}

	protected sendToOneConnection(connection: Connection, data: string) {
		this.channel.send(data, [connection.res]);
	}
}
