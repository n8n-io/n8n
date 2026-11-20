import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';
import { UserError } from '@n8n/errors';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatRelayService } from '../agent-chat-relay.service';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type { AgentQueuedTestStreamService } from '../agent-queued-test-stream.service';
import type { FlushableResponse } from '../agent-sse-stream';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';

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

	describe('storeChatAttachments', () => {
		const scope = {
			agentId: 'assistant',
			projectId: 'project-1',
			threadId: 'thread-1',
			resourceId: 'system-chat:user-1',
			source: 'system_chat',
		};
		let dir: string;

		beforeEach(async () => {
			attachmentService.storeInbound.mockReset();
			attachmentService.storeInbound.mockImplementation(async (params) =>
				mock<AgentChatAttachment>({
					id: `stored-${params.fileName}`,
					fileName: params.fileName,
					mimeType: params.mimeType,
					fileSizeBytes: params.data.byteLength,
				}),
			);
			dir = await mkdtemp(join(tmpdir(), 'agent-chat-relay-'));
		});

		afterEach(async () => {
			await rm(dir, { recursive: true, force: true });
		});

		async function tempFile(name: string, data: Buffer) {
			const path = join(dir, name);
			await writeFile(path, data);
			return path;
		}

		it('stores the files of a multipart request from their temp files', async () => {
			const path = await tempFile('clip', Buffer.alloc(32, 1));

			const stored = await relay.storeChatAttachments({
				...scope,
				attachments: undefined,
				uploads: [{ fileName: 'clip.mp4', mimeType: 'video/mp4', path }],
				maxUploadBytes: 64,
			});

			expect(stored).toEqual([
				{ id: 'stored-clip.mp4', fileName: 'clip.mp4', mimeType: 'video/mp4', sizeBytes: 32 },
			]);
			expect(attachmentService.storeInbound).toHaveBeenCalledWith(
				expect.objectContaining({ ...scope, fileName: 'clip.mp4', data: Buffer.alloc(32, 1) }),
			);
		});

		it('rejects an upload over its cap and removes the files it stored', async () => {
			const small = await tempFile('small', Buffer.alloc(8, 1));
			const large = await tempFile('large', Buffer.alloc(1024 * 1024 + 1, 1));

			await expect(
				relay.storeChatAttachments({
					...scope,
					attachments: undefined,
					uploads: [
						{ fileName: 'small.bin', mimeType: 'application/octet-stream', path: small },
						{ fileName: 'large.bin', mimeType: 'application/octet-stream', path: large },
					],
					maxUploadBytes: 1024 * 1024,
				}),
			).rejects.toThrow('Attachment "large.bin" exceeds the 1 MB limit');
			expect(attachmentService.deleteByIds).toHaveBeenCalledWith(['stored-small.bin']);
		});

		it('keeps the base64 cap for attachments in the JSON body', async () => {
			const data = Buffer.alloc(MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES + 1, 1).toString('base64');

			await expect(
				relay.storeChatAttachments({
					...scope,
					attachments: [{ fileName: 'big.txt', mimeType: 'text/plain', data }],
					maxUploadBytes: MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES * 20,
				}),
			).rejects.toThrow('Attachment "big.txt" exceeds the 10 MB limit');
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
