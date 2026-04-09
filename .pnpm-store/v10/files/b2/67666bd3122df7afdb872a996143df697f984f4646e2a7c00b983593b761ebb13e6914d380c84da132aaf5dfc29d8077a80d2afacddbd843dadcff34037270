"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WasiError = exports.strerror = void 0;
const types_1 = require("./types");
function strerror(errno) {
    switch (errno) {
        case types_1.WasiErrno.ESUCCESS: return 'Success';
        case types_1.WasiErrno.E2BIG: return 'Argument list too long';
        case types_1.WasiErrno.EACCES: return 'Permission denied';
        case types_1.WasiErrno.EADDRINUSE: return 'Address in use';
        case types_1.WasiErrno.EADDRNOTAVAIL: return 'Address not available';
        case types_1.WasiErrno.EAFNOSUPPORT: return 'Address family not supported by protocol';
        case types_1.WasiErrno.EAGAIN: return 'Resource temporarily unavailable';
        case types_1.WasiErrno.EALREADY: return 'Operation already in progress';
        case types_1.WasiErrno.EBADF: return 'Bad file descriptor';
        case types_1.WasiErrno.EBADMSG: return 'Bad message';
        case types_1.WasiErrno.EBUSY: return 'Resource busy';
        case types_1.WasiErrno.ECANCELED: return 'Operation canceled';
        case types_1.WasiErrno.ECHILD: return 'No child process';
        case types_1.WasiErrno.ECONNABORTED: return 'Connection aborted';
        case types_1.WasiErrno.ECONNREFUSED: return 'Connection refused';
        case types_1.WasiErrno.ECONNRESET: return 'Connection reset by peer';
        case types_1.WasiErrno.EDEADLK: return 'Resource deadlock would occur';
        case types_1.WasiErrno.EDESTADDRREQ: return 'Destination address required';
        case types_1.WasiErrno.EDOM: return 'Domain error';
        case types_1.WasiErrno.EDQUOT: return 'Quota exceeded';
        case types_1.WasiErrno.EEXIST: return 'File exists';
        case types_1.WasiErrno.EFAULT: return 'Bad address';
        case types_1.WasiErrno.EFBIG: return 'File too large';
        case types_1.WasiErrno.EHOSTUNREACH: return 'Host is unreachable';
        case types_1.WasiErrno.EIDRM: return 'Identifier removed';
        case types_1.WasiErrno.EILSEQ: return 'Illegal byte sequence';
        case types_1.WasiErrno.EINPROGRESS: return 'Operation in progress';
        case types_1.WasiErrno.EINTR: return 'Interrupted system call';
        case types_1.WasiErrno.EINVAL: return 'Invalid argument';
        case types_1.WasiErrno.EIO: return 'I/O error';
        case types_1.WasiErrno.EISCONN: return 'Socket is connected';
        case types_1.WasiErrno.EISDIR: return 'Is a directory';
        case types_1.WasiErrno.ELOOP: return 'Symbolic link loop';
        case types_1.WasiErrno.EMFILE: return 'No file descriptors available';
        case types_1.WasiErrno.EMLINK: return 'Too many links';
        case types_1.WasiErrno.EMSGSIZE: return 'Message too large';
        case types_1.WasiErrno.EMULTIHOP: return 'Multihop attempted';
        case types_1.WasiErrno.ENAMETOOLONG: return 'Filename too long';
        case types_1.WasiErrno.ENETDOWN: return 'Network is down';
        case types_1.WasiErrno.ENETRESET: return 'Connection reset by network';
        case types_1.WasiErrno.ENETUNREACH: return 'Network unreachable';
        case types_1.WasiErrno.ENFILE: return 'Too many files open in system';
        case types_1.WasiErrno.ENOBUFS: return 'No buffer space available';
        case types_1.WasiErrno.ENODEV: return 'No such device';
        case types_1.WasiErrno.ENOENT: return 'No such file or directory';
        case types_1.WasiErrno.ENOEXEC: return 'Exec format error';
        case types_1.WasiErrno.ENOLCK: return 'No locks available';
        case types_1.WasiErrno.ENOLINK: return 'Link has been severed';
        case types_1.WasiErrno.ENOMEM: return 'Out of memory';
        case types_1.WasiErrno.ENOMSG: return 'No message of the desired type';
        case types_1.WasiErrno.ENOPROTOOPT: return 'Protocol not available';
        case types_1.WasiErrno.ENOSPC: return 'No space left on device';
        case types_1.WasiErrno.ENOSYS: return 'Function not implemented';
        case types_1.WasiErrno.ENOTCONN: return 'Socket not connected';
        case types_1.WasiErrno.ENOTDIR: return 'Not a directory';
        case types_1.WasiErrno.ENOTEMPTY: return 'Directory not empty';
        case types_1.WasiErrno.ENOTRECOVERABLE: return 'State not recoverable';
        case types_1.WasiErrno.ENOTSOCK: return 'Not a socket';
        case types_1.WasiErrno.ENOTSUP: return 'Not supported';
        case types_1.WasiErrno.ENOTTY: return 'Not a tty';
        case types_1.WasiErrno.ENXIO: return 'No such device or address';
        case types_1.WasiErrno.EOVERFLOW: return 'Value too large for data type';
        case types_1.WasiErrno.EOWNERDEAD: return 'Previous owner died';
        case types_1.WasiErrno.EPERM: return 'Operation not permitted';
        case types_1.WasiErrno.EPIPE: return 'Broken pipe';
        case types_1.WasiErrno.EPROTO: return 'Protocol error';
        case types_1.WasiErrno.EPROTONOSUPPORT: return 'Protocol not supported';
        case types_1.WasiErrno.EPROTOTYPE: return 'Protocol wrong type for socket';
        case types_1.WasiErrno.ERANGE: return 'Result not representable';
        case types_1.WasiErrno.EROFS: return 'Read-only file system';
        case types_1.WasiErrno.ESPIPE: return 'Invalid seek';
        case types_1.WasiErrno.ESRCH: return 'No such process';
        case types_1.WasiErrno.ESTALE: return 'Stale file handle';
        case types_1.WasiErrno.ETIMEDOUT: return 'Operation timed out';
        case types_1.WasiErrno.ETXTBSY: return 'Text file busy';
        case types_1.WasiErrno.EXDEV: return 'Cross-device link';
        case types_1.WasiErrno.ENOTCAPABLE: return 'Capabilities insufficient';
        default: return 'Unknown error';
    }
}
exports.strerror = strerror;
class WasiError extends Error {
    constructor(message, errno) {
        super(message);
        this.errno = errno;
    }
    getErrorMessage() {
        return strerror(this.errno);
    }
}
exports.WasiError = WasiError;
Object.defineProperty(WasiError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'WasiError'
});
//# sourceMappingURL=error.js.map