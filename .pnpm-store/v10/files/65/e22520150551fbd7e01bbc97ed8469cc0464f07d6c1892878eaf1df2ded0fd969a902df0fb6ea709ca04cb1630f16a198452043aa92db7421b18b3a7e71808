import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';

// Copied from setup.ts

export const data = join(import.meta.dirname, '../data');

export const defaultEntries = readdirSync(data);

export const tmp = join(import.meta.dirname, '../tmp');

if (!existsSync(tmp)) mkdirSync(tmp);

export const port = 26514;

export const baseUrl = 'http://localhost:' + port;

export const indexPath = '/.index.json';

export function whenServerReady() {
	const { promise, resolve, reject } = Promise.withResolvers();

	const timeout = setTimeout(reject, 10_000);

	const interval = setInterval(() => {
		const socket = createConnection(port)
			.on('connect', () => {
				socket.end();
				clearTimeout(timeout);
				clearInterval(interval);
				resolve();
			})
			.on('error', () => {
				// ignore
			});
	}, 250);

	return promise;
}
