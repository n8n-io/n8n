import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { ConflictError } from '@n8n/errors';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { IntegrationMessageContextService } from '@/modules/agents/integrations/integration-message-context.service';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentThreadRepository } from '@/modules/agents/repositories/agent-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createOwner } from '../shared/db/users';

describe('Session bindings of a deleted task session', () => {
	let projectId: string;
	let userId: string;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		userId = (await createOwner()).id;
		projectId = (await createTeamProject()).id;
		agentId = randomUUID();
		await Container.get(AgentRepository).save({
			id: agentId,
			name: 'Agent',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	/** A task session that messaged one recipient, as a task run send leaves it. */
	async function createBoundTaskSession(parentThreadId?: string) {
		const taskThreadId = randomUUID();
		const recipientThreadId = `${agentId}:whatsapp:${randomUUID()}`;
		const origin = { threadId: taskThreadId, resourceId: `task:${randomUUID()}` };
		await Container.get(AgentExecutionThreadRepository).save({
			id: taskThreadId,
			agentId,
			agentName: 'Agent',
			projectId,
			ownerId: null,
			accessScope: 'project',
			sessionNumber: 1,
			parentThreadId: parentThreadId ?? null,
			parentAgentId: parentThreadId ? agentId : null,
		});
		const messageContext = Container.get(IntegrationMessageContextService);
		await messageContext.bindSession(recipientThreadId, origin, {
			recipientId: '15551234567',
			outboundText: 'Your order has shipped. Reply to change the address.',
		});
		return { taskThreadId, recipientThreadId, origin };
	}

	it.each(['task session', 'parent session'])(
		'clears the reply binding when deleting the %s',
		async (target) => {
			const parent = target === 'parent session' ? await createBoundTaskSession() : undefined;
			const { taskThreadId, recipientThreadId, origin } = await createBoundTaskSession(
				parent?.taskThreadId,
			);
			const messageContext = Container.get(IntegrationMessageContextService);
			expect(await messageContext.resolveSessionReplyScope(recipientThreadId)).toMatchObject({
				binding: origin,
			});

			await expect(
				Container.get(AgentExecutionService).deleteThread(
					projectId,
					agentId,
					parent?.taskThreadId ?? taskThreadId,
					userId,
				),
			).resolves.toBe(true);

			// Check the stored binding before reply routing can clear it.
			const recipientThread = await Container.get(AgentThreadRepository).findOneBy({
				id: recipientThreadId,
			});
			const metadata = jsonParse<Record<string, unknown>>(recipientThread!.metadata!);
			expect(metadata.continueAs).toBeUndefined();
			expect(metadata.outboundMessages).toBeUndefined();
			expect(await messageContext.resolveSessionReplyScope(recipientThreadId)).toBeNull();
		},
	);

	it('recovers on the next reply and the next task send when the cleanup fails', async () => {
		const { taskThreadId, recipientThreadId } = await createBoundTaskSession();
		const messageContext = Container.get(IntegrationMessageContextService);
		const cleanup = vi
			.spyOn(messageContext, 'clearSessionBindings')
			.mockRejectedValueOnce(new Error('database unavailable'));

		await expect(
			Container.get(AgentExecutionService).deleteThread(projectId, agentId, taskThreadId, userId),
		).resolves.toBe(true);
		expect(cleanup).toHaveBeenCalled();
		cleanup.mockRestore();

		// The binding to the deleted session is still stored, but it is ignored.
		await expect(messageContext.resolveSession(recipientThreadId)).resolves.toBeNull();
		expect(await messageContext.resolveSessionReplyScope(recipientThreadId)).toBeNull();
		const recipientThread = await Container.get(AgentThreadRepository).findOneBy({
			id: recipientThreadId,
		});
		const metadata = jsonParse<Record<string, unknown>>(recipientThread!.metadata!);
		expect(metadata.continueAs).toBeUndefined();
		expect(metadata.outboundMessages).toBeUndefined();

		// A later task that messages the same recipient takes the binding.
		const { origin: nextOrigin } = await createBoundTaskSession();
		await messageContext.bindSession(recipientThreadId, nextOrigin, { recipientId: '15551234567' });
		expect(await messageContext.resolveSessionReplyScope(recipientThreadId)).toMatchObject({
			binding: nextOrigin,
		});
	});

	it('keeps the bindings when the task session has a running execution', async () => {
		const { taskThreadId, recipientThreadId, origin } = await createBoundTaskSession();
		await Container.get(AgentExecutionRepository).save({
			id: randomUUID(),
			threadId: taskThreadId,
			source: 'chat',
			status: 'running',
		});

		await expect(
			Container.get(AgentExecutionService).deleteThread(projectId, agentId, taskThreadId, userId),
		).rejects.toThrow(ConflictError);

		const scope = await Container.get(IntegrationMessageContextService).resolveSessionReplyScope(
			recipientThreadId,
		);
		expect(scope).toMatchObject({
			binding: origin,
			outboundMessages: ['Your order has shipped. Reply to change the address.'],
		});
	});
});
