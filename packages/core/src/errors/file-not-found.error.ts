import { FileSystemError } from './abstract/filesystem.error';

export class FileNotFoundError extends FileSystemError {
	constructor(filePath: string) {
		super('File not found', filePath);
	}
}
