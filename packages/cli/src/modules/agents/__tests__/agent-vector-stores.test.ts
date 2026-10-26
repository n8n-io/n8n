import type { BuiltVectorStoreBackend } from '@n8n/agents';
import type { AgentJsonVectorStoreConfig } from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest, CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsHelper } from '@/credentials-helper';

import { AgentsCredentialProvider } from '../adapters/agents-credential-provider';
import { AgentVectorStoresController } from '../agent-vector-stores.controller';
import {
	buildFromJson,
	type MemoryFactory,
	type ToolExecutor,
} from '../json-config/from-json-config';

const { backend, PgVectorStore, getBase } = vi.hoisted(() => {
	const backend = {
		upsert: vi.fn(),
		query: vi.fn(),
		delete: vi.fn(),
		close: vi.fn(),
	} satisfies BuiltVectorStoreBackend;
	return {
		backend,
		PgVectorStore: vi.fn(function () {
			return backend;
		}),
		getBase: vi.fn(),
	};
});

// Keep the controller, credential provider and Knowledge implementation real;
// only replace database, decryption and external embedding/vector-store I/O.
vi.mock('@n8n/agents/vector-stores/postgres', () => ({ PgVectorStore }));
vi.mock('@/workflow-execute-additional-data', () => ({ getBase }));
vi.mock('ai', () => ({ embed: vi.fn().mockResolvedValue({ embedding: [0, 0] }) }));
vi.mock('@n8n/agents/catalog', () => ({ getCachedCatalog: vi.fn() }));

type AccessibleCredential = Awaited<
	ReturnType<CredentialsService['getCredentialsAUserCanUseInAWorkflow']>
>[number];

const credentials = [
	mock<CredentialsEntity>({ id: 'postgres-cred', name: 'Documents', type: 'postgres' }),
	mock<CredentialsEntity>({ id: 'embed-cred', name: 'Embedding model', type: 'openAiApi' }),
];
const accessibleCredentials = credentials.map(({ id }) => mock<AccessibleCredential>({ id }));
const user = mock<User>({ id: 'user-1' });
const request = mock<AuthenticatedRequest<{ projectId: string }>>({
	params: { projectId: 'project-1' },
	user,
});
const response = mock<Response>();
const vectorStore: AgentJsonVectorStoreConfig = {
	provider: 'postgres',
	name: 'product_docs',
	credential: 'postgres-cred',
	useWhen: 'Search product documentation',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
	tableName: 'documents',
};

const credentialsService = mockInstance(CredentialsService);
const credentialsHelper = mockInstance(CredentialsHelper);
const moduleRegistry = mockInstance(ModuleRegistry);

beforeEach(() => {
	vi.clearAllMocks();
	// No Knowledge module init or entities: external vector stores must remain usable.
	moduleRegistry.isActive.mockImplementation((name) => name !== 'knowledge');
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue(credentials);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
	credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(accessibleCredentials);
	credentialsHelper.getDecrypted.mockResolvedValue({ apiKey: 'test-key' });
	getBase.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());
	backend.query.mockResolvedValue([]);
	backend.close.mockResolvedValue(undefined);
});

describe('Agent vector-store connection tests', () => {
	it('tests the connection with Knowledge inactive and credentials scoped to the request', async () => {
		const controller = Container.get(AgentVectorStoresController);

		await expect(controller.testConnection(request, response, { vectorStore })).resolves.toEqual({
			success: true,
		});

		expect(credentialsService.getCredentialsAUserCanUseInAWorkflow).toHaveBeenCalledWith(user, {
			projectId: 'project-1',
			excludePersonalRoute: true,
		});
		expect(credentialsService.findAllCredentialIdsForProject).toHaveBeenCalledWith('project-1');
		expect(getBase).toHaveBeenCalledWith({ projectId: 'project-1', userId: 'user-1' });
		expect(credentialsHelper.getDecrypted).toHaveBeenCalledTimes(2);
		expect(backend.query).toHaveBeenCalledWith([0, 0], { topK: 1 });
		expect(backend.close).toHaveBeenCalledTimes(1);
	});

	it.each([
		['postgres-cred', 'user'],
		['postgres-cred', 'project'],
		['embed-cred', 'user'],
		['embed-cred', 'project'],
	])('rejects %s outside the %s scope before decrypting it', async (credentialId, scope) => {
		if (scope === 'user') {
			credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue(
				accessibleCredentials.filter(({ id }) => id !== credentialId),
			);
		} else {
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue(
				credentials.filter(({ id }) => id !== credentialId),
			);
		}
		const controller = Container.get(AgentVectorStoresController);

		await expect(controller.testConnection(request, response, { vectorStore })).resolves.toEqual({
			success: false,
			message: `Credential "${credentialId}" not found or not accessible`,
		});

		expect(credentialsHelper.getDecrypted).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: credentialId }),
			expect.anything(),
			expect.anything(),
		);
		expect(backend.query).not.toHaveBeenCalled();
		if (credentialId === 'postgres-cred') {
			expect(PgVectorStore).not.toHaveBeenCalled();
		} else {
			expect(backend.close).toHaveBeenCalledTimes(1);
		}
	});
});

it('builds the existing search tool through Knowledge code while the module is inactive', async () => {
	const agent = await buildFromJson(
		{
			name: 'Documentation agent',
			instructions: 'Answer questions using the documentation.',
			model: 'openai/gpt-4.1',
			credential: 'embed-cred',
			vectorStores: [vectorStore],
		},
		{},
		{
			credentialProvider: new AgentsCredentialProvider(credentialsService, 'project-1', user),
			toolExecutor: mock<ToolExecutor>(),
			memoryFactory: vi.fn<MemoryFactory>(),
		},
	);

	expect(PgVectorStore).toHaveBeenCalledWith('product_docs', {
		connectionString: 'postgresql://postgres:@localhost:5432/postgres',
		tableName: 'documents',
		connectionTimeoutMillis: 10_000,
	});
	expect(agent.snapshot.tools).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ name: 'search_product_docs', description: vectorStore.useWhen }),
		]),
	);
});
