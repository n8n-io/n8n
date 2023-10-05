import { BINARY_DATA_MODES } from './utils';

export class InvalidBinaryDataModeError extends Error {
	message = `Invalid binary data mode. Valid modes: ${BINARY_DATA_MODES.join(', ')}`;
}

export class UnknownBinaryDataManagerError extends Error {
	constructor(mode: string) {
		super(`No binary data manager found for: ${mode}`);
	}
}
