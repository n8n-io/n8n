/*
This is a great resource: https://www.kernel.org/doc/html/latest/admin-guide/devices.html
*/
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
import { canary } from 'utilium';
import { InMemoryStore } from '../backends/memory.js';
import { StoreFS } from '../backends/store/fs.js';
import { Stats } from '../stats.js';
import { decodeUTF8 } from '../utils.js';
import { S_IFBLK, S_IFCHR } from '../vfs/constants.js';
import { basename, dirname } from '../vfs/path.js';
import { Errno, ErrnoError } from './error.js';
import { File } from './file.js';
import { Inode } from './inode.js';
import { alert, debug, err, info, log_deprecated } from './log.js';
/**
 * The base class for device files
 * This class only does some simple things:
 * It implements `truncate` using `write` and it has non-device methods throw.
 * It is up to device drivers to implement the rest of the functionality.
 * @category Internals
 * @internal
 */
export class DeviceFile extends File {
    constructor(fs, path, device) {
        super(fs, path);
        this.fs = fs;
        this.device = device;
        this.position = 0;
        this.stats = new Inode({
            mode: (this.driver.isBuffered ? S_IFBLK : S_IFCHR) | 0o666,
        });
    }
    get driver() {
        return this.device.driver;
    }
    async stat() {
        return Promise.resolve(new Stats(this.stats));
    }
    statSync() {
        return new Stats(this.stats);
    }
    readSync(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        this.stats.atimeMs = Date.now();
        const end = position + length;
        this.position = end;
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this.driver.readD(this.device, uint8.subarray(offset, length), position, end);
        return length;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async read(buffer, offset, length) {
        return { bytesRead: this.readSync(buffer, offset, length), buffer };
    }
    writeSync(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        const end = position + length;
        if (end > this.stats.size)
            this.stats.size = end;
        this.stats.mtimeMs = Date.now();
        this.position = end;
        const data = buffer.subarray(offset, offset + length);
        this.driver.writeD(this.device, data, position);
        return length;
    }
    // eslint-disable-next-line @typescript-eslint/require-await
    async write(buffer, offset, length, position) {
        return this.writeSync(buffer, offset, length, position);
    }
    async truncate(length) {
        const { size } = await this.stat();
        const buffer = new Uint8Array(length > size ? length - size : 0);
        await this.write(buffer, 0, buffer.length, length > size ? size : length);
    }
    truncateSync(length) {
        const { size } = this.statSync();
        const buffer = new Uint8Array(length > size ? length - size : 0);
        this.writeSync(buffer, 0, buffer.length, length > size ? size : length);
    }
    closeSync() {
        var _a, _b;
        (_b = (_a = this.driver).close) === null || _b === void 0 ? void 0 : _b.call(_a, this);
    }
    close() {
        this.closeSync();
        return Promise.resolve();
    }
    syncSync() {
        var _a, _b;
        (_b = (_a = this.driver).sync) === null || _b === void 0 ? void 0 : _b.call(_a, this);
    }
    sync() {
        this.syncSync();
        return Promise.resolve();
    }
    chown() {
        throw ErrnoError.With('ENOTSUP', this.path, 'chown');
    }
    chownSync() {
        throw ErrnoError.With('ENOTSUP', this.path, 'chown');
    }
    chmod() {
        throw ErrnoError.With('ENOTSUP', this.path, 'chmod');
    }
    chmodSync() {
        throw ErrnoError.With('ENOTSUP', this.path, 'chmod');
    }
    utimes() {
        throw ErrnoError.With('ENOTSUP', this.path, 'utimes');
    }
    utimesSync() {
        throw ErrnoError.With('ENOTSUP', this.path, 'utimes');
    }
}
/**
 * A temporary file system that manages and interfaces with devices
 * @category Internals
 */
export class DeviceFS extends StoreFS {
    /* node:coverage disable */
    /**
     * Creates a new device at `path` relative to the `DeviceFS` root.
     * @deprecated
     */
    createDevice(path, driver, options = {}) {
        var _a;
        log_deprecated('DeviceFS#createDevice');
        if (this.existsSync(path)) {
            throw ErrnoError.With('EEXIST', path, 'mknod');
        }
        let ino = 1;
        const silence = canary(ErrnoError.With('EDEADLK', path, 'mknod'));
        while (this.store.has(ino))
            ino++;
        silence();
        const dev = {
            driver,
            ino,
            data: {},
            minor: 0,
            major: 0,
            ...(_a = driver.init) === null || _a === void 0 ? void 0 : _a.call(driver, ino, options),
        };
        this.devices.set(path, dev);
        return dev;
    }
    /* node:coverage enable */
    devicesWithDriver(driver, forceIdentity) {
        if (forceIdentity && typeof driver == 'string') {
            throw err(new ErrnoError(Errno.EINVAL, 'Can not fetch devices using only a driver name'), { fs: this });
        }
        const devs = [];
        for (const device of this.devices.values()) {
            if (forceIdentity && device.driver != driver)
                continue;
            const name = typeof driver == 'string' ? driver : driver.name;
            if (name == device.driver.name)
                devs.push(device);
        }
        return devs;
    }
    /**
     * @internal
     */
    _createDevice(driver, options = {}) {
        var _a;
        let ino = 1;
        while (this.store.has(ino))
            ino++;
        const dev = {
            driver,
            ino,
            data: {},
            minor: 0,
            major: 0,
            ...(_a = driver.init) === null || _a === void 0 ? void 0 : _a.call(driver, ino, options),
        };
        const path = '/' + (dev.name || driver.name) + (driver.singleton ? '' : this.devicesWithDriver(driver).length);
        if (this.existsSync(path))
            throw ErrnoError.With('EEXIST', path, 'mknod');
        this.devices.set(path, dev);
        info('Initialized device: ' + this._mountPoint + path);
        return dev;
    }
    /**
     * Adds default devices
     */
    addDefaults() {
        this._createDevice(nullDevice);
        this._createDevice(zeroDevice);
        this._createDevice(fullDevice);
        this._createDevice(randomDevice);
        this._createDevice(consoleDevice);
        debug('Added default devices');
    }
    constructor() {
        // Please don't store your temporary files in /dev.
        // If you do, you'll have up to 16 MiB
        super(new InMemoryStore(0x1000000, 'devfs'));
        this.devices = new Map();
    }
    async rename(oldPath, newPath) {
        if (this.devices.has(oldPath)) {
            throw ErrnoError.With('EPERM', oldPath, 'rename');
        }
        if (this.devices.has(newPath)) {
            throw ErrnoError.With('EEXIST', newPath, 'rename');
        }
        return super.rename(oldPath, newPath);
    }
    renameSync(oldPath, newPath) {
        if (this.devices.has(oldPath)) {
            throw ErrnoError.With('EPERM', oldPath, 'rename');
        }
        if (this.devices.has(newPath)) {
            throw ErrnoError.With('EEXIST', newPath, 'rename');
        }
        return super.renameSync(oldPath, newPath);
    }
    async stat(path) {
        if (this.devices.has(path)) {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const file = __addDisposableResource(env_1, await this.openFile(path, 'r'), true);
                return file.stat();
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
        return super.stat(path);
    }
    statSync(path) {
        if (this.devices.has(path)) {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const file = __addDisposableResource(env_2, this.openFileSync(path, 'r'), false);
                return file.statSync();
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                __disposeResources(env_2);
            }
        }
        return super.statSync(path);
    }
    async openFile(path, flag) {
        if (this.devices.has(path)) {
            return new DeviceFile(this, path, this.devices.get(path));
        }
        return await super.openFile(path, flag);
    }
    openFileSync(path, flag) {
        if (this.devices.has(path)) {
            return new DeviceFile(this, path, this.devices.get(path));
        }
        return super.openFileSync(path, flag);
    }
    async createFile(path, flag, mode, options) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EEXIST', path, 'createFile');
        }
        return super.createFile(path, flag, mode, options);
    }
    createFileSync(path, flag, mode, options) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EEXIST', path, 'createFile');
        }
        return super.createFileSync(path, flag, mode, options);
    }
    async unlink(path) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EPERM', path, 'unlink');
        }
        return super.unlink(path);
    }
    unlinkSync(path) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EPERM', path, 'unlink');
        }
        return super.unlinkSync(path);
    }
    async rmdir(path) {
        return super.rmdir(path);
    }
    rmdirSync(path) {
        return super.rmdirSync(path);
    }
    async mkdir(path, mode, options) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EEXIST', path, 'mkdir');
        }
        return super.mkdir(path, mode, options);
    }
    mkdirSync(path, mode, options) {
        if (this.devices.has(path)) {
            throw ErrnoError.With('EEXIST', path, 'mkdir');
        }
        return super.mkdirSync(path, mode, options);
    }
    async readdir(path) {
        const entries = await super.readdir(path);
        for (const dev of this.devices.keys()) {
            if (dirname(dev) == path) {
                entries.push(basename(dev));
            }
        }
        return entries;
    }
    readdirSync(path) {
        const entries = super.readdirSync(path);
        for (const dev of this.devices.keys()) {
            if (dirname(dev) == path) {
                entries.push(basename(dev));
            }
        }
        return entries;
    }
    async link(target, link) {
        if (this.devices.has(target)) {
            throw ErrnoError.With('EPERM', target, 'rmdir');
        }
        if (this.devices.has(link)) {
            throw ErrnoError.With('EEXIST', link, 'link');
        }
        return super.link(target, link);
    }
    linkSync(target, link) {
        if (this.devices.has(target)) {
            throw ErrnoError.With('EPERM', target, 'rmdir');
        }
        if (this.devices.has(link)) {
            throw ErrnoError.With('EEXIST', link, 'link');
        }
        return super.linkSync(target, link);
    }
    async sync(path, data, stats) {
        if (this.devices.has(path)) {
            throw alert(new ErrnoError(Errno.EINVAL, 'Attempted to sync a device incorrectly (bug)', path, 'sync'), { fs: this });
        }
        return super.sync(path, data, stats);
    }
    syncSync(path, data, stats) {
        if (this.devices.has(path)) {
            throw alert(new ErrnoError(Errno.EINVAL, 'Attempted to sync a device incorrectly (bug)', path, 'sync'), { fs: this });
        }
        return super.syncSync(path, data, stats);
    }
    async read(path, buffer, offset, end) {
        const device = this.devices.get(path);
        if (!device) {
            await super.read(path, buffer, offset, end);
            return;
        }
        device.driver.readD(device, buffer, offset, end);
    }
    readSync(path, buffer, offset, end) {
        const device = this.devices.get(path);
        if (!device) {
            super.readSync(path, buffer, offset, end);
            return;
        }
        device.driver.readD(device, buffer, offset, end);
    }
    async write(path, data, offset) {
        const device = this.devices.get(path);
        if (!device) {
            return await super.write(path, data, offset);
        }
        device.driver.writeD(device, data, offset);
    }
    writeSync(path, data, offset) {
        const device = this.devices.get(path);
        if (!device) {
            return super.writeSync(path, data, offset);
        }
        device.driver.writeD(device, data, offset);
    }
}
function defaultWrite(device, data, offset) {
    return;
}
const emptyBuffer = new Uint8Array();
/**
 * Simulates the `/dev/null` device.
 * - Reads return 0 bytes (EOF).
 * - Writes discard data, advancing the file position.
 * @category Internals
 * @internal
 */
