import { Parser, type ReadEntry } from 'tar';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { PackageManifest } from '../../spec/manifest.schema';
import type { PackageReader } from '../package-reader';

const MANIFEST_PATH = 'manifest.json';

export class TarPackageReader implements PackageReader {
	private entries: Map<string, Buffer> | null = null;

	constructor(
		private readonly buffer: Buffer,
		private readonly maxUncompressedBytes: number,
	) {}

	async readManifest(): Promise<PackageManifest> {
		const entries = await this.load();
		const manifest = entries.get(MANIFEST_PATH);
		if (!manifest) {
			throw new BadRequestError('Package is missing manifest.json');
		}
		try {
			return JSON.parse(manifest.toString('utf-8')) as PackageManifest;
		} catch {
			throw new BadRequestError('Package manifest is not valid JSON');
		}
	}

	async readFile(path: string): Promise<Buffer> {
		const entries = await this.load();
		const content = entries.get(path);
		if (!content) {
			throw new BadRequestError(`Package does not contain entry: ${path}`);
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

	private async parse(): Promise<Map<string, Buffer>> {
		const entries = new Map<string, Buffer>();
		let totalUncompressedBytes = 0;

		return await new Promise((resolve, reject) => {
			const parser = new Parser();
			parser.on('entry', (entry: ReadEntry) => {
				if (entry.type !== 'File') {
					entry.resume();
					return;
				}
				const chunks: Buffer[] = [];
				let entryBytes = 0;
				entry.on('data', (chunk: Buffer) => {
					entryBytes += chunk.length;
					if (entryBytes > this.maxUncompressedBytes) {
						reject(
							new BadRequestError(
								`Package entry "${entry.path}" exceeds the maximum allowed uncompressed size`,
							),
						);
						return;
					}
					chunks.push(chunk);
				});
				entry.on('end', () => {
					const content = Buffer.concat(chunks);
					totalUncompressedBytes += content.length;
					if (totalUncompressedBytes > this.maxUncompressedBytes) {
						reject(new BadRequestError('Package exceeds the maximum allowed uncompressed size'));
						return;
					}
					entries.set(entry.path, content);
				});
				entry.resume();
			});
			parser.on('error', (error) => {
				reject(
					new BadRequestError(
						error instanceof Error ? error.message : 'Failed to read package archive',
					),
				);
			});
			parser.on('end', () => resolve(entries));
			parser.end(this.buffer);
		});
	}
}
