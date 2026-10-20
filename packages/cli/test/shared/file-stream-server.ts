import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

/**
 * Temp file that is larger than the socket buffers, so a download stops in the
 * middle when the client stops reading. Opens it the way `FsByteStore.readStream()`
 * does.
 */
export async function createLargeTempFile(sizeInBytes = 8 * 1024 * 1024) {
	const dir = await mkdtemp(path.join(tmpdir(), 'n8n-file-stream-'));
	const filePath = path.join(dir, 'file.bin');
	await writeFile(filePath, Buffer.alloc(sizeInBytes));

	return {
		sizeInBytes,
		openStream: async () => (await open(filePath, 'r')).createReadStream(),
		remove: async () => await rm(dir, { recursive: true, force: true }),
	};
}

export async function startServer(handler: http.RequestListener) {
	const server = http.createServer(handler);
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const { port } = server.address() as AddressInfo;

	return {
		url: `http://127.0.0.1:${port}/`,
		close: async () => {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		},
	};
}

/** Reads the first chunk of the response body, then drops the connection. */
export async function readFirstChunkAndDisconnect(url: string) {
	await new Promise<void>((resolve, reject) => {
		const req = http.get(url, (res) => {
			res.once('data', () => {
				req.destroy();
				resolve();
			});
		});
		req.once('error', reject);
	});
}

/** Sends a request and drops the connection before the response starts. */
export async function disconnectBeforeResponse(
	url: string,
	serverStartedHandling: Promise<unknown>,
) {
	const req = http.get(url);
	req.once('error', () => {});
	await serverStartedHandling;
	req.destroy();
}

export async function readWholeBody(url: string) {
	const res = await fetch(url);
	return (await res.arrayBuffer()).byteLength;
}

/** Resolves `true` when the stream closes, or `false` when it is still open after the timeout. */
export async function waitForClose(stream: Readable, timeoutMs = 2000) {
	if (stream.closed) return true;
	return await new Promise<boolean>((resolve) => {
		const timer = setTimeout(() => resolve(false), timeoutMs);
		stream.once('close', () => {
			clearTimeout(timer);
			resolve(true);
		});
	});
}

/** Sends `chunksBeforeError` chunks of 64 KB, then fails like a disk or object store read error. */
export function failingStream(chunksBeforeError: number) {
	let sent = 0;
	return new Readable({
		read() {
			if (sent === chunksBeforeError) {
				this.destroy(new Error('read failed'));
				return;
			}
			sent++;
			setTimeout(() => this.push(Buffer.alloc(64 * 1024)), 1);
		},
	});
}
