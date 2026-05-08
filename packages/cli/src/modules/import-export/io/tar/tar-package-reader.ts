import * as tar from 'tar-stream';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';

export interface TarLimits {
	COMPRESSED_SIZE: number;
	MANIFEST_SIZE: number;
	PER_ENTRY_SIZE: number;
	TOTAL_ENTRIES: number;
	TOTAL_UNCOMPRESSED: number;
}

/**
 * Resource bounds for tar reads. Defaults match the security floor
 * defined in RFC §146 (Bounded resources).
 */
export const DEFAULT_TAR_LIMITS: TarLimits = {
	COMPRESSED_SIZE: 100 * 1024 * 1024, // 100 MB
	MANIFEST_SIZE: 5 * 1024 * 1024, // 5 MB
	PER_ENTRY_SIZE: 50 * 1024 * 1024, // 50 MB
	TOTAL_ENTRIES: 50_000,
	TOTAL_UNCOMPRESSED: 1024 * 1024 * 1024, // 1 GB
};

/**
 * Reject paths that could escape the package root, masquerade as
 * absolute, or carry control characters / NUL bytes. Trailing slash on
 * directory entries is allowed.
 */
function isSafePath(name: string): boolean {
	if (name.length === 0) return false;
	if (name.startsWith('/')) return false;
	if (name.includes('\\')) return false;
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(name)) return false;

	const normalized = name.endsWith('/') ? name.slice(0, -1) : name;
	for (const segment of normalized.split('/')) {
		if (segment === '..' || segment === '.' || segment === '') return false;
	}
	return true;
}

export class PackageReadError extends Error {}

export class TarPackageReader implements PackageReader {
	private constructor(private readonly files: Map<string, string>) {}

	/**
	 * Read the entire package into memory and return a reader providing
	 * random access to all files. Enforces path-safety and resource bounds
	 * before any handler sees data.
	 */
	static async fromBuffer(
		buffer: Buffer,
		limits: TarLimits = DEFAULT_TAR_LIMITS,
	): Promise<TarPackageReader> {
		if (buffer.length > limits.COMPRESSED_SIZE) {
			throw new PackageReadError(
				`Package exceeds compressed size limit (${buffer.length} > ${limits.COMPRESSED_SIZE})`,
			);
		}

		const files = new Map<string, string>();
		let entryCount = 0;
		let totalUncompressed = 0;
		const extract = tar.extract();

		const drainAnd = (
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			stream: any,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			next: any,
			err: Error,
		) => {
			stream.on('end', () => next(err));
			stream.resume();
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		extract.on('entry', (header: any, stream: any, next: any) => {
			const headerErr = validateHeader(header);
			if (headerErr) return drainAnd(stream, next, headerErr);

			entryCount++;
			if (entryCount > limits.TOTAL_ENTRIES) {
				return drainAnd(
					stream,
					next,
					new PackageReadError(`Package exceeds entry count limit (${limits.TOTAL_ENTRIES})`),
				);
			}

			if (header.type === 'directory') {
				stream.on('end', next);
				stream.resume();
				return;
			}

			const declaredSize: number = header.size ?? 0;
			const sizeLimit =
				header.name === MANIFEST_PATH ? limits.MANIFEST_SIZE : limits.PER_ENTRY_SIZE;
			if (declaredSize > sizeLimit) {
				return drainAnd(
					stream,
					next,
					new PackageReadError(
						`Entry "${header.name}" exceeds size limit (${declaredSize} > ${sizeLimit})`,
					),
				);
			}
			if (totalUncompressed + declaredSize > limits.TOTAL_UNCOMPRESSED) {
				return drainAnd(
					stream,
					next,
					new PackageReadError(
						`Package exceeds total uncompressed size limit (${limits.TOTAL_UNCOMPRESSED})`,
					),
				);
			}

			const chunks: Buffer[] = [];
			let actualSize = 0;
			let aborted: Error | null = null;
			stream.on('data', (chunk: Buffer) => {
				if (aborted) return;
				actualSize += chunk.length;
				if (actualSize > sizeLimit) {
					aborted = new PackageReadError(`Entry "${header.name}" exceeds size limit while reading`);
					return;
				}
				chunks.push(chunk);
			});
			stream.on('end', () => {
				if (aborted) {
					next(aborted);
					return;
				}
				files.set(header.name, Buffer.concat(chunks).toString('utf-8'));
				totalUncompressed += actualSize;
				next();
			});
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
	static async readManifestOnly(
		buffer: Buffer,
		limits: TarLimits = DEFAULT_TAR_LIMITS,
	): Promise<string | null> {
		if (buffer.length > limits.COMPRESSED_SIZE) {
			throw new PackageReadError(
				`Package exceeds compressed size limit (${buffer.length} > ${limits.COMPRESSED_SIZE})`,
			);
		}

		return await new Promise((resolve, reject) => {
			const extract = tar.extract();
			let resolved = false;

			const finish = (value: string | null) => {
				if (resolved) return;
				resolved = true;
				extract.destroy();
				resolve(value);
			};

			const fail = (err: Error) => {
				if (resolved) return;
				resolved = true;
				extract.destroy();
				reject(err);
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			extract.on('entry', (header: any, stream: any, _next: any) => {
				const headerErr = validateHeader(header);
				if (headerErr) {
					fail(headerErr);
					return;
				}

				if (header.type === 'file' && header.name === MANIFEST_PATH) {
					const declaredSize: number = header.size ?? 0;
					if (declaredSize > limits.MANIFEST_SIZE) {
						fail(
							new PackageReadError(
								`Manifest exceeds size limit (${declaredSize} > ${limits.MANIFEST_SIZE})`,
							),
						);
						return;
					}
					const chunks: Buffer[] = [];
					let actualSize = 0;
					let aborted = false;
					stream.on('data', (chunk: Buffer) => {
						if (aborted) return;
						actualSize += chunk.length;
						if (actualSize > limits.MANIFEST_SIZE) {
							aborted = true;
							fail(new PackageReadError('Manifest exceeds size limit while reading'));
							return;
						}
						chunks.push(chunk);
					});
					stream.on('end', () => {
						if (aborted) return;
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
			extract.on('error', (err: Error) => fail(err));

			pipeline(Readable.from(buffer), createGunzip(), extract).catch((err: Error) => {
				// Pipeline aborts when we destroy() the extract; that's expected.
				if (!resolved) fail(err);
			});
		});
	}

	readFile(path: string): string {
		const content = this.files.get(normaliseLookup(path));
		if (content === undefined) {
			throw new Error(`File not found in package: ${path}`);
		}
		return content;
	}

	hasFile(path: string): boolean {
		return this.files.has(normaliseLookup(path));
	}
}

/**
 * Strip a redundant leading "./" so callers reading from a manifest whose
 * targets were authored with that prefix still resolve correctly. Mirrors
 * the writer's path normalisation; on-the-wire validation
 * (`isSafePath`) remains strict.
 */
function normaliseLookup(path: string): string {
	return path.startsWith('./') ? path.slice(2) : path;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function validateHeader(header: any): PackageReadError | null {
	if (header.type !== 'file' && header.type !== 'directory') {
		return new PackageReadError(
			`Disallowed tar entry type "${header.type}" for "${header.name ?? '<unnamed>'}"`,
		);
	}
	if (header.linkname) {
		return new PackageReadError(`Disallowed link entry "${header.name ?? '<unnamed>'}"`);
	}
	if (typeof header.name !== 'string' || !isSafePath(header.name)) {
		return new PackageReadError(`Unsafe path in package: "${String(header.name)}"`);
	}
	return null;
}
