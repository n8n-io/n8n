import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentSessionLeaseLostError } from '@/modules/agents/agent-session-lease-lost.error';
import { AgentSessionLeaseService } from '@/modules/agents/agent-session-lease.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentMessageRepository } from '@/modules/agents/repositories/agent-message.repository';
import { AgentResourceRepository } from '@/modules/agents/repositories/agent-resource.repository';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

/**
 * Each area checks that a turn whose lease another main took over cannot
 * write, and that the same write outside a turn still works. The turn uses
 * the container services, so the adapters share the turn scope of the lease
 * service. A takeover marks the execution of the turn interrupted.
 */
describe('Fenced agent session writes', () => {
	let agentRepo: AgentRepository;
	let sessionLeases: AgentSessionLeaseService;
	let projectId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		agentRepo = Container.get(AgentRepository);
		sessionLeases = Container.get(AgentSessionLeaseService);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		projectId = project.id;
		const agent = agentRepo.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepo.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await Container.get(AgentThreadRepository).delete({});
		await Container.get(AgentResourceRepository).delete({});
		await agentRepo.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** Starts a turn on this main, then lets another main take over its session. */
	async function startStaleTurn(threadId: string) {
		const threads = Container.get(AgentExecutionThreadRepository);
		const executions = Container.get(AgentExecutionRepository);
		await threads.save(
			threads.create({
				id: threadId,
				accessScope: 'project',
				agentId,
				agentName: 'Test Agent',
				projectId,
				sessionNumber: 1,
			}),
		);
		const { id: executionId } = await executions.save(
			executions.create({ id: uuid(), threadId, status: 'running', userMessage: null }),
		);
		sessionLeases.hold(executionId);
		await executions.update(executionId, { status: 'interrupted' });

		return {
			write: async <T>(fn: () => Promise<T>) => await sessionLeases.runInTurn(executionId, fn),
			settle: () => sessionLeases.release(executionId),
		};
	}

	describe('memory transcript', () => {
		it('rejects the transcript writes of a turn whose lease another main took over', async () => {
			const threadId = uuid();
			const staleTurn = await startStaleTurn(threadId);
			const memory = Container.get(N8nMemory).getImplementation(agentId);
			const messages = Container.get(AgentMessageRepository);
			const message = {
				id: uuid(),
				createdAt: new Date(),
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'Hello' }],
			};
			const thread = { id: threadId, resourceId: 'user-1' };

			await expect(staleTurn.write(async () => await memory.saveThread(thread))).rejects.toThrow(
				AgentSessionLeaseLostError,
			);
			await expect(
				staleTurn.write(
					async () => await memory.saveMessages({ ...thread, threadId, messages: [message] }),
				),
			).rejects.toThrow(AgentSessionLeaseLostError);
			await expect(
				staleTurn.write(async () => await memory.deleteMessages([message.id])),
			).rejects.toThrow(AgentSessionLeaseLostError);
			expect(await Container.get(AgentThreadRepository).findOneBy({ id: threadId })).toBeNull();

			await memory.saveThread(thread);
			await memory.saveMessages({ ...thread, threadId, messages: [message] });
			expect(await messages.countBy({ threadId })).toBe(1);
			await memory.deleteMessages([message.id]);
			expect(await messages.countBy({ threadId })).toBe(0);

			staleTurn.settle();
		});
	});
});
