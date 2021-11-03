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

	static init(storageMode: string): void {
		if (BinaryDataHelper.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataHelper.instance = new BinaryDataHelper(storageMode);
	}

	static getInstance(): BinaryDataHelper {
		if (!BinaryDataHelper.instance) {
			throw new Error('Binary Data Manager not initialized');
		}
		return BinaryDataHelper.instance;
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		const retBinaryData = binaryData;
		if (this.storageMode === 'LOCAL_STORAGE') {
			retBinaryData.internalPath = this.generateIdentifier();
			return this.saveToLocalStorage(binaryBuffer, retBinaryData.internalPath).then(
				() => retBinaryData,
			);
		}

		retBinaryData.data = binaryBuffer.toString(BINARY_ENCODING);
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

		throw new Error('Binary data storage mode is set to default');
	}

	generateIdentifier(): string {
		return uuid();
	}

	private async saveToLocalStorage(data: Buffer, identifier: string) {
		await fs.writeFile(path.join(identifier), data);
	}

	private async retrieveFromLocalStorage(identifier: string) {
		return fs.readFile(identifier);
	}
}
