import { pick } from 'utilium';
import { credentials } from './internal/credentials.js';
import { _inode_fields } from './internal/inode.js';
import { log_deprecated } from './internal/log.js';
import * as c from './vfs/constants.js';
const n1000 = BigInt(1000);
/**
 * Provides information about a particular entry in the file system.
 * Common code used by both Stats and BigIntStats.
 */
export class StatsCommon {
    _convert(arg) {
        return (this._isBigint ? BigInt(arg) : Number(arg));
    }
    get blocks() {
        return this._convert(Math.ceil(Number(this.size) / 512));
    }
    set blocks(value) { }
    get atime() {
        return new Date(Number(this.atimeMs));
    }
    set atime(value) {
        this.atimeMs = this._convert(value.getTime());
    }
    get mtime() {
        return new Date(Number(this.mtimeMs));
    }
    set mtime(value) {
        this.mtimeMs = this._convert(value.getTime());
    }
    get ctime() {
        return new Date(Number(this.ctimeMs));
    }
    set ctime(value) {
        this.ctimeMs = this._convert(value.getTime());
    }
    get birthtime() {
        return new Date(Number(this.birthtimeMs));
    }
    set birthtime(value) {
        this.birthtimeMs = this._convert(value.getTime());
    }
    /**
     * Creates a new stats instance from a stats-like object. Can be used to copy stats (note)
     */
    constructor({ atimeMs, mtimeMs, ctimeMs, birthtimeMs, uid, gid, size, mode, ino, ...rest } = {}) {
        /**
         * ID of device containing file
         */
        this.dev = this._convert(0);
        /**
         * Inode number
         */
        this.ino = this._convert(0);
        /**
         * Device ID (if special file)
         */
        this.rdev = this._convert(0);
        /**
         * Number of hard links
         */
        this.nlink = this._convert(1);
        /**
         * Block size for file system I/O
         */
        this.blksize = this._convert(4096);
        /**
         * User ID of owner
         */
        this.uid = this._convert(0);
        /**
         * Group ID of owner
         */
        this.gid = this._convert(0);
        const now = Date.now();
        this.atimeMs = this._convert(atimeMs !== null && atimeMs !== void 0 ? atimeMs : now);
        this.mtimeMs = this._convert(mtimeMs !== null && mtimeMs !== void 0 ? mtimeMs : now);
        this.ctimeMs = this._convert(ctimeMs !== null && ctimeMs !== void 0 ? ctimeMs : now);
        this.birthtimeMs = this._convert(birthtimeMs !== null && birthtimeMs !== void 0 ? birthtimeMs : now);
        this.uid = this._convert(uid !== null && uid !== void 0 ? uid : 0);
        this.gid = this._convert(gid !== null && gid !== void 0 ? gid : 0);
        this.size = this._convert(size !== null && size !== void 0 ? size : 0);
        this.ino = this._convert(ino !== null && ino !== void 0 ? ino : 0);
        this.mode = this._convert(mode !== null && mode !== void 0 ? mode : 0o644 & c.S_IFREG);
        if ((this.mode & c.S_IFMT) == 0) {
            this.mode = (this.mode | this._convert(c.S_IFREG));
        }
        Object.assign(this, rest);
    }
    isFile() {
        return (this.mode & c.S_IFMT) === c.S_IFREG;
    }
    isDirectory() {
        return (this.mode & c.S_IFMT) === c.S_IFDIR;
    }
    isSymbolicLink() {
        return (this.mode & c.S_IFMT) === c.S_IFLNK;
    }
    isSocket() {
        return (this.mode & c.S_IFMT) === c.S_IFSOCK;
    }
    isBlockDevice() {
        return (this.mode & c.S_IFMT) === c.S_IFBLK;
    }
    isCharacterDevice() {
        return (this.mode & c.S_IFMT) === c.S_IFCHR;
    }
    isFIFO() {
        return (this.mode & c.S_IFMT) === c.S_IFIFO;
    }
    toJSON() {
        return pick(this, _inode_fields);
    }
    /**
     * Checks if a given user/group has access to this item
     * @param mode The requested access, combination of W_OK, R_OK, and X_OK
     * @returns True if the request has access, false if the request does not
     * @internal
     */
    hasAccess(mode, context) {
        const creds = (context === null || context === void 0 ? void 0 : context.credentials) || credentials;
        if (this.isSymbolicLink() || creds.euid === 0 || creds.egid === 0)
            return true;
        let perm = 0;
        // Owner permissions
        if (creds.uid === this.uid) {
            if (this.mode & c.S_IRUSR)
                perm |= c.R_OK;
            if (this.mode & c.S_IWUSR)
                perm |= c.W_OK;
            if (this.mode & c.S_IXUSR)
                perm |= c.X_OK;
        }
        // Group permissions
        if (creds.gid === this.gid || creds.groups.includes(Number(this.gid))) {
            if (this.mode & c.S_IRGRP)
                perm |= c.R_OK;
            if (this.mode & c.S_IWGRP)
                perm |= c.W_OK;
            if (this.mode & c.S_IXGRP)
                perm |= c.X_OK;
        }
        // Others permissions
        if (this.mode & c.S_IROTH)
            perm |= c.R_OK;
        if (this.mode & c.S_IWOTH)
            perm |= c.W_OK;
        if (this.mode & c.S_IXOTH)
            perm |= c.X_OK;
        // Perform the access check
        return (perm & mode) === mode;
    }
    /* node:coverage disable */
    /**
     * Change the mode of the file.
     * We use this helper function to prevent messing up the type of the file.
     * @internal @deprecated
     */
    chmod(mode) {
        log_deprecated('StatsCommon#chmod');
        this.mode = this._convert((this.mode & c.S_IFMT) | mode);
    }
    /**
     * Change the owner user/group of the file.
     * This function makes sure it is a valid UID/GID (that is, a 32 unsigned int)
     * @internal @deprecated
     */
    chown(uid, gid) {
        log_deprecated('StatsCommon#chown');
        uid = Number(uid);
        gid = Number(gid);
        if (!isNaN(uid) && 0 <= uid && uid < 2 ** 32) {
            this.uid = this._convert(uid);
        }
        if (!isNaN(gid) && 0 <= gid && gid < 2 ** 32) {
            this.gid = this._convert(gid);
        }
    }
    /* node:coverage enable */
    get atimeNs() {
        return BigInt(this.atimeMs) * n1000;
    }
    get mtimeNs() {
        return BigInt(this.mtimeMs) * n1000;
    }
    get ctimeNs() {
        return BigInt(this.ctimeMs) * n1000;
    }
    get birthtimeNs() {
        return BigInt(this.birthtimeMs) * n1000;
    }
}
/**
 * @hidden @internal
 */
