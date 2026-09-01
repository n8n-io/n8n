import type { Logger } from '@n8n/backend-common';
import type { IRun } from 'n8n-workflow';
import { createRunExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EventService } from '@/events/event.service';

import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import { formatResult, type WorkflowToolWaitRegistration } from '../workflow-tool-factory';
import { AgentWorkflowToolWaitService } from '../workflow-tool-wait.service';

const entry: WorkflowToolWaitRegistration = {
	runId: 'run-1',
	toolCallId: 'tc-1',
	agentId: 'agent-1',
	projectId: 'project-1',
	integrationType: 'n8n_chat',
	usePublishedVersion: false,
	allOutputs: false,
};

function makeCompletedRun(): IRun {
	return {
		mode: 'integrated',
		status: 'success',
		finished: true,
		startedAt: new Date(),
		stoppedAt: new Date(),
		storedAt: 'db',
		data: createRunExecutionData({
			resultData: {
				runData: {
					Result: [
						{
							data: { main: [[{ json: { answer: 42 } }]] },
							executionIndex: 0,
							startTime: 0,
							executionTime: 1,
							source: [],
						},
					],
				},
			},
		}),
	};
}

describe('AgentWorkflowToolWaitService', () => {
	let eventService: EventService;
	let orchestrator: { resumeForChat: ReturnType<typeof vi.fn> };
	let logger: ReturnType<typeof mock<Logger>>;
	let service: AgentWorkflowToolWaitService;

	beforeEach(() => {
		eventService = new EventService();
		orchestrator = {
			resumeForChat: vi.fn().mockImplementation(async function* () {
				yield { type: 'finish', finishReason: 'stop' };
			}),
		};
		logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		service = new AgentWorkflowToolWaitService(
			logger,
			eventService,
			orchestrator as unknown as AgentExecutionOrchestratorService,
		);
	});

	it('resumes the agent with formatted child output and deletes the entry', async () => {
		const runData = makeCompletedRun();
		service.register('exec-1', entry);

		eventService.emit('workflow-post-execute', {
			executionId: 'exec-1',
			workflow: { id: 'wf-1', name: 'Child' } as never,
			runData,
		});

		await vi.waitFor(() => {
			expect(orchestrator.resumeForChat).toHaveBeenCalled();
		});

		expect(orchestrator.resumeForChat).toHaveBeenCalledWith({
			agentId: 'agent-1',
			projectId: 'project-1',
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: formatResult('exec-1', runData.status, runData.data, false),
			integrationType: 'n8n_chat',
			usePublishedVersion: false,
		});
		expect(service.get('exec-1')).toBeUndefined();
	});

	it('drains the resume stream', async () => {
		const seen: unknown[] = [];
		orchestrator.resumeForChat.mockImplementation(async function* () {
			yield { type: 'text', text: 'hello' };
			yield { type: 'finish', finishReason: 'stop' };
			seen.push('completed');
		});
		service.register('exec-1', entry);

		eventService.emit('workflow-post-execute', {
			executionId: 'exec-1',
			workflow: { id: 'wf-1', name: 'Child' } as never,
			runData: makeCompletedRun(),
		});

		await vi.waitFor(() => {
			expect(seen).toEqual(['completed']);
		});
	});

	it('ignores executions that were not registered', async () => {
		service.register('exec-1', entry);

		eventService.emit('workflow-post-execute', {
			executionId: 'exec-other',
			workflow: { id: 'wf-1', name: 'Child' } as never,
			runData: makeCompletedRun(),
		});

		await Promise.resolve();
		expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		expect(service.get('exec-1')).toEqual(entry);
	});

	it('logs drain errors without throwing', async () => {
		orchestrator.resumeForChat.mockImplementation(() => {
			throw new Error('drain failed');
		});
		service.register('exec-1', entry);

		expect(() =>
			eventService.emit('workflow-post-execute', {
				executionId: 'exec-1',
				workflow: { id: 'wf-1', name: 'Child' } as never,
				runData: makeCompletedRun(),
			}),
		).not.toThrow();

		await vi.waitFor(() => {
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to resume agent after workflow tool child completed',
				expect.objectContaining({
					executionId: 'exec-1',
					agentId: 'agent-1',
					runId: 'run-1',
					toolCallId: 'tc-1',
				}),
			);
		});
		expect(service.get('exec-1')).toBeUndefined();
	});
});
