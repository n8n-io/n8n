import { BinaryDataRepository, In, SourceTypeSchema, type SourceType } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	BinaryDataConfig,
	type BinaryData,
	binaryToBuffer,
	FileTooLargeError,
	InvalidSourceTypeError,
	MissingSourceIdError,
} from 'n8n-core';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { v4 as uuid } from 'uuid';

@Service()
export class DatabaseManager implements BinaryData.Manager {
	constructor(
		private readonly repository: BinaryDataRepository,
		private readonly config: BinaryDataConfig,
	) {}

	async init() {
		// managed centrally by typeorm
	}

	async store(
		location: BinaryData.FileLocation,
		bufferOrStream: Buffer | Readable,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const buffer = await binaryToBuffer(bufferOrStream);
		const fileSize = buffer.length;
		const fileSizeInMb = fileSize / (1024 * 1024);

		const fileId = uuid();

		if (fileSizeInMb > this.config.dbMaxFileSize) {
			throw new FileTooLargeError({
				fileSizeMb: fileSizeInMb,
				maxFileSizeMb: this.config.dbMaxFileSize,
				fileId,
				fileName: metadata.fileName,
			});
		}

		const { sourceType, sourceId } = this.toSource(location);

		await this.repository.insert({
			fileId,
			sourceType,
			sourceId,
			data: buffer,
			mimeType: metadata.mimeType ?? null,
			fileName: metadata.fileName ?? null,
			fileSize,
		});

		return { fileId, fileSize };
	}

	getPath(fileId: string) {
		return `database://${fileId}`;
	}

	async getAsBuffer(fileId: string) {
		const file = await this.repository.findOneOrFail({
			where: { fileId },
			select: ['data'],
		});

		return file.data;
	}

	async getAsStream(fileId: string) {
		const buffer = await this.getAsBuffer(fileId);

		return Readable.from(buffer);
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		const file = await this.repository.findOneOrFail({
			where: { fileId },
			select: ['fileName', 'mimeType', 'fileSize'],
		});

		return {
			fileName: file.fileName ?? undefined,
			mimeType: file.mimeType ?? undefined,
			fileSize: file.fileSize,
		};
	}

	async deleteMany(locations: BinaryData.FileLocation[]) {
		if (locations.length === 0) return;

		const executionIds = locations.flatMap((location) =>
			location.type === 'execution' ? [location.executionId] : [],
		);

		if (executionIds.length === 0) return;

		await this.repository.delete({ sourceType: 'execution', sourceId: In(executionIds) });
	}

	async deleteManyByFileId(ids: string[]) {
		if (ids.length === 0) return;

		await this.repository.delete({ fileId: In(ids) });
	}

	async copyByFileId(targetLocation: BinaryData.FileLocation, sourceFileId: string) {
		const sourceFile = await this.repository.findOneByOrFail({ fileId: sourceFileId });

		const targetFileId = uuid();
		const { sourceType, sourceId } = this.toSource(targetLocation);

		await this.repository.insert({
			fileId: targetFileId,
			sourceType,
			sourceId,
			data: sourceFile.data,
			mimeType: sourceFile.mimeType,
			fileName: sourceFile.fileName,
			fileSize: sourceFile.fileSize,
		});

		return targetFileId;
	}

	async copyByFilePath(
		targetLocation: BinaryData.FileLocation,
		sourcePath: string,
		metadata: BinaryData.PreWriteMetadata,
	) {
		const fileId = uuid();
		const buffer = await fs.readFile(sourcePath);
		const fileSize = buffer.length;
		const { sourceType, sourceId } = this.toSource(targetLocation);

		await this.repository.insert({
			fileId,
			sourceType,
			sourceId,
			data: buffer,
			mimeType: metadata.mimeType ?? null,
			fileName: metadata.fileName ?? null,
			fileSize,
		});

		return { fileId, fileSize };
	}

	async rename(oldFileId: string, newFileId: string) {
		const oldRecord = await this.repository.findOneByOrFail({ fileId: oldFileId });

		await this.repository.insert({
			fileId: newFileId,
			sourceType: oldRecord.sourceType,
			sourceId: oldRecord.sourceId,
			data: oldRecord.data,
			mimeType: oldRecord.mimeType,
			fileName: oldRecord.fileName,
			fileSize: oldRecord.fileSize,
		});

		await this.repository.delete({ fileId: oldFileId });
	}

	private toSource(location: BinaryData.FileLocation): {
		sourceType: SourceType;
		sourceId: string;
	} {
		if (location.type === 'execution') {
			return {
				sourceType: 'execution',
				sourceId: location.executionId || 'temp', // missing only in edge case, see PR #7244
			};
		}

		if (typeof location.sourceId !== 'string') {
			throw new MissingSourceIdError(location.pathSegments);
		}

		const validationResult = SourceTypeSchema.safeParse(location.sourceType);

		if (!validationResult.success) {
			throw new InvalidSourceTypeError(location.sourceType ?? 'unknown');
		}

		return {
			sourceType: validationResult.data,
			sourceId: location.sourceId,
		};
	}
}
