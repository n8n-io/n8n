import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { isUniqueConstraintError } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { createAgent } from '@test-integration/db/agents';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	AgentKnowledgeDependency,
	KnowledgeCollection,
	KnowledgeFile,
} from '@/modules/knowledge/entities';
import { KnowledgeCollectionFileRepository } from '@/modules/knowledge/repositories/knowledge-collection-file.repository';
import { KnowledgeCollectionRepository } from '@/modules/knowledge/repositories/knowledge-collection.repository';

describe('Knowledge collection repositories', () => {
	let collectionRepo: KnowledgeCollectionRepository;
	let fileRepo: KnowledgeCollectionFileRepository;
	let collectionTable: Repository<KnowledgeCollection>;
	let fileTable: Repository<KnowledgeFile>;
	let dependencyTable: Repository<AgentKnowledgeDependency>;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['knowledge', 'agents']);
		await testDb.init();
		collectionRepo = Container.get(KnowledgeCollectionRepository);
		fileRepo = Container.get(KnowledgeCollectionFileRepository);
		const dataSource = Container.get(DataSource);
		collectionTable = dataSource.getRepository(KnowledgeCollection);
		fileTable = dataSource.getRepository(KnowledgeFile);
		dependencyTable = dataSource.getRepository(AgentKnowledgeDependency);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
	});

	afterEach(async () => {
		// The files and the agent dependencies go with their collection.
		await collectionTable.delete({});
		await Container.get(AgentRepository).delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createCollection(
		overrides: Partial<Pick<KnowledgeCollection, 'name' | 'projectId'>> = {},
	): Promise<string> {
		const id = generateNanoId();
		await collectionTable.insert({
			id,
			name: `Collection ${id}`,
			description: 'Product documents',
			slug: `collection_${id}`.slice(0, 24),
			kind: 'shared',
			projectId,
			...overrides,
		});

		return id;
	}

	async function createPrivateCollection(agentId: string): Promise<string> {
		const id = generateNanoId();
		await collectionTable.insert({
			id,
			name: `Private ${id}`,
			slug: `agent_${id}`.slice(0, 24),
			kind: 'agent',
			agentId,
		});

		return id;
	}

	function fileParams(collectionId: string, name: string) {
		const fileId = generateNanoId();
		return {
			id: fileId,
			knowledgeCollectionId: collectionId,
			name,
			storedAt: 'db' as const,
			storageKey: `knowledge-collections/${collectionId}/files/${fileId}/content`,
			mimeType: 'text/plain',
			fileSizeBytes: 10,
			createdById: null,
		};
	}

	describe('KnowledgeCollectionRepository', () => {
		it('finds a collection by id in its home project only', async () => {
			const collectionId = await createCollection();
			const otherProjectId = (await createTeamProject()).id;

			await expect(
				collectionRepo.findByIdAndProjectId(collectionId, projectId, {}),
			).resolves.toMatchObject({ id: collectionId, projectId });
			await expect(
				collectionRepo.findByIdAndProjectId(collectionId, otherProjectId, {}),
			).resolves.toBeNull();
			await expect(
				collectionRepo.findByIdAndProjectId('missing', projectId, {}),
			).resolves.toBeNull();
		});

		it('finds the agents that use a collection', async () => {
			const collectionId = await createCollection();
			const otherCollectionId = await createCollection();
			const createAgentId = async () => (await createAgent({ projectId })).id;
			const firstAgentId = await createAgentId();
			const secondAgentId = await createAgentId();
			const otherAgentId = await createAgentId();
			await dependencyTable.insert([
				{ agentId: firstAgentId, knowledgeCollectionId: collectionId },
				{ agentId: secondAgentId, knowledgeCollectionId: collectionId },
				{ agentId: otherAgentId, knowledgeCollectionId: otherCollectionId },
			]);

			const agentIds = await collectionRepo.findAgentIds(collectionId, {});

			expect(agentIds.sort()).toEqual([firstAgentId, secondAgentId].sort());
		});

		describe('findUsableByAgent', () => {
			it('finds the linked collections that the project of the agent owns, by name', async () => {
				const agent = await createAgent({ projectId });
				const secondId = await createCollection({ name: 'B docs' });
				const firstId = await createCollection({ name: 'A docs' });
				await createCollection({ name: 'Not linked' });
				await dependencyTable.insert([
					{ agentId: agent.id, knowledgeCollectionId: secondId },
					{ agentId: agent.id, knowledgeCollectionId: firstId },
				]);

				const collections = await collectionRepo.findUsableByAgent(agent.id, projectId, {});

				expect(collections.map(({ id }) => id)).toEqual([firstId, secondId]);
				expect(collections[0]).toBeInstanceOf(KnowledgeCollection);
				expect(await collectionRepo.hasUsableByAgent(agent.id, projectId, {})).toBe(true);
			});

			it('leaves out a linked collection that another project owns', async () => {
				const agent = await createAgent({ projectId });
				const otherProjectId = (await createTeamProject()).id;
				const foreignId = await createCollection({ projectId: otherProjectId });
				await dependencyTable.insert({ agentId: agent.id, knowledgeCollectionId: foreignId });

				await expect(collectionRepo.findUsableByAgent(agent.id, projectId, {})).resolves.toEqual(
					[],
				);
				expect(await collectionRepo.hasUsableByAgent(agent.id, projectId, {})).toBe(false);
			});

			it('leaves out the private collection of the agent and the collections of other agents', async () => {
				const agent = await createAgent({ projectId });
				const otherAgent = await createAgent({ projectId });
				const privateId = await createPrivateCollection(agent.id);
				const otherAgentCollectionId = await createCollection();
				await dependencyTable.insert([
					{ agentId: agent.id, knowledgeCollectionId: privateId },
					{ agentId: otherAgent.id, knowledgeCollectionId: otherAgentCollectionId },
				]);

				await expect(collectionRepo.findUsableByAgent(agent.id, projectId, {})).resolves.toEqual(
					[],
				);
				expect(await collectionRepo.hasUsableByAgent(agent.id, projectId, {})).toBe(false);
			});
		});
	});

	describe('KnowledgeCollectionFileRepository', () => {
		it('saves a file and lists the files of a collection in upload order', async () => {
			const collectionId = await createCollection();
			const otherCollectionId = await createCollection();
			const first = await fileRepo.saveUploadedFile(fileParams(collectionId, 'first.txt'), {});
			await fileTable.update(first.id, { createdAt: new Date('2020-01-01T00:00:00.000Z') });
			const second = await fileRepo.saveUploadedFile(fileParams(collectionId, 'second.txt'), {});
			await fileRepo.saveUploadedFile(fileParams(otherCollectionId, 'other.txt'), {});

			expect(first).toBeInstanceOf(KnowledgeFile);
			const files = await fileRepo.findByCollectionId(collectionId, {});

			expect(files.map((file) => file.id)).toEqual([first.id, second.id]);
			expect(files[1]).toMatchObject({ name: 'second.txt', fileSizeBytes: 10 });
		});

		it('lists the files of several collections, grouped by collection in upload order', async () => {
			const firstCollectionId = await createCollection();
			const secondCollectionId = await createCollection();
			await fileRepo.saveUploadedFile(fileParams(await createCollection(), 'other.txt'), {});
			const [earlierId, laterId] = [firstCollectionId, secondCollectionId].sort();
			const laterFirst = await fileRepo.saveUploadedFile(fileParams(laterId, 'first.txt'), {});
			await fileTable.update(laterFirst.id, { createdAt: new Date('2020-01-01T00:00:00.000Z') });
			const laterSecond = await fileRepo.saveUploadedFile(fileParams(laterId, 'second.txt'), {});
			const earlier = await fileRepo.saveUploadedFile(fileParams(earlierId, 'only.txt'), {});

			const files = await fileRepo.findByCollectionIds([firstCollectionId, secondCollectionId], {});

			expect(files.map((file) => file.id)).toEqual([earlier.id, laterFirst.id, laterSecond.id]);
			await expect(fileRepo.findByCollectionIds([], {})).resolves.toEqual([]);
		});

		it('rejects a second file with the same name in one collection', async () => {
			const collectionId = await createCollection();
			await fileRepo.saveUploadedFile(fileParams(collectionId, 'same.txt'), {});

			const error = await fileRepo
				.saveUploadedFile(fileParams(collectionId, 'same.txt'), {})
				.catch((caught: unknown) => caught);

			expect(isUniqueConstraintError(error)).toBe(true);
			expect(await fileTable.countBy({ knowledgeCollectionId: collectionId })).toBe(1);
		});

		it('accepts the same file name in another collection', async () => {
			const collectionId = await createCollection();
			const otherCollectionId = await createCollection();
			await fileRepo.saveUploadedFile(fileParams(collectionId, 'same.txt'), {});

			await expect(
				fileRepo.saveUploadedFile(fileParams(otherCollectionId, 'same.txt'), {}),
			).resolves.toMatchObject({ name: 'same.txt' });
		});

		it('finds and deletes a file only in its own collection', async () => {
			const collectionId = await createCollection();
			const otherCollectionId = await createCollection();
			const file = await fileRepo.saveUploadedFile(fileParams(collectionId, 'file.txt'), {});

			await expect(
				fileRepo.findByIdAndCollectionId({ fileId: file.id, collectionId: otherCollectionId }, {}),
			).resolves.toBeNull();
			await fileRepo.deleteByIdAndCollectionId(
				{ fileId: file.id, collectionId: otherCollectionId },
				{},
			);
			await expect(
				fileRepo.findByIdAndCollectionId({ fileId: file.id, collectionId }, {}),
			).resolves.toMatchObject({ id: file.id });

			await fileRepo.deleteByIdAndCollectionId({ fileId: file.id, collectionId }, {});

			await expect(
				fileRepo.findByIdAndCollectionId({ fileId: file.id, collectionId }, {}),
			).resolves.toBeNull();
		});
	});
});
