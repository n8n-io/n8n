import { FileSystemError } from './abstract/filesystem.error';

export class DisallowedFilepathError extends FileSystemError {
	constructor(filePath: string) {
		super('Disallowed path detected', filePath);
	}
}
