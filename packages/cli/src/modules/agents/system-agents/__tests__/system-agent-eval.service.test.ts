import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import { SystemAgentEvalService } from '../system-agent-eval.service';
import type { SystemAgentExecutionService } from '../system-agent-execution.service';

const AGENT_ID = 'assistant';
const THREAD_ID = 'thread-1';
const PROJECT_ID = 'project-1';

describe('SystemAgentEvalService', () => {
	const user = mock<User>({ id: 'user-1' });

	function setup() {
		const systemAgents = mock<SystemAgentExecutionService>();
		const thread = mock<AgentExecutionThread>({ id: THREAD_ID, projectId: PROJECT_ID });
		systemAgents.createThread.mockResolvedValue(thread);
		systemAgents.getUsableThread.mockResolvedValue(thread);
		const impl = mock<N8nMemoryImpl>();
		const n8nMemory = mock<N8nMemory>();
		n8nMemory.getImplementation.mockReturnValue(impl);
		const service = new SystemAgentEvalService(systemAgents, n8nMemory);
		return { service, systemAgents, n8nMemory, impl };
	}

	describe('threads', () => {
		it('creates a thread and returns only its id and project', async () => {
			const { service, systemAgents } = setup();

			const result = await service.createThread({
				agentId: AGENT_ID,
				user,
				projectId: PROJECT_ID,
				threadId: THREAD_ID,
			});

			expect(result).toEqual({ id: THREAD_ID, projectId: PROJECT_ID });
			expect(systemAgents.createThread).toHaveBeenCalledWith({
				agentId: AGENT_ID,
				user,
				projectId: PROJECT_ID,
				threadId: THREAD_ID,
			});
		});

		it('deletes the thread through the access-checked runtime operation', async () => {
			const { service, systemAgents } = setup();

			await service.deleteThread(AGENT_ID, user, THREAD_ID);

			expect(systemAgents.deleteThread).toHaveBeenCalledWith(AGENT_ID, user, THREAD_ID);
		});

		it('returns the id and project of a thread that the user can use', async () => {
			const { service, systemAgents } = setup();

			await expect(service.getUsableThread(AGENT_ID, user, THREAD_ID)).resolves.toEqual({
				id: THREAD_ID,
				projectId: PROJECT_ID,
			});
			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, THREAD_ID);
		});

		it('rejects a thread that the user cannot use', async () => {
			const { service, systemAgents } = setup();
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(service.getUsableThread(AGENT_ID, user, THREAD_ID)).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('getThreadMemory', () => {
		it('reads the active observations and the cursor of the thread', async () => {
			const { service, n8nMemory, impl } = setup();
			impl.getActiveObservationLog.mockResolvedValue([
				{
					id: 'obs-1',
					observationScopeId: THREAD_ID,
					marker: 'important',
					text: 'User builds a Slack bot',
					tokenCount: 7,
					parentId: null,
					status: 'active',
					supersededBy: null,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
				},
			]);
			impl.getCursor.mockResolvedValue({
				observationScopeId: THREAD_ID,
				lastObservedMessageId: 'msg-1',
				lastObservedAt: new Date('2026-01-02T00:00:00.000Z'),
				updatedAt: new Date('2026-01-03T00:00:00.000Z'),
			});

			const result = await service.getThreadMemory(AGENT_ID, THREAD_ID);

			expect(n8nMemory.getImplementation).toHaveBeenCalledWith(AGENT_ID);
			expect(impl.getActiveObservationLog).toHaveBeenCalledWith({
				observationScopeId: THREAD_ID,
				order: 'asc',
			});
			expect(impl.getCursor).toHaveBeenCalledWith(THREAD_ID);
			expect(result).toEqual({
				observations: [{ marker: 'important', text: 'User builds a Slack bot', tokenCount: 7 }],
				cursor: {
					lastObservedMessageId: 'msg-1',
					lastObservedAt: new Date('2026-01-02T00:00:00.000Z'),
				},
			});
		});

		it('returns no cursor before the observer runs', async () => {
			const { service, impl } = setup();
			impl.getActiveObservationLog.mockResolvedValue([]);
			impl.getCursor.mockResolvedValue(null);

			await expect(service.getThreadMemory(AGENT_ID, THREAD_ID)).resolves.toEqual({
				observations: [],
				cursor: null,
			});
		});
	});
});
