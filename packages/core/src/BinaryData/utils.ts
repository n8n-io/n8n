import fs from 'node:fs/promises';
import type { Readable } from 'node:stream';
import type { BinaryData } from './types';
import concatStream from 'concat-stream';

/**
 * Modes for storing binary data:
 * - `default` (in memory)
 * - `filesystem` (on disk) (replaced internally with `filesystem-v2`)
 * - `s3` (S3-compatible storage)
 */
export const CONFIG_BINARY_DATA_MODES = ['default', 'filesystem', 's3'] as const;

export function areValidModes(modes: string[]): modes is BinaryData.ConfigMode[] {
	return modes.every((m) => CONFIG_BINARY_DATA_MODES.includes(m as BinaryData.ConfigMode));
}

export async function assertDir(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
}

export async function toBuffer(body: Buffer | Readable) {
	return new Promise<Buffer>((resolve) => {
		if (Buffer.isBuffer(body)) resolve(body);
		else body.pipe(concatStream(resolve));
	});
}
