import { jsonParse, UserError } from 'n8n-workflow';
import { EventEmitter } from 'node:events';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatRelayService } from '../agent-chat-relay.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentQueuedPreviewStreamService } from '../agent-queued-preview-stream.service';
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
		mock<AgentQueuedPreviewStreamService>(),
		mock<AgentChatAttachmentService>(),
	);

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
