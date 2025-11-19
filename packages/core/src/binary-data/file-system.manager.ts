import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'stream';
import { v4 as uuid } from 'uuid';

import type { ErrorReporter } from '@/errors';

import type { BinaryData } from './types';
import { assertDir, doesNotExist, FileLocation } from './utils';
import { DisallowedFilepathError } from '../errors/disallowed-filepath.error';
import { FileNotFoundError } from '../errors/file-not-found.error';

const EXECUTION_ID_EXTRACTOR =
	/^(\w+)(?:[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12})$/;

const EXECUTION_PATH_MATCHER = /^workflows\/([^/]+)\/executions\/([^/]+)\//;

const CHAT_HUB_ATTACHMENT_PATH_MATCHER = /^chat-hub\/sessions\/([^/]+)\/messages\/([^/]+)\//;

export class FileSystemManager implements BinaryData.Manager {
	constructor(
		private storagePath: string,
		private readonly errorReporter: ErrorReporter,
	) {}

	async init() {
		await assertDir(this.storagePath);
	}

	async store(
		location: BinaryData.FileLocation,
		bufferOrStream: Buffer | Readable,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const fileId = this.toFileId(location);
		const filePath = this.resolvePath(fileId);

		await assertDir(path.dirname(filePath));

		await fs.writeFile(filePath, bufferOrStream);

		const fileSize = await this.getSize(fileId);

		await this.storeMetadata(fileId, { mimeType, fileName, fileSize });

		return { fileId, fileSize };
	}

	getPath(fileId: string) {
		return this.resolvePath(fileId);
	}

	async getAsStream(fileId: string, chunkSize?: number) {
		const filePath = this.resolvePath(fileId);

		if (await doesNotExist(filePath)) {
			throw new FileNotFoundError(filePath);
		}

		return createReadStream(filePath, { highWaterMark: chunkSize });
	}

	async getAsBuffer(fileId: string) {
		const filePath = this.resolvePath(fileId);

		if (await doesNotExist(filePath)) {
			throw new FileNotFoundError(filePath);
		}

		return await fs.readFile(filePath);
	}

	async getMetadata(fileId: string): Promise<BinaryData.Metadata> {
		const filePath = this.resolvePath(`${fileId}.metadata`);

		return await jsonParse(await fs.readFile(filePath, { encoding: 'utf-8' }));
	}

	async deleteMany(locations: BinaryData.FileLocation[]) {
		if (locations.length === 0) return;

		// binary files stored in single dir - `filesystem`

		const executionIds = locations.flatMap((location) =>
			location.type === 'execution' ? [location.executionId] : [],
		);

		const set = new Set(executionIds);
		const fileNames = await fs.readdir(this.storagePath);

		for (const fileName of fileNames) {
			const executionId = fileName.match(EXECUTION_ID_EXTRACTOR)?.[1];

			if (executionId && set.has(executionId)) {
				const filePath = this.resolvePath(fileName);

				await Promise.all([fs.rm(filePath), fs.rm(`${filePath}.metadata`)]);
			}
		}

		// binary files stored in nested dirs - `filesystem-v2`

		const binaryDataDirs = locations.map((location) =>
			this.resolvePath(this.toRelativePath(location)),
		);

		await Promise.all(
			binaryDataDirs.map(async (dir) => {
				await fs.rm(dir, { recursive: true, force: true });
			}),
		);
	}

	async copyByFilePath(
		targetLocation: BinaryData.FileLocation,
		sourcePath: string,
		{ mimeType, fileName }: BinaryData.PreWriteMetadata,
	) {
		const targetFileId = this.toFileId(targetLocation);
		const targetPath = this.resolvePath(targetFileId);

		await assertDir(path.dirname(targetPath));

		await fs.cp(sourcePath, targetPath);

		const fileSize = await this.getSize(targetFileId);

		await this.storeMetadata(targetFileId, { mimeType, fileName, fileSize });

		return { fileId: targetFileId, fileSize };
	}

	async copyByFileId(targetLocation: BinaryData.FileLocation, sourceFileId: string) {
		const targetFileId = this.toFileId(targetLocation);
		const sourcePath = this.resolvePath(sourceFileId);
		const targetPath = this.resolvePath(targetFileId);
		const sourceMetadata = await this.getMetadata(sourceFileId);

		await assertDir(path.dirname(targetPath));

		await fs.copyFile(sourcePath, targetPath);

		await this.storeMetadata(targetFileId, sourceMetadata);

		return targetFileId;
	}

	async rename(oldFileId: string, newFileId: string) {
		const oldPath = this.resolvePath(oldFileId);
		const newPath = this.resolvePath(newFileId);

		await assertDir(path.dirname(newPath));

		await Promise.all([
			fs.rename(oldPath, newPath),
			fs.rename(`${oldPath}.metadata`, `${newPath}.metadata`),
		]);

		const [tempDirParent] = oldPath.split('/temp/');
		const tempDir = path.join(tempDirParent, 'temp');

		await fs.rm(tempDir, { recursive: true });
	}

	async deleteManyByFileId(ids: string[]): Promise<void> {
		const parsedIds = ids.flatMap((id) => {
			try {
				const parsed = this.parseFileId(id);

				return [parsed];
			} catch (e) {
				this.errorReporter.warn(`Could not parse file ID ${id}. Skip deletion`);
				return [];
			}
		});

		await this.deleteMany(parsedIds);
	}

	// ----------------------------------
	//         private methods
	// ----------------------------------

	/**
	 * Generate an ID for a binary data file.
	 *
	 * The legacy ID format `{executionId}{uuid}` for `filesystem` mode is
	 * no longer used on write, only when reading old stored execution data.
	 */
	private toFileId(location: BinaryData.FileLocation) {
		return `${this.toRelativePath(location)}/binary_data/${uuid()}`;
	}

	private toRelativePath(location: BinaryData.FileLocation) {
		switch (location.type) {
			case 'execution': {
				const executionId = location.executionId || 'temp'; // missing only in edge case, see PR #7244
				return `workflows/${location.workflowId}/executions/${executionId}`;
			}
			case 'chat-hub-message-attachment':
				return `chat-hub/sessions/${location.sessionId}/messages/${location.messageId}`;
		}
	}

	private parseFileId(fileId: string): BinaryData.FileLocation {
		const executionMatch = fileId.match(EXECUTION_PATH_MATCHER);

		if (executionMatch) {
			return FileLocation.ofExecution(executionMatch[1], executionMatch[2]);
		}

		const chatHubMatch = fileId.match(CHAT_HUB_ATTACHMENT_PATH_MATCHER);

		if (chatHubMatch) {
			return FileLocation.ofChatHubMessageAttachment(chatHubMatch[1], chatHubMatch[2]);
		}

		throw new UnexpectedError(`File ID ${fileId} has invalid format.`);
	}

	private resolvePath(...args: string[]) {
		const returnPath = path.join(this.storagePath, ...args);

		if (path.relative(this.storagePath, returnPath).startsWith('..')) {
			throw new DisallowedFilepathError(returnPath);
		}

		return returnPath;
	}

	private async storeMetadata(fileId: string, metadata: BinaryData.Metadata) {
		const filePath = this.resolvePath(`${fileId}.metadata`);

		await fs.writeFile(filePath, JSON.stringify(metadata), { encoding: 'utf-8' });
	}

	private async getSize(fileId: string) {
		const filePath = this.resolvePath(fileId);

		try {
			const stats = await fs.stat(filePath);
			return stats.size;
		} catch (error) {
			throw new FileNotFoundError(filePath);
		}
	}
}
