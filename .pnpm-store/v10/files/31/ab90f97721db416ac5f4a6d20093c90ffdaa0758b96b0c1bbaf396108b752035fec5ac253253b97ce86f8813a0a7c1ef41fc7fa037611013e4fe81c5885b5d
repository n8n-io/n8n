/* Note: this file is named file_index.ts because Typescript has special behavior regarding index.ts which can't be disabled. */
import { isJSON, randomInt, sizeof } from 'utilium';
import { S_IFDIR, S_IFMT, size_max } from '../vfs/constants.js';
import { basename, dirname } from '../vfs/path.js';
import { Errno, ErrnoError } from './error.js';
import { __inode_sz, Inode } from './inode.js';
export const version = 1;
/**
 * An index of file metadata
 * @category Internals
 * @internal
 */
export class Index extends Map {
    constructor() {
        super(...arguments);
        this.maxSize = size_max;
    }
    /**
     * Converts the index to JSON
     */
    toJSON() {
        return {
            version,
            maxSize: this.maxSize,
            entries: Object.fromEntries([...this].map(([k, v]) => [k, v.toJSON()])),
        };
    }
    /**
     * Converts the index to a string
     */
    toString() {
        return JSON.stringify(this.toJSON());
    }
    /**
     * Get the size in bytes of the index (including the size reported for each entry)
     */
    get byteSize() {
        let size = this.size * __inode_sz;
        for (const entry of this.values())
            size += entry.size;
        return size;
    }
    usage() {
        return {
            totalSpace: this.maxSize,
            freeSpace: this.maxSize - this.byteSize,
        };
    }
    pathOf(id) {
        for (const [path, inode] of this) {
            if (inode.ino == id || inode.data == id)
                return path;
        }
    }
    getByID(id) {
        var _a;
        return (_a = this.entryByID(id)) === null || _a === void 0 ? void 0 : _a.inode;
    }
    entryByID(id) {
        for (const [path, inode] of this) {
            if (inode.ino == id || inode.data == id)
                return { path, inode };
        }
    }
    directoryEntries(path) {
        const node = this.get(path);
        if (!node)
            throw ErrnoError.With('ENOENT', path);
        if ((node.mode & S_IFMT) != S_IFDIR)
            throw ErrnoError.With('ENOTDIR', path);
        const entries = {};
        for (const entry of this.keys()) {
            if (dirname(entry) == path && entry != path) {
                entries[basename(entry)] = this.get(entry).ino;
            }
        }
        return entries;
    }
    /**
     * Get the next available ID in the index
     * @internal
     */
    _alloc() {
        return Math.max(...[...this.values()].flatMap(i => [i.ino, i.data])) + 1;
    }
    /**
     * Gets a list of entries for each directory in the index.
     * Use
     */
    directories() {
        const dirs = new Map();
        for (const [path, node] of this) {
            if ((node.mode & S_IFMT) != S_IFDIR)
                continue;
            const entries = {};
            for (const entry of this.keys()) {
                if (dirname(entry) == path && entry != path)
                    entries[basename(entry)] = this.get(entry).ino;
            }
            dirs.set(path, entries);
        }
        return dirs;
    }
    /**
     * Loads the index from JSON data
     */
    fromJSON(json) {
        var _a;
        if (json.version != version) {
            throw new ErrnoError(Errno.EINVAL, 'Index version mismatch');
        }
        this.clear();
        for (const [path, node] of Object.entries(json.entries)) {
            (_a = node.data) !== null && _a !== void 0 ? _a : (node.data = randomInt(1, size_max));
            if (path == '/')
                node.ino = 0;
            this.set(path, new Inode(node));
        }
        return this;
    }
    /**
     * Parses an index from a string
     */
    static parse(data) {
        if (!isJSON(data))
            throw new ErrnoError(Errno.EINVAL, 'Invalid JSON');
        const json = JSON.parse(data);
        const index = new Index();
        index.fromJSON(json);
        return index;
    }
}
