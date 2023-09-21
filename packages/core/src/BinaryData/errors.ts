import { BINARY_DATA_MODES } from './utils';

export class InvalidBinaryDataMode extends Error {
	constructor() {
		super(`Invalid binary data mode. Valid modes: ${BINARY_DATA_MODES.join(', ')}`);
	}
}

export class MissingBinaryDataManager extends Error {
	constructor() {
		super('No binary data manager found');
	}
}
