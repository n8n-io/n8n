import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import { AgentKnowledgeService } from '@/modules/agents/agent-knowledge.service';
import { chatThreadId } from '@/modules/agents/agent-test-chat.service';
import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { ProjectService } from '@/services/project.service.ee';

import { createOwner } from '../shared/db/users';

describe('Agent conversations on project deletion', () => {
	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('removes project and builder conversations while preserving other instance-agent sessions', async () => {
		const owner = await createOwner();
		const project = await createTeamProject('Deleted project', owner);
		const otherProject = await createTeamProject('Kept project', owner);
		const agents = Container.get(AgentRepository);
		const threads = Container.get(AgentExecutionThreadRepository);
		const memory = Container.get(N8nMemory);
		const agent = await agents.save(
			agents.create({ name: 'Project agent', projectId: project.id, integrations: [] }),
		);
		const instanceAgent = await agents.save(
			agents.create({
				name: 'Instance agent',
				scope: 'instance',
				projectId: null,
				integrations: [],
			}),
		);
		const otherAgent = await agents.save(
			agents.create({ name: 'Other project agent', projectId: otherProject.id, integrations: [] }),
		);
		const builderId = chatThreadId(agent.id, owner.id);
		const keptBuilderId = chatThreadId(otherAgent.id, owner.id);
		const projectSessionId = uuid();
		const instanceSessionId = uuid();
		const keptInstanceSessionId = uuid();
		for (const [threadId, agentId, projectId] of [
			[projectSessionId, agent.id, project.id],
			[instanceSessionId, instanceAgent.id, project.id],
			[keptInstanceSessionId, instanceAgent.id, otherProject.id],
		]) {
			await threads.save(
				threads.create({
					id: threadId,
					agentId,
					agentName: 'Agent',
					projectId,
					accessScope: 'user',
					ownerId: owner.id,
				}),
			);
		}
		for (const [threadId, agentId] of [
			[builderId, agent.id],
			[projectSessionId, agent.id],
			[instanceSessionId, instanceAgent.id],
			[keptInstanceSessionId, instanceAgent.id],
			[keptBuilderId, otherAgent.id],
		]) {
			const store = memory.getImplementation(agentId);
			await store.saveThread({ id: threadId, resourceId: `draft-chat:${owner.id}` });
			await store.saveMessages({
				threadId,
				resourceId: `draft-chat:${owner.id}`,
				messages: [
					{
						id: uuid(),
						createdAt: new Date(),
						role: 'user',
						content: [{ type: 'text', text: 'A recorded request.' }],
					},
				],
			});
		}
		const logs = Container.get(AgentExecutionLogStore);
		const executions = Container.get(AgentExecutionRepository);
		const deletedLog = {
			agentId: instanceAgent.id,
			threadId: instanceSessionId,
			executionId: uuid(),
		};
		const keptLog = {
			agentId: instanceAgent.id,
			threadId: keptInstanceSessionId,
			executionId: uuid(),
		};
		for (const ref of [deletedLog, keptLog]) {
			await executions.save(
				executions.create({
					id: ref.executionId,
					threadId: ref.threadId,
					status: 'success',
					storedAt: 'fs',
				}),
			);
			await logs.write(ref, { timeline: [] }, 'fs');
		}
		// The fixture has no knowledge files. Avoid creating an external sandbox during cleanup.
		const sandbox = vi
			.spyOn(Container.get(AgentKnowledgeService), 'destroyKnowledgeSandbox')
			.mockResolvedValue();
		try {
			await Container.get(ProjectService).deleteProject(owner, project.id);
		} finally {
			sandbox.mockRestore();
		}

		for (const [threadId, agentId] of [
			[builderId, agent.id],
			[projectSessionId, agent.id],
			[instanceSessionId, instanceAgent.id],
		]) {
			const store = memory.getImplementation(agentId);
			expect(await store.getThread(threadId)).toBeNull();
			expect(await store.getMessages(threadId)).toEqual([]);
		}
		expect(
			await memory.getImplementation(instanceAgent.id).getMessages(keptInstanceSessionId),
		).toHaveLength(1);
		expect(await memory.getImplementation(otherAgent.id).getMessages(keptBuilderId)).toHaveLength(
			1,
		);
		expect(await threads.findOneBy({ id: keptInstanceSessionId })).not.toBeNull();
		expect(await agents.findOneBy({ id: instanceAgent.id })).not.toBeNull();
		expect(await Container.get(ProjectRepository).findOneBy({ id: project.id })).toBeNull();
		expect(await executions.findOneBy({ id: deletedLog.executionId })).toBeNull();
		expect(await logs.read(deletedLog, 'fs')).toBeNull();
		expect(await logs.read(keptLog, 'fs')).not.toBeNull();
		await logs.delete([{ ...keptLog, storedAt: 'fs' }]);
	});
});
