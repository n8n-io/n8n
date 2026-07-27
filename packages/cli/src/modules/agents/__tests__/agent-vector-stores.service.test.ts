import type { BuiltVectorStoreBackend } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import type { CredentialsEntity, User } from '@n8n/db';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentVectorStoresService } from '../agent-vector-stores.service';
import { resolveEmbeddingProviderOptionsFromCredential } from '../json-config/embedding-credential';
import { buildVectorStoreBackend } from '../json-config/vector-store-factory';

vi.mock('../json-config/vector-store-factory', () => ({
	buildVectorStoreBackend: vi.fn(),
}));

vi.mock('../json-config/embedding-credential', () => ({
	resolveEmbeddingProviderOptionsFromCredential: vi.fn().mockResolvedValue({}),
}));

vi.mock('@n8n/agents', () => ({
	createEmbeddingModel: vi.fn().mockReturnValue({ modelId: 'text-embedding-3-small' }),
}));

vi.mock('ai', () => ({
	embed: vi.fn().mockResolvedValue({ embedding: [0, 0] }),
}));

const projectId = 'project-1';
const user = {} as User;

const postgresConfig: AgentJsonVectorStoreConfig = {
	provider: 'postgres',
	name: 'docs',
	credential: 'postgres-cred',
	useWhen: 'Search docs',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
	tableName: 'documents',
};

function makeService(
	credentialId: string,
	rawCredential: ICredentialDataDecryptedObject = { apiKey: 'store-key' },
) {
	const credentialsService = mock<CredentialsService>();
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
		{ id: credentialId } as CredentialsEntity,
	]);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	// `AgentsCredentialProvider.resolve()` intersects against this when a
	// request user is set (it always is here), so the tested credential must
	// be listed as user-accessible too, not just project-accessible.
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
		{
			id: credentialId,
			name: 'Store credential',
			type: 'httpBasicAuth',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			scopes: [],
			isManaged: false,
			isGlobal: false,
			isResolvable: true,
			currentUserHasAccess: true,
			homeProject: null,
			sharedWithProjects: [],
		},
	]);
	credentialsService.decrypt.mockResolvedValue(rawCredential);
	return { service: new AgentVectorStoresService(credentialsService), credentialsService };
}

// Built manually instead of `mock<BuiltVectorStoreBackend>()`: `close` being an
// optional method makes vitest-mock-extended's deep proxy fall back to the
// plain (un-mocked) function types for every method, so `.mockResolvedValue`
// etc. wouldn't type-check. `satisfies` keeps the vi.fn() types while still
// checking the shape matches the interface.
function makeBackend() {
	return {
		upsert: vi.fn(),
		query: vi.fn(),
		delete: vi.fn(),
		close: vi.fn().mockResolvedValue(undefined),
	} satisfies BuiltVectorStoreBackend;
}

