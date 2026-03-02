import type { Readable } from 'node:stream';

export interface PackageWriter {
	writeFile(path: string, content: string | Buffer): void;
	writeDirectory(path: string): void;
	finalize(): Readable | undefined;
}
