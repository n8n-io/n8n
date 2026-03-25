import fs from 'node:fs';
import path from 'node:path';
const lchownSync = (path, uid, gid) => {
    try {
        return fs.lchownSync(path, uid, gid);
    }
    catch (er) {
        if (er?.code !== 'ENOENT')
            throw er;
    }
};
const chown = (cpath, uid, gid, cb) => {
    fs.lchown(cpath, uid, gid, er => {
        // Skip ENOENT error
        cb(er && er?.code !== 'ENOENT' ? er : null);
    });
};
const chownrKid = (p, child, uid, gid, cb) => {
    if (child.isDirectory()) {
        chownr(path.resolve(p, child.name), uid, gid, (er) => {
            if (er)
                return cb(er);
            const cpath = path.resolve(p, child.name);
            chown(cpath, uid, gid, cb);
        });
    }
    else {
        const cpath = path.resolve(p, child.name);
        chown(cpath, uid, gid, cb);
    }
};
export const chownr = (p, uid, gid, cb) => {
    fs.readdir(p, { withFileTypes: true }, (er, children) => {
        // any error other than ENOTDIR or ENOTSUP means it's not readable,
        // or doesn't exist.  give up.
        if (er) {
            if (er.code === 'ENOENT')
                return cb();
            else if (er.code !== 'ENOTDIR' && er.code !== 'ENOTSUP')
                return cb(er);
        }
        if (er || !children.length)
            return chown(p, uid, gid, cb);
        let len = children.length;
        let errState = null;
        const then = (er) => {
            /* c8 ignore start */
            if (errState)
                return;
            /* c8 ignore stop */
            if (er)
                return cb((errState = er));
            if (--len === 0)
                return chown(p, uid, gid, cb);
        };
        for (const child of children) {
            chownrKid(p, child, uid, gid, then);
        }
    });
};
const chownrKidSync = (p, child, uid, gid) => {
    if (child.isDirectory())
        chownrSync(path.resolve(p, child.name), uid, gid);
    lchownSync(path.resolve(p, child.name), uid, gid);
};
export const chownrSync = (p, uid, gid) => {
    let children;
    try {
        children = fs.readdirSync(p, { withFileTypes: true });
    }
    catch (er) {
        const e = er;
        if (e?.code === 'ENOENT')
            return;
        else if (e?.code === 'ENOTDIR' || e?.code === 'ENOTSUP')
            return lchownSync(p, uid, gid);
        else
            throw e;
    }
    for (const child of children) {
        chownrKidSync(p, child, uid, gid);
    }
    return lchownSync(p, uid, gid);
};
//# sourceMappingURL=index.js.map