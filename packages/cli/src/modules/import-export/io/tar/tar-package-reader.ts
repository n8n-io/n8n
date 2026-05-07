import * as tar from 'tar-stream';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';

export class TarPackageReader implements PackageReader {
	private constructor(private readonly files: Map<string, string>) {}

	/**
	 * Read the entire package into memory and return a reader providing
	 * random access to all files.
	 */
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

	/**
	 * Stream just the manifest from the package and stop — used for fast-fail
	 * checks (e.g. format version, required nodes) before unpacking the whole
	 * archive. Relies on the writer placing the manifest as the first entry.
	 *
	 * Returns the parsed manifest JSON string, or `null` if no manifest was
	 * found at the head of the archive.
	 */
	static async readManifestOnly(buffer: Buffer): Promise<string | null> {
		return await new Promise((resolve, reject) => {
			const extract = tar.extract();
			let resolved = false;

			const finish = (value: string | null) => {
				if (resolved) return;
				resolved = true;
				extract.destroy();
				resolve(value);
			};

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			extract.on('entry', (header, stream, _next) => {
				if (header.type === 'file' && header.name === MANIFEST_PATH) {
					const chunks: Buffer[] = [];
					stream.on('data', (chunk: Buffer) => chunks.push(chunk));
					stream.on('end', () => {
						finish(Buffer.concat(chunks).toString('utf-8'));
					});
					stream.resume();
				} else {
					// Manifest must be first — if we hit any other entry, give up.
					stream.on('end', () => finish(null));
					stream.resume();
				}
			});

			extract.on('finish', () => finish(null));
			extract.on('error', (err) => {
				if (!resolved) reject(err);
			});

			pipeline(Readable.from(buffer), createGunzip(), extract).catch((err) => {
				// Pipeline aborts when we destroy() the extract; that's expected.
				if (!resolved) reject(err);
			});
		});
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
