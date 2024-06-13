import fs from 'node:fs/promises';
import type { Readable } from 'node:stream';
import type { BinaryData } from './types';
import concatStream from 'concat-stream';

export const CONFIG_MODES = ['default', 'filesystem', 's3'] as const;

export const STORED_MODES = ['filesystem', 'filesystem-v2', 's3'] as const;

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

export async function toBuffer(body: Buffer | Readable) {
	if (Buffer.isBuffer(body)) return body;
	return await new Promise<Buffer>((resolve, reject) => {
		body
			.once('error', (cause) => {
				if ('code' in cause && cause.code === 'Z_DATA_ERROR')
					reject(new Error('Failed to decompress response', { cause }));
				else reject(cause);
			})
			.pipe(concatStream(resolve));
	});
}
