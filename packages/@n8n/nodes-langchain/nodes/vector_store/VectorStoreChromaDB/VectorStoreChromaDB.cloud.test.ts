// Uses the real chromadb client with a stubbed fetch, so no request leaves the test
import type { ILoadOptionsFunctions, INode, ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { VectorStoreChromaDB } from './VectorStoreChromaDB.node';

const node = mock<INode>({ name: 'Chroma', typeVersion: 1.1, parameters: {} });

const json = (body: unknown) =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { 'content-type': 'application/json' },
	});

describe('VectorStoreChromaDB with Chroma Cloud credentials', () => {
	let requests: Array<{ url: string; token: string | null }>;

	beforeEach(() => {
		requests = [];
		vi.stubEnv('CHROMA_API_KEY', 'env-key');
		vi.stubEnv('CHROMA_TENANT', 'env-tenant');
		vi.stubEnv('CHROMA_DATABASE', 'env-database');
		vi.stubGlobal(
			'fetch',
			vi.fn(async (req: Request) => {
				requests.push({ url: req.url, token: req.headers.get('x-chroma-token') });
				if (req.url.endsWith('/auth/identity')) {
					return json({ user_id: 'u', tenant: 'own-tenant', databases: ['own-database'] });
				}
				if (req.method === 'POST') {
					return json({
						id: '00000000-0000-0000-0000-000000000000',
						name: 'docs',
						configuration_json: {},
					});
				}
				return json([]);
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
	});

	const listCollections = async (credentials: object) => {
		const ctx = mock<ILoadOptionsFunctions>({
			getNode: () => node,
			getNodeParameter: (name: string) =>
				(name === 'authentication' ? 'chromaCloudApi' : undefined) as never,
			getCredentials: async () => credentials as never,
		});
		return await new VectorStoreChromaDB().methods!.listSearch!.chromaCollectionsSearch.call(ctx);
	};

	const retrieve = async (credentials: object) => {
		const parameters: Record<string, unknown> = {
			authentication: 'chromaCloudApi',
			mode: 'retrieve',
			chromaCollection: 'docs',
		};
		const ctx = mock<ISupplyDataFunctions>({
			getNode: () => node,
			getNodeParameter: ((name: string, _i: number, fallback?: unknown) =>
				parameters[name] ?? fallback) as never,
			getCredentials: async () => credentials as never,
			getInputConnectionData: async () => ({}) as never,
		});
		return await new VectorStoreChromaDB().supplyData.call(ctx, 0);
	};

	it.each([
		['collection list', listCollections],
		['retrieve', retrieve],
	])('should not send a request without an API key (%s)', async (_, run) => {
		await expect(run({ apiKey: '', tenant: '', database: '' })).rejects.toThrow(
			'The credential has no API key',
		);
		expect(requests).toEqual([]);
	});

	it.each([
		['collection list', listCollections],
		['retrieve', retrieve],
	])(
		'should resolve an empty tenant and database from the credential API key (%s)',
		async (_, run) => {
			await run({ apiKey: 'own-key', tenant: '', database: '' });

			expect(requests[0].url).toMatch(/\/auth\/identity$/);
			expect(requests.at(-1)!.url).toContain('/tenants/own-tenant/databases/own-database/');
			expect(requests.every((r) => r.token === 'own-key')).toBe(true);
		},
	);

	it('should use the tenant and database of the credential', async () => {
		await listCollections({ apiKey: 'own-key', tenant: 'tenant-a', database: 'database-a' });

		expect(requests.map((r) => r.url)).toEqual([
			expect.stringContaining('/tenants/tenant-a/databases/database-a/collections'),
		]);
	});
});
