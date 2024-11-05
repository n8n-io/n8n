import { createReadStream } from 'fs';
import { access as fsAccess, writeFile as fsWriteFile } from 'fs/promises';
import type { FileSystemHelperFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { PathLike } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import Container from 'typedi';

import {
	BINARY_DATA_STORAGE_PATH,
	BLOCK_FILE_ACCESS_TO_N8N_FILES,
	CONFIG_FILES,
	CUSTOM_EXTENSION_ENV,
	RESTRICT_FILE_ACCESS_TO,
	UM_EMAIL_TEMPLATES_INVITE,
	UM_EMAIL_TEMPLATES_PWRESET,
} from '@/Constants';
import { InstanceSettings } from '@/InstanceSettings';

export class FileSystemHelpers {
	private readonly instanceSettings = Container.get(InstanceSettings);

	constructor(private readonly node: INode) {}

	get exported(): FileSystemHelperFunctions {
		return {
			createReadStream: this.createReadStream.bind(this),
			getStoragePath: this.getStoragePath.bind(this),
			writeContentToFile: this.writeContentToFile.bind(this),
		};
	}

	async createReadStream(filePath: PathLike) {
		try {
			await fsAccess(filePath);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			throw error.code === 'ENOENT'
				? new NodeOperationError(this.node, error as Error, {
						message: `The file "${String(filePath)}" could not be accessed.`,
						level: 'warning',
					})
				: error;
		}
		if (this.isFilePathBlocked(filePath as string)) {
			const allowedPaths = this.getAllowedPaths();
			const message = allowedPaths.length ? ` Allowed paths: ${allowedPaths.join(', ')}` : '';
			throw new NodeOperationError(this.node, `Access to the file is not allowed.${message}`, {
				level: 'warning',
			});
		}
		return createReadStream(filePath);
	}

	getStoragePath() {
		return join(this.instanceSettings.n8nFolder, `storage/${this.node.type}`);
	}

	async writeContentToFile(filePath: PathLike, content: string | Buffer | Readable, flag?: string) {
		if (this.isFilePathBlocked(filePath as string)) {
			throw new NodeOperationError(this.node, `The file "${String(filePath)}" is not writable.`, {
				level: 'warning',
			});
		}
		return await fsWriteFile(filePath, content, { encoding: 'binary', flag });
	}

	// TODO: cache this in the constructor
	private getAllowedPaths() {
		const restrictFileAccessTo = process.env[RESTRICT_FILE_ACCESS_TO];
		if (!restrictFileAccessTo) {
			return [];
		}
		const allowedPaths = restrictFileAccessTo
			.split(';')
			.map((path) => path.trim())
			.filter((path) => path);
		return allowedPaths;
	}

	private isFilePathBlocked(filePath: string): boolean {
		const allowedPaths = this.getAllowedPaths();
		const resolvedFilePath = resolve(filePath);
		const blockFileAccessToN8nFiles = process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] !== 'false';

		//if allowed paths are defined, allow access only to those paths
		if (allowedPaths.length) {
			for (const path of allowedPaths) {
				if (resolvedFilePath.startsWith(path)) {
					return false;
				}
			}

			return true;
		}

		//restrict access to .n8n folder, ~/.cache/n8n/public, and other .env config related paths
		if (blockFileAccessToN8nFiles) {
			const { n8nFolder, staticCacheDir } = this.instanceSettings;
			const restrictedPaths = [n8nFolder, staticCacheDir];

			if (process.env[CONFIG_FILES]) {
				restrictedPaths.push(...process.env[CONFIG_FILES].split(','));
			}

			if (process.env[CUSTOM_EXTENSION_ENV]) {
				const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV].split(';');
				restrictedPaths.push(...customExtensionFolders);
			}

			if (process.env[BINARY_DATA_STORAGE_PATH]) {
				restrictedPaths.push(process.env[BINARY_DATA_STORAGE_PATH]);
			}

			if (process.env[UM_EMAIL_TEMPLATES_INVITE]) {
				restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_INVITE]);
			}

			if (process.env[UM_EMAIL_TEMPLATES_PWRESET]) {
				restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_PWRESET]);
			}

			//check if the file path is restricted
			for (const path of restrictedPaths) {
				if (resolvedFilePath.startsWith(path)) {
					return true;
				}
			}
		}

		//path is not restricted
		return false;
	}
}
