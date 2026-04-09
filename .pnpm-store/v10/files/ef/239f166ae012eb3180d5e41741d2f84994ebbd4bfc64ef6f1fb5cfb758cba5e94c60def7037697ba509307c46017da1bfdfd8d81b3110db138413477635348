var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { _throw, canary, serialize } from 'utilium';
import { extendBuffer } from 'utilium/buffer.js';
import { Errno, ErrnoError } from '../../internal/error.js';
import { LazyFile } from '../../internal/file.js';
import { Index } from '../../internal/file_index.js';
import { FileSystem } from '../../internal/filesystem.js';
import { __inode_sz, Inode, rootIno } from '../../internal/inode.js';
import { crit, debug, err, log_deprecated, notice, warn } from '../../internal/log.js';
import { decodeDirListing, encodeDirListing, encodeUTF8 } from '../../utils.js';
import { S_IFDIR, S_IFREG, S_ISGID, S_ISUID, size_max } from '../../vfs/constants.js';
import { basename, dirname, join, parse, relative } from '../../vfs/path.js';
import { WrappedTransaction } from './store.js';
/**
 * A file system which uses a `Store`
 *
 * @todo Check modes?
 * @category Stores and Transactions
 * @internal
 */
export class StoreFS extends FileSystem {
    /**
     * Gets the first path associated with an inode
     */
    _path(id) {
        var _a;
        const [path] = (_a = this._paths.get(id)) !== null && _a !== void 0 ? _a : [];
        return path;
    }
    /**
     * Add a inode/path pair
     */
    _add(ino, path) {
        if (!this._paths.has(ino))
            this._paths.set(ino, new Set());
        this._paths.get(ino).add(path);
        this._ids.set(path, ino);
    }
    /**
     * Remove a inode/path pair
     */
    _remove(ino) {
        var _a;
        for (const path of (_a = this._paths.get(ino)) !== null && _a !== void 0 ? _a : []) {
            this._ids.delete(path);
        }
        this._paths.delete(ino);
    }
    /**
     * Move paths in the tables
     */
    _move(from, to) {
        const toMove = [];
        for (const [path, ino] of this._ids) {
            const rel = relative(from, path);
            if (rel.startsWith('..'))
                continue;
            let newKey = join(to, rel);
            if (newKey.endsWith('/'))
                newKey = newKey.slice(0, -1);
            toMove.push({ oldKey: path, newKey, ino });
        }
        for (const { oldKey, newKey, ino } of toMove) {
            this._ids.delete(oldKey);
            this._ids.set(newKey, ino);
            const p = this._paths.get(ino);
            if (!p) {
                warn('Missing paths in table for ino ' + ino);
                continue;
            }
            p.delete(oldKey);
            p.add(newKey);
        }
    }
    async ready() {
        if (this._initialized)
            return;
        this.checkRootSync();
        await this.checkRoot();
        await this._populate();
        this._initialized = true;
    }
    constructor(store) {
        var _a, _b;
        super((_a = store.id) !== null && _a !== void 0 ? _a : 0x6b766673, store.name);
        this.store = store;
        /**
         * A map of paths to inode IDs
         * @internal @hidden
         */
        this._ids = new Map([['/', 0]]);
        /**
         * A map of inode IDs to paths
         * @internal @hidden
         */
        this._paths = new Map([[0, new Set('/')]]);
        this._initialized = false;
        this.attributes.set('setid');
        store._fs = this;
        debug(this.name + ': supports features: ' + ((_b = this.store.flags) === null || _b === void 0 ? void 0 : _b.join(', ')));
    }
    /**
     * @experimental
     */
    usage() {
        var _a, _b;
        return (((_b = (_a = this.store).usage) === null || _b === void 0 ? void 0 : _b.call(_a)) || {
            totalSpace: 0,
            freeSpace: 0,
        });
    }
    /* node:coverage disable */
    /**
     * Delete all contents stored in the file system.
     * @deprecated
     */
    async empty() {
        log_deprecated('StoreFS#empty');
        // Root always exists.
        await this.checkRoot();
    }
    /**
     * Delete all contents stored in the file system.
     * @deprecated
     */
    emptySync() {
        log_deprecated('StoreFS#emptySync');
        // Root always exists.
        this.checkRootSync();
    }
    /* node:coverage enable */
    /**
     * Load an index into the StoreFS.
     * You *must* manually add non-directory files
     */
    async loadIndex(index) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_1, this.transaction(), true);
            const dirs = index.directories();
            for (const [path, inode] of index) {
                this._add(inode.ino, path);
                await tx.set(inode.ino, serialize(inode));
                if (dirs.has(path))
                    await tx.set(inode.data, encodeDirListing(dirs.get(path)));
            }
            await tx.commit();
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            const result_1 = __disposeResources(env_1);
            if (result_1)
                await result_1;
        }
    }
    /**
     * Load an index into the StoreFS.
     * You *must* manually add non-directory files
     */
    loadIndexSync(index) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_2, this.transaction(), false);
            const dirs = index.directories();
            for (const [path, inode] of index) {
                this._add(inode.ino, path);
                tx.setSync(inode.ino, serialize(inode));
                if (dirs.has(path))
                    tx.setSync(inode.data, encodeDirListing(dirs.get(path)));
            }
            tx.commitSync();
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            __disposeResources(env_2);
        }
    }
    async createIndex() {
        var _a;
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
            const index = new Index();
            const tx = __addDisposableResource(env_3, this.transaction(), true);
            const queue = [['/', 0]];
            const silence = canary(ErrnoError.With('EDEADLK'));
            while (queue.length) {
                const [path, ino] = queue.shift();
                const inode = new Inode(await tx.get(ino));
                index.set(path, inode);
                if (inode.mode & S_IFDIR) {
                    const dir = decodeDirListing((_a = (await tx.get(inode.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', path)));
                    for (const [name, id] of Object.entries(dir)) {
                        queue.push([join(path, name), id]);
                    }
                }
            }
            silence();
            return index;
        }
        catch (e_3) {
            env_3.error = e_3;
            env_3.hasError = true;
        }
        finally {
            const result_2 = __disposeResources(env_3);
            if (result_2)
                await result_2;
        }
    }
    createIndexSync() {
        var _a;
        const env_4 = { stack: [], error: void 0, hasError: false };
        try {
            const index = new Index();
            const tx = __addDisposableResource(env_4, this.transaction(), false);
            const queue = [['/', 0]];
            const silence = canary(ErrnoError.With('EDEADLK'));
            while (queue.length) {
                const [path, ino] = queue.shift();
                const inode = new Inode(tx.getSync(ino));
                index.set(path, inode);
                if (inode.mode & S_IFDIR) {
                    const dir = decodeDirListing((_a = tx.getSync(inode.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', path)));
                    for (const [name, id] of Object.entries(dir)) {
                        queue.push([join(path, name), id]);
                    }
                }
            }
            silence();
            return index;
        }
        catch (e_4) {
            env_4.error = e_4;
            env_4.hasError = true;
        }
        finally {
            __disposeResources(env_4);
        }
    }
    /**
     * @todo Make rename compatible with the cache.
     */
    async rename(oldPath, newPath) {
        var _a, _b, _c;
        const env_5 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_5, this.transaction(), true);
            const _old = parse(oldPath), _new = parse(newPath), 
            // Remove oldPath from parent's directory listing.
            oldDirNode = await this.findInode(tx, _old.dir, 'rename'), oldDirList = decodeDirListing((_a = (await tx.get(oldDirNode.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', _old.dir, 'rename')));
            if (!oldDirList[_old.base])
                throw ErrnoError.With('ENOENT', oldPath, 'rename');
            const ino = oldDirList[_old.base];
            if (ino != this._ids.get(oldPath))
                err(`Ino mismatch while renaming ${oldPath} to ${newPath}`);
            delete oldDirList[_old.base];
            /*
                Can't move a folder inside itself.
                This ensures that the check passes only if `oldPath` is a subpath of `_new.dir`.
                We append '/' to avoid matching folders that are a substring of the bottom-most folder in the path.
            */
            if ((_new.dir + '/').startsWith(oldPath + '/'))
                throw new ErrnoError(Errno.EBUSY, _old.dir);
            // Add newPath to parent's directory listing.
            const sameParent = _new.dir == _old.dir;
            // Prevent us from re-grabbing the same directory listing, which still contains `old_path.base.`
            const newDirNode = sameParent ? oldDirNode : await this.findInode(tx, _new.dir, 'rename');
            const newDirList = sameParent
                ? oldDirList
                : decodeDirListing((_b = (await tx.get(newDirNode.data))) !== null && _b !== void 0 ? _b : _throw(ErrnoError.With('ENODATA', _new.dir, 'rename')));
            if (newDirList[_new.base]) {
                // If it's a file, delete it, if it's a directory, throw a permissions error.
                const existing = new Inode((_c = (await tx.get(newDirList[_new.base]))) !== null && _c !== void 0 ? _c : _throw(ErrnoError.With('ENOENT', newPath, 'rename')));
                if (!existing.toStats().isFile())
                    throw ErrnoError.With('EPERM', newPath, 'rename');
                await tx.remove(existing.data);
                await tx.remove(newDirList[_new.base]);
            }
            newDirList[_new.base] = ino;
            // Commit the two changed directory listings.
            await tx.set(oldDirNode.data, encodeDirListing(oldDirList));
            await tx.set(newDirNode.data, encodeDirListing(newDirList));
            await tx.commit();
            this._move(oldPath, newPath);
        }
        catch (e_5) {
            env_5.error = e_5;
            env_5.hasError = true;
        }
        finally {
            const result_3 = __disposeResources(env_5);
            if (result_3)
                await result_3;
        }
    }
    renameSync(oldPath, newPath) {
        var _a, _b, _c;
        const env_6 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_6, this.transaction(), false);
            const _old = parse(oldPath), _new = parse(newPath), 
            // Remove oldPath from parent's directory listing.
            oldDirNode = this.findInodeSync(tx, _old.dir, 'rename'), oldDirList = decodeDirListing((_a = tx.getSync(oldDirNode.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', _old.dir, 'rename')));
            if (!oldDirList[_old.base])
                throw ErrnoError.With('ENOENT', oldPath, 'rename');
            const ino = oldDirList[_old.base];
            if (ino != this._ids.get(oldPath))
                err(`Ino mismatch while renaming ${oldPath} to ${newPath}`);
            delete oldDirList[_old.base];
            /*
                Can't move a folder inside itself.
                This ensures that the check passes only if `oldPath` is a subpath of `_new.dir`.
                We append '/' to avoid matching folders that are a substring of the bottom-most folder in the path.
            */
            if ((_new.dir + '/').startsWith(oldPath + '/'))
                throw new ErrnoError(Errno.EBUSY, _old.dir);
            // Add newPath to parent's directory listing.
            const sameParent = _new.dir === _old.dir;
            // Prevent us from re-grabbing the same directory listing, which still contains `old_path.base.`
            const newDirNode = sameParent ? oldDirNode : this.findInodeSync(tx, _new.dir, 'rename');
            const newDirList = sameParent
                ? oldDirList
                : decodeDirListing((_b = tx.getSync(newDirNode.data)) !== null && _b !== void 0 ? _b : _throw(ErrnoError.With('ENODATA', _new.dir, 'rename')));
            if (newDirList[_new.base]) {
                // If it's a file, delete it, if it's a directory, throw a permissions error.
                const existing = new Inode((_c = tx.getSync(newDirList[_new.base])) !== null && _c !== void 0 ? _c : _throw(ErrnoError.With('ENOENT', newPath, 'rename')));
                if (!existing.toStats().isFile())
                    throw ErrnoError.With('EPERM', newPath, 'rename');
                tx.removeSync(existing.data);
                tx.removeSync(newDirList[_new.base]);
            }
            newDirList[_new.base] = ino;
            // Commit the two changed directory listings.
            tx.setSync(oldDirNode.data, encodeDirListing(oldDirList));
            tx.setSync(newDirNode.data, encodeDirListing(newDirList));
            tx.commitSync();
            this._move(oldPath, newPath);
        }
        catch (e_6) {
            env_6.error = e_6;
            env_6.hasError = true;
        }
        finally {
            __disposeResources(env_6);
        }
    }
    async stat(path) {
        const env_7 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_7, this.transaction(), true);
            return (await this.findInode(tx, path, 'stat')).toStats();
        }
        catch (e_7) {
            env_7.error = e_7;
            env_7.hasError = true;
        }
        finally {
            const result_4 = __disposeResources(env_7);
            if (result_4)
                await result_4;
        }
    }
    statSync(path) {
        const env_8 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_8, this.transaction(), false);
            return this.findInodeSync(tx, path, 'stat').toStats();
        }
        catch (e_8) {
            env_8.error = e_8;
            env_8.hasError = true;
        }
        finally {
            __disposeResources(env_8);
        }
    }
    async createFile(path, flag, mode, options) {
        const node = await this.commitNew(path, { mode: mode | S_IFREG, ...options }, new Uint8Array(), 'createFile');
        return new LazyFile(this, path, flag, node.toStats());
    }
    createFileSync(path, flag, mode, options) {
        const node = this.commitNewSync(path, { mode: mode | S_IFREG, ...options }, new Uint8Array(), 'createFile');
        return new LazyFile(this, path, flag, node.toStats());
    }
    async openFile(path, flag) {
        const env_9 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_9, this.transaction(), true);
            const node = await this.findInode(tx, path, 'openFile');
            return new LazyFile(this, path, flag, node.toStats());
        }
        catch (e_9) {
            env_9.error = e_9;
            env_9.hasError = true;
        }
        finally {
            const result_5 = __disposeResources(env_9);
            if (result_5)
                await result_5;
        }
    }
    openFileSync(path, flag) {
        const env_10 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_10, this.transaction(), false);
            const node = this.findInodeSync(tx, path, 'openFile');
            return new LazyFile(this, path, flag, node.toStats());
        }
        catch (e_10) {
            env_10.error = e_10;
            env_10.hasError = true;
        }
        finally {
            __disposeResources(env_10);
        }
    }
    async unlink(path) {
        return this.remove(path, false);
    }
    unlinkSync(path) {
        this.removeSync(path, false);
    }
    async rmdir(path) {
        if ((await this.readdir(path)).length) {
            throw ErrnoError.With('ENOTEMPTY', path, 'rmdir');
        }
        await this.remove(path, true);
    }
    rmdirSync(path) {
        if (this.readdirSync(path).length) {
            throw ErrnoError.With('ENOTEMPTY', path, 'rmdir');
        }
        this.removeSync(path, true);
    }
    async mkdir(path, mode, options) {
        await this.commitNew(path, { mode: mode | S_IFDIR, ...options }, encodeUTF8('{}'), 'mkdir');
    }
    mkdirSync(path, mode, options) {
        this.commitNewSync(path, { mode: mode | S_IFDIR, ...options }, encodeUTF8('{}'), 'mkdir');
    }
    async readdir(path) {
        var _a;
        const env_11 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_11, this.transaction(), true);
            const node = await this.findInode(tx, path, 'readdir');
            return Object.keys(decodeDirListing((_a = (await tx.get(node.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, 'readdir'))));
        }
        catch (e_11) {
            env_11.error = e_11;
            env_11.hasError = true;
        }
        finally {
            const result_6 = __disposeResources(env_11);
            if (result_6)
                await result_6;
        }
    }
    readdirSync(path) {
        var _a;
        const env_12 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_12, this.transaction(), false);
            const node = this.findInodeSync(tx, path, 'readdir');
            return Object.keys(decodeDirListing((_a = tx.getSync(node.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, 'readdir'))));
        }
        catch (e_12) {
            env_12.error = e_12;
            env_12.hasError = true;
        }
        finally {
            __disposeResources(env_12);
        }
    }
    /**
     * Updated the inode and data node at `path`
     * @todo Ensure mtime updates properly, and use that to determine if a data update is required.
     */
    async sync(path, data, metadata) {
        const env_13 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_13, this.transaction(), true);
            const inode = await this.findInode(tx, path, 'sync');
            if (data)
                await tx.set(inode.data, data);
            if (inode.update(metadata)) {
                this._add(inode.ino, path);
                await tx.set(inode.ino, serialize(inode));
            }
            await tx.commit();
        }
        catch (e_13) {
            env_13.error = e_13;
            env_13.hasError = true;
        }
        finally {
            const result_7 = __disposeResources(env_13);
            if (result_7)
                await result_7;
        }
    }
    /**
     * Updated the inode and data node at `path`
     * @todo Ensure mtime updates properly, and use that to determine if a data update is required.
     */
    syncSync(path, data, metadata) {
        const env_14 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_14, this.transaction(), false);
            const inode = this.findInodeSync(tx, path, 'sync');
            if (data)
                tx.setSync(inode.data, data);
            if (inode.update(metadata)) {
                this._add(inode.ino, path);
                tx.setSync(inode.ino, serialize(inode));
            }
            tx.commitSync();
        }
        catch (e_14) {
            env_14.error = e_14;
            env_14.hasError = true;
        }
        finally {
            __disposeResources(env_14);
        }
    }
    async link(target, link) {
        var _a;
        const env_15 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_15, this.transaction(), true);
            const newDir = dirname(link), newDirNode = await this.findInode(tx, newDir, 'link'), listing = decodeDirListing((_a = (await tx.get(newDirNode.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', newDir, 'link')));
            const inode = await this.findInode(tx, target, 'link');
            inode.nlink++;
            listing[basename(link)] = inode.ino;
            this._add(inode.ino, link);
            await tx.set(inode.ino, serialize(inode));
            await tx.set(newDirNode.data, encodeDirListing(listing));
            await tx.commit();
        }
        catch (e_15) {
            env_15.error = e_15;
            env_15.hasError = true;
        }
        finally {
            const result_8 = __disposeResources(env_15);
            if (result_8)
                await result_8;
        }
    }
    linkSync(target, link) {
        var _a;
        const env_16 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_16, this.transaction(), false);
            const newDir = dirname(link), newDirNode = this.findInodeSync(tx, newDir, 'link'), listing = decodeDirListing((_a = tx.getSync(newDirNode.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', newDir, 'link')));
            const inode = this.findInodeSync(tx, target, 'link');
            inode.nlink++;
            listing[basename(link)] = inode.ino;
            this._add(inode.ino, link);
            tx.setSync(inode.ino, serialize(inode));
            tx.setSync(newDirNode.data, encodeDirListing(listing));
            tx.commitSync();
        }
        catch (e_16) {
            env_16.error = e_16;
            env_16.hasError = true;
        }
        finally {
            __disposeResources(env_16);
        }
    }
    async read(path, buffer, offset, end) {
        var _a;
        const env_17 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_17, this.transaction(), true);
            const inode = await this.findInode(tx, path, 'read');
            if (inode.size == 0)
                return;
            const data = (_a = (await tx.get(inode.data, offset, end))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', path, 'read'));
            const _ = tx.flag('partial') ? data : data.subarray(offset, end);
            if (_.byteLength > buffer.byteLength)
                err(`Trying to place ${_.byteLength} bytes into a ${buffer.byteLength} byte buffer on read`);
            buffer.set(_);
        }
        catch (e_17) {
            env_17.error = e_17;
            env_17.hasError = true;
        }
        finally {
            const result_9 = __disposeResources(env_17);
            if (result_9)
                await result_9;
        }
    }
    readSync(path, buffer, offset, end) {
        var _a;
        const env_18 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_18, this.transaction(), false);
            const inode = this.findInodeSync(tx, path, 'read');
            if (inode.size == 0)
                return;
            const data = (_a = tx.getSync(inode.data, offset, end)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENODATA', path, 'read'));
            const _ = tx.flag('partial') ? data : data.subarray(offset, end);
            if (_.byteLength > buffer.byteLength)
                err(`Trying to place ${_.byteLength} bytes into a ${buffer.byteLength} byte buffer on read`);
            buffer.set(_);
        }
        catch (e_18) {
            env_18.error = e_18;
            env_18.hasError = true;
        }
        finally {
            __disposeResources(env_18);
        }
    }
    async write(path, data, offset) {
        var _a;
        const env_19 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_19, this.transaction(), true);
            const inode = await this.findInode(tx, path, 'write');
            let buffer = data;
            if (!tx.flag('partial')) {
                buffer = extendBuffer((_a = (await tx.get(inode.data))) !== null && _a !== void 0 ? _a : new Uint8Array(), offset + data.byteLength);
                buffer.set(data, offset);
                offset = 0;
            }
            await tx.set(inode.data, buffer, offset);
            inode.update({ mtimeMs: Date.now(), size: Math.max(inode.size, data.byteLength + offset) });
            this._add(inode.ino, path);
            await tx.set(inode.ino, serialize(inode));
            await tx.commit();
        }
        catch (e_19) {
            env_19.error = e_19;
            env_19.hasError = true;
        }
        finally {
            const result_10 = __disposeResources(env_19);
            if (result_10)
                await result_10;
        }
    }
    writeSync(path, data, offset) {
        var _a;
        const env_20 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_20, this.transaction(), false);
            const inode = this.findInodeSync(tx, path, 'write');
            let buffer = data;
            if (!tx.flag('partial')) {
                buffer = extendBuffer((_a = tx.getSync(inode.data)) !== null && _a !== void 0 ? _a : new Uint8Array(), offset + data.byteLength);
                buffer.set(data, offset);
                offset = 0;
            }
            tx.setSync(inode.data, buffer, offset);
            inode.update({ mtimeMs: Date.now(), size: Math.max(inode.size, data.byteLength + offset) });
            this._add(inode.ino, path);
            tx.setSync(inode.ino, serialize(inode));
            tx.commitSync();
        }
        catch (e_20) {
            env_20.error = e_20;
            env_20.hasError = true;
        }
        finally {
            __disposeResources(env_20);
        }
    }
    /**
     * Wraps a transaction
     * @internal @hidden
     */
    transaction() {
        return new WrappedTransaction(this.store.transaction(), this);
    }
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    async checkRoot() {
        const env_21 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_21, this.transaction(), true);
            if (await tx.get(rootIno))
                return;
            const inode = new Inode({ ino: rootIno, data: 1, mode: 0o777 | S_IFDIR });
            await tx.set(inode.data, encodeUTF8('{}'));
            this._add(rootIno, '/');
            await tx.set(rootIno, serialize(inode));
            await tx.commit();
        }
        catch (e_21) {
            env_21.error = e_21;
            env_21.hasError = true;
        }
        finally {
            const result_11 = __disposeResources(env_21);
            if (result_11)
                await result_11;
        }
    }
    /**
     * Checks if the root directory exists. Creates it if it doesn't.
     */
    checkRootSync() {
        const env_22 = { stack: [], error: void 0, hasError: false };
        try {
            const tx = __addDisposableResource(env_22, this.transaction(), false);
            if (tx.getSync(rootIno))
                return;
            const inode = new Inode({ ino: rootIno, data: 1, mode: 0o777 | S_IFDIR });
            tx.setSync(inode.data, encodeUTF8('{}'));
            this._add(rootIno, '/');
            tx.setSync(rootIno, serialize(inode));
            tx.commitSync();
        }
        catch (e_22) {
            env_22.error = e_22;
            env_22.hasError = true;
        }
        finally {
            __disposeResources(env_22);
        }
    }
    /**
     * Populates the `_ids` and `_paths` maps with all existing files stored in the underlying `Store`.
     */
    async _populate() {
        const env_23 = { stack: [], error: void 0, hasError: false };
        try {
            if (this._initialized) {
                warn('Attempted to populate tables after initialization');
                return;
            }
            debug('Populating tables with existing store metadata');
            const tx = __addDisposableResource(env_23, this.transaction(), true);
            const rootData = await tx.get(rootIno);
            if (!rootData) {
                notice('Store does not have a root inode');
                const inode = new Inode({ ino: rootIno, data: 1, mode: 0o777 | S_IFDIR });
                await tx.set(inode.data, encodeUTF8('{}'));
                this._add(rootIno, '/');
                await tx.set(rootIno, serialize(inode));
                await tx.commit();
                return;
            }
            if (rootData.length != __inode_sz) {
                crit('Store contains an invalid root inode. Refusing to populate tables');
                return;
            }
            // Keep track of directories we have already traversed to avoid loops
            const visitedDirectories = new Set();
            let i = 0;
            // Start BFS from root
            const queue = [['/', rootIno]];
            while (queue.length > 0) {
                i++;
                const [path, ino] = queue.shift();
                this._add(ino, path);
                // Get the inode data from the store
                const inodeData = await tx.get(ino);
                if (!inodeData) {
                    warn('Store is missing data for inode: ' + ino);
                    continue;
                }
                if (inodeData.length != __inode_sz) {
                    warn(`Invalid inode size for ino ${ino}: ${inodeData.length}`);
                    continue;
                }
                // Parse the raw data into our Inode object
                const inode = new Inode(inodeData);
                // If it is a directory and not yet visited, read its directory listing
                if ((inode.mode & S_IFDIR) != S_IFDIR || visitedDirectories.has(ino)) {
                    continue;
                }
                visitedDirectories.add(ino);
                // Grab the directory listing from the store
                const dirData = await tx.get(inode.data);
                if (!dirData) {
                    warn('Store is missing directory data: ' + inode.data);
                    continue;
                }
                const dirListing = decodeDirListing(dirData);
                for (const [entryName, childIno] of Object.entries(dirListing)) {
                    queue.push([join(path, entryName), childIno]);
                }
            }
            debug(`Added ${i} existing inode(s) from store`);
        }
        catch (e_23) {
            env_23.error = e_23;
            env_23.hasError = true;
        }
        finally {
            const result_12 = __disposeResources(env_23);
            if (result_12)
                await result_12;
        }
    }
    /**
     * Finds the Inode of `path`.
     * @param path The path to look up.
     * @todo memoize/cache
     */
    async findInode(tx, path, syscall) {
        var _a;
        const ino = this._ids.get(path);
        if (ino === undefined)
            throw ErrnoError.With('ENOENT', path, syscall);
        return new Inode((_a = (await tx.get(ino))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, syscall)));
    }
    /**
     * Finds the Inode of `path`.
     * @param path The path to look up.
     * @return The Inode of the path p.
     * @todo memoize/cache
     */
    findInodeSync(tx, path, syscall) {
        var _a;
        const ino = this._ids.get(path);
        if (ino === undefined)
            throw ErrnoError.With('ENOENT', path, syscall);
        return new Inode((_a = tx.getSync(ino)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', path, syscall)));
    }
    /**
     * Allocates a new ID and adds the ID/path
     */
    allocNew(path, syscall) {
        var _a;
        (_a = this._lastID) !== null && _a !== void 0 ? _a : (this._lastID = Math.max(...this._paths.keys()));
        this._lastID += 2;
        const id = this._lastID;
        if (id > size_max)
            throw err(new ErrnoError(Errno.ENOSPC, 'No IDs available', path, syscall), { fs: this });
        this._add(id, path);
        return id;
    }
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
     * Note: This will commit the transaction.
     * @param path The path to the new file.
     * @param options The options to create the new file with.
     * @param data The data to store at the file's data node.
     */
    async commitNew(path, options, data, syscall) {
        var _a;
        const env_24 = { stack: [], error: void 0, hasError: false };
        try {
            /*
                The root always exists.
                If we don't check this prior to taking steps below,
                we will create a file with name '' in root if path is '/'.
            */
            if (path == '/')
                throw ErrnoError.With('EEXIST', path, syscall);
            const tx = __addDisposableResource(env_24, this.transaction(), true);
            const { dir: parentPath, base: fname } = parse(path);
            const parent = await this.findInode(tx, parentPath, syscall);
            const listing = decodeDirListing((_a = (await tx.get(parent.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', parentPath, syscall)));
            // Check if file already exists.
            if (listing[fname])
                throw ErrnoError.With('EEXIST', path, syscall);
            const id = this.allocNew(path, syscall);
            // Commit data.
            const inode = new Inode({
                ino: id,
                data: id + 1,
                mode: options.mode,
                size: data.byteLength,
                uid: parent.mode & S_ISUID ? parent.uid : options.uid,
                gid: parent.mode & S_ISGID ? parent.gid : options.gid,
            });
            await tx.set(inode.ino, serialize(inode));
            await tx.set(inode.data, data);
            // Update and commit parent directory listing.
            listing[fname] = inode.ino;
            await tx.set(parent.data, encodeDirListing(listing));
            await tx.commit();
            return inode;
        }
        catch (e_24) {
            env_24.error = e_24;
            env_24.hasError = true;
        }
        finally {
            const result_13 = __disposeResources(env_24);
            if (result_13)
                await result_13;
        }
    }
    /**
     * Commits a new file (well, a FILE or a DIRECTORY) to the file system with `mode`.
     * Note: This will commit the transaction.
     * @param path The path to the new file.
     * @param options The options to create the new file with.
     * @param data The data to store at the file's data node.
     * @return The Inode for the new file.
     */
    commitNewSync(path, options, data, syscall) {
        var _a;
        const env_25 = { stack: [], error: void 0, hasError: false };
        try {
            /*
                The root always exists.
                If we don't check this prior to taking steps below,
                we will create a file with name '' in root if path is '/'.
            */
            if (path == '/')
                throw ErrnoError.With('EEXIST', path, syscall);
            const tx = __addDisposableResource(env_25, this.transaction(), false);
            const { dir: parentPath, base: fname } = parse(path);
            const parent = this.findInodeSync(tx, parentPath, syscall);
            const listing = decodeDirListing((_a = tx.getSync(parent.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', parentPath, syscall)));
            // Check if file already exists.
            if (listing[fname])
                throw ErrnoError.With('EEXIST', path, syscall);
            const id = this.allocNew(path, syscall);
            // Commit data.
            const inode = new Inode({
                ino: id,
                data: id + 1,
                mode: options.mode,
                size: data.byteLength,
                uid: parent.mode & S_ISUID ? parent.uid : options.uid,
                gid: parent.mode & S_ISGID ? parent.gid : options.gid,
            });
            // Update and commit parent directory listing.
            tx.setSync(inode.ino, serialize(inode));
            tx.setSync(inode.data, data);
            listing[fname] = inode.ino;
            tx.setSync(parent.data, encodeDirListing(listing));
            tx.commitSync();
            return inode;
        }
        catch (e_25) {
            env_25.error = e_25;
            env_25.hasError = true;
        }
        finally {
            __disposeResources(env_25);
        }
    }
    /**
     * Remove all traces of `path` from the file system.
     * @param path The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    async remove(path, isDir) {
        var _a, _b;
        const env_26 = { stack: [], error: void 0, hasError: false };
        try {
            const syscall = isDir ? 'rmdir' : 'unlink';
            const tx = __addDisposableResource(env_26, this.transaction(), true);
            const { dir: parent, base: fileName } = parse(path), parentNode = await this.findInode(tx, parent, syscall), listing = decodeDirListing((_a = (await tx.get(parentNode.data))) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', parent, syscall)));
            if (!listing[fileName]) {
                throw ErrnoError.With('ENOENT', path, syscall);
            }
            const fileIno = listing[fileName];
            // Get file inode.
            const fileNode = new Inode((_b = (await tx.get(fileIno))) !== null && _b !== void 0 ? _b : _throw(ErrnoError.With('ENOENT', path, syscall)));
            // Remove from directory listing of parent.
            delete listing[fileName];
            if (!isDir && fileNode.toStats().isDirectory())
                throw ErrnoError.With('EISDIR', path, syscall);
            await tx.set(parentNode.data, encodeDirListing(listing));
            if (--fileNode.nlink < 1) {
                // remove file
                await tx.remove(fileNode.data);
                await tx.remove(fileIno);
                this._remove(fileIno);
            }
            // Success.
            await tx.commit();
        }
        catch (e_26) {
            env_26.error = e_26;
            env_26.hasError = true;
        }
        finally {
            const result_14 = __disposeResources(env_26);
            if (result_14)
                await result_14;
        }
    }
    /**
     * Remove all traces of `path` from the file system.
     * @param path The path to remove from the file system.
     * @param isDir Does the path belong to a directory, or a file?
     * @todo Update mtime.
     */
    removeSync(path, isDir) {
        var _a, _b;
        const env_27 = { stack: [], error: void 0, hasError: false };
        try {
            const syscall = isDir ? 'rmdir' : 'unlink';
            const tx = __addDisposableResource(env_27, this.transaction(), false);
            const { dir: parent, base: fileName } = parse(path), parentNode = this.findInodeSync(tx, parent, syscall), listing = decodeDirListing((_a = tx.getSync(parentNode.data)) !== null && _a !== void 0 ? _a : _throw(ErrnoError.With('ENOENT', parent, syscall))), fileIno = listing[fileName];
            if (!fileIno)
                throw ErrnoError.With('ENOENT', path, syscall);
            // Get file inode.
            const fileNode = new Inode((_b = tx.getSync(fileIno)) !== null && _b !== void 0 ? _b : _throw(ErrnoError.With('ENOENT', path, syscall)));
            // Remove from directory listing of parent.
            delete listing[fileName];
            if (!isDir && fileNode.toStats().isDirectory()) {
                throw ErrnoError.With('EISDIR', path, syscall);
            }
            // Update directory listing.
            tx.setSync(parentNode.data, encodeDirListing(listing));
            if (--fileNode.nlink < 1) {
                // remove file
                tx.removeSync(fileNode.data);
                tx.removeSync(fileIno);
                this._remove(fileIno);
            }
            // Success.
            tx.commitSync();
        }
        catch (e_27) {
            env_27.error = e_27;
            env_27.hasError = true;
        }
        finally {
            __disposeResources(env_27);
        }
    }
}