describe('AgentVectorStoresService.testConnection', () => {
	beforeEach(() => {
		vi.mocked(buildVectorStoreBackend).mockReset();
		vi.mocked(resolveEmbeddingProviderOptionsFromCredential).mockReset().mockResolvedValue({});
	});

	it('resolves the store credential once, builds the backend with it, and closes on success', async () => {
		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		const { service, credentialsService } = makeService(postgresConfig.credential);

		const result = await service.testConnection(projectId, user, postgresConfig);

		expect(result).toEqual({ success: true });
		expect(credentialsService.decrypt).toHaveBeenCalledTimes(1);
		expect(buildVectorStoreBackend).toHaveBeenCalledWith(postgresConfig, expect.anything(), {
			apiKey: 'store-key',
		});
		expect(backend.query).toHaveBeenCalledWith([0, 0], { topK: 1 });
		expect(backend.close).toHaveBeenCalledTimes(1);
	});

	it('times out, reports a timeout message, and still closes the backend', async () => {
		vi.useFakeTimers();
		try {
			const backend = makeBackend();
			backend.query.mockImplementation(async () => await new Promise<never>(() => {}));
			vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
			const { service } = makeService(postgresConfig.credential);

			const resultPromise = service.testConnection(projectId, user, postgresConfig);
			await vi.advanceTimersByTimeAsync(15_000);
			const result = await resultPromise;

			expect(result).toEqual({ success: false, message: 'Connection test timed out' });
			expect(backend.close).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('closes a backend that finishes building only after the timeout already responded', async () => {
		vi.useFakeTimers();
		try {
			const backend = makeBackend();
			let resolveBackend!: (value: BuiltVectorStoreBackend) => void;
			vi.mocked(buildVectorStoreBackend).mockImplementation(
				async () =>
					await new Promise<BuiltVectorStoreBackend>((resolve) => {
						resolveBackend = resolve;
					}),
			);
			const { service } = makeService(postgresConfig.credential);

			const resultPromise = service.testConnection(projectId, user, postgresConfig);
			await vi.advanceTimersByTimeAsync(15_000);
			const result = await resultPromise;

			expect(result).toEqual({ success: false, message: 'Connection test timed out' });
			expect(backend.close).not.toHaveBeenCalled();

			// Backend creation finishes late, after the timeout already responded.
			resolveBackend(backend);
			await vi.advanceTimersByTimeAsync(0);

			expect(backend.close).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('surfaces the probe query error and still closes the backend', async () => {
		const backend = makeBackend();
		backend.query.mockRejectedValue(new Error('connection refused'));
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		const { service } = makeService(postgresConfig.credential);

		const result = await service.testConnection(projectId, user, postgresConfig);

		expect(result).toEqual({ success: false, message: 'connection refused' });
		expect(backend.close).toHaveBeenCalledTimes(1);
	});

	it('warns when the configured Pinecone namespace has no data yet, still running the probe query', async () => {
		vi.doMock('@pinecone-database/pinecone', () => ({
			Pinecone: class {
				async describeIndex() {
					return { dimension: 2 };
				}
				index() {
					return { describeIndexStats: async () => ({ namespaces: { prod: {} } }) };
				}
			},
		}));

		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		const { service } = makeService('pinecone-cred', { apiKey: 'pc-key' });
		const pineconeConfig: AgentJsonVectorStoreConfig = {
			provider: 'pinecone',
			name: 'docs',
			credential: 'pinecone-cred',
			useWhen: 'Search docs',
			embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
			indexName: 'product-docs',
			namespace: 'staging',
		};

		const result = await service.testConnection(projectId, user, pineconeConfig);

		expect(result).toEqual({
			success: true,
			warning:
				'Namespace "staging" has no data yet in index "product-docs". It will appear once data is indexed — double-check the name if you expected existing data.',
		});
		expect(backend.query).toHaveBeenCalledWith([0, 0], { topK: 1 });
		expect(backend.close).toHaveBeenCalledTimes(1);

		vi.doUnmock('@pinecone-database/pinecone');
	});

	it('reports a hard failure for a Pinecone dimension mismatch and skips the probe query', async () => {
		vi.doMock('@pinecone-database/pinecone', () => ({
			Pinecone: class {
				async describeIndex() {
					return { dimension: 4 };
				}
				index() {
					return { describeIndexStats: async () => ({ namespaces: { prod: {} } }) };
				}
			},
		}));

		const backend = makeBackend();
		backend.query.mockResolvedValue([]);
		vi.mocked(buildVectorStoreBackend).mockResolvedValue(backend);
		const { service } = makeService('pinecone-cred', { apiKey: 'pc-key' });
		const pineconeConfig: AgentJsonVectorStoreConfig = {
			provider: 'pinecone',
			name: 'docs',
			credential: 'pinecone-cred',
			useWhen: 'Search docs',
			embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
			indexName: 'product-docs',
		};

		const result = await service.testConnection(projectId, user, pineconeConfig);

		expect(result).toEqual({
			success: false,
			message:
				'Index "product-docs" expects 4 dimensions but model "openai/text-embedding-3-small" produces 2.',
		});
		expect(backend.query).not.toHaveBeenCalled();
		expect(backend.close).toHaveBeenCalledTimes(1);

		vi.doUnmock('@pinecone-database/pinecone');
	});
});
