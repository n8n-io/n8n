"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRights = exports.TTY_INHERITING = exports.TTY_BASE = exports.SOCKET_INHERITING = exports.SOCKET_BASE = exports.DIRECTORY_INHERITING = exports.DIRECTORY_BASE = exports.REGULAR_FILE_INHERITING = exports.REGULAR_FILE_BASE = exports.CHARACTER_DEVICE_INHERITING = exports.CHARACTER_DEVICE_BASE = exports.BLOCK_DEVICE_INHERITING = exports.BLOCK_DEVICE_BASE = exports.RIGHTS_ALL = void 0;
/* eslint-disable spaced-comment */
const error_1 = require("./error");
const types_1 = require("./types");
exports.RIGHTS_ALL = types_1.WasiRights.FD_DATASYNC |
    types_1.WasiRights.FD_READ |
    types_1.WasiRights.FD_SEEK |
    types_1.WasiRights.FD_FDSTAT_SET_FLAGS |
    types_1.WasiRights.FD_SYNC |
    types_1.WasiRights.FD_TELL |
    types_1.WasiRights.FD_WRITE |
    types_1.WasiRights.FD_ADVISE |
    types_1.WasiRights.FD_ALLOCATE |
    types_1.WasiRights.PATH_CREATE_DIRECTORY |
    types_1.WasiRights.PATH_CREATE_FILE |
    types_1.WasiRights.PATH_LINK_SOURCE |
    types_1.WasiRights.PATH_LINK_TARGET |
    types_1.WasiRights.PATH_OPEN |
    types_1.WasiRights.FD_READDIR |
    types_1.WasiRights.PATH_READLINK |
    types_1.WasiRights.PATH_RENAME_SOURCE |
    types_1.WasiRights.PATH_RENAME_TARGET |
    types_1.WasiRights.PATH_FILESTAT_GET |
    types_1.WasiRights.PATH_FILESTAT_SET_SIZE |
    types_1.WasiRights.PATH_FILESTAT_SET_TIMES |
    types_1.WasiRights.FD_FILESTAT_GET |
    types_1.WasiRights.FD_FILESTAT_SET_TIMES |
    types_1.WasiRights.FD_FILESTAT_SET_SIZE |
    types_1.WasiRights.PATH_SYMLINK |
    types_1.WasiRights.PATH_UNLINK_FILE |
    types_1.WasiRights.PATH_REMOVE_DIRECTORY |
    types_1.WasiRights.POLL_FD_READWRITE |
    types_1.WasiRights.SOCK_SHUTDOWN |
    types_1.WasiRights.SOCK_ACCEPT;
exports.BLOCK_DEVICE_BASE = exports.RIGHTS_ALL;
exports.BLOCK_DEVICE_INHERITING = exports.RIGHTS_ALL;
exports.CHARACTER_DEVICE_BASE = exports.RIGHTS_ALL;
exports.CHARACTER_DEVICE_INHERITING = exports.RIGHTS_ALL;
exports.REGULAR_FILE_BASE = types_1.WasiRights.FD_DATASYNC |
    types_1.WasiRights.FD_READ |
    types_1.WasiRights.FD_SEEK |
    types_1.WasiRights.FD_FDSTAT_SET_FLAGS |
    types_1.WasiRights.FD_SYNC |
    types_1.WasiRights.FD_TELL |
    types_1.WasiRights.FD_WRITE |
    types_1.WasiRights.FD_ADVISE |
    types_1.WasiRights.FD_ALLOCATE |
    types_1.WasiRights.FD_FILESTAT_GET |
    types_1.WasiRights.FD_FILESTAT_SET_SIZE |
    types_1.WasiRights.FD_FILESTAT_SET_TIMES |
    types_1.WasiRights.POLL_FD_READWRITE;
