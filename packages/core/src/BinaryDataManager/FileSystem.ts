import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

import { IBinaryDataConfig, IBinaryDataManager } from '../Interfaces';

const PREFIX_METAFILE = 'binarymeta';
const PREFIX_PERSISTED_METAFILE = 'persistedmeta';

export class BinaryDataFileSystem implements IBinaryDataManager {
	private storagePath: string;

	private binaryDataTTL: number;

	constructor(config: IBinaryDataConfig) {
		this.storagePath = config.localStoragePath;
		this.binaryDataTTL = config.binaryDataTTL;
	}

	async init(startPurger = false): Promise<void> {
		if (startPurger) {
			setInterval(async () => {
				// get all files and delete data
				await this.deleteMarkedFiles();
				await this.deleteMarkedPersistedFiles();
			}, this.binaryDataTTL * 30000);
		}

		return fs
			.readdir(this.storagePath)
			.catch(async () => fs.mkdir(this.storagePath, { recursive: true }))
			.then(async () => fs.readdir(this.getBinaryDataMetaPath()))
			.catch(async () => fs.mkdir(this.getBinaryDataMetaPath(), { recursive: true }))
			.then(async () => fs.readdir(this.getBinaryDataPersistMetaPath()))
			.catch(async () => fs.mkdir(this.getBinaryDataPersistMetaPath(), { recursive: true }))
			.then(async () => this.deleteMarkedFiles())
			.then(async () => this.deleteMarkedPersistedFiles())
			.then(() => {});
	}

	async storeBinaryData(binaryBuffer: Buffer, executionId: string): Promise<string> {
		const binaryDataId = this.generateFileName(executionId);
		return this.addBinaryIdToPersistMeta(executionId, binaryDataId).then(async () =>
			this.saveToLocalStorage(binaryBuffer, binaryDataId).then(() => binaryDataId),
		);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		return this.retrieveFromLocalStorage(identifier);
	}

	private async addBinaryIdToPersistMeta(executionId: string, identifier: string): Promise<void> {
		const currentTime = new Date().getTime();
		const timeAtNextHour = currentTime + 3600000 - (currentTime % 3600000);
		const timeoutTime = timeAtNextHour + this.binaryDataTTL * 60000;

		const filePath = path.join(
			this.getBinaryDataPersistMetaPath(),
			`${PREFIX_PERSISTED_METAFILE}_${executionId}_${timeoutTime}`,
		);

		return fs
			.readFile(filePath)
			.catch(async () => fs.writeFile(filePath, identifier))
			.then(() => {});
	}

	async markDataForDeletion(identifiers: string[]): Promise<void> {
		const tt = new Date(new Date().getTime() + this.binaryDataTTL * 60000);
		return fs.writeFile(
			path.join(this.getBinaryDataMetaPath(), `${PREFIX_METAFILE}_${tt.valueOf()}`),
			JSON.stringify(identifiers, null, '\t'),
		);
	}

	async deleteMarkedFiles(): Promise<unknown> {
		const currentTimeValue = new Date().valueOf();
		const metaFileNames = await fs.readdir(this.getBinaryDataMetaPath());

		const filteredFilenames = metaFileNames.filter((filename) => {
			try {
				return (
					filename.startsWith(`${PREFIX_METAFILE}_`) &&
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

	async deleteMarkedPersistedFiles(): Promise<unknown> {
		const currentTimeValue = new Date().valueOf();
		const metaFileNames = await fs.readdir(this.getBinaryDataPersistMetaPath());

		const execsAdded: { [key: string]: number } = {};

		const proms = metaFileNames.reduce(
			(prev, curr) => {
				const [prefix, executionId, partialTS] = curr.split('_');

				if (prefix !== PREFIX_PERSISTED_METAFILE) {
					return prev;
				}

				const execTimestamp = parseInt(partialTS, 10);

				if (execTimestamp < currentTimeValue) {
					if (execsAdded[executionId]) {
						// do not delete data, only meta file
						prev.push(this.deletePersistedMetaFileByName(curr));
						return prev;
					}

					execsAdded[executionId] = 1;
					prev.push(
						this.deleteBinaryDataByExecutionId(executionId).then(async () =>
							this.deletePersistedMetaFileByName(curr),
						),
					);
				}

				return prev;
			},
			[Promise.resolve()],
		);

		return Promise.all(proms);
	}

	async duplicateBinaryDataByIdentifier(binaryDataId: string, prefix: string): Promise<string> {
		const newBinaryDataId = this.generateFileName(prefix);

		return fs
			.copyFile(
				path.join(this.storagePath, binaryDataId),
				path.join(this.storagePath, newBinaryDataId),
			)
			.then(() => newBinaryDataId);
	}

	async deleteBinaryDataByExecutionId(executionId: string): Promise<void> {
		const regex = new RegExp(`${executionId}_*`);
		return fs
			.readdir(path.join(this.storagePath))
			.then((files) => files.filter((filename) => regex.test(filename)))
			.then((filteredFiles) =>
				filteredFiles.map(async (file) => fs.rm(path.join(this.storagePath, file))),
			)
			.then(async (deletePromises) => Promise.all(deletePromises))
			.then(async () => Promise.resolve());
	}

	async persistBinaryDataForExecutionId(executionId: string): Promise<void> {
		return fs.readdir(this.getBinaryDataPersistMetaPath()).then(async (metafiles) => {
			const proms = metafiles.reduce(
				(prev, curr) => {
					if (curr.startsWith(`${PREFIX_PERSISTED_METAFILE}_${executionId}_`)) {
						prev.push(fs.rm(path.join(this.getBinaryDataPersistMetaPath(), curr)));
						return prev;
					}

					return prev;
				},
				[Promise.resolve()],
			);

			return Promise.all(proms).then(() => {});
		});
	}

	private generateFileName(prefix: string): string {
		return `${prefix}_${uuid()}`;
	}

	private getBinaryDataMetaPath() {
		return path.join(this.storagePath, 'meta');
	}

	private getBinaryDataPersistMetaPath() {
		return path.join(this.storagePath, 'persistMeta');
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

	private async deletePersistedMetaFileByName(filename: string): Promise<void> {
		return fs.rm(path.join(this.getBinaryDataPersistMetaPath(), filename));
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
