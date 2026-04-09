// Utilities and shared data
import { InMemory } from '../backends/memory.js';
import { bindContext } from '../context.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { alert, debug, err, info, log_deprecated, notice, warn } from '../internal/log.js';
import { normalizePath } from '../utils.js';
import { size_max } from './constants.js';
import { join, resolve } from './path.js';
// descriptors
/**
 * @internal @hidden
 */
export const fdMap = new Map();
let nextFd = 100;
/**
 * @internal @hidden
 */
export function file2fd(file) {
    const fd = nextFd++;
    fdMap.set(fd, file);
    return fd;
}
/**
 * @internal @hidden
 */
export function fd2file(fd) {
    if (!fdMap.has(fd)) {
        throw new ErrnoError(Errno.EBADF);
    }
    return fdMap.get(fd);
}
/**
 * The map of mount points
 * @category Backends and Configuration
 * @internal
 */
export const mounts = new Map();
// Set a default root.
mount('/', InMemory.create({ name: 'root' }));
/**
 * Mounts the file system at `mountPoint`.
 * @category Backends and Configuration
 * @internal
 */
export function mount(mountPoint, fs) {
    if (mountPoint[0] != '/')
        mountPoint = '/' + mountPoint;
    mountPoint = resolve(mountPoint);
    if (mounts.has(mountPoint))
        throw err(new ErrnoError(Errno.EINVAL, 'Mount point is already in use: ' + mountPoint));
    fs._mountPoint = mountPoint;
    mounts.set(mountPoint, fs);
    info(`Mounted ${fs.name} on ${mountPoint}`);
    debug(`${fs.name} attributes: ${[...fs.attributes].map(([k, v]) => (v !== undefined && v !== null ? k + '=' + v : k)).join(', ')}`);
}
/**
 * Unmounts the file system at `mountPoint`.
 * @category Backends and Configuration
 */
export function umount(mountPoint) {
    if (mountPoint[0] != '/')
        mountPoint = '/' + mountPoint;
    mountPoint = resolve(mountPoint);
    if (!mounts.has(mountPoint)) {
        warn(mountPoint + ' is already unmounted');
        return;
    }
    mounts.delete(mountPoint);
    notice('Unmounted ' + mountPoint);
}
/**
 * Gets the internal `FileSystem` for the path, then returns it along with the path relative to the FS' root
 * @internal @hidden
 */
export function resolveMount(path, ctx) {
    const root = (ctx === null || ctx === void 0 ? void 0 : ctx.root) || '/';
    path = normalizePath(join(root, path));
    const sortedMounts = [...mounts].sort((a, b) => (a[0].length > b[0].length ? -1 : 1)); // descending order of the string length
    for (const [mountPoint, fs] of sortedMounts) {
        // We know path is normalized, so it would be a substring of the mount point.
        if (_isParentOf(mountPoint, path)) {
            path = path.slice(mountPoint.length > 1 ? mountPoint.length : 0); // Resolve the path relative to the mount point
            if (path === '')
                path = root;
            return { fs, path, mountPoint, root };
        }
    }
    throw alert(new ErrnoError(Errno.EIO, 'No file system', path));
}
/**
 * Reverse maps the paths in text from the mounted FileSystem to the global path
 * @internal @hidden
 */
export function fixPaths(text, paths) {
    for (const [from, to] of Object.entries(paths)) {
        text = text === null || text === void 0 ? void 0 : text.replaceAll(from, to);
    }
    return text;
}
/**
 * Fix paths in error stacks
 * @internal @hidden
 */
export function fixError(e, paths) {
    if (typeof e.stack == 'string') {
        e.stack = fixPaths(e.stack, paths);
    }
    try {
        e.message = fixPaths(e.message, paths);
    }
    catch {
        // `message` is read only
    }
    if (e.path)
        e.path = fixPaths(e.path, paths);
    return e;
}
/* node:coverage disable */
/**
 * @internal @deprecated
 */
export function mountObject(mounts) {
    log_deprecated('mountObject');
    if ('/' in mounts) {
        umount('/');
    }
    for (const [point, fs] of Object.entries(mounts)) {
        mount(point, fs);
    }
}
/* node:coverage enable */
/**
 * @internal @hidden
 */
export function _statfs(fs, bigint) {
    const md = fs.usage();
    const bs = md.blockSize || 4096;
    return {
        type: (bigint ? BigInt : Number)(fs.id),
        bsize: (bigint ? BigInt : Number)(bs),
        ffree: (bigint ? BigInt : Number)(md.freeNodes || size_max),
        files: (bigint ? BigInt : Number)(md.totalNodes || size_max),
        bavail: (bigint ? BigInt : Number)(md.freeSpace / bs),
        bfree: (bigint ? BigInt : Number)(md.freeSpace / bs),
        blocks: (bigint ? BigInt : Number)(md.totalSpace / bs),
    };
}
export function chroot(path, inPlace) {
    const creds = this === null || this === void 0 ? void 0 : this.credentials;
    if ((creds === null || creds === void 0 ? void 0 : creds.uid) && (creds === null || creds === void 0 ? void 0 : creds.gid) && (creds === null || creds === void 0 ? void 0 : creds.euid) && (creds === null || creds === void 0 ? void 0 : creds.egid)) {
        throw new ErrnoError(Errno.EPERM, 'Can not chroot() as non-root user');
    }
    if (inPlace && this) {
        this.root += path;
        return this;
    }
    return bindContext(join((this === null || this === void 0 ? void 0 : this.root) || '/', path), creds);
}
/**
 * @internal @hidden
 */
function _isParentOf(parent, child) {
    if (parent === '/' || parent === child)
        return true;
    if (!parent.endsWith('/'))
        parent += '/';
    return child.startsWith(parent);
}
