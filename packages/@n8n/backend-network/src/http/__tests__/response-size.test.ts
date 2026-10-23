import { startServer, type LocalServer } from '../local-server';
import {
	buildDispatcher,
	createDispatcherTransport,
	dispatchedFetch,
	limitResponseBody,
} from '../undici/transport';

describe('limitResponseBody', () => {
	it('returns the same response when the limit is disabled', () => {
		const response = new Response('payload');
		expect(limitResponseBody(response, { maxBytes: 0 })).toBe(response);
	});

	it('returns the same response when the body is empty', () => {
		const response = new Response(null);
		expect(limitResponseBody(response, { maxBytes: 10 })).toBe(response);
	});

	it('passes a body that stays within the cap', async () => {
		const response = limitResponseBody(new Response(new Uint8Array(5)), { maxBytes: 10 });
		await expect(response.arrayBuffer()).resolves.toHaveProperty('byteLength', 5);
	});

	it('aborts a body that exceeds the cap', async () => {
		const response = limitResponseBody(new Response(new Uint8Array(100)), { maxBytes: 10 });
		await expect(response.text()).rejects.toThrow(/exceeded the maximum allowed size/);
	});

	it('throws the error the caller supplies', async () => {
		class CustomLimitError extends Error {}
		const response = limitResponseBody(new Response(new Uint8Array(100)), {
			maxBytes: 10,
			createError: () => new CustomLimitError('too big'),
		});
		await expect(response.text()).rejects.toBeInstanceOf(CustomLimitError);
	});

	it('preserves url, redirected and type', () => {
		const source = new Response(new Uint8Array(5), { status: 200 });
		Object.defineProperties(source, {
			url: { value: 'https://example.test/' },
			redirected: { value: true },
			type: { value: 'basic' },
		});
		const limited = limitResponseBody(source, { maxBytes: 10 });
		expect(limited.url).toBe('https://example.test/');
		expect(limited.redirected).toBe(true);
		expect(limited.type).toBe('basic');
	});
});

describe('dispatchedFetch responseSizeLimit', () => {
	let server: LocalServer;

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end('A'.repeat(1024));
		});
	});

	afterAll(async () => await server.close());

	it('streams the response unchanged without a limit', async () => {
		const dispatcher = buildDispatcher(false, 'disabled', {});
		const response = await dispatchedFetch(dispatcher, server.url, {});
		expect((await response.text()).length).toBe(1024);
	});

	it('aborts a response over the cap', async () => {
		const dispatcher = buildDispatcher(false, 'disabled', {});
		await expect(
			dispatchedFetch(dispatcher, server.url, {}, { maxBytes: 10 }).then(
				async (response) => await response.text(),
			),
		).rejects.toThrow(/exceeded the maximum allowed size/);
	});

	it('passes a response under the cap', async () => {
		const dispatcher = buildDispatcher(false, 'disabled', {});
		const response = await dispatchedFetch(dispatcher, server.url, {}, { maxBytes: 1024 * 1024 });
		expect((await response.text()).length).toBe(1024);
	});
});

describe('createDispatcherTransport asCustomFetch responseSizeLimit', () => {
	let server: LocalServer;

	beforeAll(async () => {
		server = await startServer((_req, res) => {
			res.writeHead(200, { 'content-type': 'text/plain' });
			res.end('A'.repeat(1024));
		});
	});

	afterAll(async () => await server.close());

	it('aborts a response over the cap', async () => {
		const fetch = createDispatcherTransport({
			proxy: false,
			responseSizeLimit: { maxBytes: 10 },
		}).asCustomFetch();
		await expect(fetch(server.url).then(async (r) => await r.text())).rejects.toThrow(
			/exceeded the maximum allowed size/,
		);
	});

	it('streams the response unchanged without a limit', async () => {
		const fetch = createDispatcherTransport({ proxy: false }).asCustomFetch();
		const response = await fetch(server.url);
		expect((await response.text()).length).toBe(1024);
	});
});
