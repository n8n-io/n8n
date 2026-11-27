import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createAgent } from '@test-integration/db/agents';

import { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';

describe('AgentExecutionThreadRepository test chat marker', () => {
	let db: DataSource;
	let repository: AgentExecutionThreadRepository;
	let agentId: string;
	let projectId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		db = Container.get(DataSource);
		repository = Container.get(AgentExecutionThreadRepository);
		({ id: projectId } = await createTeamProject());
		agentId = randomUUID();
		await createAgent({
			id: agentId,
			name: 'Test chat marker',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	afterEach(async () => {
		await db.getRepository(AgentExecutionThread).delete({ agentId });
	});
	afterAll(async () => await testDb.terminate());

	async function createThread() {
		return await db.getRepository(AgentExecutionThread).save({
			id: randomUUID(),
			agentId,
			agentName: 'Test chat marker',
			projectId,
			sessionNumber: 1,
		});
	}

	it('reports an existing thread as not a test chat until it is marked', async () => {
		const thread = await createThread();

		await expect(repository.findTestChatState(thread.id)).resolves.toEqual({ testChat: false });
	});

	it('reports nothing for a thread that does not exist yet', async () => {
		await expect(repository.findTestChatState(randomUUID())).resolves.toBeUndefined();
	});

	it('marks an existing thread, and the marker is read back', async () => {
		const thread = await createThread();

		await expect(repository.markTestChat(thread.id)).resolves.toBe(true);
		await expect(repository.findTestChatState(thread.id)).resolves.toEqual({ testChat: true });
	});

	it('marks only the given thread', async () => {
		const marked = await createThread();
		const other = await createThread();

		await repository.markTestChat(marked.id);

		await expect(repository.findTestChatState(other.id)).resolves.toEqual({ testChat: false });
	});

	it('reports false when the thread to mark does not exist', async () => {
		await expect(repository.markTestChat(randomUUID())).resolves.toBe(false);
	});
});
