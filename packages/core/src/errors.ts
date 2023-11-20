export class FileNotFoundError extends Error {
	constructor(readonly filePath: string) {
		super('File not found', { cause: { filePath } });
	}
}

export class BinaryFileNotFoundError extends FileNotFoundError {}

export class InvalidPathError extends Error {
	constructor(readonly filePath: string) {
		super('Invalid path detected', { cause: { filePath } });
	}
}
