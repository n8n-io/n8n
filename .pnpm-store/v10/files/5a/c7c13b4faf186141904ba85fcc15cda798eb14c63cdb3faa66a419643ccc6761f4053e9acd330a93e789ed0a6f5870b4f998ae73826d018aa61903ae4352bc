"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTmpSync = exports.defaultTmp = void 0;
// The default temporary folder location for use in the windows algorithm.
// It's TEMPting to use dirname(path), since that's guaranteed to be on the
// same device.  However, this means that:
// rimraf(path).then(() => rimraf(dirname(path)))
// will often fail with EBUSY, because the parent dir contains
// marked-for-deletion directory entries (which do not show up in readdir).
// The approach here is to use os.tmpdir() if it's on the same drive letter,
// or resolve(path, '\\temp') if it exists, or the root of the drive if not.
// On Posix (not that you'd be likely to use the windows algorithm there),
// it uses os.tmpdir() always.
const os_1 = require("os");
const path_1 = require("path");
const fs_js_1 = require("./fs.js");
const platform_js_1 = __importDefault(require("./platform.js"));
const { stat } = fs_js_1.promises;
const isDirSync = (path) => {
    try {
        return (0, fs_js_1.statSync)(path).isDirectory();
    }
    catch (er) {
        return false;
    }
};
const isDir = (path) => stat(path).then(st => st.isDirectory(), () => false);
const win32DefaultTmp = async (path) => {
    const { root } = (0, path_1.parse)(path);
    const tmp = (0, os_1.tmpdir)();
    const { root: tmpRoot } = (0, path_1.parse)(tmp);
    if (root.toLowerCase() === tmpRoot.toLowerCase()) {
        return tmp;
    }
    const driveTmp = (0, path_1.resolve)(root, '/temp');
    if (await isDir(driveTmp)) {
        return driveTmp;
    }
    return root;
};
const win32DefaultTmpSync = (path) => {
    const { root } = (0, path_1.parse)(path);
    const tmp = (0, os_1.tmpdir)();
    const { root: tmpRoot } = (0, path_1.parse)(tmp);
    if (root.toLowerCase() === tmpRoot.toLowerCase()) {
        return tmp;
    }
    const driveTmp = (0, path_1.resolve)(root, '/temp');
    if (isDirSync(driveTmp)) {
        return driveTmp;
    }
    return root;
};
const posixDefaultTmp = async () => (0, os_1.tmpdir)();
const posixDefaultTmpSync = () => (0, os_1.tmpdir)();
exports.defaultTmp = platform_js_1.default === 'win32' ? win32DefaultTmp : posixDefaultTmp;
exports.defaultTmpSync = platform_js_1.default === 'win32' ? win32DefaultTmpSync : posixDefaultTmpSync;
//# sourceMappingURL=default-tmp.js.map