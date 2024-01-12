import { BinaryDataError } from './abstract/binary-data.error';

export class InvalidManagerError extends BinaryDataError {
	constructor(mode: string) {
		super(`No binary data manager found for: ${mode}`);
	}
}
