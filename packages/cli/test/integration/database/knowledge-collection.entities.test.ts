import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v4 as uuid } from 'uuid';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	AgentKnowledgeDependency,
	KnowledgeCollection,
	KnowledgeFile,
	KnowledgeVectorStore,
	SharedKnowledgeCollection,
} from '@/modules/knowledge/entities';

import { createCredentials } from '../shared/db/credentials';
import { createMember } from '../shared/db/users';

describe('Knowledge collection entities', () => {
	let dataSource: DataSource;
	let project: Project;

	beforeAll(async () => {
		await testModules.loadModules(['knowledge', 'agents']);
		await testDb.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		project = await createTeamProject();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent() {
		const agentId = uuid();
		await Container.get(AgentRepository).insert({
			id: agentId,
			name: 'Knowledge agent',
			projectId: project.id,
			schema: null,
		});

		return agentId;
	}

	async function saveSharedCollection() {
		const collections = dataSource.getRepository(KnowledgeCollection);

		return await collections.save(
			collections.create({
				name: `Handbook ${generateNanoId()}`,
				description: 'Use for HR questions',
				slug: `kc-${generateNanoId()}`,
				kind: 'shared',
				ownerProjectId: project.id,
			}),
		);
	}

	it('saves a shared collection and reads its owner project through the relation', async () => {
		const author = await createMember();
		const collections = dataSource.getRepository(KnowledgeCollection);
		const saved = await collections.save(
			collections.create({
				name: 'Handbook',
				description: 'Use for HR questions',
				slug: `kc-${generateNanoId()}`,
				kind: 'shared',
				ownerProjectId: project.id,
				createdById: author.id,
			}),
		);

		const read = await collections.findOneOrFail({
			where: { id: saved.id },
			relations: { ownerProject: true },
		});

		expect(read).toMatchObject({
			name: 'Handbook',
			kind: 'shared',
			ownerProjectId: project.id,
			// SQLite stores the boolean as 0: the entity must read it back as `false`.
			isGlobal: false,
			createdById: author.id,
		});
		expect(read.ownerProject?.id).toBe(project.id);
	});

	it('saves the private collection of an agent without a project', async () => {
		const agentId = await createAgent();
		const collections = dataSource.getRepository(KnowledgeCollection);
		const saved = await collections.save(
			collections.create({
				name: 'Agent knowledge',
				slug: `kc-${generateNanoId()}`,
				kind: 'agent',
				agentId,
			}),
		);

		const read = await collections.findOneOrFail({
			where: { id: saved.id },
			relations: { ownerProject: true },
		});

		expect(read).toMatchObject({ kind: 'agent', agentId });
		expect(read.ownerProject).toBeNull();
	});

	it('saves the owner row of a collection', async () => {
		const collection = await saveSharedCollection();
		const shares = dataSource.getRepository(SharedKnowledgeCollection);
		await shares.save(
			shares.create({
				knowledgeCollectionId: collection.id,
				projectId: project.id,
				role: 'knowledgeCollection:owner',
			}),
		);

		const read = await shares.findOneByOrFail({ knowledgeCollectionId: collection.id });

		expect(read).toMatchObject({ projectId: project.id, role: 'knowledgeCollection:owner' });
	});

	it('saves a file', async () => {
		const collection = await saveSharedCollection();
		const files = dataSource.getRepository(KnowledgeFile);
		const saved = await files.save(
			files.create({
				knowledgeCollectionId: collection.id,
				name: 'leave-policy.pdf',
				storageKey: 'knowledge/leave-policy',
				mimeType: 'application/pdf',
				fileSizeBytes: 1024,
			}),
		);

		const read = await files.findOneByOrFail({ id: saved.id });

		expect(read).toMatchObject({
			knowledgeCollectionId: collection.id,
			name: 'leave-policy.pdf',
			storageKey: 'knowledge/leave-policy',
			fileSizeBytes: 1024,
		});
	});

	it('saves a vector store and reads its config back as JSON', async () => {
		const collection = await saveSharedCollection();
		const credential = await createCredentials({ name: 'Pinecone', type: 'pineconeApi', data: '' });
		const embeddingCredential = await createCredentials({
			name: 'OpenAI',
			type: 'openAiApi',
			data: '',
		});
		const config = { indexName: 'policies', namespace: 'hr', filters: { year: 2026 } };
		const stores = dataSource.getRepository(KnowledgeVectorStore);
		const saved = await stores.save(
			stores.create({
				knowledgeCollectionId: collection.id,
				name: 'policies',
				description: 'Search when the user asks about a policy',
				provider: 'pinecone',
				credentialId: credential.id,
				embeddingCredentialId: embeddingCredential.id,
				embeddingModel: 'openai/text-embedding-3-small',
				config,
			}),
		);

		const read = await stores.findOneByOrFail({ id: saved.id });

		expect(read).toMatchObject({
			provider: 'pinecone',
			credentialId: credential.id,
			embeddingCredentialId: embeddingCredential.id,
		});
		expect(read.config).toEqual(config);
	});

	it('saves the dependency of an agent on a collection', async () => {
		const agentId = await createAgent();
		const collection = await saveSharedCollection();
		const dependencies = dataSource.getRepository(AgentKnowledgeDependency);
		await dependencies.save(dependencies.create({ agentId, knowledgeCollectionId: collection.id }));

		const read = await dependencies.findOneByOrFail({ agentId });

		expect(read.knowledgeCollectionId).toBe(collection.id);
	});
});
