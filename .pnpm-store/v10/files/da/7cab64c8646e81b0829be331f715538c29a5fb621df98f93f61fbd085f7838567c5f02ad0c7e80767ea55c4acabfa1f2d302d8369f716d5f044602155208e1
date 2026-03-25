"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const util = require("util");
const path = require("path");
const readdirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);
/**
 * Recursively scans the list of directories for files with one of the provided
 * extensions.
 *
 * @param baseDirs Directories to search for files
 * @param extensions List of valid extensions that files may have
 */
async function recursiveWalk(baseDirs, extensions) {
    // We put the results in a set to ensure there are no duplicates
    const results = new Set();
    await Promise.all(baseDirs.map(async (baseDir) => {
        const files = await recursiveWalkInternal(path.resolve(baseDir), new RegExp(`\\.${extensions.map(ext => `(?:${ext})`).join('|')}$`, 'i'));
        for (const file of files) {
            results.add(file);
        }
    }));
    return [...results];
}
exports.default = recursiveWalk;
/**
 * Recursively walk the filesystem to find files with the proper extensions.
 *
 * @param baseDir The fully resolved starting directory (absolute path)
 * @param extensionRegex Regular expression to verify the file extension
 * @param maxDepth The maximum number of recursive calls to make before stopping
 */
async function recursiveWalkInternal(baseDir, extensionRegex, maxDepth = 10) {
    if (maxDepth <= 0) {
        return [];
    }
    let entries;
    try {
        entries = await readdirAsync(baseDir);
    }
    catch (_a) {
        return [];
    }
    // We collect the results up in this array as we find them rather than
    // mapping/reducing the data to avoid the cost of creating and concatenating
    // intermediate arrays.
    const results = [];
    await Promise.all(entries.map(async (entry) => {
        const entryPath = path.join(baseDir, entry);
        let stats;
        try {
            stats = await statAsync(entryPath);
        }
        catch (_a) {
            return;
        }
        if (stats.isFile() && extensionRegex.test(entryPath)) {
            results.push(entryPath);
        }
        else if (stats.isDirectory()) {
            results.push(...await recursiveWalkInternal(entryPath, extensionRegex, maxDepth - 1));
        }
    }));
    return results;
}
//# sourceMappingURL=recursiveWalk.js.map