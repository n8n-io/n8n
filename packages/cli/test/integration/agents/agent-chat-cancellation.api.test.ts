import type { SerializableAgentState } from '@n8n/agents';
import { testModules } from '@n8n/backend-test-utils';
import { ProjectRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { AgentChatExecutionService } from '@/modules/agents/agent-chat-execution.service';
import { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

afterEach(() => vi.restoreAllMocks());

describe.each(['execution', 'run'] as const)('Preview %s cancellation HTTP route', (kind) => {
	it.each([undefined, 'all', 'foreground', 'invalid'])(
		'reads scope %s from the query string',
		async (scope) => {
			const owner = await createOwner();
			const project = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
				owner.id,
			);
			const agentId = randomUUID();
			const threadId = randomUUID();
			const executionId = randomUUID();
			const runId = randomUUID();
			await Container.get(AgentRepository).save({
				id: agentId,
				name: 'Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
			});
			await Container.get(AgentExecutionThreadRepository).save({
				id: threadId,
				agentId,
				agentName: 'Agent',
				projectId: project.id,
				ownerId: owner.id,
				accessScope: 'user',
				sessionNumber: 1,
			});
			await Container.get(AgentExecutionRepository).save({
				id: executionId,
				threadId,
				source: 'chat',
				status: kind === 'execution' ? 'running' : 'success',
			});
			const jobs = Container.get(AgentBackgroundJobService);
			const cancelJobs = vi.spyOn(jobs, 'cancelForParent').mockResolvedValue(undefined);
			const chat = Container.get(AgentChatExecutionService);
			const controller = new AbortController();
			const storage = Container.get(N8NCheckpointStorage);
			const checkpoint = mock<SerializableAgentState>({
				status: 'suspended',
				persistence: { threadId, resourceId: `draft-chat:${owner.id}` },
				pendingToolCalls: {},
			});
			vi.spyOn(storage, 'getStatus').mockResolvedValue({ status: 'active', checkpoint });
			const cancelSuspended = vi.spyOn(storage, 'cancelSuspended').mockResolvedValue(true);
			vi.spyOn(storage, 'delete').mockResolvedValue(undefined);
			if (kind === 'execution') {
				chat.register(
					{
						projectId: project.id,
						agentId,
						threadId,
						executionId,
						userId: owner.id,
						surface: 'preview',
					},
					controller,
				);
			}
			try {
				const path =
					kind === 'execution' ? `${threadId}/executions/${executionId}` : `runs/${runId}`;
				await server
					.authAgentFor(owner)
					.delete(`/projects/${project.id}/agents/v2/${agentId}/chat/${path}`)
					.query(scope === undefined ? {} : { scope })
					.expect(scope === 'invalid' ? 400 : 200);
				if (kind === 'execution') expect(controller.signal.aborted).toBe(scope !== 'invalid');
				else expect(cancelSuspended).toHaveBeenCalledTimes(scope === 'invalid' ? 0 : 1);
				if (scope === 'foreground' || scope === 'invalid') {
					expect(cancelJobs).not.toHaveBeenCalled();
				} else {
					expect(cancelJobs).toHaveBeenCalledExactlyOnceWith(
						agentId,
						threadId,
						`draft-chat:${owner.id}`,
					);
				}
			} finally {
				await chat.settle(executionId, async () => {});
			}
		},
	);
});
