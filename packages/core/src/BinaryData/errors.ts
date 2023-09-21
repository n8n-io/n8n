import { BINARY_DATA_MODES } from './utils';

export class InvalidBinaryDataMode extends Error {
	constructor() {
		super(`Invalid binary data mode. Valid modes: ${BINARY_DATA_MODES.join(', ')}`);
	}
}

export class BinaryDataManagerNotFound extends Error {
	constructor(mode: string) {
		super(`No binary data manager found for: ${mode}`);
	}
}

export class FileNotFound extends Error {
	constructor(filePath: string) {
		super(`File not found: ${filePath}`);
	}
}
