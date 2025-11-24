import { UnexpectedError } from 'n8n-workflow';
import fs from 'node:fs/promises';
import type { Readable } from 'node:stream';

import type { BinaryData } from './types';

const STORED_MODES = ['filesystem', 'filesystem-v2', 's3', 'database'] as const;

export function isStoredMode(mode: string): mode is BinaryData.StoredMode {
	return STORED_MODES.includes(mode as BinaryData.StoredMode);
}

export async function assertDir(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
}

export async function doesNotExist(dir: string) {
	try {
		await fs.access(dir);
		return false;
	} catch {
		return true;
	}
}

/** Converts a readable stream to a buffer */
export async function streamToBuffer(stream: Readable) {
	return await new Promise<Buffer>((resolve, reject) => {
		const chunks: Buffer[] = [];
		stream.on('data', (chunk: Buffer) => chunks.push(chunk));
		stream.on('end', () => resolve(Buffer.concat(chunks)));
		stream.once('error', (cause) => {
			if ('code' in cause && cause.code === 'Z_DATA_ERROR')
				reject(new UnexpectedError('Failed to decompress response', { cause }));
			else reject(cause);
		});
	});
}

/** Converts a buffer or a readable stream to a buffer */
export async function binaryToBuffer(body: Buffer | Readable) {
	if (Buffer.isBuffer(body)) return body;
	return await streamToBuffer(body);
}

export const FileLocation = {
	ofExecution: (workflowId: string, executionId: string): BinaryData.FileLocation => ({
		type: 'execution',
		workflowId,
		executionId,
	}),

	/**
	 * Create a location for a binary file at a custom path,
	 * e.g. ["chat-hub", "sessions", "abc", "messages", "def"] -> "chat-hub/sessions/abc/messages/def"
	 */
	ofCustom: (pathSegments: string[]): BinaryData.FileLocation => ({
		type: 'custom',
		pathSegments,
	}),
};
