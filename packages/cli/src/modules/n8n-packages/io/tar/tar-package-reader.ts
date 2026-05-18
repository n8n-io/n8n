import { Parser, type ReadEntry } from 'tar';

import type { PackageReader } from '../package-reader';
import type { PackageManifest } from '../../spec/manifest.schema';

const MANIFEST_PATH = 'manifest.json';

export class TarPackageReader implements PackageReader {
	private entries: Map<string, Buffer> | null = null;

	constructor(private readonly buffer: Buffer) {}

	async readManifest(): Promise<PackageManifest> {
		const entries = await this.load();
		const manifest = entries.get(MANIFEST_PATH);
		if (!manifest) {
			throw new Error('Package is missing manifest.json');
		}
		return JSON.parse(manifest.toString('utf-8')) as PackageManifest;
	}

	async readFile(path: string): Promise<Buffer> {
		const entries = await this.load();
		const content = entries.get(path);
		if (!content) {
			throw new Error(`Package does not contain entry: ${path}`);
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
		return await new Promise((resolve, reject) => {
			const parser = new Parser();
			parser.on('entry', (entry: ReadEntry) => {
				if (entry.type !== 'File') {
					entry.resume();
					return;
				}
				const chunks: Buffer[] = [];
				entry.on('data', (c: Buffer) => chunks.push(c));
				entry.on('end', () => {
					entries.set(entry.path, Buffer.concat(chunks));
				});
				entry.resume();
			});
			parser.on('error', reject);
			parser.on('end', () => resolve(entries));
			parser.end(this.buffer);
		});
	}
}
