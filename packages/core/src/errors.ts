export class FileNotFoundError extends Error {
	constructor(readonly filePath: string) {
		super(`File not found: ${filePath}`);
	}
}

export class BinaryFileNotFound extends FileNotFoundError {
	severity = 'warning';
}

export class InvalidPathError extends Error {
	severity = 'warning';

	constructor(readonly filePath: string) {
		super(`Invalid path detected: ${filePath}`);
	}
}
