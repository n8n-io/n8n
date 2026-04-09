import { _WebAssembly } from "../webassembly.mjs";
import { resolve } from "./path.mjs";
import { WasiErrno, WasiRights, FileControlFlag, WasiFileControlFlag, WasiFdFlag, WasiFileType, WasiClockid, WasiFstFlag, WasiEventType, WasiSubclockflags } from "./types.mjs";
import { concatBuffer, toFileStat, AsyncTable, SyncTable } from "./fd.mjs";
import { WasiError } from "./error.mjs";
import { isPromiseLike, sleepBreakIf, unsharedSlice } from "./util.mjs";
import { getRights } from "./rights.mjs";
import { extendMemory } from "../memory.mjs";
import { wrapAsyncImport } from "../jspi.mjs";
function copyMemory(targets, src) {
    if (targets.length === 0 || src.length === 0)
        return 0;
    let copied = 0;
    let left = src.length - copied;
    for (let i = 0; i < targets.length; ++i) {
        const target = targets[i];
        if (left < target.length) {
            target.set(src.subarray(copied, copied + left), 0);
            copied += left;
            left = 0;
            return copied;
        }
        target.set(src.subarray(copied, copied + target.length), 0);
        copied += target.length;
        left -= target.length;
    }
    return copied;
}
const _memory = new WeakMap();
const _wasi = new WeakMap();
const _fs = new WeakMap();
function getMemory(wasi) {
    return _memory.get(wasi);
}
function getFs(wasi) {
    const fs = _fs.get(wasi);
    if (!fs)
        throw new Error('filesystem is unavailable');
    return fs;
}
function handleError(err) {
    if (err instanceof WasiError) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(err);
        }
        return err.errno;
    }
    switch (err.code) {
        case 'ENOENT': return WasiErrno.ENOENT;
        case 'EBADF': return WasiErrno.EBADF;
        case 'EINVAL': return WasiErrno.EINVAL;
        case 'EPERM': return WasiErrno.EPERM;
        case 'EPROTO': return WasiErrno.EPROTO;
        case 'EEXIST': return WasiErrno.EEXIST;
        case 'ENOTDIR': return WasiErrno.ENOTDIR;
        case 'EMFILE': return WasiErrno.EMFILE;
        case 'EACCES': return WasiErrno.EACCES;
        case 'EISDIR': return WasiErrno.EISDIR;
        case 'ENOTEMPTY': return WasiErrno.ENOTEMPTY;
        case 'ENOSYS': return WasiErrno.ENOSYS;
    }
    throw err;
}
function defineName(name, f) {
    Object.defineProperty(f, 'name', { value: name });
    return f;
}
function tryCall(f, wasi, args) {
    let r;
    try {
        r = f.apply(wasi, args);
    }
    catch (err) {
        return handleError(err);
    }
    if (isPromiseLike(r)) {
        return r.then(_ => _, handleError);
    }
    return r;
}
function syscallWrap(self, name, f) {
    let debug = false;
    const NODE_DEBUG_NATIVE = (() => {
        try {
            return process.env.NODE_DEBUG_NATIVE;
        }
        catch (_) {
            return undefined;
        }
    })();
    if (typeof NODE_DEBUG_NATIVE === 'string' && NODE_DEBUG_NATIVE.split(',').includes('wasi')) {
        debug = true;
    }
    return debug
        ? defineName(name, function () {
            const args = Array.prototype.slice.call(arguments);
            let debugArgs = [`${name}(${Array.from({ length: arguments.length }).map(() => '%d').join(', ')})`];
            debugArgs = debugArgs.concat(args);
            console.debug.apply(console, debugArgs);
            return tryCall(f, self, args);
        })
        : defineName(name, function () {
            return tryCall(f, self, arguments);
        });
}
function resolvePathSync(fs, fileDescriptor, path, flags) {
    let resolvedPath = resolve(fileDescriptor.realPath, path);
    if ((flags & 1) === 1) {
        try {
            resolvedPath = fs.readlinkSync(resolvedPath);
        }
        catch (err) {
            if (err.code !== 'EINVAL' && err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
    return resolvedPath;
}
async function resolvePathAsync(fs, fileDescriptor, path, flags) {
    let resolvedPath = resolve(fileDescriptor.realPath, path);
    if ((flags & 1) === 1) {
        try {
            resolvedPath = await fs.promises.readlink(resolvedPath);
        }
        catch (err) {
            if (err.code !== 'EINVAL' && err.code !== 'ENOENT') {
                throw err;
            }
        }
    }
    return resolvedPath;
}
// eslint-disable-next-line spaced-comment
const encoder = /*#__PURE__*/ new TextEncoder();
// eslint-disable-next-line spaced-comment
const decoder = /*#__PURE__*/ new TextDecoder();
const INT64_MAX = (BigInt(1) << BigInt(63)) - BigInt(1);
function readStdin() {
    const value = window.prompt();
    if (value === null)
        return new Uint8Array();
    const buffer = new TextEncoder().encode(value + '\n');
    return buffer;
}
function validateFstFlagsOrReturn(flags) {
    return (Boolean((flags) & ~(WasiFstFlag.SET_ATIM | WasiFstFlag.SET_ATIM_NOW |
        WasiFstFlag.SET_MTIM | WasiFstFlag.SET_MTIM_NOW)) ||
        ((flags) & (WasiFstFlag.SET_ATIM | WasiFstFlag.SET_ATIM_NOW)) ===
            (WasiFstFlag.SET_ATIM | WasiFstFlag.SET_ATIM_NOW) ||
        ((flags) & (WasiFstFlag.SET_MTIM | WasiFstFlag.SET_MTIM_NOW)) ===
            (WasiFstFlag.SET_MTIM | WasiFstFlag.SET_MTIM_NOW));
}
export class WASI {
    constructor(args, env, fds, asyncFs, fs, asyncify) {
        this.args_get = syscallWrap(this, 'args_get', function (argv, argv_buf) {
            argv = Number(argv);
            argv_buf = Number(argv_buf);
            if (argv === 0 || argv_buf === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const args = wasi.args;
            for (let i = 0; i < args.length; ++i) {
                const arg = args[i];
                view.setInt32(argv, argv_buf, true);
                argv += 4;
                const data = encoder.encode(arg + '\0');
                HEAPU8.set(data, argv_buf);
                argv_buf += data.length;
            }
            return WasiErrno.ESUCCESS;
        });
        this.args_sizes_get = syscallWrap(this, 'args_sizes_get', function (argc, argv_buf_size) {
            argc = Number(argc);
            argv_buf_size = Number(argv_buf_size);
            if (argc === 0 || argv_buf_size === 0) {
                return WasiErrno.EINVAL;
            }
            const { view } = getMemory(this);
            const wasi = _wasi.get(this);
            const args = wasi.args;
            view.setUint32(argc, args.length, true);
            view.setUint32(argv_buf_size, encoder.encode(args.join('\0') + '\0').length, true);
            return WasiErrno.ESUCCESS;
        });
        this.environ_get = syscallWrap(this, 'environ_get', function (environ, environ_buf) {
            environ = Number(environ);
            environ_buf = Number(environ_buf);
            if (environ === 0 || environ_buf === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const env = wasi.env;
            for (let i = 0; i < env.length; ++i) {
                const pair = env[i];
                view.setInt32(environ, environ_buf, true);
                environ += 4;
                const data = encoder.encode(pair + '\0');
                HEAPU8.set(data, environ_buf);
                environ_buf += data.length;
            }
            return WasiErrno.ESUCCESS;
        });
        this.environ_sizes_get = syscallWrap(this, 'environ_sizes_get', function (len, buflen) {
            len = Number(len);
            buflen = Number(buflen);
            if (len === 0 || buflen === 0) {
                return WasiErrno.EINVAL;
            }
            const { view } = getMemory(this);
            const wasi = _wasi.get(this);
            view.setUint32(len, wasi.env.length, true);
            view.setUint32(buflen, encoder.encode(wasi.env.join('\0') + '\0').length, true);
            return WasiErrno.ESUCCESS;
        });
        this.clock_res_get = syscallWrap(this, 'clock_res_get', function (id, resolution) {
            resolution = Number(resolution);
            if (resolution === 0) {
                return WasiErrno.EINVAL;
            }
            const { view } = getMemory(this);
            switch (id) {
                case WasiClockid.REALTIME:
                    view.setBigUint64(resolution, BigInt(1000000), true);
                    return WasiErrno.ESUCCESS;
                case WasiClockid.MONOTONIC:
                case WasiClockid.PROCESS_CPUTIME_ID:
                case WasiClockid.THREAD_CPUTIME_ID:
                    view.setBigUint64(resolution, BigInt(1000), true);
                    return WasiErrno.ESUCCESS;
                default: return WasiErrno.EINVAL;
            }
        });
        this.clock_time_get = syscallWrap(this, 'clock_time_get', function (id, _percision, time) {
            time = Number(time);
            if (time === 0) {
                return WasiErrno.EINVAL;
            }
            const { view } = getMemory(this);
            switch (id) {
                case WasiClockid.REALTIME:
                    view.setBigUint64(time, BigInt(Date.now()) * BigInt(1000000), true);
                    return WasiErrno.ESUCCESS;
                case WasiClockid.MONOTONIC:
                case WasiClockid.PROCESS_CPUTIME_ID:
                case WasiClockid.THREAD_CPUTIME_ID: {
                    const t = performance.now() / 1000;
                    const s = Math.trunc(t);
                    const ms = Math.floor((t - s) * 1000);
                    const result = BigInt(s) * BigInt(1000000000) + BigInt(ms) * BigInt(1000000);
                    view.setBigUint64(time, result, true);
                    return WasiErrno.ESUCCESS;
                }
                default: return WasiErrno.EINVAL;
            }
        });
        this.fd_advise = syscallWrap(this, 'fd_advise', function (_fd, _offset, _len, _advice) {
            return WasiErrno.ENOSYS;
        });
        this.fd_fdstat_get = syscallWrap(this, 'fd_fdstat_get', function (fd, fdstat) {
            fdstat = Number(fdstat);
            if (fdstat === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            const { view } = getMemory(this);
            view.setUint16(fdstat, fileDescriptor.type, true);
            view.setUint16(fdstat + 2, 0, true);
            view.setBigUint64(fdstat + 8, fileDescriptor.rightsBase, true);
            view.setBigUint64(fdstat + 16, fileDescriptor.rightsInheriting, true);
            return WasiErrno.ESUCCESS;
        });
        this.fd_fdstat_set_flags = syscallWrap(this, 'fd_fdstat_set_flags', function (_fd, _flags) {
            return WasiErrno.ENOSYS;
        });
        this.fd_fdstat_set_rights = syscallWrap(this, 'fd_fdstat_set_rights', function (fd, rightsBase, rightsInheriting) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            if ((rightsBase | fileDescriptor.rightsBase) > fileDescriptor.rightsBase) {
                return WasiErrno.ENOTCAPABLE;
            }
            if ((rightsInheriting | fileDescriptor.rightsInheriting) >
                fileDescriptor.rightsInheriting) {
                return WasiErrno.ENOTCAPABLE;
            }
            fileDescriptor.rightsBase = rightsBase;
            fileDescriptor.rightsInheriting = rightsInheriting;
            return WasiErrno.ESUCCESS;
        });
        this.fd_prestat_get = syscallWrap(this, 'fd_prestat_get', function (fd, prestat) {
            prestat = Number(prestat);
            if (prestat === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            let fileDescriptor;
            try {
                fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            }
            catch (err) {
                if (err instanceof WasiError)
                    return err.errno;
                throw err;
            }
            if (fileDescriptor.preopen !== 1)
                return WasiErrno.EINVAL;
            const { view } = getMemory(this);
            // preopen type is dir(0)
            view.setUint32(prestat, 0, true);
            view.setUint32(prestat + 4, encoder.encode(fileDescriptor.path).length, true);
            return WasiErrno.ESUCCESS;
        });
        this.fd_prestat_dir_name = syscallWrap(this, 'fd_prestat_dir_name', function (fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            if (fileDescriptor.preopen !== 1)
                return WasiErrno.EBADF;
            const buffer = encoder.encode(fileDescriptor.path);
            const size = buffer.length;
            if (size > path_len)
                return WasiErrno.ENOBUFS;
            const { HEAPU8 } = getMemory(this);
            HEAPU8.set(buffer, path);
            return WasiErrno.ESUCCESS;
        });
        this.fd_seek = syscallWrap(this, 'fd_seek', function (fd, offset, whence, newOffset) {
            newOffset = Number(newOffset);
            if (newOffset === 0) {
                return WasiErrno.EINVAL;
            }
            if (fd === 0 || fd === 1 || fd === 2)
                return WasiErrno.ESUCCESS;
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SEEK, BigInt(0));
            const r = fileDescriptor.seek(offset, whence);
            const { view } = getMemory(this);
            view.setBigUint64(newOffset, r, true);
            return WasiErrno.ESUCCESS;
        });
        this.fd_tell = syscallWrap(this, 'fd_tell', function (fd, offset) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_TELL, BigInt(0));
            const pos = BigInt(fileDescriptor.pos);
            const { view } = getMemory(this);
            view.setBigUint64(Number(offset), pos, true);
            return WasiErrno.ESUCCESS;
        });
        this.poll_oneoff = syscallWrap(this, 'poll_oneoff', function (in_ptr, out_ptr, nsubscriptions, nevents) {
            in_ptr = Number(in_ptr);
            out_ptr = Number(out_ptr);
            nevents = Number(nevents);
            nsubscriptions = Number(nsubscriptions);
            nsubscriptions = nsubscriptions >>> 0;
            if (in_ptr === 0 || out_ptr === 0 || nsubscriptions === 0 || nevents === 0) {
                return WasiErrno.EINVAL;
            }
            const { view } = getMemory(this);
            view.setUint32(nevents, 0, true);
            let i = 0;
            let timer_userdata = BigInt(0);
            let cur_timeout = BigInt(0);
            let has_timeout = 0;
            let min_timeout = BigInt(0);
            let sub;
            const subscriptions = Array(nsubscriptions);
            for (i = 0; i < nsubscriptions; i++) {
                sub = in_ptr + i * 48;
                const userdata = view.getBigUint64(sub, true);
                const type = view.getUint8(sub + 8);
                const clockIdOrFd = view.getUint32(sub + 16, true);
                const timeout = view.getBigUint64(sub + 24, true);
                const precision = view.getBigUint64(sub + 32, true);
                const flags = view.getUint16(sub + 40, true);
                subscriptions[i] = {
                    userdata,
                    type,
                    u: {
                        clock: {
                            clock_id: clockIdOrFd,
                            timeout,
                            precision,
                            flags
                        },
                        fd_readwrite: {
                            fd: clockIdOrFd
                        }
                    }
                };
            }
            const fdevents = [];
            for (i = 0; i < nsubscriptions; i++) {
                sub = subscriptions[i];
                switch (sub.type) {
                    case WasiEventType.CLOCK: {
                        if (sub.u.clock.flags === WasiSubclockflags.ABSTIME) {
                            /* Convert absolute time to relative delay. */
                            const now = BigInt(Date.now()) * BigInt(1000000);
                            cur_timeout = sub.u.clock.timeout - now;
                        }
                        else {
                            cur_timeout = sub.u.clock.timeout;
                        }
                        if (has_timeout === 0 || cur_timeout < min_timeout) {
                            min_timeout = cur_timeout;
                            timer_userdata = sub.userdata;
                            has_timeout = 1;
                        }
                        break;
                    }
                    case WasiEventType.FD_READ:
                    case WasiEventType.FD_WRITE:
                        fdevents.push(sub);
                        break;
                    default: return WasiErrno.EINVAL;
                }
            }
            if (fdevents.length > 0) {
                for (i = 0; i < fdevents.length; i++) {
                    const fdevent = fdevents[i];
                    const event = out_ptr + 32 * i;
                    view.setBigUint64(event, fdevent.userdata, true);
                    view.setUint32(event + 8, WasiErrno.ENOSYS, true);
                    view.setUint32(event + 12, fdevent.type, true);
                    view.setBigUint64(event + 16, BigInt(0), true);
                    view.setUint16(event + 24, 0, true);
                    view.setUint32(nevents, 1, true);
                }
                view.setUint32(nevents, fdevents.length, true);
                return WasiErrno.ESUCCESS;
            }
            if (has_timeout) {
                const delay = Number(min_timeout / BigInt(1000000));
                // if (isMainThread || typeof SharedArrayBuffer !== 'function') {
                sleepBreakIf(delay, () => false);
                // } else {
                //   const buf = new SharedArrayBuffer(4)
                //   const arr = new Int32Array(buf)
                //   postMsg({
                //     __tybys_wasm_util_wasi__: {
                //       type: 'set-timeout',
                //       payload: {
                //         buffer: buf,
                //         delay
                //       }
                //     }
                //   })
                //   Atomics.wait(arr, 0, 0)
                // }
                const event = out_ptr;
                view.setBigUint64(event, timer_userdata, true);
                view.setUint32(event + 8, WasiErrno.ESUCCESS, true);
                view.setUint32(event + 12, WasiEventType.CLOCK, true);
                view.setUint32(nevents, 1, true);
            }
            return WasiErrno.ESUCCESS;
        });
        this.proc_exit = syscallWrap(this, 'proc_exit', function (rval) {
            if ((typeof process === 'object') && (process !== null) && (typeof process.exit === 'function')) {
                process.exit(rval);
            }
            return WasiErrno.ESUCCESS;
        });
        this.proc_raise = syscallWrap(this, 'proc_raise', function (_sig) {
            return WasiErrno.ENOSYS;
        });
        this.sched_yield = syscallWrap(this, 'sched_yield', function () {
            return WasiErrno.ESUCCESS;
        });
        this.random_get = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
            ? syscallWrap(this, 'random_get', function (buf, buf_len) {
                buf = Number(buf);
                if (buf === 0) {
                    return WasiErrno.EINVAL;
                }
                buf_len = Number(buf_len);
                const { HEAPU8, view } = getMemory(this);
                if ((typeof SharedArrayBuffer === 'function' && HEAPU8.buffer instanceof SharedArrayBuffer) ||
                    (Object.prototype.toString.call(HEAPU8.buffer) === '[object SharedArrayBuffer]')) {
                    for (let i = buf; i < buf + buf_len; ++i) {
                        view.setUint8(i, Math.floor(Math.random() * 256));
                    }
                    return WasiErrno.ESUCCESS;
                }
                let pos;
                const stride = 65536;
                for (pos = 0; pos + stride < buf_len; pos += stride) {
                    crypto.getRandomValues(HEAPU8.subarray(buf + pos, buf + pos + stride));
                }
                crypto.getRandomValues(HEAPU8.subarray(buf + pos, buf + buf_len));
                return WasiErrno.ESUCCESS;
            })
            : syscallWrap(this, 'random_get', function (buf, buf_len) {
                buf = Number(buf);
                if (buf === 0) {
                    return WasiErrno.EINVAL;
                }
                buf_len = Number(buf_len);
                const { view } = getMemory(this);
                for (let i = buf; i < buf + buf_len; ++i) {
                    view.setUint8(i, Math.floor(Math.random() * 256));
                }
                return WasiErrno.ESUCCESS;
            });
        this.sock_recv = syscallWrap(this, 'sock_recv', function () {
            return WasiErrno.ENOTSUP;
        });
        this.sock_send = syscallWrap(this, 'sock_send', function () {
            return WasiErrno.ENOTSUP;
        });
        this.sock_shutdown = syscallWrap(this, 'sock_shutdown', function () {
            return WasiErrno.ENOTSUP;
        });
        this.sock_accept = syscallWrap(this, 'sock_accept', function () {
            return WasiErrno.ENOTSUP;
        });
        _wasi.set(this, {
            fds,
            args,
            env
        });
        if (fs)
            _fs.set(this, fs);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        function defineImport(name, syncVersion, asyncVersion, parameterType, returnType) {
            if (asyncFs) {
                if (asyncify) {
                    _this[name] = asyncify.wrapImportFunction(syscallWrap(_this, name, asyncVersion));
                }
                else {
                    _this[name] = wrapAsyncImport(syscallWrap(_this, name, asyncVersion), parameterType, returnType);
                }
            }
            else {
                _this[name] = syscallWrap(_this, name, syncVersion);
            }
        }
        defineImport('fd_allocate', function fd_allocate(fd, offset, len) {
            const wasi = _wasi.get(this);
            const fs = getFs(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_ALLOCATE, BigInt(0));
            const stat = fs.fstatSync(fileDescriptor.fd, { bigint: true });
            if (stat.size < offset + len) {
                fs.ftruncateSync(fileDescriptor.fd, Number(offset + len));
            }
            return WasiErrno.ESUCCESS;
        }, async function fd_allocate(fd, offset, len) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_ALLOCATE, BigInt(0));
            const h = fileDescriptor.fd;
            const stat = await h.stat({ bigint: true });
            if (stat.size < offset + len) {
                await h.truncate(Number(offset + len));
            }
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i64', 'f64'], ['i32']);
        defineImport('fd_close', function fd_close(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            const fs = getFs(this);
            fs.closeSync(fileDescriptor.fd);
            wasi.fds.remove(fd);
            return WasiErrno.ESUCCESS;
        }, async function fd_close(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, BigInt(0), BigInt(0));
            await fileDescriptor.fd.close();
            wasi.fds.remove(fd);
            return WasiErrno.ESUCCESS;
        }, ['i32'], ['i32']);
        defineImport('fd_datasync', function fd_datasync(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_DATASYNC, BigInt(0));
            const fs = getFs(this);
            fs.fdatasyncSync(fileDescriptor.fd);
            return WasiErrno.ESUCCESS;
        }, async function fd_datasync(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_DATASYNC, BigInt(0));
            await fileDescriptor.fd.datasync();
            return WasiErrno.ESUCCESS;
        }, ['i32'], ['i32']);
        defineImport('fd_filestat_get', function fd_filestat_get(fd, buf) {
            buf = Number(buf);
            if (buf === 0)
                return WasiErrno.EINVAL;
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_GET, BigInt(0));
            const fs = getFs(this);
            const stat = fs.fstatSync(fileDescriptor.fd, { bigint: true });
            const { view } = getMemory(this);
            toFileStat(view, buf, stat);
            return WasiErrno.ESUCCESS;
        }, async function fd_filestat_get(fd, buf) {
            buf = Number(buf);
            if (buf === 0)
                return WasiErrno.EINVAL;
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_GET, BigInt(0));
            const h = fileDescriptor.fd;
            const stat = await h.stat({ bigint: true });
            const { view } = getMemory(this);
            toFileStat(view, buf, stat);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32'], ['i32']);
        defineImport('fd_filestat_set_size', function fd_filestat_set_size(fd, size) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_SET_SIZE, BigInt(0));
            const fs = getFs(this);
            fs.ftruncateSync(fileDescriptor.fd, Number(size));
            return WasiErrno.ESUCCESS;
        }, async function fd_filestat_set_size(fd, size) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_SET_SIZE, BigInt(0));
            const h = fileDescriptor.fd;
            await h.truncate(Number(size));
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i64'], ['i32']);
        function fdFilestatGetTimes(fd, atim, mtim, flags) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_FILESTAT_SET_TIMES, BigInt(0));
            if ((flags & WasiFstFlag.SET_ATIM_NOW) === WasiFstFlag.SET_ATIM_NOW) {
                atim = BigInt(Date.now() * 1000000);
            }
            if ((flags & WasiFstFlag.SET_MTIM_NOW) === WasiFstFlag.SET_MTIM_NOW) {
                mtim = BigInt(Date.now() * 1000000);
            }
            return { fileDescriptor, atim, mtim };
        }
        defineImport('fd_filestat_set_times', function fd_filestat_set_times(fd, atim, mtim, flags) {
            if (validateFstFlagsOrReturn(flags)) {
                return WasiErrno.EINVAL;
            }
            const { fileDescriptor, atim: atimRes, mtim: mtimRes } = fdFilestatGetTimes.call(this, fd, atim, mtim, flags);
            const fs = getFs(this);
            fs.futimesSync(fileDescriptor.fd, Number(atimRes), Number(mtimRes));
            return WasiErrno.ESUCCESS;
        }, async function fd_filestat_set_times(fd, atim, mtim, flags) {
            if (validateFstFlagsOrReturn(flags)) {
                return WasiErrno.EINVAL;
            }
            const { fileDescriptor, atim: atimRes, mtim: mtimRes } = fdFilestatGetTimes.call(this, fd, atim, mtim, flags);
            const h = fileDescriptor.fd;
            await h.utimes(Number(atimRes), Number(mtimRes));
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i64', 'i64', 'i32'], ['i32']);
        defineImport('fd_pread', function fd_pread(fd, iovs, iovslen, offset, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0 || offset > INT64_MAX) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ | WasiRights.FD_SEEK, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            let totalSize = 0;
            const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                totalSize += bufLen;
                return HEAPU8.subarray(buf, buf + bufLen);
            });
            let nread = 0;
            const buffer = (() => {
                try {
                    return new Uint8Array(new SharedArrayBuffer(totalSize));
                }
                catch (_) {
                    return new Uint8Array(totalSize);
                }
            })();
            buffer._isBuffer = true;
            const fs = getFs(this);
            const bytesRead = fs.readSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(offset));
            nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0;
            view.setUint32(size, nread, true);
            return WasiErrno.ESUCCESS;
        }, async function (fd, iovs, iovslen, offset, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0 || offset > INT64_MAX) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ | WasiRights.FD_SEEK, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            let totalSize = 0;
            const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                totalSize += bufLen;
                return HEAPU8.subarray(buf, buf + bufLen);
            });
            let nread = 0;
            const buffer = new Uint8Array(totalSize);
            buffer._isBuffer = true;
            const { bytesRead } = await fileDescriptor.fd.read(buffer, 0, buffer.length, Number(offset));
            nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0;
            view.setUint32(size, nread, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i64', 'i32'], ['i32']);
        defineImport('fd_pwrite', function fd_pwrite(fd, iovs, iovslen, offset, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0 || offset > INT64_MAX) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE | WasiRights.FD_SEEK, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                return HEAPU8.subarray(buf, buf + bufLen);
            }));
            const fs = getFs(this);
            const nwritten = fs.writeSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(offset));
            view.setUint32(size, nwritten, true);
            return WasiErrno.ESUCCESS;
        }, async function fd_pwrite(fd, iovs, iovslen, offset, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0 || offset > INT64_MAX) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE | WasiRights.FD_SEEK, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                return HEAPU8.subarray(buf, buf + bufLen);
            }));
            const { bytesWritten } = await fileDescriptor.fd.write(buffer, 0, buffer.length, Number(offset));
            view.setUint32(size, bytesWritten, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i64', 'i32'], ['i32']);
        defineImport('fd_read', function fd_read(fd, iovs, iovslen, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            let totalSize = 0;
            const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                totalSize += bufLen;
                return HEAPU8.subarray(buf, buf + bufLen);
            });
            let buffer;
            let nread = 0;
            if (fd === 0) {
                if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
                    return WasiErrno.ENOTSUP;
                }
                buffer = readStdin();
                nread = buffer ? copyMemory(ioVecs, buffer) : 0;
            }
            else {
                buffer = (() => {
                    try {
                        return new Uint8Array(new SharedArrayBuffer(totalSize));
                    }
                    catch (_) {
                        return new Uint8Array(totalSize);
                    }
                })();
                buffer._isBuffer = true;
                const fs = getFs(this);
                const bytesRead = fs.readSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos));
                nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0;
                fileDescriptor.pos += BigInt(nread);
            }
            view.setUint32(size, nread, true);
            return WasiErrno.ESUCCESS;
        }, async function fd_read(fd, iovs, iovslen, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READ, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            let totalSize = 0;
            const ioVecs = Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                totalSize += bufLen;
                return HEAPU8.subarray(buf, buf + bufLen);
            });
            let buffer;
            let nread = 0;
            if (fd === 0) {
                if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
                    return WasiErrno.ENOTSUP;
                }
                buffer = readStdin();
                nread = buffer ? copyMemory(ioVecs, buffer) : 0;
            }
            else {
                buffer = new Uint8Array(totalSize);
                buffer._isBuffer = true;
                const { bytesRead } = await fileDescriptor.fd.read(buffer, 0, buffer.length, Number(fileDescriptor.pos));
                nread = buffer ? copyMemory(ioVecs, buffer.subarray(0, bytesRead)) : 0;
                fileDescriptor.pos += BigInt(nread);
            }
            view.setUint32(size, nread, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('fd_readdir', function fd_readdir(fd, buf, buf_len, cookie, bufused) {
            buf = Number(buf);
            buf_len = Number(buf_len);
            bufused = Number(bufused);
            if (buf === 0 || bufused === 0)
                return WasiErrno.ESUCCESS;
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READDIR, BigInt(0));
            const fs = getFs(this);
            const entries = fs.readdirSync(fileDescriptor.realPath, { withFileTypes: true });
            const { HEAPU8, view } = getMemory(this);
            let bufferUsed = 0;
            for (let i = Number(cookie); i < entries.length; i++) {
                const nameData = encoder.encode(entries[i].name);
                const entryInfo = fs.statSync(resolve(fileDescriptor.realPath, entries[i].name), { bigint: true });
                const entryData = new Uint8Array(24 + nameData.byteLength);
                const entryView = new DataView(entryData.buffer);
                entryView.setBigUint64(0, BigInt(i + 1), true);
                entryView.setBigUint64(8, BigInt(entryInfo.ino ? entryInfo.ino : 0), true);
                entryView.setUint32(16, nameData.byteLength, true);
                let type;
                if (entries[i].isFile()) {
                    type = WasiFileType.REGULAR_FILE;
                }
                else if (entries[i].isDirectory()) {
                    type = WasiFileType.DIRECTORY;
                }
                else if (entries[i].isSymbolicLink()) {
                    type = WasiFileType.SYMBOLIC_LINK;
                }
                else if (entries[i].isCharacterDevice()) {
                    type = WasiFileType.CHARACTER_DEVICE;
                }
                else if (entries[i].isBlockDevice()) {
                    type = WasiFileType.BLOCK_DEVICE;
                }
                else if (entries[i].isSocket()) {
                    type = WasiFileType.SOCKET_STREAM;
                }
                else {
                    type = WasiFileType.UNKNOWN;
                }
                entryView.setUint8(20, type);
                entryData.set(nameData, 24);
                const data = entryData.slice(0, Math.min(entryData.length, buf_len - bufferUsed));
                HEAPU8.set(data, buf + bufferUsed);
                bufferUsed += data.byteLength;
            }
            view.setUint32(bufused, bufferUsed, true);
            return WasiErrno.ESUCCESS;
        }, async function fd_readdir(fd, buf, buf_len, cookie, bufused) {
            buf = Number(buf);
            buf_len = Number(buf_len);
            bufused = Number(bufused);
            if (buf === 0 || bufused === 0)
                return WasiErrno.ESUCCESS;
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_READDIR, BigInt(0));
            const fs = getFs(this);
            const entries = await fs.promises.readdir(fileDescriptor.realPath, { withFileTypes: true });
            const { HEAPU8, view } = getMemory(this);
            let bufferUsed = 0;
            for (let i = Number(cookie); i < entries.length; i++) {
                const nameData = encoder.encode(entries[i].name);
                const entryInfo = await fs.promises.stat(resolve(fileDescriptor.realPath, entries[i].name), { bigint: true });
                const entryData = new Uint8Array(24 + nameData.byteLength);
                const entryView = new DataView(entryData.buffer);
                entryView.setBigUint64(0, BigInt(i + 1), true);
                entryView.setBigUint64(8, BigInt(entryInfo.ino ? entryInfo.ino : 0), true);
                entryView.setUint32(16, nameData.byteLength, true);
                let type;
                if (entries[i].isFile()) {
                    type = WasiFileType.REGULAR_FILE;
                }
                else if (entries[i].isDirectory()) {
                    type = WasiFileType.DIRECTORY;
                }
                else if (entries[i].isSymbolicLink()) {
                    type = WasiFileType.SYMBOLIC_LINK;
                }
                else if (entries[i].isCharacterDevice()) {
                    type = WasiFileType.CHARACTER_DEVICE;
                }
                else if (entries[i].isBlockDevice()) {
                    type = WasiFileType.BLOCK_DEVICE;
                }
                else if (entries[i].isSocket()) {
                    type = WasiFileType.SOCKET_STREAM;
                }
                else {
                    type = WasiFileType.UNKNOWN;
                }
                entryView.setUint8(20, type);
                entryData.set(nameData, 24);
                const data = entryData.slice(0, Math.min(entryData.length, buf_len - bufferUsed));
                HEAPU8.set(data, buf + bufferUsed);
                bufferUsed += data.byteLength;
            }
            view.setUint32(bufused, bufferUsed, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i64', 'i32'], ['i32']);
        defineImport('fd_renumber', function fd_renumber(from, to) {
            const wasi = _wasi.get(this);
            wasi.fds.renumber(to, from);
            return WasiErrno.ESUCCESS;
        }, async function fd_renumber(from, to) {
            const wasi = _wasi.get(this);
            await wasi.fds.renumber(to, from);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32'], ['i32']);
        defineImport('fd_sync', function fd_sync(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SYNC, BigInt(0));
            const fs = getFs(this);
            fs.fsyncSync(fileDescriptor.fd);
            return WasiErrno.ESUCCESS;
        }, async function fd_sync(fd) {
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_SYNC, BigInt(0));
            await fileDescriptor.fd.sync();
            return WasiErrno.ESUCCESS;
        }, ['i32'], ['i32']);
        defineImport('fd_write', function fd_write(fd, iovs, iovslen, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                return HEAPU8.subarray(buf, buf + bufLen);
            }));
            let nwritten;
            if (fd === 1 || fd === 2) {
                nwritten = fileDescriptor.write(buffer);
            }
            else {
                const fs = getFs(this);
                nwritten = fs.writeSync(fileDescriptor.fd, buffer, 0, buffer.length, Number(fileDescriptor.pos));
                fileDescriptor.pos += BigInt(nwritten);
            }
            view.setUint32(size, nwritten, true);
            return WasiErrno.ESUCCESS;
        }, async function fd_write(fd, iovs, iovslen, size) {
            iovs = Number(iovs);
            size = Number(size);
            if ((iovs === 0 && iovslen) || size === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.FD_WRITE, BigInt(0));
            if (!iovslen) {
                view.setUint32(size, 0, true);
                return WasiErrno.ESUCCESS;
            }
            const buffer = concatBuffer(Array.from({ length: Number(iovslen) }, (_, i) => {
                const offset = iovs + (i * 8);
                const buf = view.getInt32(offset, true);
                const bufLen = view.getUint32(offset + 4, true);
                return HEAPU8.subarray(buf, buf + bufLen);
            }));
            let nwritten;
            if (fd === 1 || fd === 2) {
                nwritten = fileDescriptor.write(buffer);
            }
            else {
                nwritten = await (await (fileDescriptor.fd.write(buffer, 0, buffer.length, Number(fileDescriptor.pos)))).bytesWritten;
                fileDescriptor.pos += BigInt(nwritten);
            }
            view.setUint32(size, nwritten, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('path_create_directory', function path_create_directory(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_CREATE_DIRECTORY, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            fs.mkdirSync(pathString);
            return WasiErrno.ESUCCESS;
        }, async function path_create_directory(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_CREATE_DIRECTORY, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            await fs.promises.mkdir(pathString);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32'], ['i32']);
        defineImport('path_filestat_get', function path_filestat_get(fd, flags, path, path_len, filestat) {
            path = Number(path);
            path_len = Number(path_len);
            filestat = Number(filestat);
            if (path === 0 || filestat === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_GET, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            const fs = getFs(this);
            pathString = resolve(fileDescriptor.realPath, pathString);
            let stat;
            if ((flags & 1) === 1) {
                stat = fs.statSync(pathString, { bigint: true });
            }
            else {
                stat = fs.lstatSync(pathString, { bigint: true });
            }
            toFileStat(view, filestat, stat);
            return WasiErrno.ESUCCESS;
        }, async function path_filestat_get(fd, flags, path, path_len, filestat) {
            path = Number(path);
            path_len = Number(path_len);
            filestat = Number(filestat);
            if (path === 0 || filestat === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_GET, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            const fs = getFs(this);
            pathString = resolve(fileDescriptor.realPath, pathString);
            let stat;
            if ((flags & 1) === 1) {
                stat = await fs.promises.stat(pathString, { bigint: true });
            }
            else {
                stat = await fs.promises.lstat(pathString, { bigint: true });
            }
            toFileStat(view, filestat, stat);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('path_filestat_set_times', function path_filestat_set_times(fd, flags, path, path_len, atim, mtim, fst_flags) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0)
                return WasiErrno.EINVAL;
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_SET_TIMES, BigInt(0));
            if (validateFstFlagsOrReturn(fst_flags)) {
                return WasiErrno.EINVAL;
            }
            const fs = getFs(this);
            const resolvedPath = resolvePathSync(fs, fileDescriptor, decoder.decode(unsharedSlice(HEAPU8, path, path + path_len)), flags);
            if ((fst_flags & WasiFstFlag.SET_ATIM_NOW) === WasiFstFlag.SET_ATIM_NOW) {
                atim = BigInt(Date.now() * 1000000);
            }
            if ((fst_flags & WasiFstFlag.SET_MTIM_NOW) === WasiFstFlag.SET_MTIM_NOW) {
                mtim = BigInt(Date.now() * 1000000);
            }
            fs.utimesSync(resolvedPath, Number(atim), Number(mtim));
            return WasiErrno.ESUCCESS;
        }, async function path_filestat_set_times(fd, flags, path, path_len, atim, mtim, fst_flags) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0)
                return WasiErrno.EINVAL;
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_FILESTAT_SET_TIMES, BigInt(0));
            if (validateFstFlagsOrReturn(fst_flags)) {
                return WasiErrno.EINVAL;
            }
            const fs = getFs(this);
            const resolvedPath = await resolvePathAsync(fs, fileDescriptor, decoder.decode(unsharedSlice(HEAPU8, path, path + path_len)), flags);
            if ((fst_flags & WasiFstFlag.SET_ATIM_NOW) === WasiFstFlag.SET_ATIM_NOW) {
                atim = BigInt(Date.now() * 1000000);
            }
            if ((fst_flags & WasiFstFlag.SET_MTIM_NOW) === WasiFstFlag.SET_MTIM_NOW) {
                mtim = BigInt(Date.now() * 1000000);
            }
            await fs.promises.utimes(resolvedPath, Number(atim), Number(mtim));
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i64', 'i64', 'i32'], ['i32']);
        defineImport('path_link', function path_link(old_fd, old_flags, old_path, old_path_len, new_fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            let oldWrap;
            let newWrap;
            if (old_fd === new_fd) {
                oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE | WasiRights.PATH_LINK_TARGET, BigInt(0));
            }
            else {
                oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE, BigInt(0));
                newWrap = wasi.fds.get(new_fd, WasiRights.PATH_LINK_TARGET, BigInt(0));
            }
            const { HEAPU8 } = getMemory(this);
            const fs = getFs(this);
            const resolvedOldPath = resolvePathSync(fs, oldWrap, decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len)), old_flags);
            const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len)));
            fs.linkSync(resolvedOldPath, resolvedNewPath);
            return WasiErrno.ESUCCESS;
        }, async function path_link(old_fd, old_flags, old_path, old_path_len, new_fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            let oldWrap;
            let newWrap;
            if (old_fd === new_fd) {
                oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE | WasiRights.PATH_LINK_TARGET, BigInt(0));
            }
            else {
                oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_LINK_SOURCE, BigInt(0));
                newWrap = wasi.fds.get(new_fd, WasiRights.PATH_LINK_TARGET, BigInt(0));
            }
            const { HEAPU8 } = getMemory(this);
            const fs = getFs(this);
            const resolvedOldPath = await resolvePathAsync(fs, oldWrap, decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len)), old_flags);
            const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len)));
            await fs.promises.link(resolvedOldPath, resolvedNewPath);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32', 'i32', 'i32'], ['i32']);
        function pathOpen(o_flags, fs_rights_base, fs_rights_inheriting, fs_flags) {
            const read = (fs_rights_base & (WasiRights.FD_READ |
                WasiRights.FD_READDIR)) !== BigInt(0);
            const write = (fs_rights_base & (WasiRights.FD_DATASYNC |
                WasiRights.FD_WRITE |
                WasiRights.FD_ALLOCATE |
                WasiRights.FD_FILESTAT_SET_SIZE)) !== BigInt(0);
            let flags = write ? read ? FileControlFlag.O_RDWR : FileControlFlag.O_WRONLY : FileControlFlag.O_RDONLY;
            let needed_base = WasiRights.PATH_OPEN;
            let needed_inheriting = fs_rights_base | fs_rights_inheriting;
            if ((o_flags & WasiFileControlFlag.O_CREAT) !== 0) {
                flags |= FileControlFlag.O_CREAT;
                needed_base |= WasiRights.PATH_CREATE_FILE;
            }
            if ((o_flags & WasiFileControlFlag.O_DIRECTORY) !== 0) {
                flags |= FileControlFlag.O_DIRECTORY;
            }
            if ((o_flags & WasiFileControlFlag.O_EXCL) !== 0) {
                flags |= FileControlFlag.O_EXCL;
            }
            if ((o_flags & WasiFileControlFlag.O_TRUNC) !== 0) {
                flags |= FileControlFlag.O_TRUNC;
                needed_base |= WasiRights.PATH_FILESTAT_SET_SIZE;
            }
            if ((fs_flags & WasiFdFlag.APPEND) !== 0) {
                flags |= FileControlFlag.O_APPEND;
            }
            if ((fs_flags & WasiFdFlag.DSYNC) !== 0) {
                // flags |= FileControlFlag.O_DSYNC;
                needed_inheriting |= WasiRights.FD_DATASYNC;
            }
            if ((fs_flags & WasiFdFlag.NONBLOCK) !== 0) {
                flags |= FileControlFlag.O_NONBLOCK;
            }
            if ((fs_flags & WasiFdFlag.RSYNC) !== 0) {
                flags |= FileControlFlag.O_SYNC;
                needed_inheriting |= WasiRights.FD_SYNC;
            }
            if ((fs_flags & WasiFdFlag.SYNC) !== 0) {
                flags |= FileControlFlag.O_SYNC;
                needed_inheriting |= WasiRights.FD_SYNC;
            }
            if (write && (flags & (FileControlFlag.O_APPEND | FileControlFlag.O_TRUNC)) === 0) {
                needed_inheriting |= WasiRights.FD_SEEK;
            }
            return { flags, needed_base, needed_inheriting };
        }
        defineImport('path_open', function path_open(dirfd, dirflags, path, path_len, o_flags, fs_rights_base, fs_rights_inheriting, fs_flags, fd) {
            path = Number(path);
            fd = Number(fd);
            if (path === 0 || fd === 0) {
                return WasiErrno.EINVAL;
            }
            path_len = Number(path_len);
            fs_rights_base = BigInt(fs_rights_base);
            fs_rights_inheriting = BigInt(fs_rights_inheriting);
            const { flags: flagsRes, needed_base: neededBase, needed_inheriting: neededInheriting } = pathOpen(o_flags, fs_rights_base, fs_rights_inheriting, fs_flags);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(dirfd, neededBase, neededInheriting);
            const memory = getMemory(this);
            const HEAPU8 = memory.HEAPU8;
            const pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            const fs = getFs(this);
            const resolved_path = resolvePathSync(fs, fileDescriptor, pathString, dirflags);
            const r = fs.openSync(resolved_path, flagsRes, 0o666);
            const filetype = wasi.fds.getFileTypeByFd(r);
            if ((filetype !== WasiFileType.DIRECTORY) &&
                ((o_flags & WasiFileControlFlag.O_DIRECTORY) !== 0 ||
                    (resolved_path.endsWith('/')))) {
                return WasiErrno.ENOTDIR;
            }
            const { base: max_base, inheriting: max_inheriting } = getRights(wasi.fds.stdio, r, flagsRes, filetype);
            const wrap = wasi.fds.insert(r, resolved_path, resolved_path, filetype, fs_rights_base & max_base, fs_rights_inheriting & max_inheriting, 0);
            const stat = fs.fstatSync(r, { bigint: true });
            if (stat.isFile()) {
                wrap.size = stat.size;
                if ((flagsRes & FileControlFlag.O_APPEND) !== 0) {
                    wrap.pos = stat.size;
                }
            }
            const view = memory.view;
            view.setInt32(fd, wrap.id, true);
            return WasiErrno.ESUCCESS;
        }, async function path_open(dirfd, dirflags, path, path_len, o_flags, fs_rights_base, fs_rights_inheriting, fs_flags, fd) {
            path = Number(path);
            fd = Number(fd);
            if (path === 0 || fd === 0) {
                return WasiErrno.EINVAL;
            }
            path_len = Number(path_len);
            fs_rights_base = BigInt(fs_rights_base);
            fs_rights_inheriting = BigInt(fs_rights_inheriting);
            const { flags: flagsRes, needed_base: neededBase, needed_inheriting: neededInheriting } = pathOpen(o_flags, fs_rights_base, fs_rights_inheriting, fs_flags);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(dirfd, neededBase, neededInheriting);
            const memory = getMemory(this);
            const HEAPU8 = memory.HEAPU8;
            const pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            const fs = getFs(this);
            const resolved_path = await resolvePathAsync(fs, fileDescriptor, pathString, dirflags);
            const r = await fs.promises.open(resolved_path, flagsRes, 0o666);
            const filetype = await wasi.fds.getFileTypeByFd(r);
            if ((o_flags & WasiFileControlFlag.O_DIRECTORY) !== 0 && filetype !== WasiFileType.DIRECTORY) {
                return WasiErrno.ENOTDIR;
            }
            const { base: max_base, inheriting: max_inheriting } = getRights(wasi.fds.stdio, r.fd, flagsRes, filetype);
            const wrap = wasi.fds.insert(r, resolved_path, resolved_path, filetype, fs_rights_base & max_base, fs_rights_inheriting & max_inheriting, 0);
            const stat = await r.stat({ bigint: true });
            if (stat.isFile()) {
                wrap.size = stat.size;
                if ((flagsRes & FileControlFlag.O_APPEND) !== 0) {
                    wrap.pos = stat.size;
                }
            }
            const view = memory.view;
            view.setInt32(fd, wrap.id, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32', 'i64', 'i64', 'i32', 'i32'], ['i32']);
        defineImport('path_readlink', function path_readlink(fd, path, path_len, buf, buf_len, bufused) {
            path = Number(path);
            path_len = Number(path_len);
            buf = Number(buf);
            buf_len = Number(buf_len);
            bufused = Number(bufused);
            if (path === 0 || buf === 0 || bufused === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_READLINK, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            const link = fs.readlinkSync(pathString);
            const linkData = encoder.encode(link);
            const len = Math.min(linkData.length, buf_len);
            if (len >= buf_len)
                return WasiErrno.ENOBUFS;
            HEAPU8.set(linkData.subarray(0, len), buf);
            HEAPU8[buf + len] = 0;
            view.setUint32(bufused, len, true);
            return WasiErrno.ESUCCESS;
        }, async function path_readlink(fd, path, path_len, buf, buf_len, bufused) {
            path = Number(path);
            path_len = Number(path_len);
            buf = Number(buf);
            buf_len = Number(buf_len);
            bufused = Number(bufused);
            if (path === 0 || buf === 0 || bufused === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8, view } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_READLINK, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            const link = await fs.promises.readlink(pathString);
            const linkData = encoder.encode(link);
            const len = Math.min(linkData.length, buf_len);
            if (len >= buf_len)
                return WasiErrno.ENOBUFS;
            HEAPU8.set(linkData.subarray(0, len), buf);
            HEAPU8[buf + len] = 0;
            view.setUint32(bufused, len, true);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('path_remove_directory', function path_remove_directory(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_REMOVE_DIRECTORY, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            fs.rmdirSync(pathString);
            return WasiErrno.ESUCCESS;
        }, async function path_remove_directory(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_REMOVE_DIRECTORY, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            await fs.promises.rmdir(pathString);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32'], ['i32']);
        defineImport('path_rename', function path_rename(old_fd, old_path, old_path_len, new_fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            let oldWrap;
            let newWrap;
            if (old_fd === new_fd) {
                oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE | WasiRights.PATH_RENAME_TARGET, BigInt(0));
            }
            else {
                oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE, BigInt(0));
                newWrap = wasi.fds.get(new_fd, WasiRights.PATH_RENAME_TARGET, BigInt(0));
            }
            const { HEAPU8 } = getMemory(this);
            const resolvedOldPath = resolve(oldWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len)));
            const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len)));
            const fs = getFs(this);
            fs.renameSync(resolvedOldPath, resolvedNewPath);
            return WasiErrno.ESUCCESS;
        }, async function path_rename(old_fd, old_path, old_path_len, new_fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const wasi = _wasi.get(this);
            let oldWrap;
            let newWrap;
            if (old_fd === new_fd) {
                oldWrap = newWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE | WasiRights.PATH_RENAME_TARGET, BigInt(0));
            }
            else {
                oldWrap = wasi.fds.get(old_fd, WasiRights.PATH_RENAME_SOURCE, BigInt(0));
                newWrap = wasi.fds.get(new_fd, WasiRights.PATH_RENAME_TARGET, BigInt(0));
            }
            const { HEAPU8 } = getMemory(this);
            const resolvedOldPath = resolve(oldWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len)));
            const resolvedNewPath = resolve(newWrap.realPath, decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len)));
            const fs = getFs(this);
            await fs.promises.rename(resolvedOldPath, resolvedNewPath);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('path_symlink', function path_symlink(old_path, old_path_len, fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_SYMLINK, BigInt(0));
            const oldPath = decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len));
            if (oldPath.length > 0 && oldPath[0] === '/') {
                return WasiErrno.EPERM;
            }
            let newPath = decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len));
            newPath = resolve(fileDescriptor.realPath, newPath);
            const fs = getFs(this);
            fs.symlinkSync(oldPath, newPath);
            return WasiErrno.ESUCCESS;
        }, async function path_symlink(old_path, old_path_len, fd, new_path, new_path_len) {
            old_path = Number(old_path);
            old_path_len = Number(old_path_len);
            new_path = Number(new_path);
            new_path_len = Number(new_path_len);
            if (old_path === 0 || new_path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_SYMLINK, BigInt(0));
            const oldPath = decoder.decode(unsharedSlice(HEAPU8, old_path, old_path + old_path_len));
            let newPath = decoder.decode(unsharedSlice(HEAPU8, new_path, new_path + new_path_len));
            newPath = resolve(fileDescriptor.realPath, newPath);
            const fs = getFs(this);
            await fs.promises.symlink(oldPath, newPath);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32', 'i32', 'i32'], ['i32']);
        defineImport('path_unlink_file', function path_unlink_file(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_UNLINK_FILE, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            fs.unlinkSync(pathString);
            return WasiErrno.ESUCCESS;
        }, async function path_unlink_file(fd, path, path_len) {
            path = Number(path);
            path_len = Number(path_len);
            if (path === 0) {
                return WasiErrno.EINVAL;
            }
            const { HEAPU8 } = getMemory(this);
            const wasi = _wasi.get(this);
            const fileDescriptor = wasi.fds.get(fd, WasiRights.PATH_UNLINK_FILE, BigInt(0));
            let pathString = decoder.decode(unsharedSlice(HEAPU8, path, path + path_len));
            pathString = resolve(fileDescriptor.realPath, pathString);
            const fs = getFs(this);
            await fs.promises.unlink(pathString);
            return WasiErrno.ESUCCESS;
        }, ['i32', 'i32', 'i32'], ['i32']);
        this._setMemory = function setMemory(m) {
            if (!(m instanceof _WebAssembly.Memory)) {
                throw new TypeError('"instance.exports.memory" property must be a WebAssembly.Memory');
            }
            _memory.set(_this, extendMemory(m));
        };
    }
    static createSync(args, env, preopens, stdio, fs, print, printErr) {
        const fds = new SyncTable({
            size: 3,
            in: stdio[0],
            out: stdio[1],
            err: stdio[2],
            fs,
            print,
            printErr
        });
        const _this = new WASI(args, env, fds, false, fs);
        if (preopens.length > 0) {
            for (let i = 0; i < preopens.length; ++i) {
                const realPath = fs.realpathSync(preopens[i].realPath, 'utf8');
                const fd = fs.openSync(realPath, 'r', 0o666);
                fds.insertPreopen(fd, preopens[i].mappedPath, realPath);
            }
        }
        return _this;
    }
    static async createAsync(args, env, preopens, stdio, fs, print, printErr, asyncify) {
        const fds = new AsyncTable({
            size: 3,
            in: stdio[0],
            out: stdio[1],
            err: stdio[2],
            print,
            printErr
        });
        const _this = new WASI(args, env, fds, true, fs, asyncify);
        if (preopens.length > 0) {
            for (let i = 0; i < preopens.length; ++i) {
                const entry = preopens[i];
                const realPath = await fs.promises.realpath(entry.realPath);
                const fd = await fs.promises.open(realPath, 'r', 0o666);
                await fds.insertPreopen(fd, entry.mappedPath, realPath);
            }
        }
        return _this;
    }
}
