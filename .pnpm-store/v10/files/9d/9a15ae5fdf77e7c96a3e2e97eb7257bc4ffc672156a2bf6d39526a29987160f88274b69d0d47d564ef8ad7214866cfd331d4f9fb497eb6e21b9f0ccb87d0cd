"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWriter = void 0;
const Import_1 = require("./Import");
const fsx = Import_1.Import.lazy('fs-extra', require);
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
        return new FileWriter(fsx.openSync(filePath, FileWriter._convertFlagsForNode(flags)), filePath);
    }
    /**
     * Helper function to convert the file writer array to a Node.js style string (e.g. "wx" or "a").
     * @param flags - The flags that should be converted.
     */
    static _convertFlagsForNode(flags) {
        flags = Object.assign({ append: false, exclusive: false }, flags);
        return [flags.append ? 'a' : 'w', flags.exclusive ? 'x' : ''].join('');
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
        fsx.writeSync(this._fileDescriptor, text);
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
            fsx.closeSync(fd);
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
        return fsx.fstatSync(this._fileDescriptor);
    }
}
exports.FileWriter = FileWriter;
//# sourceMappingURL=FileWriter.js.map