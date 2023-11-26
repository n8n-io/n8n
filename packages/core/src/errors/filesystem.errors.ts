import { ReportableError } from 'n8n-workflow';

abstract class FileSystemError extends ReportableError {
	constructor(message: string, filePath: string) {
		super(message, { extra: { filePath } });
	}
}

export class FileNotFoundError extends FileSystemError {
	constructor(filePath: string) {
		super('File not found', filePath);
	}
}

export class BinaryFileNotFoundError extends FileNotFoundError {}

export class InvalidPathError extends FileSystemError {
	constructor(filePath: string) {
		super('Invalid path detected', filePath);
	}
}
