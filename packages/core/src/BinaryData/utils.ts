import type { BinaryData } from './types';

/**
 * Modes for storing binary data:
 * - `default` (in memory)
 * - `filesystem` (on disk)
 * - `s3` (S3-compatible storage)
 */
export const BINARY_DATA_MODES = ['default', 'filesystem', 's3'] as const;

export function areValidModes(modes: string[]): modes is BinaryData.Mode[] {
	return modes.every((m) => BINARY_DATA_MODES.includes(m as BinaryData.Mode));
}

export class InvalidBinaryDataModeError extends Error {
	constructor() {
		super(`Invalid binary data mode. Valid modes: ${BINARY_DATA_MODES.join(', ')}`);
	}
}

export class InvalidBinaryDataManagerError extends Error {
	constructor(mode: string) {
		super('No binary data manager found for mode: ' + mode);
	}
}
