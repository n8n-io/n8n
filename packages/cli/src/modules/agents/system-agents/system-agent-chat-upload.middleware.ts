import {
	MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH,
	MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
} from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { unlink } from 'node:fs/promises';

import { AgentSandboxFilesService } from '../agent-sandbox-files.service';
import type { ChatUploadFile } from '../agent-chat-relay.service';

/** The multipart part with the JSON message body. */
export const SYSTEM_CHAT_PAYLOAD_FIELD = 'payload';
/** The multipart parts with the files of the message. */
export const SYSTEM_CHAT_FILES_FIELD = 'files';

/** What the upload middleware adds to a multipart chat request. */
export interface SystemAgentChatUploads {
	chatUploads?: ChatUploadFile[];
	/** Largest file in bytes that this request may store. */
	chatUploadMaxBytes?: number;
}

/**
 * The largest chat file in bytes. With sandbox files, the cap is the import cap
 * of the workspace, so the agent can copy any uploaded file into its sandbox.
 * Without sandbox files, the cap of base64 attachments stays.
 */
export async function systemAgentChatUploadMaxBytes(): Promise<number> {
	const sandboxFiles = Container.get(AgentSandboxFilesService);
	if (!(await sandboxFiles.isEnabled())) return MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES;
	return Math.max(sandboxFiles.maxImportBytes, MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES);
}

function describeMulterError(error: multer.MulterError, maxBytes: number): string {
	switch (error.code) {
		case 'LIMIT_FILE_SIZE':
			return `Files must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`;
		case 'LIMIT_FILE_COUNT':
		case 'LIMIT_UNEXPECTED_FILE':
			return `You can attach at most ${MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE} files to a message`;
		default:
			return error.message;
	}
}

async function removeTempFiles(files: Express.Multer.File[]) {
	await Promise.all(files.map(async ({ path }) => await unlink(path).catch(() => {})));
}

function reject(res: Response, message: string) {
	res.status(400).json({ code: 400, message });
}

/**
 * Accepts a system agent chat message as `multipart/form-data`: the JSON body
 * in the `payload` part, and the files in `files` parts. Files go to temp files
 * on disk, not into the JSON body, so they can be larger than the JSON body
 * limit. The middleware replaces `req.body` with the parsed payload, so the
 * route validates it as for a JSON request. A JSON request passes unchanged.
 * The temp files are removed when the response ends.
 */
export const systemAgentChatUploadMiddleware: RequestHandler = (req, res, next) => {
	if (!req.is('multipart/form-data')) {
		// Only this middleware can set the count of uploaded files.
		if (isRecord(req.body)) delete req.body.uploadedFileCount;
		next();
		return;
	}

	void (async () => {
		const maxBytes = await systemAgentChatUploadMaxBytes();
		const upload = multer({
			storage: multer.diskStorage({}),
			defParamCharset: 'utf8',
			limits: {
				fileSize: maxBytes,
				files: MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE,
				fields: 1,
				fieldSize: Container.get(GlobalConfig).endpoints.payloadSizeMax * 1024 * 1024,
			},
		}).array(SYSTEM_CHAT_FILES_FIELD, MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE);

		void upload(req, res, (error: unknown) => {
			const files = Array.isArray(req.files) ? req.files : [];
			res.on('close', () => {
				void removeTempFiles(files);
			});
			if (error) {
				if (error instanceof multer.MulterError) {
					reject(res, describeMulterError(error, maxBytes));
					return;
				}
				next(error);
				return;
			}

			const payload = parsePayload(req);
			if (!payload) {
				reject(res, `The "${SYSTEM_CHAT_PAYLOAD_FIELD}" part must be a JSON object`);
				return;
			}
			const longName = files.find(
				({ originalname }) => originalname.length > MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH,
			);
			if (longName) {
				reject(
					res,
					`File names can have at most ${MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH} characters`,
				);
				return;
			}
			req.body = { ...payload, uploadedFileCount: files.length };
			const uploads: SystemAgentChatUploads = {
				chatUploads: files.map((file) => ({
					fileName: file.originalname,
					// Browsers send an empty type for unknown extensions; the server sniffs the real one.
					mimeType:
						file.mimetype && file.mimetype.length <= MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH
							? file.mimetype
							: 'application/octet-stream',
					path: file.path,
				})),
				chatUploadMaxBytes: maxBytes,
			};
			Object.assign(req, uploads);
			next();
		});
	})().catch(next);
};

function parsePayload(req: Request): Record<string, unknown> | undefined {
	const raw: unknown = isRecord(req.body) ? req.body[SYSTEM_CHAT_PAYLOAD_FIELD] : undefined;
	if (typeof raw !== 'string') return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}
