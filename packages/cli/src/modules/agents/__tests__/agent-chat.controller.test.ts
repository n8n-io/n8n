import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { jsonParse } from 'n8n-workflow';
import { FileNotFoundError } from 'n8n-core';
import { EventEmitter } from 'node:events';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentActiveChatRunRegistry } from '../agent-active-chat-run.registry';
import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatController } from '../agent-chat.controller';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentTestChatService } from '../agent-test-chat.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController() {
	const agentsService =
		mock<Pick<AgentsService, 'findById' | 'findByProjectId' | 'findByProjectIdPaginated'>>();
	const agentExecutionOrchestratorService = mock<AgentExecutionOrchestratorService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const agentTestRunService = mock<AgentTestRunService>();
	const agentChatAttachmentService = mock<AgentChatAttachmentService>();
	agentTestRunService.prepareDraftRun.mockResolvedValue({
		status: 'ready',
		sessionId: 'thread-1',
	});
	agentTestRunService.streamDraftRun.mockImplementation((config) =>
		agentExecutionOrchestratorService.executeForChat({
			...config,
			memory: {
				threadId: config.sessionId,
				resourceId: `draft-chat:${config.user.id}`,
			},
		}),
	);

	const activeChatRunRegistry = new AgentActiveChatRunRegistry();
	const controller = new AgentChatController(
		agentExecutionOrchestratorService,
		agentTestRunService,
		mock<AgentTestChatService>(),
		agentsBuilderService,
		mock<CredentialsService>(),
		agentsService as unknown as AgentsService,
		agentChatAttachmentService,
		activeChatRunRegistry,
	);

	return {
		controller,
		agentExecutionOrchestratorService,
		agentTestRunService,
		agentChatAttachmentService,
		activeChatRunRegistry,
		agentsService: {
			findById: agentsService.findById,
			getConversationHistory: agentExecutionOrchestratorService.getConversationHistory,
		} as Mocked<
			Pick<AgentsService, 'findById'> &
				Pick<AgentExecutionOrchestratorService, 'getConversationHistory'>
		>,
	};
}

function makeSseResponse(writes: string[]): FlushableResponse {
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
			writes.push(String(chunk));
			return true;
		}),
		flush: vi.fn(),
		end: vi.fn(() => {
			emitter.emit('finish');
		}),
		writableEnded: false,
		destroyed: false,
	});

	return res as unknown as FlushableResponse;
}

/** Parse the `data:` frames a handler wrote to its SSE response. */
function sseEvents(writes: string[]): Array<Record<string, unknown>> {
	return writes
		.filter((line) => line.startsWith('data: '))
		.map((line) => jsonParse<Record<string, unknown>>(line.slice(6).trim()));
}

describe('AgentChatController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentChatController);

	const routes = getRoutesByHandlerName(AgentChatController);

	it.each([
		['chat', 'agent:execute'],
		['chatResume', 'agent:execute'],
		['cancelActiveChatRun', 'agent:execute'],
		['cancelChatRun', 'agent:execute'],
		['getChatMessages', 'agent:read'],
		['getTestChatMessages', 'agent:read'],
		['clearTestChatMessages', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentChatController chat message history', () => {
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
				params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
			} as never),
		).rejects.toThrow(NotFoundError);
	});
});

