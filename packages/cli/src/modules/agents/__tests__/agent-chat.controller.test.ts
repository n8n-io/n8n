import { EventEmitter } from 'node:events';
import type { SerializableAgentState } from '@n8n/agents';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { FileNotFoundError } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatController } from '../agent-chat.controller';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentExecutionRecordingError } from '../agent-execution-recording.error';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentTestChatService } from '../agent-test-chat.service';
import { AgentTestRunService } from '../agent-test-run.service';
import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController() {
	const agentsService =
		mock<Pick<AgentsService, 'findById' | 'findByProjectId' | 'findByProjectIdPaginated'>>();
	const agentExecutionOrchestratorService = mock<AgentExecutionOrchestratorService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const agentChatAttachmentService = mock<AgentChatAttachmentService>();
	const agentExecutionService = mock<AgentExecutionService>();
	const agentValidationService = mock<AgentValidationService>();
	const backgroundJobService = mock<AgentBackgroundJobService>();
	agentExecutionService.findThreadById.mockResolvedValue(null);
	agentExecutionService.canUseDraftThread.mockResolvedValue(true);
	agentValidationService.validateAgentIsRunnable.mockResolvedValue({ missing: [] });
	const agentTestRunService = new AgentTestRunService(
		agentExecutionService,
		agentValidationService,
		agentExecutionOrchestratorService,
		mock<N8NCheckpointStorage>(),
	);

	const controller = new AgentChatController(
		agentExecutionOrchestratorService,
		agentTestRunService,
		mock<AgentTestChatService>(),
		agentsBuilderService,
		mock<CredentialsService>(),
		agentsService as unknown as AgentsService,
		agentChatAttachmentService,
		agentExecutionService,
		backgroundJobService,
	);

	return {
		controller,
		agentsBuilderService,
		agentExecutionService,
		backgroundJobService,
		agentExecutionOrchestratorService,
		agentTestRunService,
		agentChatAttachmentService,
		agentsService: {
			findById: agentsService.findById,
			getConversationHistory: agentExecutionOrchestratorService.getConversationHistory,
		} as Mocked<
			Pick<AgentsService, 'findById'> &
				Pick<AgentExecutionOrchestratorService, 'getConversationHistory'>
		>,
	};
}

function makeSseResponse(
	writes: string[],
	beforeWrite?: (chunk: string) => void,
): FlushableResponse {
	const emitter = new EventEmitter();
	const res = Object.assign(emitter, {
		socket: {
			setTimeout: vi.fn(),
			setNoDelay: vi.fn(),
			setKeepAlive: vi.fn(),
		},
		setHeader: vi.fn(),
		flushHeaders: vi.fn(),
		write: vi.fn((chunk: string) => {
			beforeWrite?.(chunk);
			writes.push(String(chunk));
			return true;
		}),
		flush: vi.fn(),
		end: vi.fn(),
		writableEnded: false,
		destroyed: false,
	});
	res.end.mockImplementation(() => {
		res.writableEnded = true;
		emitter.emit('finish');
	});

	return res as unknown as FlushableResponse;
}

