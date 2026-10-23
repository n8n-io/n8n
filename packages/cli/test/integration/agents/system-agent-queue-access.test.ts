import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { AgentMessageQueueService } from '@/modules/agents/agent-message-queue.service';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';

import { createOwner } from '../shared/db/users';

const AGENT_ID = 'test-system-agent';

/**
 * The queue consumer does not run here, so a thread has no execution. A new
 * thread has no source at all. The system surface must still accept it.
 */
describe('System agent queue access before the first execution', () => {
	let service: SystemAgentExecutionService;
	let queue: AgentMessageQueueService;
	let owner: User;
	let projectId: string;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Test System Agent',
		authorize: async () => true,
		prepareTurn: async () => {
			throw new Error('The queue consumer does not run in this test');
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(SystemAgentExecutionService);
		queue = Container.get(AgentMessageQueueService);
		await service.register(provider);
		owner = await createOwner();
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id))
			.id;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const scope = (threadId: string) => ({
		projectId,
		agentId: AGENT_ID,
		threadId,
		userId: owner.id,
	});

	it('lists the empty queue of a new thread', async () => {
		const thread = await service.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId,
			title: 'New chat',
		});

		expect(await queue.listPending({ ...scope(thread.id), kind: 'system' })).toEqual({
			items: [],
			steerableExecutionId: null,
		});
	});

	it('refuses the Preview queue of a system thread without an execution', async () => {
		const thread = await service.createThread({ agentId: AGENT_ID, user: owner, projectId });

		await expect(queue.listPending({ ...scope(thread.id), kind: 'preview' })).rejects.toThrow(
			NotFoundError,
		);
	});
});
