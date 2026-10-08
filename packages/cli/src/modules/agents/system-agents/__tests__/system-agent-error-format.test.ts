import type { StreamChunk } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import type { AgentExecutionService } from '../../agent-execution.service';
import type {
	AgentMessageQueueService,
	ClaimedAgentMessage,
} from '../../agent-message-queue.service';
import type { AgentMessageSteeringService } from '../../agent-message-steering.service';
import type { AgentToolApprovalService } from '../../agent-tool-approval.service';
import { AgentTurnExecutionService } from '../../agent-turn-execution.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { SystemAgentExecutionService } from '../system-agent-execution.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type { SystemAgentProvider, SystemAgentTurnHandle } from '../system-agent.types';

/**
 * Runs a system-agent turn on the real turn execution service and recorder,
 * so that the tests compare the live `error` event with the stored execution
 * error.
 */

const AGENT_ID = 'test-assistant';
const RAW_ERROR = 'Gateway quota exceeded for key abc';
const FORMATTED_ERROR = 'You ran out of Gateway credits.';

const user = mock<User>({ id: 'user-1' });
const thread = {
	id: 'thread-1',
	agentId: AGENT_ID,
	agentName: 'Test Assistant',
	projectId: 'project-1',
	accessScope: 'user',
	ownerId: 'user-1',
} as AgentExecutionThread;

function claim(): ClaimedAgentMessage {
	return {
		item: { id: 'queue-1' },
		thread,
		payload: {
			kind: 'system',
			message: 'Build me a workflow',
			resourceId: 'draft-chat:user-1',
			options: {},
		},
		admission: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: ['m-1'] },
		recording: {
			threadId: 'thread-1',
			agentId: AGENT_ID,
			agentName: 'Test Assistant',
			projectId: 'project-1',
			access: { accessScope: 'user', ownerId: 'user-1' },
			userMessage: 'Build me a workflow',
			sessionMode: 'existing',
		},
	} as unknown as ClaimedAgentMessage;
}

/** A runtime agent whose stream emits the given chunks, or whose start throws. */
function runtimeAgent(behavior: { chunks: StreamChunk[] } | { throws: Error }) {
	return {
		stream: vi.fn(async () => {
			if ('throws' in behavior) throw behavior.throws;
			return {
				stream: new ReadableStream<StreamChunk>({
					start(controller) {
						for (const chunk of behavior.chunks) controller.enqueue(chunk);
						controller.close();
					},
				}),
			};
		}),
	} as unknown as SystemAgentTurnHandle['agent'];
}

function setup(
	behavior: { chunks: StreamChunk[] } | { throws: Error },
	formatError?: SystemAgentTurnHandle['formatError'],
) {
	const executionService = mock<AgentExecutionService>();
	executionService.getAbortSignal.mockReturnValue(new AbortController().signal);
	executionService.finalizeExecution.mockResolvedValue('exec-1');
	const chatExecutionService = mock<AgentChatExecutionService>();
	chatExecutionService.settle.mockImplementation(async (_id, finalize) => await finalize());
	const toolApprovalService = mock<AgentToolApprovalService>();
	toolApprovalService.createContext.mockResolvedValue(undefined as never);

	const turnExecutionService = new AgentTurnExecutionService(
		mock<Logger>(),
		executionService,
		chatExecutionService,
		mock<AgentMessageQueueService>(),
		mock<AgentMessageSteeringService>(),
		toolApprovalService,
	);

	const registry = new SystemAgentRegistry();
	const handle: SystemAgentTurnHandle = {
		agent: runtimeAgent(behavior),
		...(formatError ? { formatError } : {}),
	};
	const provider = {
		agentId: AGENT_ID,
		name: 'Test Assistant',
		authorize: vi.fn(async () => true),
		prepareTurn: vi.fn(async () => handle),
	} satisfies SystemAgentProvider;
	registry.register(provider);

	const executionRepository = mock<AgentExecutionRepository>();
	executionRepository.findExecution.mockResolvedValue(null);

	const service = new SystemAgentExecutionService(
		mock<Logger>(),
		registry,
		mock<AgentRepository>(),
		mock<AgentExecutionThreadRepository>(),
		executionRepository,
		executionService,
		turnExecutionService,
		mock<AgentMessageQueueService>(),
		chatExecutionService,
		mock<N8NCheckpointStorage>(),
		mock<TransactionRunner>(),
		mock(),
	);

	const events: AgentSseEvent[] = [];
	const send = (event: AgentSseEvent) => events.push(event);

	/** The error text the turn stored on its execution. */
	const storedError = () => {
		const [executionId, params] = executionService.finalizeExecution.mock.calls[0];
		expect(executionId).toBe('exec-1');
		return params.record.error;
	};
	const liveErrors = () =>
		events.flatMap((event) => (event.type === 'error' ? [event.message] : []));

	return { service, send, storedError, liveErrors };
}

const errorChunks: StreamChunk[] = [
	{ type: 'error', error: new Error(RAW_ERROR) },
	{ type: 'finish', finishReason: 'error' },
];

describe('System agent error formatting', () => {
	describe('error chunk', () => {
		it('sends and stores the raw error when the handle has no formatter', async () => {
			const { service, send, storedError, liveErrors } = setup({ chunks: errorChunks });

			await service.consume(claim(), user, new AbortController().signal, send);

			expect(liveErrors()).toEqual([RAW_ERROR]);
			expect(storedError()).toBe(RAW_ERROR);
		});

		it('sends and stores the formatted text when the handle has a formatter', async () => {
			const formatError = vi.fn(() => FORMATTED_ERROR);
			const { service, send, storedError, liveErrors } = setup(
				{ chunks: errorChunks },
				formatError,
			);

			await service.consume(claim(), user, new AbortController().signal, send);

			expect(formatError).toHaveBeenCalledWith(expect.objectContaining({ message: RAW_ERROR }));
			expect(liveErrors()).toEqual([FORMATTED_ERROR]);
			expect(storedError()).toBe(FORMATTED_ERROR);
		});

		it('sends and stores the raw error when the formatter returns undefined', async () => {
			const { service, send, storedError, liveErrors } = setup(
				{ chunks: errorChunks },
				() => undefined,
			);

			await service.consume(claim(), user, new AbortController().signal, send);

			expect(liveErrors()).toEqual([RAW_ERROR]);
			expect(storedError()).toBe(RAW_ERROR);
		});

		it('sends and stores the raw error when the formatter throws', async () => {
			const { service, send, storedError, liveErrors } = setup({ chunks: errorChunks }, () => {
				throw new Error('formatter broke');
			});

			await service.consume(claim(), user, new AbortController().signal, send);

			expect(liveErrors()).toEqual([RAW_ERROR]);
			expect(storedError()).toBe(RAW_ERROR);
		});
	});

	describe('thrown error', () => {
		it('stores the raw error and rethrows it when the handle has no formatter', async () => {
			const { service, send, storedError } = setup({ throws: new Error(RAW_ERROR) });

			await expect(
				service.consume(claim(), user, new AbortController().signal, send),
			).rejects.toThrow(RAW_ERROR);
			expect(storedError()).toBe(RAW_ERROR);
		});

		it('stores the formatted text and rethrows it for the live error event', async () => {
			const { service, send, storedError } = setup(
				{ throws: new Error(RAW_ERROR) },
				() => FORMATTED_ERROR,
			);

			// The queue consumer sends the message of this error as the live `error` event.
			await expect(
				service.consume(claim(), user, new AbortController().signal, send),
			).rejects.toThrow(FORMATTED_ERROR);
			expect(storedError()).toBe(FORMATTED_ERROR);
		});
	});
});
