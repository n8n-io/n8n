export class FileNotFoundError extends Error {
	constructor(readonly filePath: string) {
		super(`File not found: ${filePath}`);
	}
}
