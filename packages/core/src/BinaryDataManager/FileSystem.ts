import { promises as fs } from 'fs';
import * as path from 'path';
import { IBinaryData } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';

const PREFIX_METAFILE = 'binarymeta-';
const PREFIX_FILE_ID = 'filesystem-';

export class BinaryDataFileSystem implements IBinaryDataManager {
	private storagePath = '';

	private binaryDataTTL = 60;

	async init(config: IBinaryDataConfig, startPurger = false): Promise<void> {
		this.storagePath = config.localStoragePath;
		this.binaryDataTTL = config.binaryDataTTL;
		if (startPurger) {
			setInterval(async () => {
				// get all files and delete data
				await this.deleteMarkedFiles();
			}, this.binaryDataTTL * 30000);
		}

		return fs
			.readdir(this.storagePath)
			.catch(async () => fs.mkdir(this.storagePath, { recursive: true }))
			.then(async () => fs.readdir(this.getBinaryDataMetaPath()))
			.catch(async () => fs.mkdir(this.getBinaryDataMetaPath(), { recursive: true }))
			.then(async () => this.deleteMarkedFiles())
			.then(() => {});
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		const retBinaryData = binaryData;
		retBinaryData.id = this.generateFileName();

		return this.saveToLocalStorage(binaryBuffer, retBinaryData.id).then(() => retBinaryData);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		return this.retrieveFromLocalStorage(identifier);
	}

	async markDataForDeletion(identifiers: string[]): Promise<void> {
		const tt = new Date(new Date().getTime() + this.binaryDataTTL * 60000);
		return fs.writeFile(
			path.join(this.getBinaryDataMetaPath(), PREFIX_METAFILE + tt.valueOf().toString()),
			JSON.stringify(identifiers, null, '\t'),
		);
	}

	async deleteMarkedFiles(): Promise<unknown> {
		const currentTimeValue = new Date().valueOf();
		const metaFileNames = await fs.readdir(this.getBinaryDataMetaPath());

		const filteredFilenames = metaFileNames.filter((filename) => {
			try {
				return (
					filename.startsWith(PREFIX_METAFILE) &&
					parseInt(filename.substr(11), 10) < currentTimeValue
				);
			} catch (e) {
				return false;
			}
		});

		const proms = filteredFilenames.map(async (filename) => {
			return this.deleteMarkedFilesByMetaFile(filename).then(async () =>
				this.deleteMetaFileByName(filename),
			);
		});

		return Promise.all(proms);
	}

	async duplicateBinaryDataByIdentifier(identifier: string): Promise<string> {
		const newIdentifier = this.generateFileName();
		return fs
			.copyFile(path.join(this.storagePath, identifier), path.join(this.storagePath, newIdentifier))
			.then(async () => Promise.resolve(newIdentifier));
	}

	private getBinaryDataMetaPath() {
		return path.join(this.storagePath, 'meta');
	}

	private generateFileName(): string {
		return PREFIX_FILE_ID + uuid();
	}

	private async deleteMarkedFilesByMetaFile(metaFilename: string): Promise<unknown> {
		return fs
			.readFile(path.join(this.getBinaryDataMetaPath(), metaFilename), 'utf8')
			.then(async (file) => {
				const identifiers = JSON.parse(file) as string[];
				return Promise.all(
					identifiers.map(async (identifier) => this.deleteBinaryDataByIdentifier(identifier)),
				);
			});
	}

	private async deleteMetaFileByName(filename: string): Promise<void> {
		return fs.rm(path.join(this.getBinaryDataMetaPath(), filename));
	}

	async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		return this.deleteFromLocalStorage(identifier);
	}

	private async deleteFromLocalStorage(identifier: string) {
		return fs.rm(path.join(this.storagePath, identifier));
	}

	private async saveToLocalStorage(data: Buffer, identifier: string) {
		await fs.writeFile(path.join(this.storagePath, identifier), data);
	}

	private async retrieveFromLocalStorage(identifier: string): Promise<Buffer> {
		const filePath = path.join(this.storagePath, identifier);
		try {
			return await fs.readFile(filePath);
		} catch (e) {
			throw new Error(`Error finding file: ${filePath}`);
		}
	}
}
