import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { FileNotFoundError } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatController } from '../agent-chat.controller';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentExecutionService } from '../agent-execution.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
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
	const agentExecutionService = mock<AgentExecutionService>();
	const backgroundJobService = mock<AgentBackgroundJobService>();
	const queue = mock<AgentMessageQueueService>();
	queue.enqueuePreview.mockImplementation(async (input) => ({
		id: '1',
		status: 'queued',
		...(input.payload.kind === 'message'
			? {
					kind: 'message',
					message: input.payload.message,
					attachments: input.payload.attachments ?? [],
				}
			: { kind: 'hitl', runId: input.payload.runId, toolCallId: input.payload.toolCallId }),
	}));
	queue.cancelPreviewResumes.mockResolvedValue(false);
	queue.getResumeScope.mockResolvedValue({ threadId: 'thread-1', resourceId: 'draft-chat:user-1' });
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
		queue,
	);

	return {
		controller,
		agentExecutionService,
		backgroundJobService,
		agentExecutionOrchestratorService,
		agentTestRunService,
		agentChatAttachmentService,
		queue,
		agentsService: {
			findById: agentsService.findById,
			getConversationHistory: agentExecutionOrchestratorService.getConversationHistory,
		} as Mocked<
			Pick<AgentsService, 'findById'> &
				Pick<AgentExecutionOrchestratorService, 'getConversationHistory'>
		>,
	};
}

describe('AgentChatController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentChatController);

	const routes = getRoutesByHandlerName(AgentChatController);

	it.each([
		['chat', 'agent:execute'],
		['chatResume', 'agent:execute'],
		['getQueue', 'agent:read'],
		['editQueuedMessage', 'agent:execute'],
		['removeQueuedMessage', 'agent:execute'],
		['stopQueuedMessage', 'agent:execute'],
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
	});
	const request = { params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' } };

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

	it.each([{ projectId: 'other-project' }, { agentId: 'other-agent' }])(
		'rejects an unrelated thread: %s',
		async (overrides) => {
			const { controller, agentsService, agentExecutionService, backgroundJobService } =
				makeController();
			agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
			agentExecutionService.findThreadById.mockResolvedValue({ ...thread, ...overrides });
			await expect(controller.getBackgroundJobs(request as never)).rejects.toThrow(NotFoundError);
			expect(backgroundJobService.listCurrentGroupForThread).not.toHaveBeenCalled();
		},
	);

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

describe('AgentChatController admission', () => {
	const request = { params: { projectId: 'project-1' }, user: { id: 'user-1' } };
	const clientRequestId = '724038b9-fc74-4428-bf08-07998f1e3b20';

	it.each(['message', 'hitl'] as const)(
		'acknowledges %s before executing queued work',
		async (kind) => {
			const {
				controller,
				agentsService,
				queue,
				agentTestRunService,
				agentExecutionOrchestratorService,
			} = makeController();
			agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
			const result =
				kind === 'message'
					? await controller.chat(request as never, {} as never, 'agent-1', {
							message: 'original',
							clientRequestId,
						})
					: await controller.chatResume(request as never, {} as never, 'agent-1', {
							runId: 'run-1',
							toolCallId: 'tc-1',
							resumeData: { approved: true },
							clientRequestId,
						});
			expect(result).toMatchObject({
				status: 'queued',
				sessionId: 'thread-1',
				item: { id: '1', kind },
			});
			expect(agentTestRunService.streamDraftRun).not.toHaveBeenCalled();
			expect(agentExecutionOrchestratorService.resumeForChat).not.toHaveBeenCalled();
			const [input, correlationId, execute] = queue.enqueuePreview.mock.calls[0];
			expect(correlationId).toBe(clientRequestId);
			const context = {
				abortSignal: new AbortController().signal,
				send: vi.fn(),
				onExecutionStarted: vi.fn(),
			};
			agentExecutionOrchestratorService.executeForChat.mockImplementation(async function* (config) {
				await config.onExecutionStarted?.('execution-1');
				yield { type: 'text-delta', id: 'text', delta: 'Hello' };
			});
			agentExecutionOrchestratorService.resumeForChat.mockImplementation(async function* (config) {
				await config.onExecutionStarted?.('execution-1');
				yield { type: 'text-delta', id: 'text', delta: 'Hello' };
			});
			await execute(
				input.payload.kind === 'message'
					? { ...input.payload, message: 'saved edit' }
					: input.payload,
				context,
			);
			expect(context.send).toHaveBeenCalledWith({ type: 'text-delta', id: 'text', delta: 'Hello' });
			if (kind === 'message') {
				expect(agentTestRunService.streamDraftRun).toHaveBeenCalledWith(
					expect.objectContaining({ message: 'saved edit', previewChat: true }),
				);
			} else {
				expect(agentExecutionOrchestratorService.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({
						expectedMemory: { threadId: 'thread-1', resourceId: 'draft-chat:user-1' },
						previewChat: true,
					}),
				);
			}
		},
	);

	it('preserves structured configuration errors without admitting work', async () => {
		const { controller, agentTestRunService, queue } = makeController();
		agentTestRunService.prepareDraftRun.mockResolvedValue({
			status: 'agent_misconfigured',
			missing: ['model'],
		});
		await expect(
			controller.chat(request as never, {} as never, 'agent-1', {
				message: 'hello',
				clientRequestId,
			}),
		).resolves.toEqual({ status: 'agent_misconfigured', missing: ['model'] });
		expect(queue.enqueuePreview).not.toHaveBeenCalled();
	});
});

describe('AgentChatController queue scope', () => {
	const request = {
		params: { projectId: 'project-1', agentId: 'agent-1', threadId: 'thread-1' },
		user: { id: 'user-1' },
	};
	it('reads a queue before the first execution creates its thread', async () => {
		const { controller, agentsService, agentExecutionService, queue } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue(null);
		queue.listPreview.mockResolvedValue([]);
		await expect(controller.getQueue(request as never)).resolves.toEqual({ items: [] });
		expect(queue.listPreview).toHaveBeenCalledWith({
			...request.params,
			userId: 'user-1',
			resourceId: 'draft-chat:user-1',
		});
	});

	it.each([
		{ projectId: 'other-project', agentId: 'agent-1' },
		{ projectId: 'project-1', agentId: 'other-agent' },
	])('rejects a thread outside the requested scope: %j', async (scope) => {
		const { controller, agentsService, agentExecutionService, queue } = makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionService.findThreadById.mockResolvedValue(mock<AgentExecutionThread>(scope));
		await expect(controller.getQueue(request as never)).rejects.toThrow(NotFoundError);
		expect(queue.listPreview).not.toHaveBeenCalled();
	});
});

describe('AgentChatController HITL cancellation', () => {
	it('cancels a suspended run for the current preview user', async () => {
		const { controller, agentExecutionOrchestratorService, agentsService, queue } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		agentExecutionOrchestratorService.cancelChatRun.mockImplementation(async ({ onCancelled }) => {
			onCancelled?.('thread-1');
			return true;
		});

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
			onCancelled: expect.any(Function),
		});
		expect(queue.notify).toHaveBeenCalledWith('thread-1');
	});

	it('attempts active run cancellation when preview resume cleanup fails', async () => {
		const { controller, agentExecutionOrchestratorService, agentsService, queue } =
			makeController();
		agentsService.findById.mockResolvedValue({ id: 'agent-1' } as never);
		queue.cancelPreviewResumes.mockRejectedValue(new Error('Queue cleanup failed'));
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
		).rejects.toThrow('Queue cleanup failed');

		expect(agentExecutionOrchestratorService.cancelChatRun).toHaveBeenCalled();
	});
});

