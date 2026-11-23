import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { BinaryDataRepository, ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
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

	beforeAll(async () => {
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
	});

	async function createAgentWithFile(projectId: string) {
		const agent = await createTestAgent({
			name: 'Knowledge agent',
			projectId,
			schema: null,
			integrations: [],
		});
		const fileId = generateNanoId();
		const storageKey = uuid();
		const content = Buffer.from('Stored knowledge');
		await binaryData.insert({
			fileId: storageKey,
			sourceType: 'agent_file',
			sourceId: fileId,
			data: content,
			mimeType: 'text/plain',
			fileName: 'notes.txt',
			fileSize: content.length,
		});
		await dataSource
			.createQueryBuilder()
			.insert()
			.into(fileTable)
			.values({
				id: fileId,
				agentId: agent.id,
				storedAt: 'db',
				storageKey,
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: content.length,
			})
			.execute();
		return { agentId: agent.id, storageKey, content };
	}

	async function fileRowsForAgent(agentId: string) {
		return await dataSource
			.createQueryBuilder()
			.select('id')
			.from(fileTable, 'file')
			.where(`${dataSource.driver.escape('agentId')} = :agentId`, { agentId })
			.getRawMany<{ id: string }>();
	}

	it('deletes the agent and its stored bytes while preserving another agent in the same project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Agent deletion', owner);
		const deleted = await createAgentWithFile(project.id);
		const kept = await createAgentWithFile(project.id);

		await Container.get(AgentsService).delete(deleted.agentId, owner, project.id);

		expect(await agents.findById(deleted.agentId)).toBeNull();
		expect(await fileRowsForAgent(deleted.agentId)).toEqual([]);
		expect(await binaryData.findContentByFileId(deleted.storageKey)).toBeNull();
		expect(await fileRowsForAgent(kept.agentId)).toHaveLength(1);
		expect(await binaryData.findContentByFileId(kept.storageKey)).toEqual(kept.content);
	});

	it('deletes every agent file in a project while preserving files in another project', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Deleted project', owner);
		const otherProject = await createTeamProject('Kept project', owner);
		const deleted = [await createAgentWithFile(project.id), await createAgentWithFile(project.id)];
		const kept = await createAgentWithFile(otherProject.id);

		await Container.get(ProjectService).deleteProject(owner, project.id);

		expect(await Container.get(ProjectRepository).findOneBy({ id: project.id })).toBeNull();
		for (const file of deleted) {
			expect(await agents.findById(file.agentId)).toBeNull();
			expect(await fileRowsForAgent(file.agentId)).toEqual([]);
			expect(await binaryData.findContentByFileId(file.storageKey)).toBeNull();
		}
		expect(await fileRowsForAgent(kept.agentId)).toHaveLength(1);
		expect(await binaryData.findContentByFileId(kept.storageKey)).toEqual(kept.content);
	});
});
