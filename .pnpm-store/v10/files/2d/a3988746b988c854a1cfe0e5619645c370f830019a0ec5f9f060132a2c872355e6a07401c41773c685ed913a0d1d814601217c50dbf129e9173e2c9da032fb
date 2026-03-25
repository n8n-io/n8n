"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chownrSync = exports.chownr = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const lchownSync = (path, uid, gid) => {
    try {
        return node_fs_1.default.lchownSync(path, uid, gid);
    }
    catch (er) {
        if (er?.code !== 'ENOENT')
            throw er;
    }
};
const chown = (cpath, uid, gid, cb) => {
    node_fs_1.default.lchown(cpath, uid, gid, er => {
        // Skip ENOENT error
        cb(er && er?.code !== 'ENOENT' ? er : null);
    });
};
const chownrKid = (p, child, uid, gid, cb) => {
    if (child.isDirectory()) {
        (0, exports.chownr)(node_path_1.default.resolve(p, child.name), uid, gid, (er) => {
            if (er)
                return cb(er);
            const cpath = node_path_1.default.resolve(p, child.name);
            chown(cpath, uid, gid, cb);
        });
    }
    else {
        const cpath = node_path_1.default.resolve(p, child.name);
        chown(cpath, uid, gid, cb);
    }
};
const chownr = (p, uid, gid, cb) => {
    node_fs_1.default.readdir(p, { withFileTypes: true }, (er, children) => {
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
exports.chownr = chownr;
const chownrKidSync = (p, child, uid, gid) => {
    if (child.isDirectory())
        (0, exports.chownrSync)(node_path_1.default.resolve(p, child.name), uid, gid);
    lchownSync(node_path_1.default.resolve(p, child.name), uid, gid);
};
const chownrSync = (p, uid, gid) => {
    let children;
    try {
        children = node_fs_1.default.readdirSync(p, { withFileTypes: true });
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
exports.chownrSync = chownrSync;
//# sourceMappingURL=index.js.map