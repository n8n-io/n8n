import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { BinaryDataRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { FsByteStoreService, StorageConfig } from 'n8n-core';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuid } from 'uuid';

import { createAgent as createTestAgent } from '@test-integration/db/agents';

import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AgentFile } from '@/modules/knowledge/entities';
import { KnowledgeAvailabilityService } from '@/modules/knowledge/knowledge-availability.service';
import { ProjectService } from '@/services/project.service.ee';

import { createOwner } from '../shared/db/users';

describe('Knowledge cleanup with the module disabled', () => {
	let dataSource: DataSource;
	let fileTable: string;
	let agents: AgentRepository;
	let binaryData: BinaryDataRepository;
	let fsByteStore: FsByteStoreService;
	let storagePath: string;

	beforeAll(async () => {
		storagePath = await mkdtemp(join(tmpdir(), 'knowledge-cleanup-'));
		Container.get(StorageConfig).storagePath = storagePath;
		fsByteStore = Container.get(FsByteStoreService);
		await testModules.loadModules(['agents']);
		await testDb.init();
		dataSource = Container.get(DataSource);
		const { driver, options } = dataSource;
		fileTable = driver.buildTableName(
			`${options.entityPrefix ?? ''}agent_files`,
			options.type === 'postgres' ? options.schema : undefined,
		);
		agents = Container.get(AgentRepository);
		binaryData = Container.get(BinaryDataRepository);
	});

	beforeEach(() => {
		expect(Container.get(KnowledgeAvailabilityService).isModuleActive()).toBe(false);
		expect(dataSource.hasMetadata(AgentFile)).toBe(false);
		vi.spyOn(Container.get(AgentKnowledgeService), 'destroyKnowledgeSandbox').mockResolvedValue();
	});

	afterEach(() => vi.restoreAllMocks());

	afterAll(async () => {
		await testDb.terminate();
		await rm(storagePath, { recursive: true, force: true });
	});

	async function createAgentWithFile(projectId: string, storedAt: 'db' | 'fs') {
		const agent = await createTestAgent({
			name: 'Knowledge agent',
			projectId,
			schema: null,
			integrations: [],
		});
		const fileId = generateNanoId();
		const storageKey =
			storedAt === 'db' ? uuid() : `agents/${agent.id}/knowledge-files/${fileId}/content`;
		const content = Buffer.from('Stored knowledge');
		if (storedAt === 'db') {
			await binaryData.insert({
				fileId: storageKey,
				sourceType: 'agent_file',
				sourceId: fileId,
				data: content,
				mimeType: 'text/plain',
				fileName: 'notes.txt',
				fileSize: content.length,
			});
		} else {
			await fsByteStore.write(storageKey, content);
		}
		await dataSource
			.createQueryBuilder()
			.insert()
			.into(fileTable)
			.values({
				id: fileId,
				agentId: agent.id,
				storedAt,
				storageKey,
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: content.length,
			})
			.execute();
		return { agentId: agent.id, storedAt, storageKey, content };
	}

	async function storedContent(file: { storedAt: 'db' | 'fs'; storageKey: string }) {
		return file.storedAt === 'db'
			? await binaryData.findContentByFileId(file.storageKey)
			: await fsByteStore.read(file.storageKey);
	}

	async function fileRowsForAgent(agentId: string) {
		return await dataSource
			.createQueryBuilder()
			.select('id')
			.from(fileTable, 'file')
			.where(`${dataSource.driver.escape('agentId')} = :agentId`, { agentId })
			.getRawMany<{ id: string }>();
	}

	it.each(['db', 'fs'] as const)(
		'deletes the agent and its %s bytes while preserving another agent in the same project',
		async (storedAt) => {
			const owner = await createOwner();
			const project = await createTeamProject('Agent deletion', owner);
			const deleted = await createAgentWithFile(project.id, storedAt);
			const kept = await createAgentWithFile(project.id, storedAt);

			expect(await storedContent(deleted)).toEqual(deleted.content);

			await Container.get(AgentsService).delete(deleted.agentId, owner, project.id);

			expect(await agents.findById(deleted.agentId)).toBeNull();
			expect(await fileRowsForAgent(deleted.agentId)).toEqual([]);
			expect(await storedContent(deleted)).toBeNull();
			expect(await fileRowsForAgent(kept.agentId)).toHaveLength(1);
			expect(await storedContent(kept)).toEqual(kept.content);
		},
	);

	it.each(['db', 'fs'] as const)(
		'deletes every %s agent file in a project while preserving files in another project',
		async (storedAt) => {
			const owner = await createOwner();
			const project = await createTeamProject('Deleted project', owner);
			const otherProject = await createTeamProject('Kept project', owner);
			const deleted = [
				await createAgentWithFile(project.id, storedAt),
				await createAgentWithFile(project.id, storedAt),
			];
			const kept = await createAgentWithFile(otherProject.id, storedAt);

			for (const file of deleted) {
				expect(await storedContent(file)).toEqual(file.content);
			}

			await Container.get(ProjectService).deleteProject(owner, project.id);

			expect(await Container.get(ProjectRepository).findOneBy({ id: project.id })).toBeNull();
			for (const file of deleted) {
				expect(await agents.findById(file.agentId)).toBeNull();
				expect(await fileRowsForAgent(file.agentId)).toEqual([]);
				expect(await storedContent(file)).toBeNull();
			}
			expect(await fileRowsForAgent(kept.agentId)).toHaveLength(1);
			expect(await storedContent(kept)).toEqual(kept.content);
		},
	);
});
