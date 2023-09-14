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

export class InvalidBinaryModeError extends Error {
	constructor() {
		const validModes = BINARY_DATA_MODES.join(', ');
		super(
			`Invalid binary data mode. Set N8N_AVAILABLE_BINARY_DATA_MODES using only valid modes: ${validModes}`,
		);
	}
}
