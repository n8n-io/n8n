// promisify ourselves, because older nodes don't have fs.promises
import fs from 'fs';
// sync ones just take the sync version from node
export { chmodSync, mkdirSync, renameSync, rmdirSync, rmSync, statSync, lstatSync, unlinkSync, } from 'fs';
import { readdirSync as rdSync } from 'fs';
export const readdirSync = (path) => rdSync(path, { withFileTypes: true });
// unrolled for better inlining, this seems to get better performance
// than something like:
// const makeCb = (res, rej) => (er, ...d) => er ? rej(er) : res(...d)
// which would be a bit cleaner.
const chmod = (path, mode) => new Promise((res, rej) => fs.chmod(path, mode, (er, ...d) => (er ? rej(er) : res(...d))));
const mkdir = (path, options) => new Promise((res, rej) => fs.mkdir(path, options, (er, made) => (er ? rej(er) : res(made))));
const readdir = (path) => new Promise((res, rej) => fs.readdir(path, { withFileTypes: true }, (er, data) => er ? rej(er) : res(data)));
const rename = (oldPath, newPath) => new Promise((res, rej) => fs.rename(oldPath, newPath, (er, ...d) => er ? rej(er) : res(...d)));
const rm = (path, options) => new Promise((res, rej) => fs.rm(path, options, (er, ...d) => (er ? rej(er) : res(...d))));
const rmdir = (path) => new Promise((res, rej) => fs.rmdir(path, (er, ...d) => (er ? rej(er) : res(...d))));
const stat = (path) => new Promise((res, rej) => fs.stat(path, (er, data) => (er ? rej(er) : res(data))));
const lstat = (path) => new Promise((res, rej) => fs.lstat(path, (er, data) => (er ? rej(er) : res(data))));
const unlink = (path) => new Promise((res, rej) => fs.unlink(path, (er, ...d) => (er ? rej(er) : res(...d))));
export const promises = {
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