exports.REGULAR_FILE_INHERITING = BigInt(0);
exports.DIRECTORY_BASE = types_1.WasiRights.FD_FDSTAT_SET_FLAGS |
    types_1.WasiRights.FD_SYNC |
    types_1.WasiRights.FD_ADVISE |
    types_1.WasiRights.PATH_CREATE_DIRECTORY |
    types_1.WasiRights.PATH_CREATE_FILE |
    types_1.WasiRights.PATH_LINK_SOURCE |
    types_1.WasiRights.PATH_LINK_TARGET |
    types_1.WasiRights.PATH_OPEN |
    types_1.WasiRights.FD_READDIR |
    types_1.WasiRights.PATH_READLINK |
    types_1.WasiRights.PATH_RENAME_SOURCE |
    types_1.WasiRights.PATH_RENAME_TARGET |
    types_1.WasiRights.PATH_FILESTAT_GET |
    types_1.WasiRights.PATH_FILESTAT_SET_SIZE |
    types_1.WasiRights.PATH_FILESTAT_SET_TIMES |
    types_1.WasiRights.FD_FILESTAT_GET |
    types_1.WasiRights.FD_FILESTAT_SET_TIMES |
    types_1.WasiRights.PATH_SYMLINK |
    types_1.WasiRights.PATH_UNLINK_FILE |
    types_1.WasiRights.PATH_REMOVE_DIRECTORY |
    types_1.WasiRights.POLL_FD_READWRITE;
exports.DIRECTORY_INHERITING = exports.DIRECTORY_BASE | exports.REGULAR_FILE_BASE;
exports.SOCKET_BASE = (types_1.WasiRights.FD_READ |
    types_1.WasiRights.FD_FDSTAT_SET_FLAGS |
    types_1.WasiRights.FD_WRITE |
    types_1.WasiRights.FD_FILESTAT_GET |
    types_1.WasiRights.POLL_FD_READWRITE |
    types_1.WasiRights.SOCK_SHUTDOWN);
exports.SOCKET_INHERITING = exports.RIGHTS_ALL;
exports.TTY_BASE = types_1.WasiRights.FD_READ |
    types_1.WasiRights.FD_FDSTAT_SET_FLAGS |
    types_1.WasiRights.FD_WRITE |
    types_1.WasiRights.FD_FILESTAT_GET |
    types_1.WasiRights.POLL_FD_READWRITE;
exports.TTY_INHERITING = BigInt(0);
function getRights(stdio, fd, flags, type) {
    const ret = {
        base: BigInt(0),
        inheriting: BigInt(0)
    };
    if (type === types_1.WasiFileType.UNKNOWN) {
        throw new error_1.WasiError('Unknown file type', types_1.WasiErrno.EINVAL);
    }
    switch (type) {
        case types_1.WasiFileType.REGULAR_FILE:
            ret.base = exports.REGULAR_FILE_BASE;
            ret.inheriting = exports.REGULAR_FILE_INHERITING;
            break;
        case types_1.WasiFileType.DIRECTORY:
            ret.base = exports.DIRECTORY_BASE;
            ret.inheriting = exports.DIRECTORY_INHERITING;
            break;
        case types_1.WasiFileType.SOCKET_STREAM:
        case types_1.WasiFileType.SOCKET_DGRAM:
            ret.base = exports.SOCKET_BASE;
            ret.inheriting = exports.SOCKET_INHERITING;
            break;
        case types_1.WasiFileType.CHARACTER_DEVICE:
            if (stdio.indexOf(fd) !== -1) {
                ret.base = exports.TTY_BASE;
                ret.inheriting = exports.TTY_INHERITING;
            }
            else {
                ret.base = exports.CHARACTER_DEVICE_BASE;
                ret.inheriting = exports.CHARACTER_DEVICE_INHERITING;
            }
            break;
        case types_1.WasiFileType.BLOCK_DEVICE:
            ret.base = exports.BLOCK_DEVICE_BASE;
            ret.inheriting = exports.BLOCK_DEVICE_INHERITING;
            break;
        default:
            ret.base = BigInt(0);
            ret.inheriting = BigInt(0);
    }
    /* Disable read/write bits depending on access mode. */
    const read_or_write_only = flags & (0 | 1 | 2);
    if (read_or_write_only === 0) {
        ret.base &= ~types_1.WasiRights.FD_WRITE;
    }
    else if (read_or_write_only === 1) {
        ret.base &= ~types_1.WasiRights.FD_READ;
    }
    return ret;
}
exports.getRights = getRights;
//# sourceMappingURL=rights.js.map