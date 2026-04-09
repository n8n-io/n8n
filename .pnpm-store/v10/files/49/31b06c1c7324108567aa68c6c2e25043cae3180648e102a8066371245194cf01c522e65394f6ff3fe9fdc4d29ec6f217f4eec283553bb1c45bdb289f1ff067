import { Errno, ErrnoError } from './internal/error.js';
import { log_deprecated } from './internal/log.js';
import { resolve } from './vfs/path.js';
/**
 * Encodes a string into a buffer
 * @internal
 */
export function encodeRaw(input) {
    if (typeof input != 'string') {
        throw new ErrnoError(Errno.EINVAL, 'Can not encode a non-string');
    }
    return new Uint8Array(Array.from(input).map(char => char.charCodeAt(0)));
}
/**
 * Decodes a string from a buffer
 * @internal
 */
export function decodeRaw(input) {
    if (!(input instanceof Uint8Array)) {
        throw new ErrnoError(Errno.EINVAL, 'Can not decode a non-Uint8Array');
    }
    return Array.from(input)
        .map(char => String.fromCharCode(char))
        .join('');
}
const encoder = new TextEncoder();
/**
 * Encodes a string into a buffer
 * @internal
 */
export function encodeUTF8(input) {
    if (typeof input != 'string') {
        throw new ErrnoError(Errno.EINVAL, 'Can not encode a non-string');
    }
    return encoder.encode(input);
}
/* node:coverage disable */
export { /** @deprecated @hidden */ encodeUTF8 as encode };
/* node:coverage enable */
const decoder = new TextDecoder();
/**
 * Decodes a string from a buffer
 * @internal
 */
export function decodeUTF8(input) {
    if (!(input instanceof Uint8Array)) {
        throw new ErrnoError(Errno.EINVAL, 'Can not decode a non-Uint8Array');
    }
    return decoder.decode(input);
}
/* node:coverage disable */
export { /** @deprecated @hidden */ decodeUTF8 as decode };
/* node:coverage enable */
/**
 * Decodes a directory listing
 * @hidden
 */
export function decodeDirListing(data) {
    return JSON.parse(decodeUTF8(data), (k, v) => k == '' ? v : typeof v == 'string' ? BigInt(v).toString(16).slice(0, Math.min(v.length, 8)) : v);
}
/**
 * Encodes a directory listing
 * @hidden
 */
export function encodeDirListing(data) {
    return encodeUTF8(JSON.stringify(data));
}
/**
 * Normalizes a mode
 * @param def default
 * @internal
 */
export function normalizeMode(mode, def) {
    if (typeof mode == 'number')
        return mode;
    if (typeof mode == 'string') {
        const parsed = parseInt(mode, 8);
        if (!isNaN(parsed)) {
            return parsed;
        }
    }
    if (typeof def == 'number')
        return def;
    throw new ErrnoError(Errno.EINVAL, 'Invalid mode: ' + (mode === null || mode === void 0 ? void 0 : mode.toString()));
}
/**
 * Normalizes a time
 * @internal
 */
export function normalizeTime(time) {
    if (time instanceof Date)
        return time.getTime();
    try {
        return Number(time);
    }
    catch {
        throw new ErrnoError(Errno.EINVAL, 'Invalid time.');
    }
}
/**
 * Normalizes a path
 * @internal
 */
export function normalizePath(p, noResolve = false) {
    if (p instanceof URL) {
        if (p.protocol != 'file:')
            throw new ErrnoError(Errno.EINVAL, 'URLs must use the file: protocol');
        p = p.pathname;
    }
    p = p.toString();
    if (p.startsWith('file://'))
        p = p.slice('file://'.length);
    if (p.includes('\x00')) {
        throw new ErrnoError(Errno.EINVAL, 'Path can not contain null character');
    }
    if (p.length == 0) {
        throw new ErrnoError(Errno.EINVAL, 'Path can not be empty');
    }
    p = p.replaceAll(/[/\\]+/g, '/');
    return noResolve ? p : resolve(p);
}
/**
 * Normalizes options
 * @param options options to normalize
 * @param encoding default encoding
 * @param flag default flag
 * @param mode default mode
 * @internal
 */
export function normalizeOptions(options, encoding = 'utf8', flag, mode = 0) {
    if (typeof options != 'object' || options === null) {
        return {
            encoding: typeof options == 'string' ? options : (encoding !== null && encoding !== void 0 ? encoding : null),
            flag,
            mode,
        };
    }
    return {
        encoding: typeof (options === null || options === void 0 ? void 0 : options.encoding) == 'string' ? options.encoding : (encoding !== null && encoding !== void 0 ? encoding : null),
        flag: typeof (options === null || options === void 0 ? void 0 : options.flag) == 'string' ? options.flag : flag,
        mode: normalizeMode('mode' in options ? options === null || options === void 0 ? void 0 : options.mode : null, mode),
    };
}
/* node:coverage disable */
import { randomHex } from 'utilium';
/**
 * Generate a random ino
 * @internal @deprecated @hidden
 */
export function randomBigInt() {
    log_deprecated('randomBigInt');
    return BigInt('0x' + randomHex(8));
}
/**
 * Prevents infinite loops
 * @internal
 * @deprecated Use `canary` from Utilium
 */
export function canary(path, syscall) {
    log_deprecated('canary');
    const timeout = setTimeout(() => {
        throw ErrnoError.With('EDEADLK', path, syscall);
    }, 5000);
    return () => clearTimeout(timeout);
}
/* node:coverage enable */