describe('AgentChatController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentChatController);

	const routes = getRoutesByHandlerName(AgentChatController);

	it.each([
		['chat', 'agent:execute'],
		['chatResume', 'agent:execute'],
		['cancelChatRun', 'agent:execute'],
		['getChatMessages', 'agent:read'],
		['getBackgroundJobs', 'agent:read'],
		['getTestChatMessages', 'agent:read'],
		['clearTestChatMessages', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentChatController background tasks', () => {
	const thread = mock<AgentExecutionThread>({
		id: 'thread-1',
		projectId: 'project-1',
		agentId: 'agent-1',
		accessScope: 'user',
		ownerId: 'user-1',
	});
	const request = {
		params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		user: { id: 'user-1' },
	};

	it('scrubs task titles in the response', async () => {
		const { controller, agentsService, agentExecutionService, backgroundJobService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue(thread);
		backgroundJobService.listCurrentGroupForThread.mockResolvedValue([
			{
				id: 'job-1',
				title: 'Check api_key=example-value',
				kind: 'subagent',
				status: 'running',
				createdAt: new Date(),
			},
		] as never);
		const response = await controller.getBackgroundJobs(request as never);
		expect(response.tasks[0].title).toBe('Check [REDACTED]');
	});

	it('returns current group statuses without consuming results', async () => {
		const { controller, agentsService, agentExecutionService, backgroundJobService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue(thread);
		backgroundJobService.listCurrentGroupForThread.mockResolvedValue([
			{
				id: 'job-1',
				kind: 'subagent',
				title: 'Check escalations',
				status: 'running',
				createdAt: new Date('2026-09-09T10:00:00Z'),
			},
			{
				id: 'job-2',
				kind: 'workflow',
				title: 'Wait for reply',
				status: 'running',
				createdAt: new Date('2026-09-09T10:01:00Z'),
			},
			{
				id: 'job-3',
				kind: 'subagent',
				title: 'Completed job',
				status: 'completed',
				createdAt: new Date('2026-09-09T10:02:00Z'),
				settledAt: new Date('2026-09-09T10:05:00Z'),
				notifiedAt: null,
			},
			{
				id: 'job-4',
				kind: 'subagent',
				title: 'Failed job',
				status: 'failed',
				createdAt: new Date('2026-09-09T10:03:00Z'),
				notifiedAt: null,
			},
			{
				id: 'job-5',
				kind: 'subagent',
				title: 'Canceled job',
				status: 'cancelled',
				createdAt: new Date('2026-09-09T10:04:00Z'),
				notifiedAt: new Date('2026-09-09T10:05:00Z'),
			},
		] as never);
		expect(await controller.getBackgroundJobs(request as never)).toEqual({
			pendingTaskIds: ['job-3', 'job-4'],
			tasks: [
				{
					id: 'job-1',
					kind: 'subagent',
					title: 'Check escalations',
					status: 'running',
					startedAt: '2026-09-09T10:00:00.000Z',
				},
				{
					id: 'job-2',
					kind: 'workflow',
					title: 'Wait for reply',
					status: 'running',
					startedAt: '2026-09-09T10:01:00.000Z',
				},
				{
					id: 'job-3',
					kind: 'subagent',
					title: 'Completed job',
					status: 'completed',
					startedAt: '2026-09-09T10:02:00.000Z',
					settledAt: '2026-09-09T10:05:00.000Z',
				},
				{
					id: 'job-4',
					kind: 'subagent',
					title: 'Failed job',
					status: 'failed',
					startedAt: '2026-09-09T10:03:00.000Z',
				},
				{
					id: 'job-5',
					kind: 'subagent',
					title: 'Canceled job',
					status: 'cancelled',
					startedAt: '2026-09-09T10:04:00.000Z',
				},
			],
		});
		expect(backgroundJobService.listCurrentGroupForThread).toHaveBeenCalledWith(
			'agent-1',
			'thread-1',
		);
		expect(backgroundJobService.markMailConsumed).not.toHaveBeenCalled();
	});

	it.each([
		{ projectId: 'other-project' },
		{ agentId: 'other-agent' },
		{ ownerId: 'other-user' },
		{ ownerId: null },
	])('rejects an unrelated thread: %s', async (overrides) => {
		const { controller, agentsService, agentExecutionService, backgroundJobService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue({ ...thread, ...overrides });
		await expect(controller.getBackgroundJobs(request as never)).rejects.toThrow(NotFoundError);
		expect(backgroundJobService.listCurrentGroupForThread).not.toHaveBeenCalled();
	});

	it('returns no tasks for a new session and rejects an unknown agent', async () => {
		const { controller, agentsService, agentExecutionService, backgroundJobService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue(null);
		expect(await controller.getBackgroundJobs(request as never)).toEqual({ tasks: [] });
		expect(backgroundJobService.listCurrentGroupForThread).not.toHaveBeenCalled();
		agentsService.findById.mockResolvedValue(null);
		await expect(controller.getBackgroundJobs(request as never)).rejects.toThrow(NotFoundError);
	});
});

describe('AgentChatController chat message history', () => {
	it('uses an owned checkpoint only when execution history is absent', async () => {
		const { controller, agentsService, agentsBuilderService, agentExecutionService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue(null);
		const checkpoint = mock<SerializableAgentState>({
			persistence: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
			messageList: { messages: [] },
			pendingToolCalls: {},
		});
		agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(checkpoint);
		const request = {
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			user: { id: 'user-1' },
		};
		expect(await controller.getChatMessages(request as never)).toEqual({
			messages: [],
			openSuspensions: [],
		});
		await expect(
			controller.getChatMessages({ ...request, user: { id: 'user-2' } } as never),
		).rejects.toThrow(NotFoundError);
		agentExecutionService.findThreadById.mockResolvedValue(
			mock<AgentExecutionThread>({
				projectId: 'project-1',
				agentId: 'agent-1',
				accessScope: 'user',
				ownerId: null,
			}),
		);
		agentsBuilderService.findOpenCheckpointForThread.mockClear();
		await expect(controller.getChatMessages(request as never)).rejects.toThrow(NotFoundError);
		expect(agentsBuilderService.findOpenCheckpointForThread).not.toHaveBeenCalled();
	});

	it('accepts only shared checkpoints for a project-scoped thread', async () => {
		const { controller, agentsService, agentsBuilderService, agentExecutionService } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue(null);
		agentExecutionService.findThreadById.mockResolvedValue(
			mock<AgentExecutionThread>({
				projectId: 'project-1',
				agentId: 'agent-1',
				accessScope: 'project',
				ownerId: null,
			}),
		);
		const request = {
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			user: { id: 'user-1' },
		};
		const checkpoint = mock<SerializableAgentState>({
			persistence: { threadId: 'thread-1', resourceId: 'integration:slack:user-1' },
			messageList: { messages: [] },
			pendingToolCalls: {},
		});
		agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(checkpoint);

		await expect(controller.getChatMessages(request as never)).resolves.toEqual({
			messages: [],
			openSuspensions: [],
		});

		agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue({
			...checkpoint,
			persistence: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
		});
		await expect(controller.getChatMessages(request as never)).rejects.toThrow(NotFoundError);
	});

	it('returns conversation history envelope from the execution orchestrator', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue([
			{
				id: 'execution-1:user',
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'execution-1:assistant',
				role: 'assistant',
				content: [{ type: 'text', text: 'Hi there' }],
			},
		]);

		const result = await controller.getChatMessages({
			user: { id: 'user-1' },
			params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		} as never);

		expect(result).toEqual({
			messages: [
				{
					id: 'execution-1:user',
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
				},
				{
					id: 'execution-1:assistant',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hi there' }],
				},
			],
			openSuspensions: [],
		});
		expect(agentsService.getConversationHistory).toHaveBeenCalledWith({
			userId: 'user-1',
			threadId: 'thread-1',
			projectId: 'project-1',
			agentId: 'agent-1',
		});
	});

	it('rejects missing conversation history', async () => {
		const { controller, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentsService.getConversationHistory.mockResolvedValue(null);

		await expect(
			controller.getChatMessages({
				user: { id: 'user-1' },
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			} as never),
		).rejects.toThrow(NotFoundError);
	});
});

describe('AgentChatController SSE done payload', () => {
	const operations = [
		{
			name: 'new chat',
			method: 'executeForChat' as const,
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chat(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ message: 'hi', sessionId: 'thread-1', newSession: true } as never,
				),
			done: { type: 'done', sessionId: 'thread-1', executionId: 'exec-99' },
		},
		{
			name: 'resumed chat',
			method: 'resumeForChat' as const,
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chatResume(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } } as never,
				),
			done: { type: 'done', executionId: 'exec-99' },
		},
	];

	it('does not start a chat after the response closes during preparation', async () => {
		const { controller, agentTestRunService, agentExecutionOrchestratorService } = makeController();
		let resolvePreparation = (_value: {
			status: 'ready';
			sessionId: string;
			sessionMode: 'new';
		}) => {};
		const prepareDraftRun = vi.spyOn(agentTestRunService, 'prepareDraftRun').mockReturnValue(
			new Promise((resolve) => {
				resolvePreparation = resolve;
			}),
		);

		const res = makeSseResponse([]);
		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi' } as never,
		);
		await vi.waitFor(() => expect(prepareDraftRun).toHaveBeenCalled());

		(res as unknown as EventEmitter).emit('close');
		resolvePreparation({ status: 'ready', sessionId: 'thread-1', sessionMode: 'new' });
		await request;

		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
	});

	it.each(operations)(
		'sends done after the $name settles',
		async ({ name, method, start, done }) => {
			const { controller, agentExecutionService, agentExecutionOrchestratorService } =
				makeController();
			if (name === 'new chat') agentExecutionService.canUseDraftThread.mockResolvedValue(false);
			const finalization = createDeferredPromise();
			const finalizationStarted = createDeferredPromise();
			let receivedSignal: AbortSignal | undefined;
			agentExecutionOrchestratorService[method].mockImplementation(async function* (config) {
				receivedSignal = config.abortSignal;
				yield { type: 'finish', finishReason: 'stop' };
				finalizationStarted.resolve();
				await finalization.promise;
				config.onExecutionRecorded?.('exec-99');
			});

			const writes: string[] = [];
			const res = makeSseResponse(writes);
			const request = start(controller, res);
			await finalizationStarted.promise;
			expect(res.end).not.toHaveBeenCalled();
			expect(writes.some((line) => line.includes('"done"'))).toBe(false);
			finalization.resolve();
			await request;

			const events = writes
				.filter((line) => line.startsWith('data: '))
				.map((line) => JSON.parse(line.slice(6).trim()) as { type: string });

			expect(events).toContainEqual(done);
			expect(res.end).toHaveBeenCalledOnce();
			res.emit('close');
			expect(receivedSignal?.aborted).toBe(false);
		},
	);

	it.each(operations)('does not send done for a suspended $name', async ({ method, start }) => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		agentExecutionOrchestratorService[method].mockImplementation(async function* () {
			yield {
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tc-1',
				toolName: 'ask_questions',
			};
		});
		const writes: string[] = [];

		await start(controller, makeSseResponse(writes));

		const eventTypes = writes
			.filter((line) => line.startsWith('data: '))
			.map((line) => (JSON.parse(line.slice(6).trim()) as { type: string }).type);
		expect(eventTypes).toContain('tool-call-suspended');
		expect(eventTypes).not.toContain('done');
	});

	it.each(operations)(
		'aborts the $name when its SSE response closes early',
		async ({ start, method }) => {
			const { controller, agentExecutionOrchestratorService } = makeController();

			let receivedSignal: AbortSignal | undefined;
			let releaseRun = () => {};
			let markStarted = () => {};
			const runStarted = new Promise<void>((resolve) => {
				markStarted = resolve;
			});
			const runBlocked = new Promise<void>((resolve) => {
				releaseRun = resolve;
			});
			agentExecutionOrchestratorService[method].mockImplementation(async function* (config) {
				receivedSignal = (config as { abortSignal?: AbortSignal }).abortSignal;
				markStarted();
				await runBlocked;
				yield* [];
			});

			const res = makeSseResponse([]);
			const request = start(controller, res);
			await runStarted;
			(res as unknown as EventEmitter).emit('close');
			releaseRun();
			await request;

			expect(receivedSignal?.aborted).toBe(true);
		},
	);

	it('settles execution after SSE delivery fails', async () => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		const deliveryError = new Error('socket write failed');
		let receivedSignal: AbortSignal | undefined;
		const lifecycle: string[] = [];
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			receivedSignal = config.abortSignal;
			try {
				yield { type: 'text-delta', id: 'text-1', delta: 'first' };
				lifecycle.push('continued');
				yield { type: 'text-delta', id: 'text-1', delta: 'second' };
			} finally {
				lifecycle.push('settled');
			}
		});
		const res = makeSseResponse([], (chunk) => {
			if (chunk.includes('"text-delta"')) throw deliveryError;
		});

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		expect(receivedSignal?.aborted).toBe(true);
		expect(lifecycle).toEqual(['continued', 'settled']);
		expect(res.end).toHaveBeenCalledTimes(1);
	});
});

