import * as tar from 'tar-stream';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import type { PackageReader } from './package-reader';

export class TarPackageReader implements PackageReader {
	private constructor(private readonly files: Map<string, string>) {}

	static async fromBuffer(buffer: Buffer): Promise<TarPackageReader> {
		const files = new Map<string, string>();
		const extract = tar.extract();

		extract.on('entry', (header, stream, next) => {
			if (header.type === 'file') {
				const chunks: Buffer[] = [];
				stream.on('data', (chunk: Buffer) => chunks.push(chunk));
				stream.on('end', () => {
					files.set(header.name, Buffer.concat(chunks).toString('utf-8'));
					next();
				});
			} else {
				stream.on('end', next);
			}
			stream.resume();
		});

		await pipeline(Readable.from(buffer), createGunzip(), extract);

		return new TarPackageReader(files);
	}

	readFile(path: string): string {
		const content = this.files.get(path);
		if (content === undefined) {
			throw new Error(`File not found in package: ${path}`);
		}
		return content;
	}

	hasFile(path: string): boolean {
		return this.files.has(path);
	}
}
