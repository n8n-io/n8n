import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { v4 as uuid } from 'uuid';

import { AgentFileRepository } from '@/modules/agents/repositories/agent-file.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentFileRepository knowledge totals', () => {
	let agentRepo: AgentRepository;
	let fileRepo: AgentFileRepository;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		fileRepo = Container.get(AgentFileRepository);
	});

	beforeEach(async () => {
		projectId = (await createTeamProject()).id;
	});

	afterEach(async () => {
		await fileRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createAgent(): Promise<string> {
		const agentId = uuid();
		await agentRepo.insert({
			id: agentId,
			name: 'Knowledge agent',
			projectId,
			schema: null,
		});

		return agentId;
	}

	async function addFile(agentId: string, fileName: string, fileSizeBytes: number) {
		const fileId = generateNanoId();
		await fileRepo.insert({
			id: fileId,
			agentId,
			storedAt: 'db',
			storageKey: `agents/${agentId}/knowledge-files/${fileId}/content`,
			fileName,
			mimeType: 'text/plain',
			fileSizeBytes,
		});
	}

	it('returns the file count and the size sum of an agent', async () => {
		const agentId = await createAgent();
		await addFile(agentId, 'a.txt', 100);
		await addFile(agentId, 'b.txt', 250);

		await expect(fileRepo.getKnowledgeTotals(agentId)).resolves.toEqual({
			fileCount: 2,
			totalBytes: 350,
		});
	});

	it('returns zero totals for an agent without files', async () => {
		const agentId = await createAgent();

		await expect(fileRepo.getKnowledgeTotals(agentId)).resolves.toEqual({
			fileCount: 0,
			totalBytes: 0,
		});
	});

	it('returns the totals of each agent and leaves out agents without files', async () => {
		const firstAgentId = await createAgent();
		const secondAgentId = await createAgent();
		const agentWithoutFilesId = await createAgent();
		await addFile(firstAgentId, 'a.txt', 100);
		await addFile(secondAgentId, 'a.txt', 40);
		await addFile(secondAgentId, 'b.txt', 60);

		const totalsByAgentId = await fileRepo.getKnowledgeTotalsByAgentIds([
			firstAgentId,
			secondAgentId,
			agentWithoutFilesId,
		]);

		expect(totalsByAgentId).toEqual(
			new Map([
				[firstAgentId, { fileCount: 1, totalBytes: 100 }],
				[secondAgentId, { fileCount: 2, totalBytes: 100 }],
			]),
		);
	});

	it('returns an empty map for an empty list of agents', async () => {
		await expect(fileRepo.getKnowledgeTotalsByAgentIds([])).resolves.toEqual(new Map());
	});
});
