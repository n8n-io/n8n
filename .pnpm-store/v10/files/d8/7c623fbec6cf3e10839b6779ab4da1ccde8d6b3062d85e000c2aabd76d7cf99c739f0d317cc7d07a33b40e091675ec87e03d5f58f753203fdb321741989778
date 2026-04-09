import { pick } from 'utilium';
import { resolveMountConfig } from '../../config.js';
import { Errno, ErrnoError } from '../../internal/error.js';
import { FileSystem } from '../../internal/filesystem.js';
import { err, info } from '../../internal/log.js';
import { Async } from '../../mixins/async.js';
import { Stats } from '../../stats.js';
import { InMemory } from '../memory.js';
import * as RPC from './rpc.js';
/**
 * PortFS lets you access an FS instance that is running in a port, or the other way around.
 *
 * Note that *direct* synchronous operations are not permitted on the PortFS,
 * regardless of the configuration option of the remote FS.
 */
export class PortFS extends Async(FileSystem) {
    /**
     * Constructs a new PortFS instance that connects with the FS running on `options.port`.
     */
    constructor(options) {
        super(0x706f7274, 'portfs');
        this.options = options;
        /**`
         * @hidden
         */
        this._sync = InMemory.create({ name: 'tmpfs:port' });
        this.port = options.port;
        RPC.attach(this.port, RPC.handleResponse);
    }
    rpc(method, ...args) {
        return RPC.request({ method, args }, {
            ...this.options,
            fs: this,
        });
    }
    async ready() {
        await this.rpc('ready');
        await super.ready();
    }
    rename(oldPath, newPath) {
        return this.rpc('rename', oldPath, newPath);
    }
    async stat(path) {
        return new Stats(await this.rpc('stat', path));
    }
    sync(path, data, stats) {
        stats = 'toJSON' in stats ? stats.toJSON() : stats;
        return this.rpc('sync', path, data, stats);
    }
    openFile(path, flag) {
        return this.rpc('openFile', path, flag);
    }
    createFile(path, flag, mode, options) {
        return this.rpc('createFile', path, flag, mode, options);
    }
    unlink(path) {
        return this.rpc('unlink', path);
    }
    rmdir(path) {
        return this.rpc('rmdir', path);
    }
    mkdir(path, mode, options) {
        return this.rpc('mkdir', path, mode, options);
    }
    readdir(path) {
        return this.rpc('readdir', path);
    }
    exists(path) {
        return this.rpc('exists', path);
    }
    link(srcpath, dstpath) {
        return this.rpc('link', srcpath, dstpath);
    }
    async read(path, buffer, offset, length) {
        const _buf = (await this.rpc('read', path, buffer, offset, length));
        buffer.set(_buf);
    }
    write(path, buffer, offset) {
        return this.rpc('write', path, buffer, offset);
    }
}
/** @internal */
export async function handleRequest(port, fs, request) {
    if (!RPC.isMessage(request))
        return;
    const { method, args, id, stack } = request;
    let value, error = false;
    try {
        // @ts-expect-error 2556
        value = await fs[method](...args);
        switch (method) {
            case 'openFile':
            case 'createFile': {
                value = {
                    path: args[0],
                    flag: args[1],
                    stats: await fs.stat(args[0]),
                };
                break;
            }
            case 'read':
                value = args[1];
                break;
        }
    }
    catch (e) {
        value = e instanceof ErrnoError ? e.toJSON() : pick(e, 'message', 'stack');
        error = true;
    }
    port.postMessage({ _zenfs: true, id, error, method, stack, value });
}
export function attachFS(port, fs) {
    RPC.attach(port, request => handleRequest(port, fs, request));
}
export function detachFS(port, fs) {
    RPC.detach(port, request => handleRequest(port, fs, request));
}
const _Port = {
    name: 'Port',
    options: {
        port: {
            type: 'object',
            required: true,
            validator(port) {
                // Check for a `postMessage` function.
                if (typeof (port === null || port === void 0 ? void 0 : port.postMessage) != 'function') {
                    throw err(new ErrnoError(Errno.EINVAL, 'option must be a port'));
                }
            },
        },
        timeout: { type: 'number', required: false },
    },
    create(options) {
        return new PortFS(options);
    },
};
/**
 * @category Backends and Configuration
 */
export const Port = _Port;
/**
 * @category Backends and Configuration
 */
export async function resolveRemoteMount(port, config, _depth = 0) {
    const stopAndReplay = RPC.catchMessages(port);
    const fs = await resolveMountConfig(config, _depth);
    attachFS(port, fs);
    await stopAndReplay(fs);
    info('Resolved remote mount: ' + fs.toString());
    return fs;
}
