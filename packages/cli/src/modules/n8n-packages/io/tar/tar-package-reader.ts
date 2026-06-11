import { jsonParse } from 'n8n-workflow';
import path from 'node:path';
import { Parser, type ReadEntry } from 'tar';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';
const ALLOWED_PATH_CHARS = /^[a-zA-Z0-9._/-]+$/;

export interface TarReaderLimits {
	maxUncompressedBytes: number;
	maxEntryBytes: number;
	maxEntries: number;
	maxPathLength: number;
}

export class TarPackageReader implements PackageReader {
	private entries: Map<string, Buffer> | null = null;

	constructor(
		private readonly buffer: Buffer,
		private readonly limits: TarReaderLimits,
	) {}

	async readManifest(): Promise<PackageManifest> {
		const entries = await this.load();
		const manifest = entries.get(MANIFEST_PATH);
		if (!manifest) {
			throw new BadRequestError('Package is missing manifest.json');
		}
		try {
			return jsonParse<PackageManifest>(manifest.toString('utf-8'));
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}

	async readFile(entryPath: string): Promise<Buffer> {
		const entries = await this.load();
		const content = entries.get(entryPath);
		if (!content) {
			throw new BadRequestError(`Package does not contain entry: ${entryPath}`);
		}
		return content;
	}

	async listEntries(): Promise<string[]> {
		const entries = await this.load();
		return Array.from(entries.keys());
	}

	private async load(): Promise<Map<string, Buffer>> {
		if (this.entries) return this.entries;
		this.entries = await this.parse();
		return this.entries;
	}

	private validateEntryPath(rawPath: string): string {
		const trimmed = rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

		if (trimmed.length === 0) {
			throw new BadRequestError('Package contains an entry with an empty path');
		}
		if (trimmed.length > this.limits.maxPathLength) {
			throw new BadRequestError('Package entry path exceeds the maximum allowed length');
		}
		if (trimmed.startsWith('/')) {
			throw new BadRequestError(`Package entry path "${trimmed}" must be relative`);
		}
		if (!ALLOWED_PATH_CHARS.test(trimmed)) {
			throw new BadRequestError(`Package entry path "${trimmed}" contains disallowed characters`);
		}

		const normalized = path.posix.normalize(trimmed);
		if (
			normalized === '..' ||
			normalized.startsWith('../') ||
			normalized.includes('/../') ||
			normalized.endsWith('/..')
		) {
			throw new BadRequestError(
				`Package entry path "${trimmed}" attempts to escape the package root`,
			);
		}

		return normalized;
	}

	private async parse(): Promise<Map<string, Buffer>> {
		const { maxEntries, maxEntryBytes, maxUncompressedBytes } = this.limits;
		const entries = new Map<string, Buffer>();
		let totalUncompressedBytes = 0;
		let entryCount = 0;
		let firstFileSeen = false;

		return await new Promise((resolve, reject) => {
			// strict mode turns node-tar's recoverable warnings (bad checksums,
			// malformed headers, forbidden linkpaths) into errors instead of
			// silently skipping the offending entry and reading the rest.
			const parser = new Parser({ strict: true });
			let aborted = false;

			const fail = (message: string): void => {
				if (aborted) return;
				aborted = true;
				try {
					parser.abort(new Error(message));
				} catch {
					// abort can throw if already torn down; swallow and reject below
				}
				reject(new BadRequestError(message));
			};

			// File path to read, null to skip a directory, or throws to reject.
			const accept = (entry: ReadEntry): string | null => {
				if (++entryCount > maxEntries) {
					throw new BadRequestError('Package contains too many entries');
				}
				if (entry.type !== 'File' && entry.type !== 'Directory') {
					throw new BadRequestError(`Package contains a disallowed entry type for "${entry.path}"`);
				}

				const safePath = this.validateEntryPath(entry.path);
				if (entries.has(safePath)) {
					throw new BadRequestError(`Package contains a duplicate entry for "${safePath}"`);
				}
				if (entry.type === 'Directory') return null;

				if (!firstFileSeen) {
					firstFileSeen = true;
					if (safePath !== MANIFEST_PATH) {
						throw new BadRequestError(
							`Package must begin with ${MANIFEST_PATH} but found "${safePath}"`,
						);
					}
				}
				return safePath;
			};

			parser.on('entry', (entry: ReadEntry) => {
				let validated: string | null = null;
				if (!aborted) {
					try {
						validated = accept(entry);
					} catch (error) {
						fail(error instanceof BadRequestError ? error.message : 'Invalid package entry path');
					}
				}
				if (validated === null) {
					entry.resume();
					return;
				}
				const safePath = validated;

				const chunks: Buffer[] = [];
				let entryBytes = 0;
				entry.on('data', (chunk: Buffer) => {
					if (aborted) return;
					entryBytes += chunk.length;
					if (entryBytes > maxEntryBytes) {
						fail(
							`Package entry "${safePath}" exceeds the maximum allowed uncompressed size per entry`,
						);
						return;
					}
					totalUncompressedBytes += chunk.length;
					if (totalUncompressedBytes > maxUncompressedBytes) {
						fail('Package exceeds the maximum allowed uncompressed size');
						return;
					}
					chunks.push(chunk);
				});
				entry.on('end', () => {
					if (!aborted) entries.set(safePath, Buffer.concat(chunks));
				});
				entry.resume();
			});

			parser.on('error', () => {
				if (aborted) return;
				aborted = true;
				reject(new BadRequestError('Failed to read package archive'));
			});
			parser.on('end', () => {
				if (!aborted) resolve(entries);
			});
			parser.end(this.buffer);
		});
	}
}
