// tar -r
import { WriteStream, WriteStreamSync } from '@isaacs/fs-minipass';
import fs from 'node:fs';
import path from 'node:path';
import { Header } from './header.js';
import { list } from './list.js';
import { makeCommand } from './make-command.js';
import { isFile, } from './options.js';
import { Pack, PackSync } from './pack.js';
// starting at the head of the file, read a Header
// If the checksum is invalid, that's our position to start writing
// If it is, jump forward by the specified size (round up to 512)
// and try again.
// Write the new Pack stream starting there.
const replaceSync = (opt, files) => {
    const p = new PackSync(opt);
    let threw = true;
    let fd;
    let position;
    try {
        try {
            fd = fs.openSync(opt.file, 'r+');
        }
        catch (er) {
            if (er?.code === 'ENOENT') {
                fd = fs.openSync(opt.file, 'w+');
            }
            else {
                throw er;
            }
        }
        const st = fs.fstatSync(fd);
        const headBuf = Buffer.alloc(512);
        POSITION: for (position = 0; position < st.size; position += 512) {
            for (let bufPos = 0, bytes = 0; bufPos < 512; bufPos += bytes) {
                bytes = fs.readSync(fd, headBuf, bufPos, headBuf.length - bufPos, position + bufPos);
                if (position === 0 &&
                    headBuf[0] === 0x1f &&
                    headBuf[1] === 0x8b) {
                    throw new Error('cannot append to compressed archives');
                }
                if (!bytes) {
                    break POSITION;
                }
            }
            const h = new Header(headBuf);
            if (!h.cksumValid) {
                break;
            }
            const entryBlockSize = 512 * Math.ceil((h.size || 0) / 512);
            if (position + entryBlockSize + 512 > st.size) {
                break;
            }
            // the 512 for the header we just parsed will be added as well
            // also jump ahead all the blocks for the body
            position += entryBlockSize;
            if (opt.mtimeCache && h.mtime) {
                opt.mtimeCache.set(String(h.path), h.mtime);
            }
        }
        threw = false;
        streamSync(opt, p, position, fd, files);
    }
    finally {
        if (threw) {
            try {
                fs.closeSync(fd);
            }
            catch (er) { }
        }
    }
};
const streamSync = (opt, p, position, fd, files) => {
    const stream = new WriteStreamSync(opt.file, {
        fd: fd,
        start: position,
    });
    p.pipe(stream);
    addFilesSync(p, files);
};
const replaceAsync = (opt, files) => {
    files = Array.from(files);
    const p = new Pack(opt);
    const getPos = (fd, size, cb_) => {
        const cb = (er, pos) => {
            if (er) {
                fs.close(fd, _ => cb_(er));
            }
            else {
                cb_(null, pos);
            }
        };
        let position = 0;
        if (size === 0) {
            return cb(null, 0);
        }
        let bufPos = 0;
        const headBuf = Buffer.alloc(512);
        const onread = (er, bytes) => {
            if (er || typeof bytes === 'undefined') {
                return cb(er);
            }
            bufPos += bytes;
            if (bufPos < 512 && bytes) {
                return fs.read(fd, headBuf, bufPos, headBuf.length - bufPos, position + bufPos, onread);
            }
            if (position === 0 &&
                headBuf[0] === 0x1f &&
                headBuf[1] === 0x8b) {
                return cb(new Error('cannot append to compressed archives'));
            }
            // truncated header
            if (bufPos < 512) {
                return cb(null, position);
            }
            const h = new Header(headBuf);
            if (!h.cksumValid) {
                return cb(null, position);
            }
            /* c8 ignore next */
            const entryBlockSize = 512 * Math.ceil((h.size ?? 0) / 512);
            if (position + entryBlockSize + 512 > size) {
                return cb(null, position);
            }
            position += entryBlockSize + 512;
            if (position >= size) {
                return cb(null, position);
            }
            if (opt.mtimeCache && h.mtime) {
                opt.mtimeCache.set(String(h.path), h.mtime);
            }
            bufPos = 0;
            fs.read(fd, headBuf, 0, 512, position, onread);
        };
        fs.read(fd, headBuf, 0, 512, position, onread);
    };
    const promise = new Promise((resolve, reject) => {
        p.on('error', reject);
        let flag = 'r+';
        const onopen = (er, fd) => {
            if (er && er.code === 'ENOENT' && flag === 'r+') {
                flag = 'w+';
                return fs.open(opt.file, flag, onopen);
            }
            if (er || !fd) {
                return reject(er);
            }
            fs.fstat(fd, (er, st) => {
                if (er) {
                    return fs.close(fd, () => reject(er));
                }
                getPos(fd, st.size, (er, position) => {
                    if (er) {
                        return reject(er);
                    }
                    const stream = new WriteStream(opt.file, {
                        fd: fd,
                        start: position,
                    });
                    p.pipe(stream);
                    stream.on('error', reject);
                    stream.on('close', resolve);
                    addFilesAsync(p, files);
                });
            });
        };
        fs.open(opt.file, flag, onopen);
    });
    return promise;
};
const addFilesSync = (p, files) => {
    files.forEach(file => {
        if (file.charAt(0) === '@') {
            list({
                file: path.resolve(p.cwd, file.slice(1)),
                sync: true,
                noResume: true,
                onReadEntry: entry => p.add(entry),
            });
        }
        else {
            p.add(file);
        }
    });
    p.end();
};
const addFilesAsync = async (p, files) => {
    for (let i = 0; i < files.length; i++) {
        const file = String(files[i]);
        if (file.charAt(0) === '@') {
            await list({
                file: path.resolve(String(p.cwd), file.slice(1)),
                noResume: true,
                onReadEntry: entry => p.add(entry),
            });
        }
        else {
            p.add(file);
        }
    }
    p.end();
};
export const replace = makeCommand(replaceSync, replaceAsync, 
/* c8 ignore start */
() => {
    throw new TypeError('file is required');
}, () => {
    throw new TypeError('file is required');
}, 
/* c8 ignore stop */
(opt, entries) => {
    if (!isFile(opt)) {
        throw new TypeError('file is required');
    }
    if (opt.gzip ||
        opt.brotli ||
        opt.zstd ||
        opt.file.endsWith('.br') ||
        opt.file.endsWith('.tbr')) {
        throw new TypeError('cannot append to compressed archives');
    }
    if (!entries?.length) {
        throw new TypeError('no paths specified to add/replace');
    }
});
//# sourceMappingURL=replace.js.map