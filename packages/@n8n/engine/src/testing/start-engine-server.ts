import type { Server } from 'node:http';

import { createEngineServer } from '../server';

export async function startEngineServer(): Promise<{
	url: string;
	stop: () => Promise<void>;
}> {
	const { app } = createEngineServer();

	const server = await new Promise<Server>((resolve, reject) => {
		const s = app.listen(0, '127.0.0.1', () => resolve(s));
		s.on('error', reject);
	});

	const address = server.address();
	if (address === null || typeof address === 'string') {
		throw new Error('Engine server address is not a TCP socket');
	}

	const url = `http://127.0.0.1:${address.port}`;

	const stop = async (): Promise<void> => {
		await new Promise<void>((resolve, reject) => {
			server.close((error) => {
				if (error) reject(error);
				else resolve();
			});
		});
	};

	return { url, stop };
}
