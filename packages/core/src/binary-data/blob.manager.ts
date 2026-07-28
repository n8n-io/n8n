import type { ByteStore } from '@n8n/blob-storage';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

import type { ErrorReporter } from '@/errors';

import type { BinaryData } from './types';
import { FileLocation } from './utils';
import { FileNotFoundError } from '../errors/file-not-found.error';

const EXECUTION_PATH_MATCHER = /^workflows\/([^/]+)\/executions\/([^/]+)\/binary_data\//;

/**
 * Stores binary data as blobs via a {@link ByteStore}.
 *
 * Backend differences are capability-driven:
 * - Backends with native object metadata (S3, Azure) store it on the object.
 * FS keeps it in companion `{fileId}.metadata` entries.
 * - Deletion happens only on backends that can delete by prefix (FS). Others
 * delegate deletion, e.g. to bucket lifecycle policies.
 */
export class BinaryDataBlobManager implements BinaryData.Manager {
	constructor(
		private readonly byteStore: ByteStore,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await this.byteStore.init?.();
	}

	async store(
		location: BinaryData.FileLocation,
		bufferOrStream: Buffer | Readable,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(location);
		const fileSize = await this.byteStore.write(fileId, bufferOrStream, metadata);
		await this.storeMetadata(fileId, { ...metadata, fileSize });
		return { fileId, fileSize };
	}

	getPath(fileId: string) {
		return this.byteStore.getAbsolutePath?.(fileId) ?? fileId;
	}

	async getAsBuffer(fileId: string) {
		const buffer = await this.byteStore.read(fileId);
		if (!buffer) throw new FileNotFoundError(fileId);
		return buffer;
	}

	async getAsStream(fileId: string, chunkSize?: number) {
		const stream = await this.byteStore.readStream(fileId, { chunkSize });
		if (!stream) throw new FileNotFoundError(fileId);
		return stream;
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		if (this.byteStore.getMetadata) {
			const metadata = await this.byteStore.getMetadata(fileId);
			if (!metadata) throw new FileNotFoundError(fileId);
			return metadata;
		}

		const metadataFile = await this.byteStore.read(this.metadataKey(fileId));
		if (!metadataFile) throw new FileNotFoundError(fileId);
		return jsonParse<BinaryData.Metadata>(metadataFile.toString('utf-8'));
	}

	async deleteMany(locations: BinaryData.FileLocation[]) {
		if (locations.length === 0) return;

		await this.deleteBinaryDataDirs(locations);
	}

	async deleteManyByFileId(ids: string[]) {
		if (!this.byteStore.deletePrefix) return;

		const locations = ids.flatMap((id) => {
			try {
				return [this.parseFileId(id)];
			} catch {
				this.errorReporter.warn(`Could not parse file ID ${id}. Skip deletion`);
				return [];
			}
		});

		await this.deleteBinaryDataDirs(locations);
	}

	async copyByFileId(targetLocation: BinaryData.FileLocation, sourceFileId: string) {
		const targetFileId = this.toFileId(targetLocation);

		if (this.byteStore.getMetadata) {
			await this.byteStore.copy(sourceFileId, targetFileId);
			return targetFileId;
		}

		const metadata = await this.getMetadata(sourceFileId);
		await this.byteStore.copy(sourceFileId, targetFileId);
		await this.storeMetadata(targetFileId, metadata);

		return targetFileId;
	}

	/**
	 * Copy to the byte store the temp file written by nodes like Webhook, FTP, and SSH.
	 */
	async copyByFilePath(
		targetLocation: BinaryData.FileLocation,
		sourcePath: string,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(targetLocation);
		const fileSize = await this.byteStore.write(fileId, createReadStream(sourcePath), metadata);
		await this.storeMetadata(fileId, { ...metadata, fileSize });

		return { fileId, fileSize };
	}

	async rename(oldFileId: string, newFileId: string) {
		await this.byteStore.rename(oldFileId, newFileId);
		if (!this.byteStore.getMetadata) {
			await this.byteStore.rename(this.metadataKey(oldFileId), this.metadataKey(newFileId));
		}
	}

	// private methods

	private toFileId(location: BinaryData.FileLocation) {
		return `${this.toRelativePath(location)}/binary_data/${uuid()}`;
	}

	private toRelativePath(location: BinaryData.FileLocation) {
		switch (location.type) {
			case 'execution': {
				const executionId = location.executionId || 'temp'; // missing only in edge case, see PR #7244
				return `workflows/${location.workflowId}/executions/${executionId}`;
			}
			case 'custom': {
				this.assertPathSegments(location.pathSegments);
				return location.pathSegments.join('/');
			}
		}
	}

	private parseFileId(fileId: string): BinaryData.FileLocation {
		const executionMatch = fileId.match(EXECUTION_PATH_MATCHER);

		if (executionMatch) {
			return FileLocation.ofExecution(executionMatch[1], executionMatch[2]);
		}

		const binaryDataIndex = fileId.lastIndexOf('/binary_data/');
		if (binaryDataIndex !== -1) {
			const pathSegments = fileId.substring(0, binaryDataIndex).split('/');
			this.assertPathSegments(pathSegments);
			return FileLocation.ofCustom({ pathSegments });
		}

		throw new UnexpectedError(`File ID ${fileId} has invalid format.`);
	}

	private assertPathSegments(pathSegments: string[]) {
		if (pathSegments.length === 0 || pathSegments.some((segment) => segment.length === 0)) {
			throw new UnexpectedError('Custom file location requires non-empty path segments');
		}
	}

	private async deleteBinaryDataDirs(locations: BinaryData.FileLocation[]) {
		const deletePrefix = this.byteStore.deletePrefix?.bind(this.byteStore);
		if (!deletePrefix || locations.length === 0) return;

		const prefixes = [
			...new Set(locations.map((location) => `${this.toRelativePath(location)}/binary_data`)),
		];
		await Promise.all(prefixes.map(async (prefix) => await deletePrefix(prefix)));
	}

	private metadataKey(fileId: string) {
		return `${fileId}.metadata`;
	}

	/** Persist metadata in a companion entry on backends without native object metadata. */
	private async storeMetadata(fileId: string, metadata: BinaryData.Metadata) {
		if (this.byteStore.getMetadata) return;

		await this.byteStore.write(
			this.metadataKey(fileId),
			Buffer.from(JSON.stringify(metadata), 'utf-8'),
		);
	}
}
