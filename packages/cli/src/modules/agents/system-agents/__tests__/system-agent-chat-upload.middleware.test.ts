import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import express from 'express';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { AgentSandboxFilesService } from '../../agent-sandbox-files.service';
import {
	type SystemAgentChatUploads,
	systemAgentChatUploadMiddleware,
} from '../system-agent-chat-upload.middleware';

const sandboxFiles = mock<AgentSandboxFilesService>();

/** An app whose route returns what the middleware gave it, with the content of each temp file. */
function app() {
	const server = express();
	server.use(express.json());
	server.post('/chat', systemAgentChatUploadMiddleware, async (req, res) => {
		const { chatUploads, chatUploadMaxBytes } = req as typeof req & SystemAgentChatUploads;
		const files = await Promise.all(
			(chatUploads ?? []).map(async (upload) => ({
				...upload,
				content: (await readFile(upload.path)).toString(),
			})),
		);
		res.json({ body: req.body as unknown, files, chatUploadMaxBytes });
	});
	return server;
}

describe('systemAgentChatUploadMiddleware', () => {
	beforeAll(() => {
		Container.set(AgentSandboxFilesService, sandboxFiles);
		Container.set(GlobalConfig, mock<GlobalConfig>({ endpoints: { payloadSizeMax: 16 } }));
	});

	beforeEach(() => {
		sandboxFiles.isEnabled.mockResolvedValue(true);
		Object.defineProperty(sandboxFiles, 'maxImportBytes', {
			value: 200 * 1024 * 1024,
			configurable: true,
		});
	});

	it('passes a JSON request on, without a count of uploaded files from the client', async () => {
		const response = await request(app())
			.post('/chat')
			.send({ message: 'hi', uploadedFileCount: 3 })
			.expect(200);

		expect(response.body).toEqual({ body: { message: 'hi' }, files: [] });
	});

	it('takes the payload part as the body and the files parts as uploads', async () => {
		const response = await request(app())
			.post('/chat')
			.field('payload', JSON.stringify({ message: 'see clip', sessionId: 'session-1' }))
			.attach('files', Buffer.from('video bytes'), {
				filename: 'clip ü.mp4',
				contentType: 'video/mp4',
			})
			.expect(200);

		expect(response.body).toEqual({
			body: { message: 'see clip', sessionId: 'session-1', uploadedFileCount: 1 },
			files: [
				expect.objectContaining({
					fileName: 'clip ü.mp4',
					mimeType: 'video/mp4',
					content: 'video bytes',
				}),
			],
			chatUploadMaxBytes: 200 * 1024 * 1024,
		});
	});

	it('removes the temp files when the response ends', async () => {
		const response = await request(app())
			.post('/chat')
			.field('payload', JSON.stringify({ message: '' }))
			.attach('files', Buffer.from('data'), 'data.bin')
			.expect(200);
		const [{ path }] = (response.body as { files: Array<{ path: string }> }).files;

		await vi.waitFor(() => expect(existsSync(path)).toBe(false));
	});

	it('keeps the base64 cap when sandbox files are off', async () => {
		sandboxFiles.isEnabled.mockResolvedValue(false);

		const response = await request(app())
			.post('/chat')
			.field('payload', JSON.stringify({ message: 'hi' }))
			.attach('files', Buffer.from('data'), 'data.bin')
			.expect(200);

		expect((response.body as { chatUploadMaxBytes: number }).chatUploadMaxBytes).toBe(
			MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
		);
	});

	it('rejects a file over the cap', async () => {
		Object.defineProperty(sandboxFiles, 'maxImportBytes', { value: 0, configurable: true });
		sandboxFiles.isEnabled.mockResolvedValue(false);

		const response = await request(app())
			.post('/chat')
			.field('payload', JSON.stringify({ message: 'hi' }))
			.attach('files', Buffer.alloc(MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES + 1), 'big.bin')
			.expect(400);

		expect(response.body).toEqual({ code: 400, message: 'Files must be 10 MB or smaller' });
	});

	it('rejects a multipart request without a JSON payload', async () => {
		const response = await request(app())
			.post('/chat')
			.field('payload', 'not json')
			.attach('files', Buffer.from('data'), 'data.bin')
			.expect(400);

		expect(response.body).toEqual({
			code: 400,
			message: 'The "payload" part must be a JSON object',
		});
	});
});