export function _chown(stats, uid, gid) {
    if (!isNaN(uid) && 0 <= uid && uid < c.size_max) {
        stats.uid = uid;
    }
    if (!isNaN(gid) && 0 <= gid && gid < 2 ** 32) {
        stats.gid = gid;
    }
}
/**
 * Implementation of Node's `Stats`.
 *
 * Attribute descriptions are from `man 2 stat'
 * @see http://nodejs.org/api/fs.html#fs_class_fs_stats
 * @see http://man7.org/linux/man-pages/man2/stat.2.html
 */
export class Stats extends StatsCommon {
    constructor() {
        super(...arguments);
        this._isBigint = false;
    }
}
Stats;
/**
 * Stats with bigint
 */
export class BigIntStats extends StatsCommon {
    constructor() {
        super(...arguments);
        this._isBigint = true;
    }
}
/**
 * Determines if the file stats have changed by comparing relevant properties.
 *
 * @param left The previous stats.
 * @param right The current stats.
 * @returns `true` if stats have changed; otherwise, `false`.
 * @internal
 */
export function isStatsEqual(left, right) {
    return (left.size == right.size
        && +left.atime == +right.atime
        && +left.mtime == +right.mtime
        && +left.ctime == +right.ctime
        && left.mode == right.mode);
}
/** @internal */
export const ZenFsType = 0x7a656e6673; // 'z' 'e' 'n' 'f' 's'
/**
 * @hidden
 */
export class StatsFs {
    constructor() {
        /** Type of file system. */
        this.type = 0x7a656e6673;
        /**  Optimal transfer block size. */
        this.bsize = 4096;
        /**  Total data blocks in file system. */
        this.blocks = 0;
        /** Free blocks in file system. */
        this.bfree = 0;
        /** Available blocks for unprivileged users */
        this.bavail = 0;
        /** Total file nodes in file system. */
        this.files = c.size_max;
        /** Free file nodes in file system. */
        this.ffree = c.size_max;
    }
}
/**
 * @hidden
 */
export class BigIntStatsFs {
    constructor() {
        /** Type of file system. */
        this.type = BigInt('0x7a656e6673');
        /**  Optimal transfer block size. */
        this.bsize = BigInt(4096);
        /**  Total data blocks in file system. */
        this.blocks = BigInt(0);
        /** Free blocks in file system. */
        this.bfree = BigInt(0);
        /** Available blocks for unprivileged users */
        this.bavail = BigInt(0);
        /** Total file nodes in file system. */
        this.files = BigInt(c.size_max);
        /** Free file nodes in file system. */
        this.ffree = BigInt(c.size_max);
    }
}
