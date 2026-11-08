import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { AppFiles } from './storage/app-version-stores';
import { AppsConfig } from './apps.config';

const CHUNK_SIZE = 64 * 1024;

function* slices(body: Buffer) {
	for (let offset = 0; offset < body.length; offset += CHUNK_SIZE) {
		yield body.subarray(offset, offset + CHUNK_SIZE);
	}
}

@Service()
export class AppArchive {
	constructor(private readonly config: AppsConfig) {}

	async pack(files: AppFiles, bundle = false): Promise<Buffer> {
		const normalized = new Map<string, Buffer>();
		let size = 0;
		for (const [name, content] of files) {
			const filePath = this.filePath(name);
			if (normalized.has(filePath))
				throw new BadRequestError('App artifact contains duplicate paths.');
			normalized.set(filePath, content);
			size += content.length;
			this.checkLimits(size, normalized.size + 1);
		}
		this.checkFilePaths(new Set(normalized.keys()));
		this.checkBundle(normalized, bundle);
		const { Header, Pack, ReadEntry } = await import('tar');
		const archive = new Pack({ gzip: { portable: true }, portable: true, noMtime: true });
		const root = new ReadEntry(new Header({ path: './', size: 0, mode: 0o755, type: 'Directory' }));
		root.end();
		archive.write(root);
		for (const [name, content] of normalized) {
			const entry = new ReadEntry(
				new Header({ path: name, size: content.length, mode: 0o644, type: 'File' }),
			);
			entry.end(content);
			archive.write(entry);
		}
		archive.end();
		const chunks: Buffer[] = [];
		let compressedSize = 0;
		for await (const chunk of archive) {
			compressedSize += chunk.length;
			this.checkCompressedSize(compressedSize);
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	}

	async unpack(body: Buffer, bundle = false): Promise<Map<string, Buffer>> {
		const { files } = await this.parse(body, () => true);
		this.checkBundle(files, bundle);
		return files;
	}

	async listFiles(body: Buffer): Promise<string[]> {
		const { fileNames } = await this.parse(body, () => false);
		return [...fileNames].sort();
	}

	async readFile(body: Buffer, filePath: string): Promise<Buffer | null> {
		const normalizedPath = this.filePath(filePath);
		const { files } = await this.parse(body, (name) => name === normalizedPath);
		return files.get(normalizedPath) ?? null;
	}

	private async parse(body: Buffer, includeFile: (name: string) => boolean) {
		this.checkCompressedSize(body.length);
		if (body.length < 2 || body[0] !== 0x1f || body[1] !== 0x8b) {
			throw new BadRequestError(
				'App artifact must be a gzip archive. Save the source or bundle again.',
			);
		}
		const { Parser } = await import('tar');
		const files = new Map<string, Buffer>();
		const fileNames = new Set<string>();
		const paths = new Set<string>();
		let size = 0;
		let entries = 0;
		const parser = new Parser({
			strict: true,
			filter: (_name, entry) => {
				try {
					if (!('type' in entry)) return false;
					this.checkLimits(size, ++entries);
					if (entry.type !== 'File' && entry.type !== 'Directory') {
						throw new BadRequestError('App artifacts can contain only files and directories.');
					}
					if (entry.type === 'Directory' && /^(\.\/)*\.?\/?$/.test(entry.path)) return false;
					const name = this.filePath(entry.path);
					if (paths.has(name)) throw new BadRequestError('App artifact contains duplicate paths.');
					paths.add(name);
					if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
						throw new BadRequestError('App artifact contains an invalid file size.');
					}
					size += entry.size;
					this.checkLimits(size, entries);
					if (entry.type !== 'File') return false;
					fileNames.add(name);
					return includeFile(name);
				} catch (error) {
					parser.abort(error instanceof Error ? error : new Error(String(error)));
					return false;
				}
			},
			onReadEntry: (entry) => {
				const chunks: Buffer[] = [];
				entry.on('data', (chunk: Buffer) => chunks.push(chunk));
				entry.on('end', () => files.set(this.filePath(entry.path), Buffer.concat(chunks)));
			},
		});
		try {
			await pipeline(Readable.from(slices(body)), parser);
		} catch (error) {
			throw BadRequestError.wrap(
				'App artifact is invalid or exceeds the archive limits. Check the files and configured limits.',
				error,
			);
		}
		this.checkFilePaths(fileNames);
		return { files, fileNames };
	}

	private filePath(value: string): string {
		const relative = value.replace(/^(\.\/)+/, '').replace(/\/$/, '');
		if (
			!relative ||
			relative.includes('\\') ||
			relative.includes('\0') ||
			path.posix.isAbsolute(relative) ||
			/^[a-z]:/i.test(relative) ||
			relative.split('/').some((part) => !part || part === '.' || part === '..')
		) {
			throw new BadRequestError(
				'App artifact contains an invalid file path. Use relative paths without parent directory segments.',
			);
		}
		return relative;
	}

	private checkFilePaths(fileNames: ReadonlySet<string>) {
		for (const name of fileNames) {
			let parent = path.posix.dirname(name);
			while (parent !== '.') {
				if (fileNames.has(parent))
					throw new BadRequestError('App artifact contains conflicting file paths.');
				parent = path.posix.dirname(parent);
			}
		}
	}

	private checkLimits(bytes: number, entries: number) {
		if (
			bytes > this.config.maxArtifactUnpackedSizeBytes ||
			entries > this.config.maxArtifactEntries
		) {
			throw new BadRequestError(
				'App artifact exceeds the unpacked size or entry limit. Reduce the files or increase the artifact limits.',
			);
		}
	}

	private checkCompressedSize(bytes: number) {
		if (bytes > this.config.maxArtifactSizeBytes) {
			throw new BadRequestError(
				'App artifact exceeds the compressed size limit. Reduce its size or increase the artifact limit.',
			);
		}
	}

	private checkBundle(files: AppFiles, bundle: boolean) {
		if (bundle && !files.has('index.html')) {
			throw new BadRequestError(
				'App bundle must contain index.html at its root. Check the build output.',
			);
		}
	}
}
