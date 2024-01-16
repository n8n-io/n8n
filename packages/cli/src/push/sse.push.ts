import SSEChannel from 'sse-channel';
import { Service } from 'typedi';
import { Logger } from '@/Logger';
import { AbstractPush } from './abstract.push';
import type { PushRequest, PushResponse } from './types';
import type { User } from '@db/entities/User';
import { MultiMainSetup } from '@/services/orchestration/main/MultiMainSetup.ee';

type Connection = { req: PushRequest; res: PushResponse };

@Service()
export class SSEPush extends AbstractPush<Connection> {
	readonly channel = new SSEChannel();

	readonly connections: Record<string, Connection> = {};

	constructor(logger: Logger, multiMainSetup: MultiMainSetup) {
		super(logger, multiMainSetup);

		this.channel.on('disconnect', (channel, { req }) => {
			this.remove(req?.query?.sessionId);
		});
	}

	add(sessionId: string, userId: User['id'], connection: Connection) {
		super.add(sessionId, userId, connection);
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
