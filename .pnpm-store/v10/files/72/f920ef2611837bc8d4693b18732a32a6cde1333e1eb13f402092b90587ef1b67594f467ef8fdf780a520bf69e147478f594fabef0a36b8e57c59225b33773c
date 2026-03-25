import { chownr, chownrSync } from 'chownr';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { CwdError } from './cwd-error.js';
import { normalizeWindowsPath } from './normalize-windows-path.js';
import { SymlinkError } from './symlink-error.js';
const checkCwd = (dir, cb) => {
    fs.stat(dir, (er, st) => {
        if (er || !st.isDirectory()) {
            er = new CwdError(dir, er?.code || 'ENOTDIR');
        }
        cb(er);
    });
};
/**
 * Wrapper around fs/promises.mkdir for tar's needs.
 *
 * The main purpose is to avoid creating directories if we know that
 * they already exist (and track which ones exist for this purpose),
 * and prevent entries from being extracted into symlinked folders,
 * if `preservePaths` is not set.
 */
export const mkdir = (dir, opt, cb) => {
    dir = normalizeWindowsPath(dir);
    // if there's any overlap between mask and mode,
    // then we'll need an explicit chmod
    /* c8 ignore next */
    const umask = opt.umask ?? 0o22;
    const mode = opt.mode | 0o0700;
    const needChmod = (mode & umask) !== 0;
    const uid = opt.uid;
    const gid = opt.gid;
    const doChown = typeof uid === 'number' &&
        typeof gid === 'number' &&
        (uid !== opt.processUid || gid !== opt.processGid);
    const preserve = opt.preserve;
    const unlink = opt.unlink;
    const cwd = normalizeWindowsPath(opt.cwd);
    const done = (er, created) => {
        if (er) {
            cb(er);
        }
        else {
            if (created && doChown) {
                chownr(created, uid, gid, er => done(er));
            }
            else if (needChmod) {
                fs.chmod(dir, mode, cb);
            }
            else {
                cb();
            }
        }
    };
    if (dir === cwd) {
        return checkCwd(dir, done);
    }
    if (preserve) {
        return fsp.mkdir(dir, { mode, recursive: true }).then(made => done(null, made ?? undefined), // oh, ts
        done);
    }
    const sub = normalizeWindowsPath(path.relative(cwd, dir));
    const parts = sub.split('/');
    mkdir_(cwd, parts, mode, unlink, cwd, undefined, done);
};
const mkdir_ = (base, parts, mode, unlink, cwd, created, cb) => {
    if (!parts.length) {
        return cb(null, created);
    }
    const p = parts.shift();
    const part = normalizeWindowsPath(path.resolve(base + '/' + p));
    fs.mkdir(part, mode, onmkdir(part, parts, mode, unlink, cwd, created, cb));
};
const onmkdir = (part, parts, mode, unlink, cwd, created, cb) => (er) => {
    if (er) {
        fs.lstat(part, (statEr, st) => {
            if (statEr) {
                statEr.path =
                    statEr.path && normalizeWindowsPath(statEr.path);
                cb(statEr);
            }
            else if (st.isDirectory()) {
                mkdir_(part, parts, mode, unlink, cwd, created, cb);
            }
            else if (unlink) {
                fs.unlink(part, er => {
                    if (er) {
                        return cb(er);
                    }
                    fs.mkdir(part, mode, onmkdir(part, parts, mode, unlink, cwd, created, cb));
                });
            }
            else if (st.isSymbolicLink()) {
                return cb(new SymlinkError(part, part + '/' + parts.join('/')));
            }
            else {
                cb(er);
            }
        });
    }
    else {
        created = created || part;
        mkdir_(part, parts, mode, unlink, cwd, created, cb);
    }
};
const checkCwdSync = (dir) => {
    let ok = false;
    let code = undefined;
    try {
        ok = fs.statSync(dir).isDirectory();
    }
    catch (er) {
        code = er?.code;
    }
    finally {
        if (!ok) {
            throw new CwdError(dir, code ?? 'ENOTDIR');
        }
    }
};
export const mkdirSync = (dir, opt) => {
    dir = normalizeWindowsPath(dir);
    // if there's any overlap between mask and mode,
    // then we'll need an explicit chmod
    /* c8 ignore next */
    const umask = opt.umask ?? 0o22;
    const mode = opt.mode | 0o700;
    const needChmod = (mode & umask) !== 0;
    const uid = opt.uid;
    const gid = opt.gid;
    const doChown = typeof uid === 'number' &&
        typeof gid === 'number' &&
        (uid !== opt.processUid || gid !== opt.processGid);
    const preserve = opt.preserve;
    const unlink = opt.unlink;
    const cwd = normalizeWindowsPath(opt.cwd);
    const done = (created) => {
        if (created && doChown) {
            chownrSync(created, uid, gid);
        }
        if (needChmod) {
            fs.chmodSync(dir, mode);
        }
    };
    if (dir === cwd) {
        checkCwdSync(cwd);
        return done();
    }
    if (preserve) {
        return done(fs.mkdirSync(dir, { mode, recursive: true }) ?? undefined);
    }
    const sub = normalizeWindowsPath(path.relative(cwd, dir));
    const parts = sub.split('/');
    let created = undefined;
    for (let p = parts.shift(), part = cwd; p && (part += '/' + p); p = parts.shift()) {
        part = normalizeWindowsPath(path.resolve(part));
        try {
            fs.mkdirSync(part, mode);
            created = created || part;
        }
        catch (er) {
            const st = fs.lstatSync(part);
            if (st.isDirectory()) {
                continue;
            }
            else if (unlink) {
                fs.unlinkSync(part);
                fs.mkdirSync(part, mode);
                created = created || part;
                continue;
            }
            else if (st.isSymbolicLink()) {
                return new SymlinkError(part, part + '/' + parts.join('/'));
            }
        }
    }
    return done(created);
};
//# sourceMappingURL=mkdir.js.map