describe('AgentChatController attachment admission', () => {
	const request = { params: { projectId: 'project-1' }, user: { id: 'user-1' } };
	const clientRequestId = '724038b9-fc74-4428-bf08-07998f1e3b20';
	const attachment = {
		fileName: 'notes.txt',
		mimeType: 'text/plain',
		data: Buffer.from('hello').toString('base64'),
	};
	const stored = { id: 'att-1', fileName: 'notes.txt', mimeType: 'text/plain', fileSizeBytes: 5 };

	it('keeps accepted attachments and deletes them when admission fails', async () => {
		const { controller, queue, agentChatAttachmentService } = makeController();
		agentChatAttachmentService.storeInbound.mockResolvedValue(stored as never);
		const payload = { message: 'hi', attachments: [attachment], clientRequestId };
		await controller.chat(request as never, {} as never, 'agent-1', payload);
		expect(agentChatAttachmentService.deleteByIds).not.toHaveBeenCalled();
		queue.enqueuePreview.mockRejectedValueOnce(new Error('Queue unavailable'));
		await expect(
			controller.chat(request as never, {} as never, 'agent-1', payload),
		).rejects.toThrow('Queue unavailable');
		expect(agentChatAttachmentService.deleteByIds).toHaveBeenCalledWith(['att-1']);
	});

	it('keeps attachments when admission fails after persistence', async () => {
		const { controller, queue, agentChatAttachmentService } = makeController();
		agentChatAttachmentService.storeInbound.mockResolvedValue(stored as never);
		queue.enqueuePreview.mockImplementationOnce(
			async (_input, _clientRequestId, _execute, onPersisted) => {
				onPersisted?.();
				throw new Error('Queue unavailable after persistence');
			},
		);

		await expect(
			controller.chat(request as never, {} as never, 'agent-1', {
				message: 'hi',
				attachments: [attachment],
				clientRequestId,
			}),
		).rejects.toThrow('Queue unavailable after persistence');
		expect(agentChatAttachmentService.deleteByIds).not.toHaveBeenCalled();
	});

	it('deletes earlier attachments when a later one fails to store', async () => {
		const { controller, queue, agentChatAttachmentService } = makeController();
		agentChatAttachmentService.storeInbound
			.mockResolvedValueOnce(stored as never)
			.mockRejectedValueOnce(new Error('Storage unavailable'));
		await expect(
			controller.chat(request as never, {} as never, 'agent-1', {
				message: 'hi',
				attachments: [attachment, { ...attachment, fileName: 'other.txt' }],
				clientRequestId,
			}),
		).rejects.toThrow('Storage unavailable');
		expect(agentChatAttachmentService.deleteByIds).toHaveBeenCalledWith(['att-1']);
		expect(queue.enqueuePreview).not.toHaveBeenCalled();
	});

	it('rejects an empty attachment with a dedicated error', async () => {
		const { controller, agentChatAttachmentService } = makeController();
		await expect(
			controller.chat(request as never, {} as never, 'agent-1', {
				message: 'hi',
				attachments: [{ ...attachment, data: '' }],
				clientRequestId,
			}),
		).rejects.toThrow('Attachment "notes.txt" is empty');
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
