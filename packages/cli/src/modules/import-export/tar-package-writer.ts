import * as tar from 'tar-stream';
import { createGzip } from 'node:zlib';
import type { Readable } from 'node:stream';

import type { PackageWriter } from './package-writer';

const FIXED_MTIME = new Date(0);

export class TarPackageWriter implements PackageWriter {
	private readonly pack = tar.pack();

	writeFile(path: string, content: string | Buffer): void {
		const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
		this.pack.entry({ name: path, mtime: FIXED_MTIME }, buffer);
	}

	writeDirectory(path: string): void {
		this.pack.entry({
			name: path.endsWith('/') ? path : `${path}/`,
			type: 'directory',
			mtime: FIXED_MTIME,
		});
	}

	finalize(): Readable {
		this.pack.finalize();
		return this.pack.pipe(createGzip());
	}
}
