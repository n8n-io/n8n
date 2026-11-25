import { testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository, TransactionRunner, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { randomUUID } from 'node:crypto';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';
import { SystemAgentRegistrationService } from '@/modules/agents/system-agents/system-agent-registration.service';
import type { SystemAgentProvider } from '@/modules/agents/system-agents/system-agent.types';

import { createOwner } from '../shared/db/users';

const AGENT_ID = 'test-system-agent';

describe('System agent sessions', () => {
	let service: SystemAgentExecutionService;
	let threads: AgentExecutionThreadRepository;
	let owner: User;
	let otherUser: User;
	let projectId: string;

	const provider: SystemAgentProvider = {
		agentId: AGENT_ID,
		name: 'Test System Agent',
		authorize: async () => true,
		prepareTurn: async () => {
			throw new Error('No turn runs in this test');
		},
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(SystemAgentExecutionService);
		threads = Container.get(AgentExecutionThreadRepository);
		await Container.get(SystemAgentRegistrationService).register(provider);
		owner = await createOwner();
		otherUser = await createOwner();
		projectId = (await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(owner.id))
			.id;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('creates a session for a new client session id and reuses it', async () => {
		const sessionId = randomUUID();

		const created = await service.createThread({
			agentId: AGENT_ID,
			user: owner,
			projectId,
			threadId: sessionId,
		});
		const input = await service.prepareChatMessage({
			agentId: AGENT_ID,
			user: owner,
			sessionId,
			message: 'Hello',
		});

		expect(created).toMatchObject({ id: sessionId, ownerId: owner.id, accessScope: 'user' });
		expect(input).toMatchObject({ threadId: sessionId, projectId });
	});

	it('refuses the session id of a thread of another user', async () => {
		const theirs = await service.createThread({ agentId: AGENT_ID, user: otherUser, projectId });

		await expect(
			service.prepareChatMessage({
				agentId: AGENT_ID,
				user: owner,
				projectId,
				sessionId: theirs.id,
				message: 'Hello',
			}),
		).rejects.toThrow(NotFoundError);
	});

	it('refuses the session id of a child thread of the user', async () => {
		const parent = await service.createThread({ agentId: AGENT_ID, user: owner, projectId });
		const childId = randomUUID();
		// `findOrCreate` locks the row on Postgres, which needs a transaction.
		await Container.get(TransactionRunner).run(
			{},
			async (ctx) =>
				await threads.findOrCreate(
					childId,
					AGENT_ID,
					'Test System Agent',
					projectId,
					{ accessScope: 'user', ownerId: owner.id },
					ctx,
					{ parentThreadId: parent.id, parentAgentId: AGENT_ID },
				),
		);

		await expect(
			service.prepareChatMessage({
				agentId: AGENT_ID,
				user: owner,
				projectId,
				sessionId: childId,
				message: 'Hello',
			}),
		).rejects.toThrow(NotFoundError);
	});
});
