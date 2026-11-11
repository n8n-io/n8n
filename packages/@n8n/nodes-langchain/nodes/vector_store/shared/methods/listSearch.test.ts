import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@pinecone-database/pinecone', () => ({ Pinecone: class {} }));
vi.mock('@zilliz/milvus2-sdk-node', () => ({ MilvusClient: class {} }));
vi.mock('../../VectorStoreQdrant/Qdrant.utils', () => ({ createQdrantClient: vi.fn() }));
vi.mock('../../VectorStoreWeaviate/Weaviate.utils', () => ({ createWeaviateClient: vi.fn() }));

import { supabaseTableNameSearch } from './listSearch';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOST = 'https://test.supabase.co';

const API_RESPONSE = {
	paths: {
		'/documents': {},
		'/embeddings': {},
		'/': {},
	},
};

function createContext(
	opts: {
		hostIsString?: boolean;
		useCustomSchema?: boolean;
		schema?: string;
		omitUseCustomSchema?: boolean;
	} = {},
) {
	const {
		hostIsString = true,
		useCustomSchema = false,
		schema = 'public',
		omitUseCustomSchema = false,
	} = opts;

	const requestWithAuthentication = vi.fn().mockResolvedValue(API_RESPONSE);

	const ctx = {
		getCredentials: vi.fn().mockResolvedValue({
			host: hostIsString ? HOST : 42,
			serviceRole: 'key',
		}),
		// An absent parameter comes back as the fallback, never as a throw.
		getNodeParameter: vi.fn((name: string, fallback?: unknown) => {
			if (name === 'useCustomSchema') return omitUseCustomSchema ? fallback : useCustomSchema;
			if (name === 'schema') return schema;
			return fallback;
		}),
		helpers: {
			requestWithAuthentication,
		},
	} as unknown as ILoadOptionsFunctions;

	return ctx;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('supabaseTableNameSearch', () => {
	it('sends no Accept-Profile header when useCustomSchema is false', async () => {
		const ctx = createContext({ useCustomSchema: false });

		await supabaseTableNameSearch.call(ctx);

		const callHeaders = (ctx.helpers.requestWithAuthentication as ReturnType<typeof vi.fn>).mock
			.calls[0][1].headers as Record<string, unknown>;
		expect(callHeaders['Accept-Profile']).toBeUndefined();
		expect(callHeaders['Prefer']).toBe('return=representation');
	});

	it('defaults to public when the useCustomSchema parameter is absent (older node)', async () => {
		const ctx = createContext({ omitUseCustomSchema: true });

		await supabaseTableNameSearch.call(ctx);

		const callHeaders = (ctx.helpers.requestWithAuthentication as ReturnType<typeof vi.fn>).mock
			.calls[0][1].headers as Record<string, unknown>;
		expect(callHeaders['Accept-Profile']).toBeUndefined();
	});

	it('sends Accept-Profile with the custom schema when useCustomSchema is true', async () => {
		const ctx = createContext({ useCustomSchema: true, schema: 'analytics' });

		await supabaseTableNameSearch.call(ctx);

		const callHeaders = (ctx.helpers.requestWithAuthentication as ReturnType<typeof vi.fn>).mock
			.calls[0][1].headers as Record<string, unknown>;
		expect(callHeaders['Accept-Profile']).toBe('analytics');
	});

	it('sends Accept-Profile: public when useCustomSchema is true with explicit public', async () => {
		const ctx = createContext({ useCustomSchema: true, schema: 'public' });

		await supabaseTableNameSearch.call(ctx);

		const callHeaders = (ctx.helpers.requestWithAuthentication as ReturnType<typeof vi.fn>).mock
			.calls[0][1].headers as Record<string, unknown>;
		expect(callHeaders['Accept-Profile']).toBe('public');
	});

	it('throws UserError and does not call requestWithAuthentication when schema is empty', async () => {
		const ctx = createContext({ useCustomSchema: true, schema: '' });

		await expect(supabaseTableNameSearch.call(ctx)).rejects.toThrow(UserError);

		expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('throws UserError and does not call requestWithAuthentication for header-unsafe schema', async () => {
		const ctx = createContext({ useCustomSchema: true, schema: 'bad schema' });

		await expect(supabaseTableNameSearch.call(ctx)).rejects.toThrow(UserError);

		expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('throws UserError for a non-string host (existing guard preserved)', async () => {
		const ctx = createContext({ hostIsString: false });

		await expect(supabaseTableNameSearch.call(ctx)).rejects.toThrow(UserError);
	});

	it('maps API paths to result entries, omitting the introspection path', async () => {
		const ctx = createContext();

		const result = await supabaseTableNameSearch.call(ctx);

		expect(result).toEqual({
			results: [
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'documents', value: 'documents' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'embeddings', value: 'embeddings' },
			],
		});
	});

	/**
	 * No-fallback guard: after a UserError from resolveSchema, requestWithAuthentication
	 * must NOT be called a second time with any other schema. This verifies that the
	 * failed validation propagates immediately and there is no silent retry on 'public'.
	 */
	it('no-fallback: a schema UserError stops execution without a public retry', async () => {
		const ctx = createContext({ useCustomSchema: true, schema: 'invalid schema!' });

		await expect(supabaseTableNameSearch.call(ctx)).rejects.toThrow(UserError);

		expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});
});
