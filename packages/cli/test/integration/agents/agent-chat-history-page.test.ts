import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { v4 as uuid } from 'uuid';

import type { AgentExecution } from '@/modules/agents/entities/agent-execution.entity';
import { AgentExecutionMessageLink } from '@/modules/agents/entities/agent-execution-message-link.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createAgent } from '../shared/db/agents';
import { createMember } from '../shared/db/users';

describe('Agent chat history pages', () => {
	let threadRepo: AgentExecutionThreadRepository;
	let agentRepo: AgentRepository;
	let executionRepo: AgentExecutionRepository;
	let messageRepo: AgentMessageRepository;
	let ownerId: string;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		threadRepo = Container.get(AgentExecutionThreadRepository);
		agentRepo = Container.get(AgentRepository);
		executionRepo = Container.get(AgentExecutionRepository);
		messageRepo = Container.get(AgentMessageRepository);
		ownerId = (await createMember()).id;
	});

	beforeEach(async () => {
		const projectId = (await createTeamProject()).id;
		const agent = await createAgent({
			id: uuid(),
			name: 'Agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
		const thread = await threadRepo.save(
			threadRepo.create({
				id: uuid(),
				agentId: agent.id,
				agentName: agent.name,
				projectId,
				accessScope: 'user',
				ownerId,
			}),
		);
		threadId = thread.id;
	});

	afterEach(async () => {
		await executionRepo.delete({});
		await threadRepo.delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function createExecution(id: string, createdAt: string): Promise<AgentExecution> {
		const execution = await executionRepo.save(
			executionRepo.create({ id, threadId, status: 'success' }),
		);
		await executionRepo.update({ id }, { createdAt: new Date(createdAt) });
		execution.createdAt = new Date(createdAt);
		return execution;
	}

	const ids = (executions: AgentExecution[]) => executions.map(({ id }) => id);

	describe('AgentExecutionRepository.findByThreadIdNewestFirst', () => {
		it('pages through the turns of a thread, newest first, with ties in createdAt', async () => {
			await createExecution('execution-a', '2026-05-07T10:00:00.000Z');
			// Two turns saved in the same millisecond keep their order by id.
			await createExecution('execution-b', '2026-05-07T10:01:00.000Z');
			await createExecution('execution-c', '2026-05-07T10:01:00.000Z');
			await createExecution('execution-d', '2026-05-07T10:02:00.000Z');

			const first = await executionRepo.findByThreadIdNewestFirst(threadId, 2);
			const second = await executionRepo.findByThreadIdNewestFirst(threadId, 2, first[1]);
			const last = await executionRepo.findByThreadIdNewestFirst(threadId, 2, second[1]);

			expect(ids(first)).toEqual(['execution-d', 'execution-c']);
			expect(ids(second)).toEqual(['execution-b', 'execution-a']);
			expect(last).toEqual([]);
		});
	});

	describe('AgentMessageRepository.continuesExecution', () => {
		it('is true for an execution that reuses the inputs of its predecessor', async () => {
			const suspended = await createExecution('execution-a', '2026-05-07T10:00:00.000Z');
			const resumed = await createExecution('execution-b', '2026-05-07T10:01:00.000Z');
			const next = await createExecution('execution-c', '2026-05-07T10:02:00.000Z');
			const linkInput = async (executionId: string, text: string) => {
				const message = await messageRepo.createInput(
					{
						threadId,
						resourceId: ownerId,
						content: { role: 'user', content: [{ type: 'text', text }] },
						origin: { source: 'system' },
					},
					{},
				);
				await Container.get(DataSource)
					.getRepository(AgentExecutionMessageLink)
					.insert({ executionId, messageId: message.id, direction: 'input', position: 0 });
			};
			await linkInput(suspended.id, 'Build a workflow');
			await messageRepo.copyExecutionInputs(resumed.id, suspended.id, threadId, {});
			await linkInput(next.id, 'Thanks');

			expect(await messageRepo.continuesExecution(resumed.id, suspended.id)).toBe(true);
			// The order does not matter, also when a tie in createdAt sorts the resume first.
			expect(await messageRepo.continuesExecution(suspended.id, resumed.id)).toBe(true);
			expect(await messageRepo.continuesExecution(next.id, resumed.id)).toBe(false);
		});
	});
});