describe('AgentChatController HITL cancellation', () => {
	it('cancels a suspended run for the current preview user', async () => {
		const { controller, agentExecutionOrchestratorService, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionOrchestratorService.cancelChatRun.mockResolvedValue(true);

		await expect(
			controller.cancelChatRun(
				{
					params: { projectId: 'project-1' },
					user: { id: 'user-1' },
				} as never,
				{} as never,
				'agent-1',
				'run-1',
			),
		).resolves.toEqual({ cancelled: true });

		expect(agentExecutionOrchestratorService.cancelChatRun).toHaveBeenCalledWith({
			agentId: 'agent-1',
			runId: 'run-1',
			resourceId: 'draft-chat:user-1',
		});
	});
});

describe('AgentChatController attachment cleanup on failed turns', () => {
	const textAttachment = (fileName: string) => ({
		fileName,
		mimeType: 'text/plain',
		data: Buffer.from('hello').toString('base64'),
	});

	function makeCleanupSseResponse() {
		const writes: string[] = [];
		const res = makeSseResponse(writes);
		const events = () =>
			writes
				.filter((line) => line.startsWith('data: '))
				.map((line) => JSON.parse(line.slice(6).trim()) as { type: string; message?: string });
		return { res, events };
	}

	it('deletes stored attachments when the run fails before an execution is recorded', async () => {
		const { controller, agentExecutionOrchestratorService, agentChatAttachmentService } =
			makeController();
		agentChatAttachmentService.storeInbound.mockResolvedValue({
			id: 'att-1',
			fileName: 'notes.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
		} as never);
		agentChatAttachmentService.deleteByIds.mockResolvedValue(undefined);
		// eslint-disable-next-line @typescript-eslint/require-await
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield* [];
			throw new Error('model unavailable');
		});
		const { res, events } = makeCleanupSseResponse();

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', attachments: [textAttachment('notes.txt')] } as never,
		);

		expect(events()).toContainEqual({ type: 'error', message: 'model unavailable' });
		expect(agentChatAttachmentService.deleteByIds).toHaveBeenCalledWith(['att-1']);
	});

	it.each([false, true])(
		'keeps attachments referenced by an execution (finalization failed: %s)',
		async (finalizationFailed) => {
			const { controller, agentExecutionOrchestratorService, agentChatAttachmentService } =
				makeController();
			agentChatAttachmentService.storeInbound.mockResolvedValue({
				id: 'att-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
			} as never);
			// eslint-disable-next-line @typescript-eslint/require-await
			agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
				yield* [];
				if (finalizationFailed) {
					throw new AgentExecutionRecordingError({
						phase: 'finalize',
						executionId: 'exec-1',
						executionStarted: true,
						cause: new Error('database unavailable'),
					});
				}
				config.onExecutionRecorded?.('exec-1');
				throw new Error('flaky post-persist failure');
			});
			const { res } = makeCleanupSseResponse();

			await controller.chat(
				{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
				res,
				'agent-1',
				{ message: 'hi', attachments: [textAttachment('notes.txt')] } as never,
			);

			expect(agentChatAttachmentService.deleteByIds).not.toHaveBeenCalled();
		},
	);

	it('deletes earlier attachments when a later one in the same message fails to store', async () => {
		const { controller, agentExecutionOrchestratorService, agentChatAttachmentService } =
			makeController();
		agentChatAttachmentService.storeInbound
			.mockResolvedValueOnce({
				id: 'att-1',
				fileName: 'a.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 5,
			} as never)
			.mockRejectedValueOnce(new Error('storage down'));
		const { res, events } = makeCleanupSseResponse();

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', attachments: [textAttachment('a.txt'), textAttachment('b.txt')] } as never,
		);

		expect(events()).toContainEqual({ type: 'error', message: 'storage down' });
		expect(agentChatAttachmentService.deleteByIds).toHaveBeenCalledWith(['att-1']);
		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
	});

	it('deletes stored attachments when the response closes during upload', async () => {
		const { controller, agentExecutionOrchestratorService, agentChatAttachmentService } =
			makeController();
		let finishUpload = (_value: unknown) => {};
		agentChatAttachmentService.storeInbound.mockReturnValue(
			new Promise((resolve) => {
				finishUpload = resolve;
			}),
		);
		agentChatAttachmentService.deleteByIds.mockResolvedValue(undefined);
		const { res } = makeCleanupSseResponse();
		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', attachments: [textAttachment('notes.txt')] } as never,
		);
		await vi.waitFor(() => expect(agentChatAttachmentService.storeInbound).toHaveBeenCalled());

		(res as unknown as EventEmitter).emit('close');
		finishUpload({
			id: 'att-1',
			fileName: 'notes.txt',
			mimeType: 'text/plain',
			fileSizeBytes: 5,
		});
		await request;

		expect(agentChatAttachmentService.deleteByIds).toHaveBeenCalledWith(['att-1']);
		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
	});

	it('rejects an ineligible Preview session before saving an upload or starting a runtime', async () => {
		const {
			controller,
			agentExecutionService,
			agentChatAttachmentService,
			agentExecutionOrchestratorService,
		} = makeController();
		agentExecutionService.canUseDraftThread.mockImplementation(
			async (_threadId, _projectId, _agentId, _userId, options) => !options?.previewChat,
		);
		const { res, events } = makeCleanupSseResponse();
		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-2' } } as never,
			res,
			'agent-1',
			{ sessionId: 'thread-1', message: 'hi', attachments: [textAttachment('notes.txt')] } as never,
		);
		expect(events()).toContainEqual(expect.objectContaining({ type: 'error' }));
		expect(agentChatAttachmentService.storeInbound).not.toHaveBeenCalled();
		expect(agentExecutionOrchestratorService.executeForChat).not.toHaveBeenCalled();
	});
	it('rejects an empty attachment with a dedicated error message', async () => {
		const { controller, agentChatAttachmentService } = makeController();
		const { res, events } = makeCleanupSseResponse();

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{
				message: 'hi',
				attachments: [{ fileName: 'empty.txt', mimeType: 'text/plain', data: '' }],
			} as never,
		);

		expect(events()).toContainEqual({
			type: 'error',
			message: 'Attachment "empty.txt" is empty',
		});
		expect(agentChatAttachmentService.storeInbound).not.toHaveBeenCalled();
	});
});

describe('AgentChatController attachment download', () => {
	it('returns 404 when the attachment bytes are gone from storage', async () => {
		const { controller, agentsService, agentChatAttachmentService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentChatAttachmentService.getForAgent.mockResolvedValue({
			id: 'att-1',
			mimeType: 'image/png',
			fileName: 'photo.png',
			fileSizeBytes: 33,
		} as never);
		agentChatAttachmentService.getStream.mockRejectedValue(
			new FileNotFoundError('filesystem-v2:agents/agent-1/attachments/att-1'),
		);

		const req = {
			params: { projectId: 'p1', agentId: 'agent-1', attachmentId: 'att-1' },
			user: { id: 'user-1' },
		} as never;
		const res = { setHeader: vi.fn() } as never;

		await expect(controller.getChatAttachment(req, res)).rejects.toThrow(NotFoundError);
		// Headers must not be written for a failed stream open.
		expect((res as { setHeader: ReturnType<typeof vi.fn> }).setHeader).not.toHaveBeenCalled();
	});
});
