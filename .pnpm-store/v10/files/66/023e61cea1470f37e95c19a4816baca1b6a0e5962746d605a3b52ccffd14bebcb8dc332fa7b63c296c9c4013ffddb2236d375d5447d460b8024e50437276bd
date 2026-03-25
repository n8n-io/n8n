"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmDirExists = exports.getShallowDirectorySize = void 0;
const api_1 = require("@opentelemetry/api");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
/**
 * Computes the size (in bytes) of all files in a directory at the root level. Asynchronously.
 * @internal
 */
const getShallowDirectorySize = async (directory) => {
    let totalSize = 0;
    try {
        // Get the directory listing
        const files = await (0, promises_1.readdir)(directory);
        // Query all file sizes
        for (const file of files) {
            const fileStats = await (0, promises_1.stat)((0, node_path_1.join)(directory, file));
            if (fileStats.isFile()) {
                totalSize += fileStats.size;
            }
        }
        return totalSize;
    }
    catch (err) {
        api_1.diag.error(`Error getting directory size: ${err}`);
        return 0;
    }
};
exports.getShallowDirectorySize = getShallowDirectorySize;
/**
 * Validate directory exists.
 * @internal
 */
const confirmDirExists = async (directory) => {
    try {
        const stats = await (0, promises_1.lstat)(directory);
        if (!stats.isDirectory()) {
            throw new Error("Path existed but was not a directory");
        }
    }
    catch (err) {
        if (err && err.code === "ENOENT") {
            try {
                const options = { recursive: true };
                await (0, promises_1.mkdir)(directory, options);
            }
            catch (mkdirErr) {
                if (mkdirErr && mkdirErr.code !== "EEXIST") {
                    // Handle race condition by ignoring EEXIST
                    throw mkdirErr;
                }
            }
        }
    }
};
exports.confirmDirExists = confirmDirExists;
//# sourceMappingURL=fileSystemHelpers.js.map