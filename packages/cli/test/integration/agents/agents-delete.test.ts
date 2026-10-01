import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { createOwner } from '../shared/db/users';

import { AgentsService } from '@/modules/agents/agents.service';
import { AgentMemoryEntryEntity } from '@/modules/agents/entities/agent-memory-entry.entity';
import { AgentMessageEntity } from '@/modules/agents/entities/agent-message.entity';
import { AgentResourceEntity } from '@/modules/agents/entities/agent-resource.entity';
import { N8nMemory, N8nMemoryImpl } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

describe('AgentsService.delete conversation memory', () => {
	let service: AgentsService;
	let agents: AgentRepository;
	let threads: AgentExecutionThreadRepository;
	let memory: N8nMemory;
	let dataSource: DataSource;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		service = Container.get(AgentsService);
		agents = Container.get(AgentRepository);
		threads = Container.get(AgentExecutionThreadRepository);
		memory = Container.get(N8nMemory);
		dataSource = Container.get(DataSource);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveConversation(agentId: string, threadId: string, resourceId: string) {
		const backend = memory.getImplementation(agentId);
		await backend.saveThread({ id: threadId, resourceId });
		await backend.saveMessages({
			threadId,
			resourceId,
			messages: [{ id: randomUUID(), createdAt: new Date(), role: 'user', content: [] }],
		});
		const [observation] = await backend.appendObservationLogEntries([
			{ observationScopeId: threadId, marker: 'info', text: 'Saved note', tokenCount: 2 },
		]);
		const entry = await backend.episodic.saveEntryWithSources(
			{ resourceId, content: `Saved note for ${threadId}` },
			[{ observationId: observation.id, threadId, evidenceText: 'Saved note' }],
		);
		if (!entry) throw new Error('Conversation memory entry is missing');
		return { backend, entryId: entry.id };
	}

	it.each(['uuid', 'workflow'])(
		'deletes %s sessions and preserves shared-resource conversations',
		async (format) => {
			const project = await createTeamProject();
			const owner = await createOwner();
			const agent = await service.create(project.id, 'Agent');
			const otherAgent = await service.create(project.id, 'Other agent');
			const resourceId = randomUUID();
			const threadId =
				format === 'uuid' ? randomUUID() : `workflow:project-${project.id}:${randomUUID()}`;
			const privateThreadId = randomUUID();
			const otherThreadId = randomUUID();
			await threads.save([
				{
					id: threadId,
					agentId: agent.id,
					agentName: agent.name,
					projectId: project.id,
					accessScope: 'project',
				},
				{
					id: privateThreadId,
					agentId: agent.id,
					agentName: agent.name,
					projectId: project.id,
					accessScope: 'user',
					ownerId: owner.id,
				},
				{
					id: otherThreadId,
					agentId: otherAgent.id,
					agentName: otherAgent.name,
					projectId: project.id,
				},
			]);
			await dataSource
				.getRepository(AgentResourceEntity)
				.save({ id: resourceId, metadata: '{"kept":true}' });
			const deletedThreadIds = [threadId, privateThreadId, `test-${agent.id}:legacy`];
			for (const sessionId of deletedThreadIds) {
				await saveConversation(agent.id, sessionId, resourceId);
			}
			const keptThreadIds = [otherThreadId, `test-${otherAgent.id}:legacy`];
			const controls = [];
			for (const sessionId of keptThreadIds) {
				controls.push(await saveConversation(otherAgent.id, sessionId, resourceId));
			}

			await expect(service.delete(agent.id, project.id)).resolves.toBe(true);

			expect(await agents.existsBy({ id: agent.id })).toBe(false);
			expect(await threads.countBy({ agentId: agent.id })).toBe(0);
			const backend = memory.getImplementation(agent.id);
			for (const sessionId of deletedThreadIds) {
				expect(await backend.getThread(sessionId)).toBeNull();
				expect(
					await dataSource.getRepository(AgentMessageEntity).countBy({ threadId: sessionId }),
				).toBe(0);
				expect(await backend.getObservationLog({ observationScopeId: sessionId })).toEqual([]);
			}
			expect(
				await dataSource.getRepository(AgentMemoryEntryEntity).countBy({ agentId: agent.id }),
			).toBe(0);
			expect(await agents.existsBy({ id: otherAgent.id })).toBe(true);
			expect(await threads.existsBy({ id: otherThreadId })).toBe(true);
			for (const [index, control] of controls.entries()) {
				const sessionId = keptThreadIds[index];
				expect(await control.backend.getThread(sessionId)).not.toBeNull();
				expect(
					await dataSource.getRepository(AgentMessageEntity).countBy({ threadId: sessionId }),
				).toBe(1);
				expect(
					await control.backend.getObservationLog({ observationScopeId: sessionId }),
				).toHaveLength(1);
				expect(await control.backend.episodic.getEntrySources([control.entryId])).toHaveLength(1);
				expect(
					await dataSource.getRepository(AgentMemoryEntryEntity).findOneBy({ id: control.entryId }),
				).toMatchObject({ status: 'active' });
			}
			expect(
				await dataSource.getRepository(AgentResourceEntity).findOneBy({ id: resourceId }),
			).toMatchObject({ metadata: '{"kept":true}' });
		},
	);

	it('keeps the agent and session ownership when memory cleanup fails, then permits a retry', async () => {
		const project = await createTeamProject();
		const agent = await service.create(project.id, 'Agent');
		const threadId = randomUUID();
		await threads.save({
			id: threadId,
			agentId: agent.id,
			agentName: agent.name,
			projectId: project.id,
		});
		const { backend } = await saveConversation(agent.id, threadId, randomUUID());
		const error = new Error('Memory cleanup failed');
		vi.spyOn(N8nMemoryImpl.prototype, 'deleteThread').mockRejectedValueOnce(error);

		await expect(service.delete(agent.id, project.id)).rejects.toBe(error);

		expect(await agents.existsBy({ id: agent.id })).toBe(true);
		expect(await threads.existsBy({ id: threadId, agentId: agent.id })).toBe(true);
		expect(await backend.getThread(threadId)).not.toBeNull();
		await expect(service.delete(agent.id, project.id)).resolves.toBe(true);
		expect(await agents.existsBy({ id: agent.id })).toBe(false);
		expect(await threads.existsBy({ id: threadId })).toBe(false);
		expect(await backend.getThread(threadId)).toBeNull();
	});
});
