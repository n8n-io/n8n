import { type Readable } from 'stream';
import { AbstractPush } from './abstract.push';
import type { PushRequest, PushResponse } from './types';

type Connection = { req: PushRequest; res: PushResponse };

export class SSEPush extends AbstractPush<Connection> {
	readonly connections: Record<string, Connection> = {};

	add(sessionId: string, connection: Connection) {
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

		super.add(sessionId, connection);

		// When the client disconnects, remove the client
		const removeClient = () => this.remove(sessionId);
		req.once('end', removeClient);
		req.once('close', removeClient);
		res.once('finish', removeClient);
	}

	protected close({ res }: Connection): void {
		res.end();
	}

	protected async sendTo(connections: Connection[], stream: Readable) {
		connections.forEach(({ res }) => res.write('data: '));
		await new Promise<void>((resolve, reject) => {
			stream
				.once('error', reject)
				.on('data', (chunk) => {
					connections.forEach(({ res }) => res.write(chunk));
				})
				.once('end', resolve);
		});

		connections.forEach(({ res }) => res.write('\n\n'));
		// `flush()` is defined in the compression middleware.
		// This is necessary because the compression middleware sometimes waits
		// for a certain amount of data before sending the data to the client
		connections.forEach(({ res }) => res.flush());
	}

	protected pingAll() {
		Object.values(this.connections).forEach(({ res }) => {
			res.write(':\n');
			res.flush();
		});
	}
}
