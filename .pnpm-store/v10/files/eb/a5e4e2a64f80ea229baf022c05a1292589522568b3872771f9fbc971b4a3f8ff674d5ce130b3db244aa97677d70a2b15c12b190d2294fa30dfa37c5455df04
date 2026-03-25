"use strict";
// promisify ourselves, because older nodes don't have fs.promises
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promises = exports.readdirSync = exports.unlinkSync = exports.lstatSync = exports.statSync = exports.rmSync = exports.rmdirSync = exports.renameSync = exports.mkdirSync = exports.chmodSync = void 0;
const fs_1 = __importDefault(require("fs"));
// sync ones just take the sync version from node
var fs_2 = require("fs");
Object.defineProperty(exports, "chmodSync", { enumerable: true, get: function () { return fs_2.chmodSync; } });
Object.defineProperty(exports, "mkdirSync", { enumerable: true, get: function () { return fs_2.mkdirSync; } });
Object.defineProperty(exports, "renameSync", { enumerable: true, get: function () { return fs_2.renameSync; } });
Object.defineProperty(exports, "rmdirSync", { enumerable: true, get: function () { return fs_2.rmdirSync; } });
Object.defineProperty(exports, "rmSync", { enumerable: true, get: function () { return fs_2.rmSync; } });
Object.defineProperty(exports, "statSync", { enumerable: true, get: function () { return fs_2.statSync; } });
Object.defineProperty(exports, "lstatSync", { enumerable: true, get: function () { return fs_2.lstatSync; } });
Object.defineProperty(exports, "unlinkSync", { enumerable: true, get: function () { return fs_2.unlinkSync; } });
const fs_3 = require("fs");
const readdirSync = (path) => (0, fs_3.readdirSync)(path, { withFileTypes: true });
exports.readdirSync = readdirSync;
// unrolled for better inlining, this seems to get better performance
// than something like:
// const makeCb = (res, rej) => (er, ...d) => er ? rej(er) : res(...d)
// which would be a bit cleaner.
const chmod = (path, mode) => new Promise((res, rej) => fs_1.default.chmod(path, mode, (er, ...d) => (er ? rej(er) : res(...d))));
const mkdir = (path, options) => new Promise((res, rej) => fs_1.default.mkdir(path, options, (er, made) => (er ? rej(er) : res(made))));
const readdir = (path) => new Promise((res, rej) => fs_1.default.readdir(path, { withFileTypes: true }, (er, data) => er ? rej(er) : res(data)));
const rename = (oldPath, newPath) => new Promise((res, rej) => fs_1.default.rename(oldPath, newPath, (er, ...d) => (er ? rej(er) : res(...d))));
const rm = (path, options) => new Promise((res, rej) => fs_1.default.rm(path, options, (er, ...d) => (er ? rej(er) : res(...d))));
const rmdir = (path) => new Promise((res, rej) => fs_1.default.rmdir(path, (er, ...d) => (er ? rej(er) : res(...d))));
const stat = (path) => new Promise((res, rej) => fs_1.default.stat(path, (er, data) => (er ? rej(er) : res(data))));
const lstat = (path) => new Promise((res, rej) => fs_1.default.lstat(path, (er, data) => (er ? rej(er) : res(data))));
const unlink = (path) => new Promise((res, rej) => fs_1.default.unlink(path, (er, ...d) => (er ? rej(er) : res(...d))));
exports.promises = {
    chmod,
    mkdir,
    readdir,
    rename,
    rm,
    rmdir,
    stat,
    lstat,
    unlink,
};
//# sourceMappingURL=fs.js.map