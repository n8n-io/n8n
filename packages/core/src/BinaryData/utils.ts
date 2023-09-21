import fs from 'fs/promises';
import type { BinaryData } from './types';

/**
 * Modes for storing binary data:
 * - `default` (in memory)
 * - `filesystem` (on disk)
 * - `object` (S3)
 */
export const BINARY_DATA_MODES = ['default', 'filesystem', 'object'] as const;

export function areValidModes(modes: string[]): modes is BinaryData.Mode[] {
	return modes.every((m) => BINARY_DATA_MODES.includes(m as BinaryData.Mode));
}

export async function ensureDirExists(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
}
