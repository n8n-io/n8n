import type { Readable } from 'node:stream';

import type { PackageWriter } from '../../package-writer';

export class CapturingWriter implements PackageWriter {
	readonly files: Array<{ path: string; content: string }> = [];

	readonly directories: string[] = [];

	writeFile(path: string, content: string | Buffer): void {
		this.files.push({ path, content: content.toString() });
	}

	writeDirectory(path: string): void {
		this.directories.push(path);
	}

	finalize(): Readable {
		throw new Error('CapturingWriter is for unit tests and does not produce a stream');
	}
}
