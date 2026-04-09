import * as requests from 'utilium/requests.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { Index } from '../internal/file_index.js';
import { IndexFS } from '../internal/index_fs.js';
import { err, warn } from '../internal/log.js';
import { decodeUTF8, normalizePath } from '../utils.js';
import { S_IFREG } from '../vfs/constants.js';
/** Parse and throw */
function parseError(path, fs) {
    return (error) => {
        if (!('tag' in error))
            throw err(new ErrnoError(Errno.EIO, error.stack, path), { fs });
        switch (error.tag) {
            case 'fetch':
                throw err(new ErrnoError(Errno.EREMOTEIO, error.message, path), { fs });
            case 'status':
                throw err(new ErrnoError(error.response.status > 500 ? Errno.EREMOTEIO : Errno.EIO, 'Response status code is ' + error.response.status, path), { fs });
            case 'size':
                throw err(new ErrnoError(Errno.EBADE, error.message, path), { fs });
            case 'buffer':
                throw err(new ErrnoError(Errno.EIO, 'Failed to decode buffer', path), { fs });
        }
    };
}
/**
 * A simple filesystem backed by HTTP using the `fetch` API.
 * @internal
 */
export class FetchFS extends IndexFS {
    _async(p) {
        this._asyncDone = this._asyncDone.then(() => p);
    }
    constructor(index, baseUrl, requestInit = {}, remoteWrite) {
        super(0x206e6673, 'nfs', index);
        this.baseUrl = baseUrl;
        this.requestInit = requestInit;
        this.remoteWrite = remoteWrite;
        /**
         * @internal @hidden
         */
        this._asyncDone = Promise.resolve();
    }
    async remove(path) {
        await requests.remove(this.baseUrl + path, { warn, cacheOnly: !this.remoteWrite }, this.requestInit);
    }
    removeSync(path) {
        this._async(requests.remove(this.baseUrl + path, { warn, cacheOnly: !this.remoteWrite }, this.requestInit));
    }
    async read(path, buffer, offset = 0, end) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'read');
        if (end - offset == 0)
            return;
        const data = await requests
            .get(this.baseUrl + path, { start: offset, end, size: inode.size, warn }, this.requestInit)
            .catch(parseError(path, this))
            .catch(() => undefined);
        if (!data)
            throw ErrnoError.With('ENODATA', path, 'read');
        buffer.set(data);
    }
    readSync(path, buffer, offset = 0, end) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'read');
        if (end - offset == 0)
            return;
        const { data, missing } = requests.getCached(this.baseUrl + path, { start: offset, end, size: inode.size, warn });
        if (!data)
            throw ErrnoError.With('ENODATA', path, 'read');
        if (missing.length) {
            this._async(requests.get(this.baseUrl + path, { start: offset, end, size: inode.size, warn }));
            throw ErrnoError.With('EAGAIN', path, 'read');
        }
        buffer.set(data);
    }
    async write(path, data, offset) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'write');
        inode.update({ mtimeMs: Date.now(), size: Math.max(inode.size, data.byteLength + offset) });
        await requests.set(this.baseUrl + path, data, { offset, warn, cacheOnly: !this.remoteWrite }, this.requestInit).catch(parseError(path, this));
    }
    writeSync(path, data, offset) {
        const inode = this.index.get(path);
        if (!inode)
            throw ErrnoError.With('ENOENT', path, 'write');
        inode.update({ mtimeMs: Date.now(), size: Math.max(inode.size, data.byteLength + offset) });
        this._async(requests.set(this.baseUrl + path, data, { offset, warn, cacheOnly: !this.remoteWrite }, this.requestInit).catch(parseError(path, this)));
    }
}
const _Fetch = {
    name: 'Fetch',
    options: {
        index: { type: ['string', 'object'], required: false },
        baseUrl: { type: 'string', required: true },
        requestInit: { type: 'object', required: false },
        remoteWrite: { type: 'boolean', required: false },
    },
    isAvailable() {
        return typeof globalThis.fetch == 'function';
    },
    async create(options) {
        var _a;
        const url = new URL(options.baseUrl);
        url.pathname = normalizePath(url.pathname);
        let baseUrl = url.toString();
        if (baseUrl.at(-1) == '/')
            baseUrl = baseUrl.slice(0, -1);
        (_a = options.index) !== null && _a !== void 0 ? _a : (options.index = 'index.json');
        const index = new Index();
        if (typeof options.index != 'string') {
            index.fromJSON(options.index);
        }
        else {
            const data = await requests.get(options.index, { warn }, options.requestInit).catch(parseError());
            index.fromJSON(JSON.parse(decodeUTF8(data)));
        }
        const fs = new FetchFS(index, baseUrl, options.requestInit, options.remoteWrite);
        if (options.disableAsyncCache)
            return fs;
        // Iterate over all of the files and cache their contents
        for (const [path, node] of index) {
            if (!(node.mode & S_IFREG))
                continue;
            await requests.get(baseUrl + path, { warn }, options.requestInit).catch(parseError(path, fs));
        }
        return fs;
    },
};
/**
 * @category Backends and Configuration
 */
export const Fetch = _Fetch;
