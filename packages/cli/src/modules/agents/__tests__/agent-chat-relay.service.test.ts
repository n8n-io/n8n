import { jsonParse } from 'n8n-workflow';
import { UserError } from '@n8n/errors';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatRelayService } from '../agent-chat-relay.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';
import type { AgentTurnPlacement } from '../queue/agent-turn-placement.service';

import { sendStreamToResponse } from '@/response-helper';

vi.mock('@/response-helper', () => ({
	sendStreamToResponse: vi.fn(async (_res: unknown, _stream: unknown, setHeaders?: () => void) =>
		setHeaders?.(),
	),
}));

function makeSseResponse(writes: string[]) {
	const emitter = new EventEmitter();
	const res = Object.assign(emitter, {
		socket: { setTimeout: vi.fn(), setNoDelay: vi.fn(), setKeepAlive: vi.fn() },
		setHeader: vi.fn(),
		flushHeaders: vi.fn(),
		write: vi.fn((chunk: string) => {
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
	return res;
}

/** The JSON events that the stream sent, without the SSE framing and heartbeats. */
function sentEvents(writes: string[]): unknown[] {
	return writes
		.filter((write) => write.startsWith('data: '))
		.map((write) => jsonParse<unknown>(write.slice(6)));
}

describe('AgentChatRelayService', () => {
	const attachmentService = mock<AgentChatAttachmentService>();
	const relay = new AgentChatRelayService(
		mock<AgentMessageQueueService>(),
		mock<AgentQueuedTestStreamService>(),
		attachmentService,
		mock<AgentTurnPlacement>(),
	);

	describe('relayQueuedMessage', () => {
		const input = {
			agentId: 'agent',
			projectId: 'project',
			threadId: 'thread',
			sessionMode: 'new' as const,
			source: 'chat',
			payload: { kind: 'preview' as const, message: 'hi', userId: 'user', resourceId: 'r' },
		};

		function setup(mayOpenStream: boolean) {
			const streams = mock<AgentQueuedTestStreamService>();
			const subscription = {
				accepted: vi.fn(),
				close: vi.fn(),
				lastEventAt: vi.fn(() => Date.now()),
				done: Promise.resolve(),
			};
			streams.subscribe.mockReturnValue(subscription);
			const messageQueue = mock<AgentMessageQueueService>();
			messageQueue.enqueue.mockImplementation(async (_input, onInserted) => {
				onInserted?.('7');
				return { status: 'accepted', item: { id: '7' } } as Awaited<
					ReturnType<AgentMessageQueueService['enqueue']>
				>;
			});
			const service = new AgentChatRelayService(
				messageQueue,
				streams,
				mock<AgentChatAttachmentService>(),
				mock<AgentTurnPlacement>({ mayOpenStream: () => mayOpenStream }),
			);
			return { service, streams, subscription };
		}

		it('subscribes the browser stream to the queued message', async () => {
			const { service, streams, subscription } = setup(true);
			const writes: string[] = [];
			const res = makeSseResponse(writes);
			await service.relayQueuedMessage(res as unknown as FlushableResponse, async () => input);

			expect(streams.subscribe).toHaveBeenCalledWith('7', expect.anything());
			expect(subscription.accepted).toHaveBeenCalledOnce();
		});

		it('accepts the message without a live stream when the main may not open one', async () => {
			const { service, streams } = setup(false);
			const writes: string[] = [];
			const res = makeSseResponse(writes);
			await service.relayQueuedMessage(res as unknown as FlushableResponse, async () => input);

			expect(streams.subscribe).not.toHaveBeenCalled();
			expect(sentEvents(writes)).toEqual([
				{ type: 'message-queued', queueId: '7', sessionId: 'thread' },
			]);
			expect(res.end).toHaveBeenCalledOnce();
		});
	});

	describe('relayQueuedStop', () => {
		it('subscribes before acceptance and keeps the stream open for the report', async () => {
			const streams = mock<AgentQueuedTestStreamService>();
			let finish!: () => void;
			const subscription = {
				accepted: vi.fn(),
				close: vi.fn(),
				lastEventAt: vi.fn(() => Date.now()),
				done: new Promise<void>((resolve) => {
					finish = resolve;
				}),
			};
			streams.subscribe.mockReturnValue(subscription);
			const service = new AgentChatRelayService(
				mock<AgentMessageQueueService>(),
				streams,
				mock<AgentChatAttachmentService>(),
				mock<AgentTurnPlacement>(),
			);
			const writes: string[] = [];
			const res = makeSseResponse(writes);
			const pending = service.relayQueuedStop(
				res as unknown as FlushableResponse,
				'thread',
				async (onQueued) => {
					onQueued('report');

					expect(streams.subscribe).toHaveBeenCalledOnce();
					expect(subscription.accepted).not.toHaveBeenCalled();
				},
			);
			await vi.waitFor(() => expect(subscription.accepted).toHaveBeenCalledOnce());

			expect(sentEvents(writes)).toContainEqual({
				type: 'message-queued',
				queueId: 'report',
				sessionId: 'thread',
			});
			expect(res.end).not.toHaveBeenCalled();

			finish();
			await pending;

			expect(subscription.close).toHaveBeenCalledOnce();
			expect(res.end).toHaveBeenCalledOnce();
		});

		it('closes a repeated Stop without starting another report', async () => {
			const writes: string[] = [];
			const res = makeSseResponse(writes);
			await relay.relayQueuedStop(res as unknown as FlushableResponse, 'thread', async () => {});

			expect(sentEvents(writes)).toEqual([{ type: 'done', sessionId: 'thread' }]);
		});
	});

	describe('streamAttachment', () => {
		it('downloads a sandbox file under its base name', async () => {
			const res = { setHeader: vi.fn() };
			const attachment = mock<AgentChatAttachment>({
				id: 'att-1',
				fileName: 'reports/q1.zip',
				mimeType: 'application/zip',
				fileSizeBytes: 3,
			});
			const stream = Readable.from(['abc']);
			attachmentService.getStream.mockResolvedValue(stream);

			await relay.streamAttachment(attachment, res as never);

			expect(attachmentService.getStream).toHaveBeenCalledWith(attachment);
			expect(sendStreamToResponse).toHaveBeenCalledWith(res, stream, expect.any(Function));

			expect(res.setHeader).toHaveBeenCalledWith(
				'Content-Disposition',
				'attachment; filename="q1.zip"',
			);
		});
	});

	describe('relayResume', () => {
		it('streams the events of the resume and closes the stream', async () => {
			const writes: string[] = [];
			const res = makeSseResponse(writes);

			await relay.relayResume(res as unknown as FlushableResponse, async ({ send }) => {
				send({ type: 'done', executionId: 'exec-1' });
			});

			expect(sentEvents(writes)).toEqual([{ type: 'done', executionId: 'exec-1' }]);
			expect(res.end).toHaveBeenCalledTimes(1);
		});

		it('sends a failed resume as an error event and closes the stream', async () => {
			const writes: string[] = [];
			const res = makeSseResponse(writes);

			await relay.relayResume(res as unknown as FlushableResponse, async () => {
				throw new UserError('This action is no longer waiting for input');
			});

			expect(sentEvents(writes)).toEqual([
				expect.objectContaining({
					type: 'error',
					message: 'This action is no longer waiting for input',
				}),
			]);
			expect(res.end).toHaveBeenCalledTimes(1);
		});
	});
});
