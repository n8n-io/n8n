"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.existsSync = exports.safeReadJson = exports.readJson = exports.fileExists = exports.dirExists = void 0;
const node_fs_1 = require("node:fs");
const promises_1 = require("node:fs/promises");
const util_1 = require("./util");
/**
 * Parser for Args.directory and Flags.directory. Checks that the provided path
 * exists and is a directory.
 * @param input flag or arg input
 * @returns Promise<string>
 */
const dirExists = async (input) => {
    let dirStat;
    try {
        dirStat = await (0, promises_1.stat)(input);
    }
    catch {
        throw new Error(`No directory found at ${input}`);
    }
    if (!dirStat.isDirectory()) {
        throw new Error(`${input} exists but is not a directory`);
    }
    return input;
};
exports.dirExists = dirExists;
/**
 * Parser for Args.file and Flags.file. Checks that the provided path
 * exists and is a file.
 * @param input flag or arg input
 * @returns Promise<string>
 */
const fileExists = async (input) => {
    let fileStat;
    try {
        fileStat = await (0, promises_1.stat)(input);
    }
    catch {
        throw new Error(`No file found at ${input}`);
    }
    if (!fileStat.isFile()) {
        throw new Error(`${input} exists but is not a file`);
    }
    return input;
};
exports.fileExists = fileExists;
class ProdOnlyCache extends Map {
    set(key, value) {
        if ((0, util_1.isProd)() ?? false) {
            super.set(key, value);
        }
        return this;
    }
}
const cache = new ProdOnlyCache();
/**
 * Read a file from disk and cache its contents if in production environment.
 *
 * Will throw an error if the file does not exist.
 *
 * @param path file path of JSON file
 * @param useCache if false, ignore cache and read file from disk
 * @returns <T>
 */
async function readJson(path, useCache = true) {
    if (useCache && cache.has(path)) {
        return JSON.parse(cache.get(path));
    }
    const contents = await (0, promises_1.readFile)(path, 'utf8');
    cache.set(path, contents);
    return JSON.parse(contents);
}
exports.readJson = readJson;
/**
 * Safely read a file from disk and cache its contents if in production environment.
 *
 * Will return undefined if the file does not exist.
 *
 * @param path file path of JSON file
 * @param useCache if false, ignore cache and read file from disk
 * @returns <T> or undefined
 */
async function safeReadJson(path, useCache = true) {
    try {
        return await readJson(path, useCache);
    }
    catch { }
}
exports.safeReadJson = safeReadJson;
function existsSync(path) {
    return (0, node_fs_1.existsSync)(path);
}
exports.existsSync = existsSync;
