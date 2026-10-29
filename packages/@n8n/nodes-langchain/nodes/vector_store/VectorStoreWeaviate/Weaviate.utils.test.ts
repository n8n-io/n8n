import http from 'node:http';
import http2 from 'node:http2';
import type { AddressInfo } from 'node:net';

import { createWeaviateClient, type WeaviateCredential } from './Weaviate.utils';

// These tests run the real weaviate-client and grpc-js against local servers, so they also
// cover the patched per-channel proxy handling in patches/weaviate-client@3.9.0.patch.

const listen = async (server: http.Server | http2.Http2Server) =>
	await new Promise<number>((resolve) =>
		server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)),
	);

async function startGrpcServer() {
	const requests: http2.IncomingHttpHeaders[] = [];
	const server = http2.createServer();
	server.on('stream', (stream, headers) => {
		requests.push(headers);
		stream.respond(
			{ ':status': 200, 'content-type': 'application/grpc' },
			{ waitForTrailers: true },
		);
		stream.on('wantTrailers', () =>
			stream.sendTrailers({ 'grpc-status': '2', 'grpc-message': 'test server' }),
		);
		stream.end();
	});
	const port = await listen(server);
	return { server, port, requests, close: () => server.close() };
}

async function startProxy() {
	const target = await startGrpcServer();
	const connects: Array<{ target?: string; authorization?: string }> = [];
	const server = http.createServer((_req, res) => res.writeHead(405).end());
	server.on('connect', (req, socket) => {
		connects.push({ target: req.url, authorization: req.headers['proxy-authorization'] });
		socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
		target.server.emit('connection', socket);
	});
	const port = await listen(server);
	return {
		port,
		connects,
		requests: target.requests,
		close: () => {
			server.close();
			target.close();
		},
	};
}

async function startRestServer() {
	const server = http.createServer((_req, res) => {
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify({ version: '1.31.0' }));
	});
	const port = await listen(server);
	return { port, close: () => server.close() };
}

describe('createWeaviateClient', () => {
	let grpc: Awaited<ReturnType<typeof startGrpcServer>>;
	let proxy: Awaited<ReturnType<typeof startProxy>>;
	let rest: Awaited<ReturnType<typeof startRestServer>>;
	const originalGrpcProxy = process.env.grpc_proxy;

	const credentials = (grpcProxy?: string): WeaviateCredential => ({
		weaviate_cloud_endpoint: '',
		weaviate_api_key: 'test-api-key',
		custom_connection_http_host: '127.0.0.1',
		custom_connection_http_port: rest.port,
		custom_connection_http_secure: false,
		custom_connection_grpc_host: '127.0.0.1',
		custom_connection_grpc_port: grpc.port,
		custom_connection_grpc_secure: false,
		custom_connection_grpc_proxy: grpcProxy,
	});

	const query = async (weaviateCredentials = credentials()) => {
		const client = await createWeaviateClient(weaviateCredentials, { query: 2 }, undefined, true);
		try {
			await client.collections.get('TestCollection').query.fetchObjects({ limit: 1 });
		} catch {
			// The test servers end every call with an error status.
		} finally {
			await client.close();
		}
	};

	beforeEach(async () => {
		delete process.env.grpc_proxy;
		[grpc, proxy, rest] = await Promise.all([startGrpcServer(), startProxy(), startRestServer()]);
	});

	afterEach(() => {
		grpc.close();
		proxy.close();
		rest.close();
		if (originalGrpcProxy === undefined) delete process.env.grpc_proxy;
		else process.env.grpc_proxy = originalGrpcProxy;
	});

	it('should send gRPC calls through the given proxy', async () => {
		await query(credentials(`http://user:p%40ss@127.0.0.1:${proxy.port}`));

		expect(proxy.connects).toEqual([
			{
				target: `127.0.0.1:${grpc.port}`,
				authorization: `Basic ${Buffer.from('user:p@ss').toString('base64')}`,
			},
		]);
		expect(proxy.requests[0][':authority']).toBe(`127.0.0.1:${grpc.port}`);
		expect(grpc.requests).toHaveLength(0);
	});

	it('should send an empty proxy password when the proxy URL has only a user name', async () => {
		await query(credentials(`http://user@127.0.0.1:${proxy.port}`));

		expect(proxy.connects[0].authorization).toBe(
			`Basic ${Buffer.from('user:').toString('base64')}`,
		);
	});

	it('should connect directly when no proxy is given', async () => {
		await query();

		expect(grpc.requests.length).toBeGreaterThan(0);
		expect(proxy.connects).toHaveLength(0);
	});

	it('should apply the proxy only to its own client', async () => {
		await Promise.all([query(credentials(`http://127.0.0.1:${proxy.port}`)), query()]);
		await query();

		expect(proxy.connects).toHaveLength(1);
		expect(grpc.requests.length).toBeGreaterThanOrEqual(2);
		expect(process.env.grpc_proxy).toBeUndefined();
	});

	it('should start TLS inside the proxy tunnel for a secure gRPC connection', async () => {
		const firstChunks: Buffer[] = [];
		const tlsProxy = http.createServer().on('connect', (_req, socket) => {
			socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
			socket.once('data', (chunk: Buffer) => {
				firstChunks.push(chunk);
				socket.destroy();
			});
		});
		const port = await listen(tlsProxy);

		try {
			await query({
				...credentials(`http://127.0.0.1:${port}`),
				// Node.js 25+ rejects an IP address as the TLS server name
				custom_connection_grpc_host: 'localhost',
				custom_connection_grpc_secure: true,
			});
		} finally {
			tlsProxy.close();
		}

		expect(firstChunks.length).toBeGreaterThan(0);
		// 0x16 is a TLS handshake record
		expect(firstChunks[0][0]).toBe(0x16);
		expect(firstChunks[0].toString('latin1')).not.toContain('test-api-key');
	});
});
