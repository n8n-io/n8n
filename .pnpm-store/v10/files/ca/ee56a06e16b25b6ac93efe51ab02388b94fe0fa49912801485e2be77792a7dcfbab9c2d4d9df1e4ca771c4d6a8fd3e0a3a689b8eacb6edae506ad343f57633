"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWriter = void 0;
const fs = __importStar(require("node:fs"));
/**
 * Helper function to convert the file writer array to a Node.js style string (e.g. "wx" or "a").
 * @param flags - The flags that should be converted.
 */
function convertFlagsForNode(flags) {
    flags = {
        append: false,
        exclusive: false,
        ...flags
    };
    const result = `${flags.append ? 'a' : 'w'}${flags.exclusive ? 'x' : ''}`;
    return result;
}
/**
 * API for interacting with file handles.
 * @public
 */
class FileWriter {
    constructor(fileDescriptor, filePath) {
        this._fileDescriptor = fileDescriptor;
        this.filePath = filePath;
    }
    /**
     * Opens a new file handle to the file at the specified path and given mode.
     * Behind the scenes it uses `fs.openSync()`.
     * The behaviour of this function is platform specific.
     * See: https://nodejs.org/docs/latest-v8.x/api/fs.html#fs_fs_open_path_flags_mode_callback
     * @param filePath - The absolute or relative path to the file handle that should be opened.
     * @param flags - The flags for opening the handle
     */
    static open(filePath, flags) {
        return new FileWriter(fs.openSync(filePath, convertFlagsForNode(flags)), filePath);
    }
    /**
     * Writes some text to the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.writeSync()`.
     * @param text - The text to write to the file.
     */
    write(text) {
        if (!this._fileDescriptor) {
            throw new Error(`Cannot write to file, file descriptor has already been released.`);
        }
        fs.writeSync(this._fileDescriptor, text);
    }
    /**
     * Closes the file handle permanently. No operations can be made on this file handle after calling this.
     * Behind the scenes it uses `fs.closeSync()` and releases the file descriptor to be re-used.
     *
     * @remarks
     * The `close()` method can be called more than once; additional calls are ignored.
     */
    close() {
        const fd = this._fileDescriptor;
        if (fd) {
            this._fileDescriptor = undefined;
            fs.closeSync(fd);
        }
    }
    /**
     * Gets the statistics for the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.statSync()`.
     */
    getStatistics() {
        if (!this._fileDescriptor) {
            throw new Error(`Cannot get file statistics, file descriptor has already been released.`);
        }
        return fs.fstatSync(this._fileDescriptor);
    }
}
exports.FileWriter = FileWriter;
//# sourceMappingURL=FileWriter.js.map