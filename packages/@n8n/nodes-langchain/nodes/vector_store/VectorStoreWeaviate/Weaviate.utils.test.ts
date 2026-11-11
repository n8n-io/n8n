import http from 'node:http';
import { UserError } from '@n8n/errors';
import http2 from 'node:http2';
import type { AddressInfo } from 'node:net';

import { mock } from 'vitest-mock-extended';
import weaviate, { Filters, type WeaviateClient } from 'weaviate-client';

import {
	createWeaviateClient,
	insertWithServerSideBatching,
	parseCompositeFilter,
	supportsServerSideBatching,
	type WeaviateCredential,
} from './Weaviate.utils';

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

describe('parseCompositeFilter', () => {
	const author = () => weaviate.filter.byProperty('author');

	it.each([
		['Equal', { valueString: 'Elis' }, () => author().equal('Elis')],
		['Equal', { valueNumber: 7 }, () => author().equal(7)],
		['Like', { valueString: 'El*' }, () => author().like('El*')],
		['ContainsAny', { valueTextArray: ['a', 'b'] }, () => author().containsAny(['a', 'b'])],
		['ContainsAll', { valueTextArray: ['a', 'b'] }, () => author().containsAll(['a', 'b'])],
		['GreaterThan', { valueNumber: 2020 }, () => author().greaterThan(2020)],
		['LessThan', { valueNumber: 2020 }, () => author().lessThan(2020)],
		['IsNull', { valueBoolean: true }, () => author().isNull(true)],
		[
			'WithinGeoRange',
			{ valueGeoCoordinates: { latitude: 1, longitude: 2, distance: 3 } },
			() => author().withinGeoRange({ latitude: 1, longitude: 2, distance: 3 }),
		],
	])('should build the %s operator from %j', (operator, value, expected) => {
		expect(parseCompositeFilter({ path: ['author'], operator, ...value })).toEqual(expected());
	});

	it('should accept the operator in any letter case', () => {
		expect(
			parseCompositeFilter({ path: ['author'], operator: 'gREATERtHAN', valueNumber: 1 }),
		).toEqual(author().greaterThan(1));
	});

	it.each([
		['Like', "Missing 'valueString' for 'like' operator."],
		['ContainsAny', "Missing 'valueTextArray' for 'containsAny' operator."],
		['ContainsAll', "Missing 'valueTextArray' for 'containsAll' operator."],
		['GreaterThan', "Missing 'valueNumber' for 'greaterThan' operator."],
		['LessThan', "Missing 'valueNumber' for 'lessThan' operator."],
		['IsNull', "Missing 'valueBoolean' for 'isNull' operator."],
		['WithinGeoRange', "Missing 'valueGeoCoordinates' for 'withinGeoRange' operator."],
		['Equal', 'No valid filter value provided for operator: Equal'],
	])('should throw when the %s operator has no value', (operator, message) => {
		expect(() => parseCompositeFilter({ path: ['author'], operator })).toThrow(message);
	});

	it('should throw for an unsupported operator', () => {
		expect(() =>
			parseCompositeFilter({ path: ['author'], operator: 'Between', valueNumber: 1 }),
		).toThrow('Unsupported operator: Between');
	});

	it('should combine the conditions of an AND group', () => {
		expect(
			parseCompositeFilter({
				AND: [
					{ path: ['author'], operator: 'Equal', valueString: 'Elis' },
					{ path: ['year'], operator: 'GreaterThan', valueNumber: 2020 },
				],
			}),
		).toEqual(
			Filters.and(author().equal('Elis'), weaviate.filter.byProperty('year').greaterThan(2020)),
		);
	});

	it('should combine the conditions of an OR group', () => {
		expect(
			parseCompositeFilter({
				OR: [
					{ path: ['author'], operator: 'Equal', valueString: 'Elis' },
					{ path: ['author'], operator: 'Equal', valueString: 'Pinnacle' },
				],
			}),
		).toEqual(Filters.or(author().equal('Elis'), author().equal('Pinnacle')));
	});
});

