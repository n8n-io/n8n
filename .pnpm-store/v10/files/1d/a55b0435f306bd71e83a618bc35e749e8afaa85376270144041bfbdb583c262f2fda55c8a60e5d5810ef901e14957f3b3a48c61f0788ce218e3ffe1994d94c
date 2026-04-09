/* eslint-disable @typescript-eslint/require-await */
import { _throw } from 'utilium';
import { Stats } from '../stats.js';
import { S_IFDIR, S_IFMT, S_IFREG, S_ISGID, S_ISUID } from '../vfs/constants.js';
import { dirname, join, relative } from '../vfs/path.js';
import { ErrnoError } from './error.js';
import { LazyFile } from './file.js';
import { Index } from './file_index.js';
import { FileSystem } from './filesystem.js';
import { Inode } from './inode.js';
/**
 * A file system that uses an `Index` for metadata.
 * @category Internals
 * @internal
 */
export class IndexFS extends FileSystem {
    constructor(id, name, index = new Index()) {
        super(id, name);
        this.index = index;
    }
    usage() {
        return this.index.usage();
    }
    /* node:coverage disable */
    /**
     * @deprecated
     */
    reloadFiles() {
        throw ErrnoError.With('ENOTSUP');
    }
    /**
     * @deprecated
     */
    reloadFilesSync() {
        throw ErrnoError.With('ENOTSUP');
    }
    /* node:coverage enable */
    /**
     * Finds all the paths in the index that need to be moved for a rename
     */
    pathsForRename(oldPath, newPath) {
        if (!this.index.has(oldPath))
            throw ErrnoError.With('ENOENT', oldPath, 'rename');
        if ((dirname(newPath) + '/').startsWith(oldPath + '/'))
            throw ErrnoError.With('EBUSY', dirname(oldPath), 'rename');
        const toRename = [];
        for (const [from, inode] of this.index.entries()) {
            const rel = relative(oldPath, from);
            if (rel.startsWith('..'))
                continue;
            let to = join(newPath, rel);
            if (to.endsWith('/'))
                to = to.slice(0, -1);
            toRename.push({ from, to, inode });
        }
        return toRename;
    }
    async rename(oldPath, newPath) {
        if (oldPath == newPath)
            return;
        for (const { from, to, inode } of this.pathsForRename(oldPath, newPath)) {
            const data = new Uint8Array(inode.size);
            await this.read(from, data, 0, inode.size);
            this.index.delete(from);
            this.index.set(to, inode);
            await this.write(to, data, 0);
        }
        await this.remove(oldPath);
    }
    renameSync(oldPath, newPath) {
        if (oldPath == newPath)
            return;
        for (const { from, to, inode } of this.pathsForRename(oldPath, newPath)) {
            const data = new Uint8Array(inode.size);
            this.readSync(from, data, 0, inode.size);
            this.index.delete(from);
            this.index.set(to, inode);
            this.writeSync(to, data, 0);
        }
        this.removeSync(oldPath);
    }
    async stat(path) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'stat');
        return new Stats(inode);
    }
    statSync(path) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'stat');
        return new Stats(inode);
    }
    async openFile(path, flag) {
        var _a;
        const stats = (_a = this.index.get(path)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, 'openFile'));
        return new LazyFile(this, path, flag, stats);
    }
    openFileSync(path, flag) {
        var _a;
        const stats = (_a = this.index.get(path)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, 'openFile'));
        return new LazyFile(this, path, flag, stats);
    }
    _remove(path, isUnlink) {
        const syscall = isUnlink ? 'unlink' : 'rmdir';
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, syscall);
        const isDir = (inode.mode & S_IFMT) == S_IFDIR;
        if (!isDir && !isUnlink)
            throw ErrnoError.With('ENOTDIR', path, syscall);
        if (isDir && isUnlink)
            throw ErrnoError.With('EISDIR', path, syscall);
        this.index.delete(path);
    }
    async unlink(path) {
        this._remove(path, true);
        await this.remove(path);
    }
    unlinkSync(path) {
        this._remove(path, true);
        this.removeSync(path);
    }
    async rmdir(path) {
        this._remove(path, false);
        await this.remove(path);
    }
    rmdirSync(path) {
        this._remove(path, false);
        this.removeSync(path);
    }
    create(path, options) {
        const syscall = (options.mode & S_IFMT) == S_IFDIR ? 'mkdir' : 'createFile';
        if (this.index.has(path))
            throw ErrnoError.With('EEXIST', path, syscall);
        const parent = this.index.get(dirname(path));
        if (!parent)
            throw ErrnoError.With('ENOENT', dirname(path), syscall);
        const id = this.index._alloc();
        const inode = new Inode({
            ino: id,
            data: id + 1,
            mode: options.mode,
            size: 0,
            uid: parent.mode & S_ISUID ? parent.uid : options.uid,
            gid: parent.mode & S_ISGID ? parent.gid : options.gid,
        });
        this.index.set(path, inode);
        return inode;
    }
    async createFile(path, flag, mode, options) {
        const node = this.create(path, { mode: mode | S_IFREG, ...options });
        return new LazyFile(this, path, flag, node.toStats());
    }
    createFileSync(path, flag, mode, options) {
        const node = this.create(path, { mode: mode | S_IFREG, ...options });
        return new LazyFile(this, path, flag, node.toStats());
    }
    async mkdir(path, mode, options) {
        this.create(path, { mode: mode | S_IFDIR, ...options });
    }
    mkdirSync(path, mode, options) {
        this.create(path, { mode: mode | S_IFDIR, ...options });
    }
    link(target, link) {
        throw ErrnoError.With('ENOSYS', link, 'link');
    }
    linkSync(target, link) {
        throw ErrnoError.With('ENOSYS', link, 'link');
    }
    async readdir(path) {
        return Object.keys(this.index.directoryEntries(path));
    }
    readdirSync(path) {
        return Object.keys(this.index.directoryEntries(path));
    }
    async sync(path, data, stats) {
        var _a;
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'sync');
        if (inode.update(stats))
            await ((_a = this.syncMetadata) === null || _a === void 0 ? void 0 : _a.call(this, path, stats));
        if (data)
            await this.write(path, data, 0);
    }
    syncSync(path, data, stats) {
        var _a;
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'sync');
        if (inode.update(stats))
            (_a = this.syncMetadataSync) === null || _a === void 0 ? void 0 : _a.call(this, path, stats);
        if (data)
            this.writeSync(path, data, 0);
    }
}
