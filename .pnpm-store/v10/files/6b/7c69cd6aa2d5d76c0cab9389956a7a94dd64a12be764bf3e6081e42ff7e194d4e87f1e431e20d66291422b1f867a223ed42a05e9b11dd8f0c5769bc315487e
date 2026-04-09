import { WasiError } from "./error.mjs";
import { WasiErrno, WasiRights, WasiFileType } from "./types.mjs";
export const RIGHTS_ALL = WasiRights.FD_DATASYNC |
    WasiRights.FD_READ |
    WasiRights.FD_SEEK |
    WasiRights.FD_FDSTAT_SET_FLAGS |
    WasiRights.FD_SYNC |
    WasiRights.FD_TELL |
    WasiRights.FD_WRITE |
    WasiRights.FD_ADVISE |
    WasiRights.FD_ALLOCATE |
    WasiRights.PATH_CREATE_DIRECTORY |
    WasiRights.PATH_CREATE_FILE |
    WasiRights.PATH_LINK_SOURCE |
    WasiRights.PATH_LINK_TARGET |
    WasiRights.PATH_OPEN |
    WasiRights.FD_READDIR |
    WasiRights.PATH_READLINK |
    WasiRights.PATH_RENAME_SOURCE |
    WasiRights.PATH_RENAME_TARGET |
    WasiRights.PATH_FILESTAT_GET |
    WasiRights.PATH_FILESTAT_SET_SIZE |
    WasiRights.PATH_FILESTAT_SET_TIMES |
    WasiRights.FD_FILESTAT_GET |
    WasiRights.FD_FILESTAT_SET_TIMES |
    WasiRights.FD_FILESTAT_SET_SIZE |
    WasiRights.PATH_SYMLINK |
    WasiRights.PATH_UNLINK_FILE |
    WasiRights.PATH_REMOVE_DIRECTORY |
    WasiRights.POLL_FD_READWRITE |
    WasiRights.SOCK_SHUTDOWN |
    WasiRights.SOCK_ACCEPT;
export const BLOCK_DEVICE_BASE = RIGHTS_ALL;
export const BLOCK_DEVICE_INHERITING = RIGHTS_ALL;
export const CHARACTER_DEVICE_BASE = RIGHTS_ALL;
export const CHARACTER_DEVICE_INHERITING = RIGHTS_ALL;
export const REGULAR_FILE_BASE = WasiRights.FD_DATASYNC |
    WasiRights.FD_READ |
    WasiRights.FD_SEEK |
    WasiRights.FD_FDSTAT_SET_FLAGS |
    WasiRights.FD_SYNC |
    WasiRights.FD_TELL |
    WasiRights.FD_WRITE |
    WasiRights.FD_ADVISE |
    WasiRights.FD_ALLOCATE |
    WasiRights.FD_FILESTAT_GET |
    WasiRights.FD_FILESTAT_SET_SIZE |
    WasiRights.FD_FILESTAT_SET_TIMES |
    WasiRights.POLL_FD_READWRITE;
export const REGULAR_FILE_INHERITING = /*#__PURE__*/ BigInt(0);
export const DIRECTORY_BASE = WasiRights.FD_FDSTAT_SET_FLAGS |
    WasiRights.FD_SYNC |
    WasiRights.FD_ADVISE |
    WasiRights.PATH_CREATE_DIRECTORY |
    WasiRights.PATH_CREATE_FILE |
    WasiRights.PATH_LINK_SOURCE |
    WasiRights.PATH_LINK_TARGET |
    WasiRights.PATH_OPEN |
    WasiRights.FD_READDIR |
    WasiRights.PATH_READLINK |
    WasiRights.PATH_RENAME_SOURCE |
    WasiRights.PATH_RENAME_TARGET |
    WasiRights.PATH_FILESTAT_GET |
    WasiRights.PATH_FILESTAT_SET_SIZE |
    WasiRights.PATH_FILESTAT_SET_TIMES |
    WasiRights.FD_FILESTAT_GET |
    WasiRights.FD_FILESTAT_SET_TIMES |
    WasiRights.PATH_SYMLINK |
    WasiRights.PATH_UNLINK_FILE |
    WasiRights.PATH_REMOVE_DIRECTORY |
    WasiRights.POLL_FD_READWRITE;
export const DIRECTORY_INHERITING = DIRECTORY_BASE | REGULAR_FILE_BASE;
export const SOCKET_BASE = (WasiRights.FD_READ |
    WasiRights.FD_FDSTAT_SET_FLAGS |
    WasiRights.FD_WRITE |
    WasiRights.FD_FILESTAT_GET |
    WasiRights.POLL_FD_READWRITE |
    WasiRights.SOCK_SHUTDOWN);
export const SOCKET_INHERITING = RIGHTS_ALL;
export const TTY_BASE = WasiRights.FD_READ |
    WasiRights.FD_FDSTAT_SET_FLAGS |
    WasiRights.FD_WRITE |
    WasiRights.FD_FILESTAT_GET |
    WasiRights.POLL_FD_READWRITE;
export const TTY_INHERITING = /*#__PURE__*/ BigInt(0);
export function getRights(stdio, fd, flags, type) {
    const ret = {
        base: BigInt(0),
        inheriting: BigInt(0)
    };
    if (type === WasiFileType.UNKNOWN) {
        throw new WasiError('Unknown file type', WasiErrno.EINVAL);
    }
    switch (type) {
        case WasiFileType.REGULAR_FILE:
            ret.base = REGULAR_FILE_BASE;
            ret.inheriting = REGULAR_FILE_INHERITING;
            break;
        case WasiFileType.DIRECTORY:
            ret.base = DIRECTORY_BASE;
            ret.inheriting = DIRECTORY_INHERITING;
            break;
        case WasiFileType.SOCKET_STREAM:
        case WasiFileType.SOCKET_DGRAM:
            ret.base = SOCKET_BASE;
            ret.inheriting = SOCKET_INHERITING;
            break;
        case WasiFileType.CHARACTER_DEVICE:
            if (stdio.indexOf(fd) !== -1) {
                ret.base = TTY_BASE;
                ret.inheriting = TTY_INHERITING;
            }
            else {
                ret.base = CHARACTER_DEVICE_BASE;
                ret.inheriting = CHARACTER_DEVICE_INHERITING;
            }
            break;
        case WasiFileType.BLOCK_DEVICE:
            ret.base = BLOCK_DEVICE_BASE;
            ret.inheriting = BLOCK_DEVICE_INHERITING;
            break;
        default:
            ret.base = BigInt(0);
            ret.inheriting = BigInt(0);
    }
    /* Disable read/write bits depending on access mode. */
    const read_or_write_only = flags & (0 | 1 | 2);
    if (read_or_write_only === 0) {
        ret.base &= ~WasiRights.FD_WRITE;
    }
    else if (read_or_write_only === 1) {
        ret.base &= ~WasiRights.FD_READ;
    }
    return ret;
}
