import SSEChannel from 'sse-channel';
import { Service } from 'typedi';

import { Logger } from '@/logger';

import { AbstractPush } from './abstract.push';
import type { PushRequest, PushResponse } from './types';

type Connection = { req: PushRequest; res: PushResponse };

@Service()
export class SSEPush extends AbstractPush<Connection> {
	readonly channel = new SSEChannel();

	readonly connections: Record<string, Connection> = {};

	constructor(logger: Logger) {
		super(logger);

		this.channel.on('disconnect', (_, { req }) => {
			this.remove(req?.query?.pushRef);
		});
	}

	add(pushRef: string, connection: Connection) {
		super.add(pushRef, connection);
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
