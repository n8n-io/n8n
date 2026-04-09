/**
 * Standard libc error codes. More will be added to this enum and error strings as they are
 * needed.
 * @category Internals
 * @see https://en.wikipedia.org/wiki/Errno.h
 */
export declare enum Errno {
    /** Operation not permitted */
    EPERM = 1,
    /** No such file or directory */
    ENOENT = 2,
    /** Interrupted system call */
    EINTR = 4,
    /** Input/output error */
    EIO = 5,
    /** No such device or address */
    ENXIO = 6,
    /** Bad file descriptor */
    EBADF = 9,
    /** Resource temporarily unavailable */
    EAGAIN = 11,
    /** Cannot allocate memory */
    ENOMEM = 12,
    /** Permission denied */
    EACCES = 13,
    /** Bad address */
    EFAULT = 14,
    /** Block device required */
    ENOTBLK = 15,
    /** Resource busy or locked */
    EBUSY = 16,
    /** File exists */
    EEXIST = 17,
    /** Invalid cross-device link */
    EXDEV = 18,
    /** No such device */
    ENODEV = 19,
    /** File is not a directory */
    ENOTDIR = 20,
    /** File is a directory */
    EISDIR = 21,
    /** Invalid argument */
    EINVAL = 22,
    /** Too many open files in system */
    ENFILE = 23,
    /** Too many open files */
    EMFILE = 24,
    /** Text file busy */
    ETXTBSY = 26,
    /** File is too big */
    EFBIG = 27,
    /** No space left on disk */
    ENOSPC = 28,
    /** Illegal seek */
    ESPIPE = 29,
    /** Cannot modify a read-only file system */
    EROFS = 30,
    /** Too many links */
    EMLINK = 31,
    /** Broken pipe */
    EPIPE = 32,
    /** Numerical argument out of domain */
    EDOM = 33,
    /** Numerical result out of range */
    ERANGE = 34,
    /** Resource deadlock would occur */
    EDEADLK = 35,
    /** File name too long */
    ENAMETOOLONG = 36,
    /** No locks available */
    ENOLCK = 37,
    /** Function not implemented */
    ENOSYS = 38,
    /** Directory is not empty */
    ENOTEMPTY = 39,
    /** Too many levels of symbolic links */
    ELOOP = 40,
    /** No message of desired type */
    ENOMSG = 42,
    /** Invalid exchange */
    EBADE = 52,
    /** Invalid request descriptor */
    EBADR = 53,
    /** Exchange full */
    EXFULL = 54,
    /** No anode */
    ENOANO = 55,
    /** Invalid request code */
    EBADRQC = 56,
    /** Device not a stream */
    ENOSTR = 60,
    /** No data available */
    ENODATA = 61,
    /** Timer expired */
    ETIME = 62,
    /** Out of streams resources */
    ENOSR = 63,
    /** Machine is not on the network */
    ENONET = 64,
    /** Object is remote */
    EREMOTE = 66,
    /** Link has been severed */
    ENOLINK = 67,
    /** Communication error on send */
    ECOMM = 70,
    /** Protocol error */
    EPROTO = 71,
    /** Bad message */
    EBADMSG = 74,
    /** Value too large for defined data type */
    EOVERFLOW = 75,
    /** File descriptor in bad state */
    EBADFD = 77,
    /** Streams pipe error */
    ESTRPIPE = 86,
    /** Socket operation on non-socket */
    ENOTSOCK = 88,
    /** Destination address required */
    EDESTADDRREQ = 89,
    /** Message too long */
    EMSGSIZE = 90,
    /** Protocol wrong type for socket */
    EPROTOTYPE = 91,
    /** Protocol not available */
    ENOPROTOOPT = 92,
    /** Protocol not supported */
    EPROTONOSUPPORT = 93,
    /** Socket type not supported */
    ESOCKTNOSUPPORT = 94,
    /** Operation is not supported */
    ENOTSUP = 95,
    /** Network is down */
    ENETDOWN = 100,
    /** Network is unreachable */
    ENETUNREACH = 101,
    /** Network dropped connection on reset */
    ENETRESET = 102,
    /** Connection timed out */
    ETIMEDOUT = 110,
    /** Connection refused */
    ECONNREFUSED = 111,
    /** Host is down */
    EHOSTDOWN = 112,
    /** No route to host */
    EHOSTUNREACH = 113,
    /** Operation already in progress */
    EALREADY = 114,
    /** Operation now in progress */
    EINPROGRESS = 115,
    /** Stale file handle */
    ESTALE = 116,
    /** Remote I/O error */
    EREMOTEIO = 121,
    /** Disk quota exceeded */
    EDQUOT = 122
}
/**
 * Strings associated with each error code.
 * @category Internals
 * @internal
 */
export declare const errorMessages: {
    [K in Errno]: string;
};
/**
 * @category Internals
 */
export interface ErrnoErrorJSON {
    errno: Errno;
    message: string;
    path?: string;
    code: keyof typeof Errno;
    stack: string;
    syscall: string;
}
/**
 * An error with additional information about what happened
 * @category Internals
 */
export declare class ErrnoError extends Error implements NodeJS.ErrnoException {
    /**
     * The kind of error
     */
    errno: Errno;
    /**
     * A descriptive error message
     */
    message: string;
    path?: string | undefined;
    syscall: string;
    static fromJSON(json: ErrnoErrorJSON): ErrnoError;
    static With(code: keyof typeof Errno, path?: string, syscall?: string): ErrnoError;
    code: keyof typeof Errno;
    stack: string;
    constructor(
    /**
     * The kind of error
     */
    errno: Errno, 
    /**
     * A descriptive error message
     */
    message?: string, path?: string | undefined, syscall?: string);
    /**
     * @returns A friendly error message.
     */
    toString(): string;
    toJSON(): ErrnoErrorJSON;
    /**
     * The size of the API error in buffer-form in bytes.
     */
    bufferSize(): number;
}
