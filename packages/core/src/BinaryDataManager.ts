import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import { IBinaryData } from 'n8n-workflow';
import { BINARY_ENCODING } from './Constants';

export class BinaryDataHelper {
	private static instance: BinaryDataHelper;
	private storageMode: string;

	constructor(mode: string) {
		if (mode === '') {
			this.storageMode = 'IN_MEMORY';
		} else {
			this.storageMode = mode;
		}
	}

	static init(storageMode: string) {
		if (BinaryDataHelper.instance) {
			throw 'Binary Data Manager already initialized';
		}

		BinaryDataHelper.instance = new BinaryDataHelper(storageMode);
	}

	static getInstance() {
		if (!BinaryDataHelper.instance) {
			throw 'Binary Data Manager not initialized';
		}
		return BinaryDataHelper.instance;
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer) {
		if (this.storageMode === 'LOCAL_STORAGE') {
			binaryData.internalPath = this.generateIdentifier();
			return this.saveToLocalStorage(binaryBuffer, binaryData.internalPath)
				.then(() => binaryData);
		}

		binaryData.data = binaryBuffer.toString(BINARY_ENCODING);
		return binaryData;
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			return this.retrieveBinaryDataByIdentifier(binaryData.internalPath!);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		if (this.storageMode === 'LOCAL_STORAGE') {
			return this.retrieveFromLocalStorage(identifier);
		}

		throw 'Binary data storage mode is set to default';
	}

	public generateIdentifier() {
		return uuid();
	}

	private async saveToLocalStorage(data: Buffer, identifier: string) {
		await fs.writeFile(path.join(identifier), data);
	}

	private async retrieveFromLocalStorage(identifier: string) {
		return fs.readFile(identifier);
	}
}