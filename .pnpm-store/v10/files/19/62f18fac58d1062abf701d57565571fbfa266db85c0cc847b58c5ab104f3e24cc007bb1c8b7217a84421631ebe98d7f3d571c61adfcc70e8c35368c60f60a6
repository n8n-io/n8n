import { checkOptions, isBackend, isBackendConfig } from './backends/backend.js';
import { useCredentials } from './internal/credentials.js';
import { DeviceFS } from './internal/devices.js';
import { Errno, ErrnoError } from './internal/error.js';
import { FileSystem } from './internal/filesystem.js';
import { configure as configureLog, crit, err, info } from './internal/log.js';
import { config } from './vfs/config.js';
import * as fs from './vfs/index.js';
import { mounts } from './vfs/shared.js';
function isMountConfig(arg) {
    return isBackendConfig(arg) || isBackend(arg) || arg instanceof FileSystem;
}
/**
 * Retrieve a file system with `configuration`.
 * @category Backends and Configuration
 * @see MountConfiguration
 */
export async function resolveMountConfig(configuration, _depth = 0) {
    if (typeof configuration !== 'object' || configuration == null) {
        throw err(new ErrnoError(Errno.EINVAL, 'Invalid options on mount configuration'));
    }
    if (!isMountConfig(configuration)) {
        throw err(new ErrnoError(Errno.EINVAL, 'Invalid mount configuration'));
    }
    if (configuration instanceof FileSystem) {
        await configuration.ready();
        return configuration;
    }
    if (isBackend(configuration)) {
        configuration = { backend: configuration };
    }
    for (const [key, value] of Object.entries(configuration)) {
        if (key == 'backend')
            continue;
        if (!isMountConfig(value))
            continue;
        info('Resolving nested mount configuration: ' + key);
        if (_depth > 10) {
            throw err(new ErrnoError(Errno.EINVAL, 'Invalid configuration, too deep and possibly infinite'));
        }
        configuration[key] = await resolveMountConfig(value, ++_depth);
    }
    const { backend } = configuration;
    if (typeof backend.isAvailable == 'function' && !(await backend.isAvailable())) {
        throw err(new ErrnoError(Errno.EPERM, 'Backend not available: ' + backend.name));
    }
    await checkOptions(backend, configuration);
    const mount = (await backend.create(configuration));
    if (configuration.disableAsyncCache)
        mount.attributes.set('no_async');
    await mount.ready();
    return mount;
}
/**
 * Configures ZenFS with single mount point /
 * @category Backends and Configuration
 */
export async function configureSingle(configuration) {
    if (!isBackendConfig(configuration)) {
        throw new TypeError('Invalid single mount point configuration');
    }
    const resolved = await resolveMountConfig(configuration);
    fs.umount('/');
    fs.mount('/', resolved);
}
/**
 * Like `fs.mount`, but it also creates missing directories.
 * @privateRemarks
 * This is implemented as a separate function to avoid a circular dependency between vfs/shared.ts and other vfs layer files.
 * @internal
 */
async function mount(path, mount) {
    if (path == '/') {
        fs.mount(path, mount);
        return;
    }
    const stats = await fs.promises.stat(path).catch(() => null);
    if (!stats) {
        await fs.promises.mkdir(path, { recursive: true });
    }
    else if (!stats.isDirectory()) {
        throw ErrnoError.With('ENOTDIR', path, 'configure');
    }
    fs.mount(path, mount);
}
/**
 * @category Backends and Configuration
 */
export function addDevice(driver, options) {
    const devfs = mounts.get('/dev');
    if (!(devfs instanceof DeviceFS))
        throw crit(new ErrnoError(Errno.ENOTSUP, '/dev does not exist or is not a device file system'));
    return devfs._createDevice(driver, options);
}
/**
 * Configures ZenFS with `configuration`
 * @category Backends and Configuration
 * @see Configuration
 */
export async function configure(configuration) {
    var _a;
    const uid = 'uid' in configuration ? configuration.uid || 0 : 0;
    const gid = 'gid' in configuration ? configuration.gid || 0 : 0;
    useCredentials({ uid, gid });
    config.checkAccess = !configuration.disableAccessChecks;
    config.updateOnRead = !configuration.disableUpdateOnRead;
    config.syncImmediately = !configuration.onlySyncOnClose;
    if (configuration.log)
        configureLog(configuration.log);
    if (configuration.mounts) {
        // sort to make sure any root replacement is done first
        for (const [_point, mountConfig] of Object.entries(configuration.mounts).sort(([a], [b]) => (a.length > b.length ? 1 : -1))) {
            const point = _point.startsWith('/') ? _point : '/' + _point;
            if (isBackendConfig(mountConfig)) {
                (_a = mountConfig.disableAsyncCache) !== null && _a !== void 0 ? _a : (mountConfig.disableAsyncCache = configuration.disableAsyncCache || false);
            }
            if (point == '/')
                fs.umount('/');
            await mount(point, await resolveMountConfig(mountConfig));
        }
    }
    if (configuration.addDevices) {
        const devfs = new DeviceFS();
        devfs.addDefaults();
        await devfs.ready();
        await mount('/dev', devfs);
    }
}
