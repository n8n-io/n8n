import type { AgentJsonVectorStoreConfig, StoredAgentConfig } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

const pinecone: AgentJsonVectorStoreConfig = {
	provider: 'pinecone',
	name: 'docs',
	credential: 'pinecone-credential',
	useWhen: 'Search the product docs',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-credential' },
	indexName: 'docs-index',
};

const qdrant: AgentJsonVectorStoreConfig = {
	provider: 'qdrant',
	name: 'tickets',
	credential: 'qdrant-credential',
	useWhen: 'Search old tickets',
	embedding: { model: 'openai/text-embedding-3-small', credential: 'openai-credential' },
	collectionName: 'tickets',
};

function schemaWith(vectorStores: AgentJsonVectorStoreConfig[]): StoredAgentConfig {
	return { name: 'Agent', model: 'm', instructions: 'i', vectorStores };
}

describe('AgentRepository.findPublishedVectorStoreProvidersPage', () => {
	let agentRepo: AgentRepository;
	let agentHistoryRepo: AgentHistoryRepository;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		agentHistoryRepo = Container.get(AgentHistoryRepository);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
	});

	afterEach(async () => {
		await agentHistoryRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(id: string, draftSchema: StoredAgentConfig): Promise<string> {
		const agent = agentRepo.create({
			id,
			name: 'Agent',
			projectId,
			schema: draftSchema,
		} as Partial<Agent>);
		await agentRepo.save(agent);

		return id;
	}

	async function publish(agentId: string, publishedSchema: StoredAgentConfig) {
		const versionId = uuid();
		await agentHistoryRepo.saveVersion({
			versionId,
			agentId,
			schema: publishedSchema,
			tools: {},
			publishedBy: 'test',
		});
		await agentRepo.update({ id: agentId }, { activeVersionId: versionId });
	}

	it('returns only published agents, with the providers of the published version', async () => {
		const publishedId = await createAgent('agent-a', schemaWith([pinecone, qdrant]));
		await publish(publishedId, schemaWith([pinecone]));
		await createAgent('agent-b', schemaWith([qdrant]));

		await expect(agentRepo.findPublishedVectorStoreProvidersPage(null, 10)).resolves.toEqual([
			{ agentId: publishedId, vectorStoreProviders: ['pinecone'] },
		]);
	});

	it('returns no providers for a published agent without vector stores', async () => {
		const agentId = await createAgent('agent-a', schemaWith([]));
		await publish(agentId, { name: 'Agent', model: 'm', instructions: 'i' });

		await expect(agentRepo.findPublishedVectorStoreProvidersPage(null, 10)).resolves.toEqual([
			{ agentId, vectorStoreProviders: [] },
		]);
	});

	it('leaves out instance agents', async () => {
		await agentRepo.ensureInstanceAgent('instance-agent', 'Instance agent');
		await publish('instance-agent', schemaWith([pinecone]));

		await expect(agentRepo.findPublishedVectorStoreProvidersPage(null, 10)).resolves.toEqual([]);
	});

	it('returns the agents in id order, one page after the other', async () => {
		for (const id of ['agent-c', 'agent-a', 'agent-b']) {
			await createAgent(id, schemaWith([]));
			await publish(id, schemaWith([]));
		}

		const firstPage = await agentRepo.findPublishedVectorStoreProvidersPage(null, 2);
		const secondPage = await agentRepo.findPublishedVectorStoreProvidersPage('agent-b', 2);

		expect(firstPage.map((agent) => agent.agentId)).toEqual(['agent-a', 'agent-b']);
		expect(secondPage.map((agent) => agent.agentId)).toEqual(['agent-c']);
	});
});
