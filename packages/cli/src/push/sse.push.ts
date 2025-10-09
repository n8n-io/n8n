import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { AbstractPush } from './abstract.push';
import type { PushRequest, PushResponse } from './types';

type Connection = { req: PushRequest; res: PushResponse };

@Service()
export class SSEPush extends AbstractPush<Connection> {
	add(pushRef: string, userId: User['id'], connection: Connection) {
		const { req, res } = connection;

		// Initialize the connection
		req.socket.setTimeout(0);
		req.socket.setNoDelay(true);
		req.socket.setKeepAlive(true);
		res.setHeader('Content-Type', 'text/event-stream; charset=UTF-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.writeHead(200);
		res.write(':ok\n\n');
		res.flush();

		super.add(pushRef, userId, connection);

		// When the client disconnects, remove the client
		const removeClient = () => this.remove(pushRef);
		req.once('end', removeClient);
		req.once('close', removeClient);
		res.once('finish', removeClient);
	}

	protected close({ res }: Connection) {
		res.end();
	}

	protected sendToOneConnection(connection: Connection, data: string) {
		const { res } = connection;
		res.write('data: ' + data + '\n\n');
		res.flush();
	}

	protected ping({ res }: Connection) {
		res.write(':ping\n\n');
		res.flush();
	}
}
