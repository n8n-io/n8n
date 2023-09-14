import type { BinaryData } from './types';

export class InvalidBinaryModeError extends Error {}

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
