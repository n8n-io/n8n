import { assertDir } from '@n8n/backend-common';
import chunk from 'lodash/chunk';
import fs from 'node:fs/promises';
import path from 'node:path';

const MAX_READ_CONCURRENCY = 50;

export type JsonFileStoreOptions<TRef, TPayload, TBundle> = {
	storagePath: string;
	resolveFileDir: (ref: TRef) => string;
	resolveDeleteDir?: (ref: TRef) => string;
	filename: string;
	serialize: (payload: TPayload) => string;
	parse: (content: string) => TBundle;
	key: (ref: TRef) => string;
	wrapWriteError?: (ref: TRef, error: unknown) => Error;
	wrapParseError?: (ref: TRef, error: unknown) => Error;
	shouldDropReadManyError?: (error: unknown) => boolean;
	reportError: (error: unknown) => void;
};

export class JsonFileStore<TRef, TPayload, TBundle> {
	constructor(private readonly options: JsonFileStoreOptions<TRef, TPayload, TBundle>) {}

	async init(): Promise<void> {
		await assertDir(this.options.storagePath);
	}

	async write(ref: TRef, payload: TPayload): Promise<number> {
		const writePath = this.resolveFilePath(ref);
		await assertDir(path.dirname(writePath));

		const tempPath = `${writePath}.tmp.${Date.now()}`;
		let success = false;

		try {
			const serialized = this.options.serialize(payload);
			await fs.writeFile(tempPath, serialized, 'utf-8');
			await fs.rename(tempPath, writePath);
			success = true;
			return Buffer.byteLength(serialized, 'utf-8');
		} catch (error) {
			throw this.options.wrapWriteError?.(ref, error) ?? error;
		} finally {
			if (!success) {
				await fs.rm(tempPath, { force: true }).catch((error) => this.options.reportError(error));
			}
		}
	}

	async read(ref: TRef): Promise<TBundle | null> {
		let content: string;
		try {
			content = await fs.readFile(this.resolveFilePath(ref), 'utf-8');
		} catch (error) {
			if (this.isFileNotFound(error)) return null;
			throw error;
		}

		try {
			return this.options.parse(content);
		} catch (error) {
			throw this.options.wrapParseError?.(ref, error) ?? error;
		}
	}

	async readMany(refs: TRef[]): Promise<Map<string, TBundle>> {
		const bundles = new Map<string, TBundle>();
		if (refs.length === 0) return bundles;

		for (const batch of chunk(refs, MAX_READ_CONCURRENCY)) {
			const bundlesInBatch = await Promise.all(batch.map(async (ref) => await this.tryRead(ref)));
			for (const [index, bundle] of bundlesInBatch.entries()) {
				if (bundle) bundles.set(this.options.key(batch[index]), bundle);
			}
		}

		return bundles;
	}

	async delete(ref: TRef | TRef[]): Promise<void> {
		const refs = Array.isArray(ref) ? ref : [ref];
		await Promise.all(
			refs.map(
				async (r) => await fs.rm(this.resolveDeletePath(r), { recursive: true, force: true }),
			),
		);
	}

	private resolveFilePath(ref: TRef): string {
		return path.join(
			this.options.storagePath,
			this.options.resolveFileDir(ref),
			this.options.filename,
		);
	}

	private resolveDeletePath(ref: TRef): string {
		return path.join(
			this.options.storagePath,
			this.options.resolveDeleteDir?.(ref) ?? this.options.resolveFileDir(ref),
		);
	}

	private isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
		);
	}

	private async tryRead(ref: TRef): Promise<TBundle | null> {
		try {
			return await this.read(ref);
		} catch (error) {
			if (this.options.shouldDropReadManyError?.(error)) {
				this.options.reportError(error);
				return null;
			}
			throw error;
		}
	}
}
