import { WasiErrno } from "./types.mjs";
export function strerror(errno) {
    switch (errno) {
        case WasiErrno.ESUCCESS: return 'Success';
        case WasiErrno.E2BIG: return 'Argument list too long';
        case WasiErrno.EACCES: return 'Permission denied';
        case WasiErrno.EADDRINUSE: return 'Address in use';
        case WasiErrno.EADDRNOTAVAIL: return 'Address not available';
        case WasiErrno.EAFNOSUPPORT: return 'Address family not supported by protocol';
        case WasiErrno.EAGAIN: return 'Resource temporarily unavailable';
        case WasiErrno.EALREADY: return 'Operation already in progress';
        case WasiErrno.EBADF: return 'Bad file descriptor';
        case WasiErrno.EBADMSG: return 'Bad message';
        case WasiErrno.EBUSY: return 'Resource busy';
        case WasiErrno.ECANCELED: return 'Operation canceled';
        case WasiErrno.ECHILD: return 'No child process';
        case WasiErrno.ECONNABORTED: return 'Connection aborted';
        case WasiErrno.ECONNREFUSED: return 'Connection refused';
        case WasiErrno.ECONNRESET: return 'Connection reset by peer';
        case WasiErrno.EDEADLK: return 'Resource deadlock would occur';
        case WasiErrno.EDESTADDRREQ: return 'Destination address required';
        case WasiErrno.EDOM: return 'Domain error';
        case WasiErrno.EDQUOT: return 'Quota exceeded';
        case WasiErrno.EEXIST: return 'File exists';
        case WasiErrno.EFAULT: return 'Bad address';
        case WasiErrno.EFBIG: return 'File too large';
        case WasiErrno.EHOSTUNREACH: return 'Host is unreachable';
        case WasiErrno.EIDRM: return 'Identifier removed';
        case WasiErrno.EILSEQ: return 'Illegal byte sequence';
        case WasiErrno.EINPROGRESS: return 'Operation in progress';
        case WasiErrno.EINTR: return 'Interrupted system call';
        case WasiErrno.EINVAL: return 'Invalid argument';
        case WasiErrno.EIO: return 'I/O error';
        case WasiErrno.EISCONN: return 'Socket is connected';
        case WasiErrno.EISDIR: return 'Is a directory';
        case WasiErrno.ELOOP: return 'Symbolic link loop';
        case WasiErrno.EMFILE: return 'No file descriptors available';
        case WasiErrno.EMLINK: return 'Too many links';
        case WasiErrno.EMSGSIZE: return 'Message too large';
        case WasiErrno.EMULTIHOP: return 'Multihop attempted';
        case WasiErrno.ENAMETOOLONG: return 'Filename too long';
        case WasiErrno.ENETDOWN: return 'Network is down';
        case WasiErrno.ENETRESET: return 'Connection reset by network';
        case WasiErrno.ENETUNREACH: return 'Network unreachable';
        case WasiErrno.ENFILE: return 'Too many files open in system';
        case WasiErrno.ENOBUFS: return 'No buffer space available';
        case WasiErrno.ENODEV: return 'No such device';
        case WasiErrno.ENOENT: return 'No such file or directory';
        case WasiErrno.ENOEXEC: return 'Exec format error';
        case WasiErrno.ENOLCK: return 'No locks available';
        case WasiErrno.ENOLINK: return 'Link has been severed';
        case WasiErrno.ENOMEM: return 'Out of memory';
        case WasiErrno.ENOMSG: return 'No message of the desired type';
        case WasiErrno.ENOPROTOOPT: return 'Protocol not available';
        case WasiErrno.ENOSPC: return 'No space left on device';
        case WasiErrno.ENOSYS: return 'Function not implemented';
        case WasiErrno.ENOTCONN: return 'Socket not connected';
        case WasiErrno.ENOTDIR: return 'Not a directory';
        case WasiErrno.ENOTEMPTY: return 'Directory not empty';
        case WasiErrno.ENOTRECOVERABLE: return 'State not recoverable';
        case WasiErrno.ENOTSOCK: return 'Not a socket';
        case WasiErrno.ENOTSUP: return 'Not supported';
        case WasiErrno.ENOTTY: return 'Not a tty';
        case WasiErrno.ENXIO: return 'No such device or address';
        case WasiErrno.EOVERFLOW: return 'Value too large for data type';
        case WasiErrno.EOWNERDEAD: return 'Previous owner died';
        case WasiErrno.EPERM: return 'Operation not permitted';
        case WasiErrno.EPIPE: return 'Broken pipe';
        case WasiErrno.EPROTO: return 'Protocol error';
        case WasiErrno.EPROTONOSUPPORT: return 'Protocol not supported';
        case WasiErrno.EPROTOTYPE: return 'Protocol wrong type for socket';
        case WasiErrno.ERANGE: return 'Result not representable';
        case WasiErrno.EROFS: return 'Read-only file system';
        case WasiErrno.ESPIPE: return 'Invalid seek';
        case WasiErrno.ESRCH: return 'No such process';
        case WasiErrno.ESTALE: return 'Stale file handle';
        case WasiErrno.ETIMEDOUT: return 'Operation timed out';
        case WasiErrno.ETXTBSY: return 'Text file busy';
        case WasiErrno.EXDEV: return 'Cross-device link';
        case WasiErrno.ENOTCAPABLE: return 'Capabilities insufficient';
        default: return 'Unknown error';
    }
}
export class WasiError extends Error {
    constructor(message, errno) {
        super(message);
        this.errno = errno;
    }
    getErrorMessage() {
        return strerror(this.errno);
    }
}
Object.defineProperty(WasiError.prototype, 'name', {
    configurable: true,
    writable: true,
    value: 'WasiError'
});
