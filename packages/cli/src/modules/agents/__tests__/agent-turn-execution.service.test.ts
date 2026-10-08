import type { StreamChunk } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import { UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService, RecordMessageParams } from '../agent-execution.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../agent-message-steering.service';
import type { AgentToolApprovalService } from '../agent-tool-approval.service';
import { AgentTurnExecutionService, type AgentTurnRequest } from '../agent-turn-execution.service';
import type { AgentThreadAccess } from '../entities/agent-execution-thread.entity';

const context = { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' };

function streamOf(chunks: StreamChunk[]): ReadableStream<StreamChunk> {
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(chunk);
			controller.close();
		},
	});
}

function setup() {
	const executionService = mock<AgentExecutionService>();
	executionService.startExecutionRecording.mockResolvedValue({
		executionId: 'execution-1',
		startedAt: new Date(),
		inputMessageIds: [],
	});
	executionService.getAbortSignal.mockReturnValue(new AbortController().signal);
	executionService.finalizeExecution.mockResolvedValue('execution-1');
	const chatExecutionService = mock<AgentChatExecutionService>();
	chatExecutionService.settle.mockImplementation(async (_id, finalize) => await finalize());
	const toolApprovalService = mock<AgentToolApprovalService>();
	toolApprovalService.createContext.mockResolvedValue({
		approvedKeys: new Set<string>(),
		onDecision: vi.fn(),
	});
	const agent = {
		resume: vi.fn(
			async (_mode: string, _data: unknown, options: { onResumeClaimed?: () => Promise<void> }) => {
				await options.onResumeClaimed?.();
				return { stream: streamOf([{ type: 'finish', finishReason: 'stop' } as StreamChunk]) };
			},
		),
	};
	const service = new AgentTurnExecutionService(
		mockLogger(),
		executionService,
		chatExecutionService,
		mock<AgentMessageQueueService>(),
		mock<AgentMessageSteeringService>(),
		toolApprovalService,
	);
	return { service, executionService, chatExecutionService, agent };
}

function resumeTurn(
	access: AgentThreadAccess,
	answeredBy?: Extract<AgentTurnRequest, { type: 'resume' }>['answeredBy'],
) {
	return {
		type: 'resume',
		resumeData: { approved: true },
		...(answeredBy ? { answeredBy } : {}),
		options: { runId: 'run-1', toolCallId: 'tc-1' },
		recording: {
			...context,
			agentName: 'Agent',
			access,
			userMessage: null,
			sessionMode: 'existing',
		},
	} as AgentTurnRequest;
}

async function run(
	fixtures: ReturnType<typeof setup>,
	turn: AgentTurnRequest,
): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	const stream = fixtures.service.execute({
		agentInstance: fixtures.agent as never,
		toolRegistry: new Map(),
		mcpServerAttributions: new Map(),
		context,
		previewChat: true,
		prepare: async () => turn,
	});
	for await (const chunk of stream) chunks.push(chunk as StreamChunk);
	return chunks;
}

function recordedTimeline(executionService: ReturnType<typeof setup>['executionService']) {
	const params = executionService.finalizeExecution.mock.calls[0]?.[1] as RecordMessageParams;
	return params.record.timeline;
}

describe('AgentTurnExecutionService', () => {
	it('runs a preview resume of a shared thread under its owner', async () => {
		const fixtures = setup();

		await run(fixtures, resumeTurn({ accessScope: 'project', ownerId: 'owner-1' }));

		expect(fixtures.chatExecutionService.register).toHaveBeenCalledWith(
			expect.objectContaining({ ...context, userId: 'owner-1', executionId: 'execution-1' }),
			expect.any(AbortController),
		);
		expect(fixtures.agent.resume).toHaveBeenCalledOnce();
	});

	it('refuses a preview turn of a project thread without owner', async () => {
		const fixtures = setup();

		const turn = run(fixtures, resumeTurn({ accessScope: 'project', ownerId: null }));
		await expect(turn).rejects.toThrow(UnexpectedError);
		await expect(turn).rejects.toThrow('A preview execution must have an owning user.');
		expect(fixtures.agent.resume).not.toHaveBeenCalled();
		expect(fixtures.executionService.startExecutionRecording).not.toHaveBeenCalled();
	});

	it('records the user who answered with the answer', async () => {
		const fixtures = setup();
		const answeredBy = { id: 'user-2', name: 'Grace Hopper' };

		await run(fixtures, resumeTurn({ accessScope: 'project', ownerId: 'owner-1' }, answeredBy));

		expect(recordedTimeline(fixtures.executionService)).toContainEqual(
			expect.objectContaining({
				type: 'hitl-response',
				toolCallId: 'tc-1',
				response: { approved: true },
				respondedBy: answeredBy,
			}),
		);
	});

	it('records an answer without author when the request names none', async () => {
		const fixtures = setup();

		await run(fixtures, resumeTurn({ accessScope: 'user', ownerId: 'owner-1' }));

		const answer = recordedTimeline(fixtures.executionService).find(
			(event) => event.type === 'hitl-response',
		);
		expect(answer).toBeDefined();
		expect(answer).not.toHaveProperty('respondedBy');
	});
});
