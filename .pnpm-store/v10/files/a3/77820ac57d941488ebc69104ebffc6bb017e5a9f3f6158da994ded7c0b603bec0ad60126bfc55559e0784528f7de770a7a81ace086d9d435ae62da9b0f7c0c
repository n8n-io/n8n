import { size_max } from '../vfs/constants.js';
import { StoreFS } from './store/fs.js';
import { SyncMapTransaction } from './store/map.js';
/**
 * A simple in-memory store
 * @category Stores and Transactions
 */
export class InMemoryStore extends Map {
    constructor(maxSize = size_max, label) {
        super();
        this.maxSize = maxSize;
        this.label = label;
        this.flags = [];
        this.name = 'tmpfs';
    }
    async sync() { }
    transaction() {
        return new SyncMapTransaction(this);
    }
    get bytes() {
        let size = this.size * 4;
        for (const data of this.values())
            size += data.byteLength;
        return size;
    }
    usage() {
        return {
            totalSpace: this.maxSize,
            freeSpace: this.maxSize - this.bytes,
        };
    }
}
const _InMemory = {
    name: 'InMemory',
    options: {
        maxSize: { type: 'number', required: false },
        label: { type: 'string', required: false },
        name: { type: 'string', required: false },
    },
    create({ maxSize, label, name }) {
        const fs = new StoreFS(new InMemoryStore(maxSize, label !== null && label !== void 0 ? label : name));
        fs.checkRootSync();
        return fs;
    },
};
/**
 * A simple in-memory file system backed by an InMemoryStore.
 * Files are not persisted across page loads.
 * @category Backends and Configuration
 */
export const InMemory = _InMemory;
