import { UnexpectedError } from 'n8n-workflow';
import fs from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

import type { BinaryData } from './types';

/**
 * Placeholder execution ID used when the actual execution ID is not yet available.
 * This is used in the binary data file path and will be replaced with the actual
 * execution ID after the workflow execution completes.
 */
export const TEMP_EXECUTION_ID = 'temp';

export const CONFIG_MODES = ['default', 'filesystem', 's3'] as const;

const STORED_MODES = ['filesystem', 'filesystem-v2', 's3'] as const;

export function areConfigModes(modes: string[]): modes is BinaryData.ConfigMode[] {
	return modes.every((m) => CONFIG_MODES.includes(m as BinaryData.ConfigMode));
}

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

/**
 * Generates a file ID for binary data storage.
 * Format: workflows/<workflowId>/executions/<executionId>/binary_data/<uuid>
 */
export function toFileId(workflowId: string, executionId: string): string {
	if (!executionId) executionId = TEMP_EXECUTION_ID; // missing only in edge case, see PR #7244
	return `workflows/${workflowId}/executions/${executionId}/binary_data/${uuid()}`;
}

/**
 * Parses a file ID to extract workflowId and executionId.
 * Returns null if the format doesn't match.
 */
export function parseFileId(fileId: string): { workflowId: string; executionId: string } | null {
	const match = fileId.match(/^workflows\/([^/]+)\/executions\/([^/]+)\//);
	if (!match) {
		return null;
	}
	return {
		workflowId: match[1],
		executionId: match[2],
	};
}
