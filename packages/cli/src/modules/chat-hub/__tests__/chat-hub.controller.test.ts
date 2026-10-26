import type {
	ChatHubCreateToolRequest,
	ChatHubUpdateToolRequest,
	ChatMessageId,
	ChatSessionId,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { ModuleSettings } from '@n8n/decorators';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import express, { type NextFunction, type Request, type Response } from 'express';
import { get } from 'node:http';
import type { Readable } from 'node:stream';
import type { IBinaryData, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { sendErrorResponse } from '@/response-helper';

import type { ChatHubToolService } from '../chat-hub-tool.service';
import type { ChatHubAttachmentService } from '../chat-hub.attachment.service';
import { ChatHubController } from '../chat-hub.controller';
import type { ChatHubService } from '../chat-hub.service';
import {
	createLargeTempFile,
	disconnectBeforeResponse,
	failingStream,
	readFirstChunkAndDisconnect,
	readWholeBody,
	startServer,
	waitForClose,
} from '@test/file-stream-server';

vi.mock('@/response-helper', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/response-helper')>()),
	sendErrorResponse: vi.fn(),
}));

describe('ChatHubController', () => {
	const settingsMap = new Map<string, ModuleSettings>();
	const moduleRegistry = { settings: settingsMap } as unknown as ModuleRegistry;
	const chatToolService = mock<ChatHubToolService>();
	const controller = new ChatHubController(
		mock(),
		mock(),
		mock(),
		chatToolService,
		mock(),
		moduleRegistry,
	);

	const req = mock<Request>();
	const res = mock<Response>();
	let next: NextFunction;

	beforeEach(() => {
		vi.clearAllMocks();
		settingsMap.clear();
		next = vi.fn();
	});

	describe('checkChatEnabled middleware', () => {
		it('should reject with a ForbiddenError when Chat Hub is disabled', () => {
			settingsMap.set('chat-hub', { enabled: false });

			controller.checkChatEnabled(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(sendErrorResponse).toHaveBeenCalledWith(res, expect.any(ForbiddenError));
		});

		it('should pass through when Chat Hub is enabled', () => {
			settingsMap.set('chat-hub', { enabled: true });

			controller.checkChatEnabled(req, res, next);

			expect(next).toHaveBeenCalled();
			expect(sendErrorResponse).not.toHaveBeenCalled();
		});

		it('should reject when no cached setting exists (fail closed)', () => {
			controller.checkChatEnabled(req, res, next);

			expect(next).not.toHaveBeenCalled();
			expect(sendErrorResponse).toHaveBeenCalledWith(res, expect.any(ForbiddenError));
		});
	});

	describe('tool type authorization', () => {
		const chatUserReq = mock<AuthenticatedRequest>({
			user: { id: 'chat-user', role: { slug: 'global:chatUser' } },
		});
		const memberReq = mock<AuthenticatedRequest>({
			user: { id: 'member', role: { slug: 'global:member' } },
		});

		const toolDefinition = (type: string): INode => ({
			id: '00000000-0000-4000-8000-000000000001',
			name: 'Tool',
			type,
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		const createPayload = (type: string) =>
			({ definition: toolDefinition(type) }) as ChatHubCreateToolRequest;
		const updatePayload = (type: string) =>
			({ definition: toolDefinition(type) }) as ChatHubUpdateToolRequest;

		beforeEach(() => {
			chatToolService.createTool.mockResolvedValue(mock({ definition: toolDefinition('x') }));
			chatToolService.updateTool.mockResolvedValue(mock({ definition: toolDefinition('x') }));
		});

		it.each([
			'n8n-nodes-base.executeCommandTool',
			'n8n-nodes-base.gitTool',
			'@n8n/n8n-nodes-langchain.toolCode',
			'n8n-nodes-base.messageAnAgentTool',
		])('should reject creating a %s tool for a chat user', async (type) => {
			await expect(controller.createTool(chatUserReq, res, createPayload(type))).rejects.toThrow(
				BadRequestError,
			);
			expect(chatToolService.createTool).not.toHaveBeenCalled();
		});

		it('should reject updating a tool to a blocked type for a chat user', async () => {
			await expect(
				controller.updateTool(
					chatUserReq,
					res,
					'tool-1',
					updatePayload('n8n-nodes-base.executeCommandTool'),
				),
			).rejects.toThrow(BadRequestError);
			expect(chatToolService.updateTool).not.toHaveBeenCalled();
		});

		it.each(['n8n-nodes-base.slackTool', 'n8n-nodes-base.httpRequestTool'])(
			'should allow creating a %s tool for a chat user',
			async (type) => {
				await controller.createTool(chatUserReq, res, createPayload(type));

				expect(chatToolService.createTool).toHaveBeenCalled();
			},
		);

		it('should allow creating a Code tool for a member', async () => {
			await controller.createTool(
				memberReq,
				res,
				createPayload('@n8n/n8n-nodes-langchain.toolCode'),
			);

			expect(chatToolService.createTool).toHaveBeenCalled();
		});

		it('should reject creating a Chat tool for a member', async () => {
			await expect(
				controller.createTool(memberReq, res, createPayload('@n8n/n8n-nodes-langchain.chatTool')),
			).rejects.toThrow(BadRequestError);
		});
	});

	describe('getMessageAttachment', () => {
		const chatService = mock<ChatHubService>();
		const chatAttachmentService = mock<ChatHubAttachmentService>();
		const attachmentController = new ChatHubController(
			chatService,
			mock(),
			mock(),
			mock(),
			chatAttachmentService,
			moduleRegistry,
		);
		const userReq = mock<AuthenticatedRequest>({ user: { id: 'user-1' } });

		let file: Awaited<ReturnType<typeof createLargeTempFile>>;
		let server: Awaited<ReturnType<typeof startServer>> | undefined;

		beforeAll(async () => {
			file = await createLargeTempFile();
		});

		afterAll(async () => {
			await file.remove();
		});

		beforeEach(() => {
			chatService.ensureConversation.mockResolvedValue(undefined);
		});

		afterEach(async () => {
			await server?.close();
			server = undefined;
		});

		const attachmentResult = (
			stream: Readable,
		): Awaited<ReturnType<ChatHubAttachmentService['getAttachment']>> => [
			{ mimeType: 'application/octet-stream', fileName: 'a.bin' } as IBinaryData,
			{ type: 'stream', stream, fileSize: file.sizeInBytes },
		];

		/** Serves the attachment download. `beforeHandling` runs first on each response. */
		const serveAttachment = async (beforeHandling?: (res: Response) => void) => {
			const handled: Array<Promise<void>> = [];
			const app = express();
			app.get('/', (_req, res) => {
				beforeHandling?.(res);
				const handling = attachmentController.getMessageAttachment(
					userReq,
					res,
					'session-1' as ChatSessionId,
					'message-1' as ChatMessageId,
					'0',
				);
				// The tests await the outcome later, so a rejection must not count as unhandled.
				handling.catch(() => {});
				handled.push(handling);
			});
			server = await startServer(app);
			return { url: server.url, handled };
		};

		it('should send the whole file and resolve', async () => {
			const stream = await file.openStream();
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { url, handled } = await serveAttachment();

			expect(await readWholeBody(url)).toBe(file.sizeInBytes);
			await expect(handled[0]).resolves.toBeUndefined();
			expect(await waitForClose(stream)).toBe(true);
		});

		it('should close the file stream and settle when the client disconnects mid-download', async () => {
			const stream = await file.openStream();
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { url, handled } = await serveAttachment();

			await readFirstChunkAndDisconnect(url);

			expect(await waitForClose(stream)).toBe(true);
			await expect(handled[0]).resolves.toBeUndefined();
		});

		it('should close the file stream and settle when the client disconnects before the response starts', async () => {
			const stream = await file.openStream();
			const requestReceived = createDeferredPromise();
			const releaseAttachment = createDeferredPromise();
			const responseClosed = createDeferredPromise();
			chatAttachmentService.getAttachment.mockImplementation(async () => {
				requestReceived.resolve();
				await releaseAttachment.promise;
				return attachmentResult(stream);
			});
			const { url, handled } = await serveAttachment((res) =>
				res.once('close', () => responseClosed.resolve()),
			);

			await disconnectBeforeResponse(url, requestReceived.promise);
			await responseClosed.promise;
			releaseAttachment.resolve();

			expect(await waitForClose(stream)).toBe(true);
			await expect(handled[0]).resolves.toBeUndefined();
		});

		it('should reject when the file stream closes before it ends', async () => {
			const stream = await file.openStream();
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { url, handled } = await serveAttachment();

			get(url, (clientRes) => {
				clientRes.once('data', () => stream.destroy());
				clientRes.on('error', () => {});
			}).on('error', () => {});

			await vi.waitFor(() => expect(handled).toHaveLength(1));
			await expect(handled[0]).rejects.toMatchObject({ code: 'ERR_STREAM_PREMATURE_CLOSE' });
		});

		it('should end the response and reject when the file fails during the download', async () => {
			const stream = failingStream(3);
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { url, handled } = await serveAttachment();

			await expect(readWholeBody(url)).rejects.toThrow();
			await expect(handled[0]).rejects.toThrow('read failed');
		});
	});
});
