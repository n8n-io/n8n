import { ErrorReporterProxy } from 'n8n-workflow';

export class FileNotFoundError extends ErrorReporterProxy.ReportableError {
	constructor(filePath: string) {
		super('File not found', { extra: { filePath } });
	}
}

export class BinaryFileNotFoundError extends FileNotFoundError {}

export class InvalidPathError extends ErrorReporterProxy.ReportableError {
	constructor(filePath: string) {
		super('Invalid path detected', { extra: { filePath } });
	}
}
