import { createServer, request } from 'node:http';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { PAGE, close, expectHardened, listen, usePreviewHarness } from './sandbox-preview-harness';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

interface WatchedAnswer {
	status: number;
	body: string;
	/** Whether the browser received the whole answer. */
	complete: boolean;
}

describe('SandboxPreviewProxyController transport', () => {
	const h = usePreviewHarness();
	const {
		seen,
		previewService,
		outboundHttp,
		getNodeAgent,
		httpAgent,
		httpsAgent,
		openPreview,
		send,
	} = h;

	/** Resolves when the answer ends or breaks off, or with 'hung' when it does neither in time. */
	const watch = async (path: string, waitMs: number) =>
		await Promise.race([
			new Promise<WatchedAnswer>((resolve, reject) => {
				const outgoing = request({ host: '127.0.0.1', port: h.servers.port, path }, (res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (chunk: string) => (body += chunk));
					res.on('error', () => {});
					res.on('close', () =>
						resolve({ status: res.statusCode ?? 0, body, complete: res.complete }),
					);
				});
				outgoing.on('error', reject);
				outgoing.end();
			}),
			new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), waitMs)),
		]);

	it('passes each chunk of a streamed answer on as it arrives, uncompressed', async () => {
		const { url } = await openPreview();
		h.state.mode = 'stream';

		const { encoding, chunks } = await new Promise<{ encoding?: string; chunks: string[] }>(
			(resolve, reject) => {
				const received: string[] = [];
				let ended = false;
				const end = () => {
					if (!ended) h.state.endStream();
					ended = true;
				};
				const outgoing = request(
					{
						host: '127.0.0.1',
						port: h.servers.port,
						path: `${url}events`,
						headers: { 'accept-encoding': 'gzip' },
					},
					(res) => {
						const contentEncoding = res.headers['content-encoding'];
						// A compressed stream holds the first event back, so end it now and fail below.
						if (contentEncoding) end();
						res.setEncoding('utf8');
						res.on('data', (chunk: string) => {
							received.push(chunk);
							// The upstream ends the stream only after the first event reached the client.
							end();
						});
						res.on('end', () => resolve({ encoding: contentEncoding, chunks: received }));
					},
				);
				outgoing.on('error', reject);
				outgoing.end();
			},
		);

		expect(encoding).toBeUndefined();
		expect(chunks[0]).toBe('data: first\n\n');
		expect(chunks.join('')).toBe('data: first\n\ndata: last\n\n');
	});

	it.each([
		['application/json', '{"name":"Ada","items":[1,2]}'],
		['text/plain', 'plain text body'],
		['application/octet-stream', 'raw bytes'],
	])('forwards a %s body that n8n already read', async (contentType, body) => {
		const { url } = await openPreview();

		const answer = await send(`${url}api/items`, {
			method: 'POST',
			headers: { 'content-type': contentType },
			body,
		});

		expect(answer.status).toBe(200);
		expect(answer.body).toBe(`echo:${body}`);
		expect(seen[0].method).toBe('POST');
		expect(seen[0].body).toBe(body);
		expect(seen[0].headers['content-length']).toBe(String(Buffer.byteLength(body)));
	});

	it('streams a multipart body that n8n did not read', async () => {
		const { url } = await openPreview();
		const body = [
			'--boundary',
			'Content-Disposition: form-data; name="file"; filename="a.txt"',
			'Content-Type: text/plain',
			'',
			'file contents',
			'--boundary--',
			'',
		].join('\r\n');

		const answer = await send(`${url}api/upload`, {
			method: 'POST',
			headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
			body,
		});

		expect(answer.status).toBe(200);
		expect(seen[0].body).toBe(body);
		expect(seen[0].headers['content-type']).toBe('multipart/form-data; boundary=boundary');
	});

	it('answers 502 when the sandbox service cannot be reached, and keeps the URL', async () => {
		const closed = createServer();
		const closedPort = await listen(closed);
		await close(closed);
		const { url, token } = await openPreview({
			serviceUrl: `http://127.0.0.1:${closedPort}`,
			path: '/sandboxes/sb-2/ports/3000',
		});

		const answer = await send(`${url}src/main.ts`);

		expect(answer.status).toBe(502);
		expect(answer.body).toBe('Bad Gateway');
		expectHardened(answer);
		expect(previewService.resolveToken(token)).toBeDefined();
	});

	it('passes a sandbox restart through as 409 and answers 404 afterwards', async () => {
		const { url } = await openPreview();
		h.state.mode = 'restarted';

		const restarted = await send(`${url}src/main.ts`);
		h.state.mode = 'ok';
		const later = await send(url, { headers: PAGE });

		expect(restarted.status).toBe(409);
		expectHardened(restarted);
		expect(later.status).toBe(404);
		expect(seen).toHaveLength(1);
	});

	it('relays a 502 from the app without revoking the URL', async () => {
		const { url } = await openPreview();
		h.state.mode = 'app-down';

		const down = await send(`${url}src/main.ts`);
		h.state.mode = 'ok';
		const recovered = await send(`${url}src/main.ts`);

		expect(down.status).toBe(502);
		expect(recovered.status).toBe(200);
	});

	describe('when the service stops in the middle of an answer', () => {
		it.each([
			['a sized answer', 'abort-sized' as const],
			['a chunked answer', 'abort-chunked' as const],
		])('breaks off %s for the browser too, so the frame does not wait', async (_case, mode) => {
			const { url } = await openPreview();
			h.state.mode = mode;

			const answer = await watch(`${url}src/main.ts`, 3_000);

			expect(answer).toEqual({ status: 200, body: 'partial', complete: false });
		});

		it('keeps the URL, so the next request reaches the app again', async () => {
			const { url, token } = await openPreview();
			h.state.mode = 'abort-sized';
			await watch(`${url}src/main.ts`, 3_000);
			h.state.mode = 'ok';

			const answer = await send(`${url}src/main.ts`);

			expect(answer.status).toBe(200);
			expect(previewService.resolveToken(token)).toBeDefined();
		});

		it('ends a complete answer normally', async () => {
			const { url } = await openPreview();

			const answer = await watch(`${url}src/main.ts`, 3_000);

			expect(answer).toEqual({ status: 200, body: 'export {}', complete: true });
		});
	});

	describe('compressed request bodies', () => {
		it('forwards a gzip body as the decompressed bytes that n8n read', async () => {
			const { url } = await openPreview();
			const text = 'plain text body';

			await send(`${url}api/items`, {
				method: 'POST',
				headers: { 'content-type': 'text/plain', 'content-encoding': 'gzip' },
				body: gzipSync(text),
			});

			expect(seen[0].body).toBe(text);
			expect(seen[0].headers['content-encoding']).toBeUndefined();
			expect(seen[0].headers['content-length']).toBe(String(Buffer.byteLength(text)));
		});

		it('forwards a body in an encoding that n8n does not decode with its encoding header', async () => {
			const { url } = await openPreview();
			const compressed = brotliCompressSync('{"name":"Ada"}');

			await send(`${url}api/items`, {
				method: 'POST',
				headers: { 'content-type': 'application/octet-stream', 'content-encoding': 'br' },
				body: compressed,
			});

			expect(seen[0].headers['content-encoding']).toBe('br');
			expect(seen[0].raw.equals(compressed)).toBe(true);
			expect(seen[0].headers['content-length']).toBe(String(compressed.length));
		});
	});

	describe('connections to the sandbox service', () => {
		it('asks for keep-alive agents under the instance proxy settings, once', async () => {
			const { url } = await openPreview();

			await send(`${url}src/main.ts`);
			await send(`${url}src/app.ts`);

			expect(outboundHttp.transport).toHaveBeenCalledTimes(1);
			expect(outboundHttp.transport).toHaveBeenCalledWith({ useDefaultSsrfPolicy: 'unsafe' });
			expect(getNodeAgent).toHaveBeenCalledTimes(1);
			expect(getNodeAgent).toHaveBeenCalledWith({ keepAlive: true });
		});

		it('sends the requests of one page over one kept-alive connection', async () => {
			const { url } = await openPreview();

			await send(url, { headers: PAGE });
			await send(`${url}src/main.ts`);
			await send(`${url}api/items`, { method: 'POST', body: 'x' });

			expect(seen).toHaveLength(3);
			expect(new Set(seen.map((request) => request.remotePort)).size).toBe(1);
			expect(seen.map((request) => request.headers.connection)).toEqual([
				'keep-alive',
				'keep-alive',
				'keep-alive',
			]);
		});

		it('keeps the connection when the browser or a reverse proxy sends Connection: close', async () => {
			const { url } = await openPreview();

			const closing = { headers: { connection: 'close' }, agent: false as const };
			const first = await send(`${url}src/main.ts`, closing);
			const second = await send(`${url}src/app.ts`, closing);

			expect([first.status, second.status]).toEqual([200, 200]);

			expect(seen.map((request) => request.headers.connection)).toEqual([
				'keep-alive',
				'keep-alive',
			]);
			expect(seen[0].remotePort).toBe(seen[1].remotePort);
		});

		it('does not pass the keep-alive timeout of the service on to the browser', async () => {
			const { upstream } = h.servers;
			if (!upstream) throw new Error('The harness servers did not start');
			const serviceTimeout = upstream.keepAliveTimeout;
			upstream.keepAliveTimeout = 61_000;
			const { url } = await openPreview();

			const answer = await send(`${url}src/main.ts`);
			upstream.keepAliveTimeout = serviceTimeout;

			// The service answered `keep-alive: timeout=61`; n8n closes idle browser connections sooner.
			expect(seen[0].headers.connection).toBe('keep-alive');
			expect(answer.headers['keep-alive']).toBeUndefined();
		});

		it('connects to an https service with the https agent', async () => {
			const closed = createServer();
			const closedPort = await listen(closed);
			await close(closed);
			const viaHttps = vi.spyOn(httpsAgent, 'createConnection');
			const viaHttp = vi.spyOn(httpAgent, 'createConnection');
			const { url } = await openPreview({
				serviceUrl: `https://127.0.0.1:${closedPort}`,
				path: '/sandboxes/sb-3/ports/3000',
			});

			const answer = await send(`${url}src/main.ts`);

			expect(answer.status).toBe(502);
			expect(viaHttps).toHaveBeenCalledTimes(1);
			expect(viaHttp).not.toHaveBeenCalled();
			viaHttps.mockRestore();
			viaHttp.mockRestore();
		});
	});
});
