import { Errno, ErrnoError } from '../internal/error.js';
/**
 * Implements the non-readonly methods to throw `EROFS`
 * @category Internals
 */
/* eslint-disable @typescript-eslint/require-await */
export function Readonly(FS) {
    class ReadonlyFS extends FS {
        constructor(...args) {
            super(...args);
            this.attributes.set('no_write');
        }
        async rename() {
            throw new ErrnoError(Errno.EROFS);
        }
        renameSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async createFile() {
            throw new ErrnoError(Errno.EROFS);
        }
        createFileSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async unlink() {
            throw new ErrnoError(Errno.EROFS);
        }
        unlinkSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async rmdir() {
            throw new ErrnoError(Errno.EROFS);
        }
        rmdirSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async mkdir() {
            throw new ErrnoError(Errno.EROFS);
        }
        mkdirSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async link() {
            throw new ErrnoError(Errno.EROFS);
        }
        linkSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async sync() {
            throw new ErrnoError(Errno.EROFS);
        }
        syncSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        async write() {
            throw new ErrnoError(Errno.EROFS);
        }
        writeSync() {
            throw new ErrnoError(Errno.EROFS);
        }
        streamWrite() {
            throw new ErrnoError(Errno.EROFS);
        }
    }
    return ReadonlyFS;
}
/* eslint-enable @typescript-eslint/require-await */
