import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';

import { AgentExecutionService } from '../agent-execution.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { MessageRecord } from '../execution-recorder';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const threadId = 'thread-1';
const projectId = 'project-1';

function makeRecord(overrides: Partial<MessageRecord> = {}): MessageRecord {
	return {
		assistantResponse: 'Hello',
		model: 'anthropic/claude-sonnet-4-5',
		finishReason: 'stop',
		usage: null,
		totalCost: null,
		toolCalls: [],
		timeline: [],
		startTime: 1_700_000_000_000,
		duration: 123,
		error: null,
		workingMemory: null,
		...overrides,
	};
}

describe('AgentExecutionService', () => {
	let agentExecutionRepository: jest.Mocked<AgentExecutionRepository>;
	let agentExecutionThreadRepository: jest.Mocked<AgentExecutionThreadRepository>;
	let agentRepository: jest.Mocked<AgentRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;
	let service: AgentExecutionService;

	beforeEach(() => {
		agentExecutionRepository = mock<AgentExecutionRepository>();
		agentExecutionThreadRepository = mock<AgentExecutionThreadRepository>();
		agentRepository = mock<AgentRepository>();
		n8nMemory = mock<N8nMemory>();

		agentExecutionThreadRepository.findOrCreate.mockResolvedValue({
			thread: mock<AgentExecutionThread>({
				id: threadId,
				agentId,
				projectId,
				title: 'Existing title',
			}),
			created: false,
		});
		agentExecutionRepository.create.mockImplementation((data) => data as AgentExecution);
		agentExecutionRepository.save.mockResolvedValue(mock<AgentExecution>({ id: 'execution-1' }));

		service = new AgentExecutionService(
			mockLogger(),
			agentExecutionRepository,
			agentExecutionThreadRepository,
			agentRepository,
			n8nMemory,
		);
	});

	it('increments the agent execution count after saving an execution row', async () => {
		await service.recordMessage({
			threadId,
			agentId,
			agentName: 'Support Agent',
			projectId,
			userMessage: 'Hello',
			record: makeRecord(),
		});

		expect(agentExecutionRepository.save).toHaveBeenCalledTimes(1);
		expect(agentRepository.incrementExecutionCount).toHaveBeenCalledWith(agentId);
	});

	it('does not increment the agent execution count when saving the execution row fails', async () => {
		agentExecutionRepository.save.mockRejectedValueOnce(new Error('insert failed'));

		await expect(
			service.recordMessage({
				threadId,
				agentId,
				agentName: 'Support Agent',
				projectId,
				userMessage: 'Hello',
				record: makeRecord(),
			}),
		).rejects.toThrow('insert failed');

		expect(agentRepository.incrementExecutionCount).not.toHaveBeenCalled();
	});
});