describe('AgentChatController SSE done payload', () => {
	it('runs a chat to completion when the response closes during preparation', async () => {
		const { controller, agentTestRunService, agentExecutionOrchestratorService } = makeController();
		const preparing = createDeferredPromise<{ status: 'ready'; sessionId: string }>();
		agentTestRunService.prepareDraftRun.mockReturnValue(preparing.promise);
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			yield { type: 'text-delta', id: 'text-1', delta: 'answer' } as never;
			config.onExecutionRecorded?.('exec-after-close');
		});

		const writes: string[] = [];
		const res = makeSseResponse(writes);
		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi' } as never,
		);
		await vi.waitFor(() => expect(agentTestRunService.prepareDraftRun).toHaveBeenCalled());

		(res as unknown as EventEmitter).emit('close');
		preparing.resolve({ status: 'ready', sessionId: 'thread-1' });
		await request;

		// The turn outlives the connection: it streams to the end and is recorded,
		// so a reload shows the finished answer.
		expect(agentTestRunService.streamDraftRun).toHaveBeenCalled();
		expect(sseEvents(writes)).toContainEqual({
			type: 'done',
			sessionId: 'thread-1',
			executionId: 'exec-after-close',
		});
	});

	it('stops a chat that is still being prepared', async () => {
		// Stop is live from the moment the client posts, so the run must be
		// registered before preparation awaits — otherwise it starts anyway.
		const { controller, agentTestRunService, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		const preparing = createDeferredPromise<{ status: 'ready'; sessionId: string }>();
		agentTestRunService.prepareDraftRun.mockReturnValue(preparing.promise);

		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			makeSseResponse([]),
			'agent-1',
			{ message: 'hi' } as never,
		);
		await vi.waitFor(() => expect(agentTestRunService.prepareDraftRun).toHaveBeenCalled());

		await expect(
			controller.cancelActiveChatRun(
				{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
				{} as never,
				'agent-1',
			),
		).resolves.toEqual({ cancelled: true });

		preparing.resolve({ status: 'ready', sessionId: 'thread-1' });
		await request;

		expect(agentTestRunService.streamDraftRun.mock.calls[0][0].abortSignal?.aborted).toBe(true);
	});

	it('stops writing SSE events once the response is gone', async () => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		const runStarted = createDeferredPromise();
		const runBlocked = createDeferredPromise();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield { type: 'text-delta', id: 'text-1', delta: 'before' } as never;
			runStarted.resolve();
			await runBlocked.promise;
			yield { type: 'text-delta', id: 'text-1', delta: 'after' } as never;
		});

		const writes: string[] = [];
		const res = makeSseResponse(writes);
		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);
		await runStarted.promise;

		Object.assign(res, { destroyed: true });
		(res as unknown as EventEmitter).emit('close');
		runBlocked.resolve();
		await request;

		const deltas = sseEvents(writes).map((event) => event.delta);
		expect(deltas).toContain('before');
		expect(deltas).not.toContain('after');
	});

	it('includes executionId on done when recorded', async () => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('exec-99');
			yield* [];
		});

		const writes: string[] = [];
		const res = makeSseResponse(writes);

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		const events = sseEvents(writes);

		expect(events).toContainEqual({
			type: 'done',
			sessionId: 'thread-1',
			executionId: 'exec-99',
		});
	});

	it('includes executionId on resume done when recorded', async () => {
		const { controller, agentExecutionOrchestratorService } = makeController();
		agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
			config.onExecutionRecorded?.('exec-resume-1');
			yield* [];
		});

		const writes: string[] = [];
		const res = makeSseResponse(writes);

		await controller.chatResume(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			res,
			'agent-1',
			{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } } as never,
		);

		const events = sseEvents(writes);

		expect(events).toContainEqual({
			type: 'done',
			executionId: 'exec-resume-1',
		});
	});

	it.each([
		{
			name: 'new chat',
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chat(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ message: 'hi' } as never,
				),
			method: 'executeForChat' as const,
		},
		{
			name: 'resumed chat',
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chatResume(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } } as never,
				),
			method: 'resumeForChat' as const,
		},
	])('lets the $name outlive an SSE response that closes early', async ({ start, method }) => {
		const { controller, agentExecutionOrchestratorService } = makeController();

		let receivedSignal: AbortSignal | undefined;
		const runStarted = createDeferredPromise();
		const runBlocked = createDeferredPromise();
		agentExecutionOrchestratorService[method].mockImplementation(async function* (config) {
			receivedSignal = (config as { abortSignal?: AbortSignal }).abortSignal;
			runStarted.resolve();
			await runBlocked.promise;
			yield* [];
		});

		const res = makeSseResponse([]);
		const request = start(controller, res);
		await runStarted.promise;
		(res as unknown as EventEmitter).emit('close');

		// The run keeps going: it is recorded, and a reload shows the result.
		expect(receivedSignal?.aborted).toBe(false);

		runBlocked.resolve();
		await request;
	});

	it.each([
		{
			name: 'new chat',
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chat(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ message: 'hi' } as never,
				),
			method: 'executeForChat' as const,
		},
		{
			name: 'resumed chat',
			start: async (controller: AgentChatController, res: FlushableResponse) =>
				await controller.chatResume(
					{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
					res,
					'agent-1',
					{ runId: 'run-1', toolCallId: 'tc-1', resumeData: { approved: true } } as never,
				),
			method: 'resumeForChat' as const,
		},
	])('aborts the $name on an explicit stop', async ({ start, method }) => {
		const { controller, agentExecutionOrchestratorService, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);

		let receivedSignal: AbortSignal | undefined;
		const runStarted = createDeferredPromise();
		const runBlocked = createDeferredPromise();
		agentExecutionOrchestratorService[method].mockImplementation(async function* (config) {
			receivedSignal = (config as { abortSignal?: AbortSignal }).abortSignal;
			runStarted.resolve();
			await runBlocked.promise;
			yield* [];
		});

		const res = makeSseResponse([]);
		const request = start(controller, res);
		await runStarted.promise;

		await expect(
			controller.cancelActiveChatRun(
				{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
				{} as never,
				'agent-1',
			),
		).resolves.toEqual({ cancelled: true });
		expect(receivedSignal?.aborted).toBe(true);

		runBlocked.resolve();
		await request;
	});

	it('reports no active run to stop once the turn has ended', async () => {
		const { controller, agentExecutionOrchestratorService, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* () {
			yield* [];
		});

		await controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			makeSseResponse([]),
			'agent-1',
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		await expect(
			controller.cancelActiveChatRun(
				{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
				{} as never,
				'agent-1',
			),
		).resolves.toEqual({ cancelled: false });
	});

	it('does not stop another user’s run on the same agent', async () => {
		const { controller, agentExecutionOrchestratorService, agentsService } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);

		let receivedSignal: AbortSignal | undefined;
		const runStarted = createDeferredPromise();
		const runBlocked = createDeferredPromise();
		agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
			receivedSignal = config.abortSignal;
			runStarted.resolve();
			await runBlocked.promise;
			yield* [];
		});

		const request = controller.chat(
			{ params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never,
			makeSseResponse([]),
			'agent-1',
			{ message: 'hi' } as never,
		);
		await runStarted.promise;

		await expect(
			controller.cancelActiveChatRun(
				{ params: { projectId: 'project-1' }, user: { id: 'user-2' } } as never,
				{} as never,
				'agent-1',
			),
		).resolves.toEqual({ cancelled: false });
		expect(receivedSignal?.aborted).toBe(false);

		runBlocked.resolve();
		await request;
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

	it('keeps stored attachments when the run fails after an execution was recorded', async () => {
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
			config.onExecutionRecorded?.('exec-1');
			yield* [];
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
	});

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
		} as never;
		const res = { setHeader: vi.fn() } as never;

		await expect(controller.getChatAttachment(req, res)).rejects.toThrow(NotFoundError);
		// Headers must not be written for a failed stream open.
		expect((res as { setHeader: ReturnType<typeof vi.fn> }).setHeader).not.toHaveBeenCalled();
	});
});
