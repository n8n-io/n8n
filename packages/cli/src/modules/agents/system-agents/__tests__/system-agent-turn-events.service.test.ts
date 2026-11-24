import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../../agent-execution.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { TimelineEvent } from '../../execution-recorder';
import type { SystemAgentExecutionService } from '../system-agent-execution.service';
import { SystemAgentTurnEventsService } from '../system-agent-turn-events.service';

const AGENT_ID = 'assistant';
const THREAD_ID = 'thread-1';
const EXECUTION_ID = 'execution-1';

describe('SystemAgentTurnEventsService', () => {
	const user = mock<User>({ id: 'user-1' });
	const systemAgents = mock<SystemAgentExecutionService>();
	const agentExecutions = mock<AgentExecutionService>();
	const service = new SystemAgentTurnEventsService(systemAgents, agentExecutions);

	const timeline: TimelineEvent[] = [
		{ type: 'text', content: 'Hi', timestamp: 1 } as TimelineEvent,
		{ type: 'host-event', name: 'status', key: 'a', payload: { step: 1 }, timestamp: 2 },
		{ type: 'host-event', name: 'trace', key: 'turn', payload: { id: 'root-1' }, timestamp: 3 },
		{ type: 'host-event', name: 'status', key: 'b', payload: { step: 2 }, timestamp: 4 },
	];

	beforeEach(() => {
		vi.clearAllMocks();
		systemAgents.getUsableThread.mockResolvedValue(
			mock<AgentExecutionThread>({ id: THREAD_ID, projectId: 'project-1' }),
		);
		agentExecutions.findExecutionTimeline.mockResolvedValue(timeline);
	});

	it('checks access to the thread and returns the payload of the event', async () => {
		await expect(
			service.readHostEvent(AGENT_ID, user, THREAD_ID, EXECUTION_ID, 'trace'),
		).resolves.toEqual({ id: 'root-1' });

		expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, THREAD_ID);
		expect(agentExecutions.findExecutionTimeline).toHaveBeenCalledWith(
			AGENT_ID,
			THREAD_ID,
			EXECUTION_ID,
		);
	});

	it('returns the event with the key', async () => {
		await expect(
			service.readHostEvent(AGENT_ID, user, THREAD_ID, EXECUTION_ID, 'status', 'b'),
		).resolves.toEqual({ step: 2 });
	});

	it('returns undefined when the turn has no such event', async () => {
		await expect(
			service.readHostEvent(AGENT_ID, user, THREAD_ID, EXECUTION_ID, 'other'),
		).resolves.toBeUndefined();
	});

	it('returns undefined when the thread has no such turn', async () => {
		agentExecutions.findExecutionTimeline.mockResolvedValue(null);

		await expect(
			service.readHostEvent(AGENT_ID, user, THREAD_ID, EXECUTION_ID, 'trace'),
		).resolves.toBeUndefined();
	});

	it('does not read the turn of a thread that the user cannot use', async () => {
		systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(
			service.readHostEvent(AGENT_ID, user, THREAD_ID, EXECUTION_ID, 'trace'),
		).rejects.toThrow(NotFoundError);
		expect(agentExecutions.findExecutionTimeline).not.toHaveBeenCalled();
	});
});
