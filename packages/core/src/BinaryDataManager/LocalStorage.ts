import { promises as fs } from 'fs';
import * as path from 'path';
import { IBinaryData, IDataObject } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';

export class BinaryDataLocalStorage implements IBinaryDataManager {
	private storagePath = '';

	private managerId = '';

	private binaryDataTTL = 60;

	async init(config: IBinaryDataConfig): Promise<void> {
		this.storagePath = config.localStoragePath;
		this.managerId = `manager-${uuid()}`;
		this.binaryDataTTL = config.binaryDataTTL;

		return fs
			.readdir(this.storagePath)
			.catch(async () => fs.mkdir(this.storagePath))
			.then(() => {});
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		const retBinaryData = binaryData;
		retBinaryData.internalIdentifier = this.generateIdentifier();
		return this.saveToLocalStorage(binaryBuffer, retBinaryData.internalIdentifier).then(
			() => retBinaryData,
		);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		return this.retrieveFromLocalStorage(identifier);
	}

	async markDataForDeletion(identifiers: string[]): Promise<void> {
		const currentFiles = await this.getFilesToDelete(`meta-${this.managerId}.json`);
		const filesToDelete = identifiers.reduce((acc: IDataObject, cur: string) => {
			acc[cur] = 1;
			return acc;
		}, currentFiles);

		setTimeout(async () => {
			const currentFilesToDelete = await this.getFilesToDelete(`meta-${this.managerId}.json`);
			identifiers.forEach(async (identifier) => {
				void this.deleteBinaryDataByIdentifier(identifier);
				delete currentFilesToDelete[identifier];
			});

			void this.writeDeletionIdsToFile(currentFilesToDelete);
		}, 60000 * this.binaryDataTTL);

		return this.writeDeletionIdsToFile(filesToDelete);
	}

	async deleteMarkedFiles(): Promise<unknown> {
		const metaFileNames = (await fs.readdir(this.getBinaryDataMetaPath())).filter((filename) =>
			filename.startsWith('meta-manager'),
		);

		const deletePromises = metaFileNames.map(async (metaFile) =>
			this.deleteMarkedFilesByMetaFile(metaFile).then(async () =>
				this.deleteMetaFileByName(metaFile),
			),
		);

		return Promise.all(deletePromises).finally(async () => this.writeDeletionIdsToFile({}));
	}

	generateIdentifier(): string {
		return uuid();
	}

	private getBinaryDataMetaPath() {
		return path.join(this.storagePath, 'meta');
	}

	private async writeDeletionIdsToFile(filesToDelete: IDataObject): Promise<void> {
		return fs.writeFile(
			path.join(this.getBinaryDataMetaPath(), `meta-${this.managerId}.json`),
			JSON.stringify(filesToDelete, null, '\t'),
		);
	}

	private async getFilesToDelete(metaFilename: string): Promise<IDataObject> {
		let filesToDelete = {};
		try {
			const file = await fs.readFile(path.join(this.getBinaryDataMetaPath(), metaFilename), 'utf8');

			filesToDelete = JSON.parse(file) as IDataObject;
		} catch {
			return {};
		}

		return filesToDelete;
	}

	private async deleteMarkedFilesByMetaFile(metaFilename: string): Promise<void> {
		return this.getFilesToDelete(metaFilename).then(async (filesToDelete) => {
			return Promise.all(
				Object.keys(filesToDelete).map(async (identifier) =>
					this.deleteBinaryDataByIdentifier(identifier).catch(() => {}),
				),
			).then(() => {});
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
