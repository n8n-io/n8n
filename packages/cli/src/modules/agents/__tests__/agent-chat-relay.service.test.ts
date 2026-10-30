import { jsonParse, UserError } from 'n8n-workflow';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatRelayService } from '../agent-chat-relay.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import type { FlushableResponse } from '../agent-sse-stream';

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
	const relay = new AgentChatRelayService(
		mock<AgentMessageQueueService>(),
		mock<AgentQueuedTestStreamService>(),
		mock<AgentChatAttachmentService>(),
	);

	describe('relayQueuedStop', () => {
		it('subscribes before acceptance and keeps the stream open for the report', async () => {
			const streams = mock<AgentQueuedTestStreamService>();
			let finish!: () => void;
			const subscription = {
				accepted: vi.fn(),
				close: vi.fn(),
				done: new Promise<void>((resolve) => {
					finish = resolve;
				}),
			};
			streams.subscribe.mockReturnValue(subscription);
			const service = new AgentChatRelayService(
				mock<AgentMessageQueueService>(),
				streams,
				mock<AgentChatAttachmentService>(),
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