describe('createWeaviateClient connection options', () => {
	const client = mock<WeaviateClient>();
	const baseCredentials: WeaviateCredential = {
		weaviate_cloud_endpoint: '',
		weaviate_api_key: '',
		custom_connection_http_host: 'weaviate.local',
		custom_connection_http_port: 8080,
		custom_connection_http_secure: true,
		custom_connection_grpc_host: 'grpc.weaviate.local',
		custom_connection_grpc_port: 50051,
		custom_connection_grpc_secure: true,
	};

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should connect to Weaviate Cloud with the API key, timeout and init check option', async () => {
		const connect = vi.spyOn(weaviate, 'connectToWeaviateCloud').mockResolvedValue(client);

		const result = await createWeaviateClient(
			{
				...baseCredentials,
				weaviate_cloud_endpoint: 'https://cluster.weaviate.cloud',
				weaviate_api_key: 'cloud-key',
			},
			{ query: 5 },
			undefined,
			true,
		);

		expect(result).toBe(client);
		expect(connect).toHaveBeenCalledWith('https://cluster.weaviate.cloud', {
			authCredentials: new weaviate.ApiKey('cloud-key'),
			timeout: { query: 5 },
			skipInitChecks: true,
		});
	});

	it('should connect to a custom instance with the API key', async () => {
		const connect = vi.spyOn(weaviate, 'connectToCustom').mockResolvedValue(client);

		await createWeaviateClient({ ...baseCredentials, weaviate_api_key: 'custom-key' });

		expect(connect).toHaveBeenCalledWith({
			httpHost: 'weaviate.local',
			httpPort: 8080,
			httpSecure: true,
			grpcHost: 'grpc.weaviate.local',
			grpcPort: 50051,
			grpcSecure: true,
			authCredentials: new weaviate.ApiKey('custom-key'),
			timeout: undefined,
			proxies: undefined,
			skipInitChecks: false,
		});
	});

	it('should connect to a custom instance without authentication when there is no API key', async () => {
		const connect = vi.spyOn(weaviate, 'connectToCustom').mockResolvedValue(client);

		await createWeaviateClient(baseCredentials);

		expect(connect).toHaveBeenCalledWith(expect.objectContaining({ authCredentials: undefined }));
	});
});

describe('supportsServerSideBatching', () => {
	const clientWithVersion = (isAtLeast: (...version: number[]) => boolean) =>
		mock<WeaviateClient>({
			getWeaviateVersion: vi.fn().mockResolvedValue({ isAtLeast }),
		});

	it('should ask for Weaviate v1.36.0 or later', async () => {
		const isAtLeast = vi.fn().mockReturnValue(true);

		await expect(supportsServerSideBatching(clientWithVersion(isAtLeast))).resolves.toBe(true);
		expect(isAtLeast).toHaveBeenCalledWith(1, 36, 0);
	});

	it('should be false for an older Weaviate', async () => {
		await expect(supportsServerSideBatching(clientWithVersion(() => false))).resolves.toBe(false);
	});

	it('should be false when the version is not available', async () => {
		const client = mock<WeaviateClient>({
			getWeaviateVersion: vi.fn().mockRejectedValue(new Error('no meta endpoint')),
		});

		await expect(supportsServerSideBatching(client)).resolves.toBe(false);
	});
});

describe('insertWithServerSideBatching', () => {
	const objects = [
		{ id: 'id-1', vectors: [0.1], properties: { text: 'a' } },
		{ id: 'id-2', vectors: [0.2], properties: { text: 'b' } },
	];
	const ingest = vi.fn();
	const withTenant = vi.fn();
	const client = mock<WeaviateClient>({
		collections: mock<WeaviateClient['collections']>({
			get: vi.fn().mockReturnValue({ data: { ingest }, withTenant }),
		}),
	});

	beforeEach(() => {
		ingest.mockReset().mockResolvedValue({ errors: {} });
		withTenant.mockReset().mockReturnValue({ data: { ingest } });
	});

	it('should stream the objects and return their IDs in order', async () => {
		await expect(
			insertWithServerSideBatching(client, 'Books', undefined, objects),
		).resolves.toEqual(['id-1', 'id-2']);

		expect(client.collections.get).toHaveBeenCalledWith('Books');
		expect(ingest).toHaveBeenCalledWith(objects);
		expect(withTenant).not.toHaveBeenCalled();
	});

	it('should stream the objects into the tenant', async () => {
		await insertWithServerSideBatching(client, 'Books', 'tenantA', objects);

		expect(withTenant).toHaveBeenCalledWith('tenantA');
		expect(ingest).toHaveBeenCalledWith(objects);
	});

	it('should throw a user error with the first object error', async () => {
		ingest.mockResolvedValue({
			errors: { 1: { message: 'invalid property "year"', object: objects[1] } },
		});
		const insert = async () =>
			await insertWithServerSideBatching(client, 'Books', undefined, objects);

		await expect(insert()).rejects.toThrow(UserError);
		await expect(insert()).rejects.toThrow(
			'Weaviate did not insert 1 of 2 objects: invalid property "year"',
		);
	});
});