export const nullDevice = {
    name: 'null',
    singleton: true,
    init() {
        return { major: 1, minor: 3 };
    },
    read() {
        return 0;
    },
    readD() {
        return emptyBuffer;
    },
    writeD: defaultWrite,
};
/**
 * Simulates the `/dev/zero` device
 * Provides an infinite stream of zeroes when read.
 * Discards any data written to it.
 *
 * - Reads fill the buffer with zeroes.
 * - Writes discard data but update the file position.
 * - Provides basic file metadata, treating it as a character device.
 * @category Internals
 * @internal
 */
export const zeroDevice = {
    name: 'zero',
    singleton: true,
    init() {
        return { major: 1, minor: 5 };
    },
    readD(device, buffer, offset, end) {
        buffer.fill(0, offset, end);
    },
    writeD: defaultWrite,
};
/**
 * Simulates the `/dev/full` device.
 * - Reads behave like `/dev/zero` (returns zeroes).
 * - Writes always fail with ENOSPC (no space left on device).
 * @category Internals
 * @internal
 */
export const fullDevice = {
    name: 'full',
    singleton: true,
    init() {
        return { major: 1, minor: 7 };
    },
    readD(device, buffer, offset, end) {
        buffer.fill(0, offset, end);
    },
    write(file) {
        throw ErrnoError.With('ENOSPC', file.path, 'write');
    },
    writeD() {
        throw ErrnoError.With('ENOSPC', undefined, 'write');
    },
};
/**
 * Simulates the `/dev/random` device.
 * - Reads return random bytes.
 * - Writes discard data, advancing the file position.
 * @category Internals
 * @internal
 */
export const randomDevice = {
    name: 'random',
    singleton: true,
    init() {
        return { major: 1, minor: 8 };
    },
    readD(device, buffer) {
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
        }
    },
    writeD: defaultWrite,
};
/**
 * Simulates the `/dev/console` device.
 * @category Internals
 * @experimental @internal
 */
const consoleDevice = {
    name: 'console',
    singleton: true,
    init(ino, { output = text => console.log(text) } = {}) {
        return { major: 5, minor: 1, data: { output } };
    },
    readD() {
        return emptyBuffer;
    },
    writeD(device, buffer, offset) {
        const text = decodeUTF8(buffer);
        device.data.output(text, offset);
    },
};
/**
 * Shortcuts for importing.
 * @category Internals
 * @internal
 */
export const devices = {
    null: nullDevice,
    zero: zeroDevice,
    full: fullDevice,
    random: randomDevice,
    console: consoleDevice,
};
