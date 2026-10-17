import type {
	ChatHubCreateToolRequest,
	ChatHubUpdateToolRequest,
	ChatMessageId,
	ChatSessionId,
} from '@n8n/api-types';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { ModuleSettings } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';
import type { ReadStream } from 'node:fs';
import { mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { createServer, get, type ClientRequest, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IBinaryData, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { sendErrorResponse } from '@/response-helper';

import type { ChatHubToolService } from '../chat-hub-tool.service';
import type { ChatHubAttachmentService } from '../chat-hub.attachment.service';
import { ChatHubController } from '../chat-hub.controller';
import type { ChatHubService } from '../chat-hub.service';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };

const createDeferred = <T = void>(): Deferred<T> => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
};

const TIMED_OUT = Symbol('timed out');

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
		timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		clearTimeout(timer);
	}
};

const waitForClose = async (stream: ReadStream, timeoutMs: number) => {
	if (stream.closed) return true;
	const closed = new Promise<boolean>((resolve) => stream.once('close', () => resolve(true)));
	return (await withTimeout(closed, timeoutMs)) === true;
};

vi.mock('@/response-helper');

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
		const FILE_SIZE = 8 * 1024 * 1024;
		const CLOSE_TIMEOUT_MS = 2000;

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

		type HandlerOutcome = { error: unknown };

		let tempDir: string;
		let filePath: string;
		let server: Server | undefined;
		const openedStreams: ReadStream[] = [];

		beforeAll(async () => {
			tempDir = await mkdtemp(join(tmpdir(), 'n8n-chat-hub-attachment-'));
			filePath = join(tempDir, 'a.bin');
			await writeFile(filePath, Buffer.alloc(FILE_SIZE, 1));
		});

		afterAll(async () => {
			await rm(tempDir, { recursive: true, force: true });
		});

		beforeEach(() => {
			chatService.ensureConversation.mockResolvedValue(undefined);
		});

		afterEach(async () => {
			for (const stream of openedStreams.splice(0)) stream.destroy();
			if (server) {
				const current = server;
				server = undefined;
				current.closeAllConnections();
				await new Promise<void>((resolve) => current.close(() => resolve()));
			}
		});

		const openFileStream = async () => {
			const handle = await open(filePath, 'r');
			const stream = handle.createReadStream();
			openedStreams.push(stream);
			return stream;
		};

		const attachmentResult = (
			stream: ReadStream,
		): Awaited<ReturnType<ChatHubAttachmentService['getAttachment']>> => [
			{ mimeType: 'application/octet-stream', fileName: 'a.bin' } as IBinaryData,
			{ type: 'stream', stream, fileSize: FILE_SIZE },
		];

		const startAttachmentServer = async () => {
			const handlerSettled = createDeferred<HandlerOutcome>();
			const serverResponse = createDeferred<ServerResponse>();
			server = createServer((_req, serverRes) => {
				serverResponse.resolve(serverRes);
				attachmentController
					.getMessageAttachment(
						userReq,
						serverRes as unknown as Response,
						'session-1' as ChatSessionId,
						'message-1' as ChatMessageId,
						'0',
					)
					.then(
						() => handlerSettled.resolve({ error: undefined }),
						(error: unknown) => handlerSettled.resolve({ error }),
					);
			});
			await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
			const { port } = server.address() as AddressInfo;
			return {
				port,
				handlerSettled: handlerSettled.promise,
				serverResponse: serverResponse.promise,
			};
		};

		const request = (port: number): ClientRequest => {
			const clientReq = get({ host: '127.0.0.1', port, path: '/' });
			// The client destroys the socket on purpose, so ignore the reset error.
			clientReq.on('error', () => {});
			return clientReq;
		};

		const readWholeBody = async (port: number) =>
			await new Promise<{ statusCode?: number; bytes: number }>((resolve, reject) => {
				const clientReq = get({ host: '127.0.0.1', port, path: '/' }, (clientRes) => {
					let bytes = 0;
					clientRes.on('data', (chunk: Buffer) => {
						bytes += chunk.length;
					});
					clientRes.on('end', () => resolve({ statusCode: clientRes.statusCode, bytes }));
					clientRes.on('error', reject);
				});
				clientReq.on('error', reject);
			});

		const readFirstChunkAndDisconnect = async (port: number) =>
			await new Promise<void>((resolve) => {
				const clientReq = request(port);
				clientReq.on('response', (clientRes) => {
					clientRes.once('data', () => {
						clientReq.destroy();
						resolve();
					});
				});
			});

		it('should send the whole file and resolve', async () => {
			const stream = await openFileStream();
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { port, handlerSettled } = await startAttachmentServer();

			const body = await readWholeBody(port);

			expect(body).toEqual({ statusCode: 200, bytes: FILE_SIZE });
			expect(await withTimeout(handlerSettled, CLOSE_TIMEOUT_MS)).toEqual({ error: undefined });
			expect(await waitForClose(stream, CLOSE_TIMEOUT_MS)).toBe(true);
		});

		it('should close the file stream and settle when the client disconnects mid-download', async () => {
			const stream = await openFileStream();
			chatAttachmentService.getAttachment.mockResolvedValue(attachmentResult(stream));
			const { port, handlerSettled } = await startAttachmentServer();

			await readFirstChunkAndDisconnect(port);

			expect(await waitForClose(stream, CLOSE_TIMEOUT_MS)).toBe(true);
			expect(await withTimeout(handlerSettled, CLOSE_TIMEOUT_MS)).toEqual({ error: undefined });
		});

		it('should close the file stream and settle when the client disconnects before the response starts', async () => {
			const stream = await openFileStream();
			const requestReceived = createDeferred();
			const releaseAttachment = createDeferred();
			chatAttachmentService.getAttachment.mockImplementation(async () => {
				requestReceived.resolve();
				await releaseAttachment.promise;
				return attachmentResult(stream);
			});
			const { port, handlerSettled, serverResponse } = await startAttachmentServer();

			const clientReq = request(port);
			await requestReceived.promise;
			const serverRes = await serverResponse;
			const responseClosed = new Promise<void>((resolve) => serverRes.once('close', resolve));
			clientReq.destroy();
			await responseClosed;
			releaseAttachment.resolve();

			expect(await waitForClose(stream, CLOSE_TIMEOUT_MS)).toBe(true);
			expect(await withTimeout(handlerSettled, CLOSE_TIMEOUT_MS)).toEqual({ error: undefined });
		});
	});
});
