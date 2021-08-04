import { promises as fs } from 'fs';
import * as path from 'path';

export class BinaryDataHelper {
    private static instance: BinaryDataHelper;
    private storageMode: string;

    constructor(mode: string) {
        if(mode === '') {
            this.storageMode = 'IN_MEMORY';
        } else {
            this.storageMode = mode;
        }
    }

    static init(storageMode: string) {
        if(BinaryDataHelper.instance) {
            throw 'Binary Data Manager already initialized';
        }

        BinaryDataHelper.instance = new BinaryDataHelper(storageMode);
    }

    static getInstance() {
        if(!BinaryDataHelper.instance) {
            throw 'Binary Data Manager not initialized';
        }
        return BinaryDataHelper.instance;
    }

    async storeBinaryData(data: Buffer, identifier: string) {
        if(this.storageMode === 'LOCAL_STORAGE') {
            return this.saveToLocalStorage(data, identifier);
        }

        await fs.writeFile(path.join(identifier), data);
    }

    async retrieveBinaryData(identifier: string): Promise<Buffer> {
        if(this.storageMode === 'LOCAL_STORAGE') {
            return this.retrieveFromLocalStorage(identifier);
        }

        return fs.readFile(identifier);
    }

    private async saveToLocalStorage(data: Buffer, identifier: string) {
        await fs.writeFile(path.join(identifier), data);
    }

    private async retrieveFromLocalStorage(identifier: string) {
        return fs.readFile(identifier);
    }
}