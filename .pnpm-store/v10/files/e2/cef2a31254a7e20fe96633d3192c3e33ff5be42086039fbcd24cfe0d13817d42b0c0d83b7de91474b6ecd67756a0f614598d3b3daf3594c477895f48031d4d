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
exports.FileSystem = exports.AlreadyExistsBehavior = void 0;
const nodeJsPath = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fsx = __importStar(require("fs-extra"));
const Text_1 = require("./Text");
const PosixModeBits_1 = require("./PosixModeBits");
const LegacyAdapters_1 = require("./LegacyAdapters");
/**
 * Specifies the behavior of APIs such as {@link FileSystem.copyFile} or
 * {@link FileSystem.createSymbolicLinkFile} when the output file path already exists.
 *
 * @remarks
 * For {@link FileSystem.copyFile} and related APIs, the "output file path" is
 * {@link IFileSystemCopyFileOptions.destinationPath}.
 *
 * For {@link FileSystem.createSymbolicLinkFile} and related APIs, the "output file path" is
 * {@link IFileSystemCreateLinkOptions.newLinkPath}.
 *
 * @public
 */
var AlreadyExistsBehavior;
(function (AlreadyExistsBehavior) {
    /**
     * If the output file path already exists, try to overwrite the existing object.
     *
     * @remarks
     * If overwriting the object would require recursively deleting a folder tree,
     * then the operation will fail.  As an example, suppose {@link FileSystem.copyFile}
     * is copying a single file `/a/b/c` to the destination path `/d/e`, and `/d/e` is a
     * nonempty folder.  In this situation, an error will be reported; specifying
     * `AlreadyExistsBehavior.Overwrite` does not help.  Empty folders can be overwritten
     * depending on the details of the implementation.
     */
    AlreadyExistsBehavior["Overwrite"] = "overwrite";
    /**
     * If the output file path already exists, the operation will fail, and an error
     * will be reported.
     */
    AlreadyExistsBehavior["Error"] = "error";
    /**
     * If the output file path already exists, skip this item, and continue the operation.
     */
    AlreadyExistsBehavior["Ignore"] = "ignore";
})(AlreadyExistsBehavior || (exports.AlreadyExistsBehavior = AlreadyExistsBehavior = {}));
const MOVE_DEFAULT_OPTIONS = {
    overwrite: true,
    ensureFolderExists: false
};
const READ_FOLDER_DEFAULT_OPTIONS = {
    absolutePaths: false
};
const WRITE_FILE_DEFAULT_OPTIONS = {
    ensureFolderExists: false,
    convertLineEndings: undefined,
    encoding: Text_1.Encoding.Utf8
};
const APPEND_TO_FILE_DEFAULT_OPTIONS = Object.assign({}, WRITE_FILE_DEFAULT_OPTIONS);
const READ_FILE_DEFAULT_OPTIONS = {
    encoding: Text_1.Encoding.Utf8,
    convertLineEndings: undefined
};
const COPY_FILE_DEFAULT_OPTIONS = {
    alreadyExistsBehavior: AlreadyExistsBehavior.Overwrite
};
const COPY_FILES_DEFAULT_OPTIONS = {
    alreadyExistsBehavior: AlreadyExistsBehavior.Overwrite
};
const DELETE_FILE_DEFAULT_OPTIONS = {
    throwIfNotExists: false
};
/**
 * The FileSystem API provides a complete set of recommended operations for interacting with the file system.
 *
 * @remarks
 * We recommend to use this instead of the native `fs` API, because `fs` is a minimal set of low-level
 * primitives that must be mapped for each supported operating system. The FileSystem API takes a
 * philosophical approach of providing "one obvious way" to do each operation. We also prefer synchronous
 * operations except in cases where there would be a clear performance benefit for using async, since synchronous
 * code is much easier to read and debug. Also, indiscriminate parallelism has been seen to actually worsen
 * performance, versus improving it.
 *
 * Note that in the documentation, we refer to "filesystem objects", this can be a
 * file, folder, symbolic link, hard link, directory junction, etc.
 *
 * @public
 */
class FileSystem {
    // ===============
    // COMMON OPERATIONS
    // ===============
    /**
     * Returns true if the path exists on disk.
     * Behind the scenes it uses `fs.existsSync()`.
     * @remarks
     * There is a debate about the fact that after `fs.existsSync()` returns true,
     * the file might be deleted before fs.readSync() is called, which would imply that everybody
     * should catch a `readSync()` exception, and nobody should ever use `fs.existsSync()`.
     * We find this to be unpersuasive, since "unexceptional exceptions" really hinder the
     * break-on-exception debugging experience. Also, throwing/catching is generally slow.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static exists(path) {
        return FileSystem._wrapException(() => {
            return fsx.existsSync(path);
        });
    }
    /**
     * An async version of {@link FileSystem.exists}.
     */
    static async existsAsync(path) {
        return await FileSystem._wrapExceptionAsync(() => {
            return new Promise((resolve) => {
                fsx.exists(path, resolve);
            });
        });
    }
    /**
     * Gets the statistics for a particular filesystem object.
     * If the path is a link, this function follows the link and returns statistics about the link target.
     * Behind the scenes it uses `fs.statSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getStatistics(path) {
        return FileSystem._wrapException(() => {
            return fsx.statSync(path);
        });
    }
    /**
     * An async version of {@link FileSystem.getStatistics}.
     */
    static async getStatisticsAsync(path) {
        return await FileSystem._wrapExceptionAsync(() => {
            return fsx.stat(path);
        });
    }
    /**
     * Updates the accessed and modified timestamps of the filesystem object referenced by path.
     * Behind the scenes it uses `fs.utimesSync()`.
     * The caller should specify both times in the `times` parameter.
     * @param path - The path of the file that should be modified.
     * @param times - The times that the object should be updated to reflect.
     */
    static updateTimes(path, times) {
        return FileSystem._wrapException(() => {
            fsx.utimesSync(path, times.accessedTime, times.modifiedTime);
        });
    }
    /**
     * An async version of {@link FileSystem.updateTimes}.
     */
    static async updateTimesAsync(path, times) {
        await FileSystem._wrapExceptionAsync(() => {
            // This cast is needed because the fs-extra typings require both parameters
            // to have the same type (number or Date), whereas Node.js does not require that.
            return fsx.utimes(path, times.accessedTime, times.modifiedTime);
        });
    }
    /**
     * Changes the permissions (i.e. file mode bits) for a filesystem object.
     * Behind the scenes it uses `fs.chmodSync()`.
     * @param path - The absolute or relative path to the object that should be updated.
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static changePosixModeBits(path, modeBits) {
        FileSystem._wrapException(() => {
            fs.chmodSync(path, modeBits);
        });
    }
    /**
     * An async version of {@link FileSystem.changePosixModeBits}.
     */
    static async changePosixModeBitsAsync(path, mode) {
        await FileSystem._wrapExceptionAsync(() => {
            return fsx.chmod(path, mode);
        });
    }
    /**
     * Retrieves the permissions (i.e. file mode bits) for a filesystem object.
     * Behind the scenes it uses `fs.chmodSync()`.
     * @param path - The absolute or relative path to the object that should be updated.
     *
     * @remarks
     * This calls {@link FileSystem.getStatistics} to get the POSIX mode bits.
     * If statistics in addition to the mode bits are needed, it is more efficient
     * to call {@link FileSystem.getStatistics} directly instead.
     */
    static getPosixModeBits(path) {
        return FileSystem._wrapException(() => {
            return FileSystem.getStatistics(path).mode;
        });
    }
    /**
     * An async version of {@link FileSystem.getPosixModeBits}.
     */
    static async getPosixModeBitsAsync(path) {
        return await FileSystem._wrapExceptionAsync(async () => {
            return (await FileSystem.getStatisticsAsync(path)).mode;
        });
    }
    /**
     * Returns a 10-character string representation of a PosixModeBits value similar to what
     * would be displayed by a command such as "ls -l" on a POSIX-like operating system.
     * @remarks
     * For example, `PosixModeBits.AllRead | PosixModeBits.AllWrite` would be formatted as "-rw-rw-rw-".
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static formatPosixModeBits(modeBits) {
        let result = '-'; // (later we may add support for additional states such as S_IFDIR or S_ISUID)
        result += modeBits & PosixModeBits_1.PosixModeBits.UserRead ? 'r' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.UserWrite ? 'w' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.UserExecute ? 'x' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.GroupRead ? 'r' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.GroupWrite ? 'w' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.GroupExecute ? 'x' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.OthersRead ? 'r' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.OthersWrite ? 'w' : '-';
        result += modeBits & PosixModeBits_1.PosixModeBits.OthersExecute ? 'x' : '-';
        return result;
    }
    /**
     * Moves a file. The folder must exist, unless the `ensureFolderExists` option is provided.
     * Behind the scenes it uses `fs-extra.moveSync()`
     */
    static move(options) {
        FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, MOVE_DEFAULT_OPTIONS), options);
            try {
                fsx.moveSync(options.sourcePath, options.destinationPath, { overwrite: options.overwrite });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(options.destinationPath);
                    FileSystem.ensureFolder(folderPath);
                    fsx.moveSync(options.sourcePath, options.destinationPath, { overwrite: options.overwrite });
                }
                else {
                    throw error;
                }
            }
        });
    }
    /**
     * An async version of {@link FileSystem.move}.
     */
    static async moveAsync(options) {
        await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, MOVE_DEFAULT_OPTIONS), options);
            try {
                await fsx.move(options.sourcePath, options.destinationPath, { overwrite: options.overwrite });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(options.destinationPath);
                    await FileSystem.ensureFolderAsync(nodeJsPath.dirname(folderPath));
                    await fsx.move(options.sourcePath, options.destinationPath, { overwrite: options.overwrite });
                }
                else {
                    throw error;
                }
            }
        });
    }
    // ===============
    // FOLDER OPERATIONS
    // ===============
    /**
     * Recursively creates a folder at a given path.
     * Behind the scenes is uses `fs-extra.ensureDirSync()`.
     * @remarks
     * Throws an exception if anything in the folderPath is not a folder.
     * @param folderPath - The absolute or relative path of the folder which should be created.
     */
    static ensureFolder(folderPath) {
        FileSystem._wrapException(() => {
            fsx.ensureDirSync(folderPath);
        });
    }
    /**
     * An async version of {@link FileSystem.ensureFolder}.
     */
    static async ensureFolderAsync(folderPath) {
        await FileSystem._wrapExceptionAsync(() => {
            return fsx.ensureDir(folderPath);
        });
    }
    /**
     * Reads the names of folder entries, not including "." or "..".
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItemNames(folderPath, options) {
        return FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, READ_FOLDER_DEFAULT_OPTIONS), options);
            const fileNames = fsx.readdirSync(folderPath);
            if (options.absolutePaths) {
                return fileNames.map((fileName) => nodeJsPath.resolve(folderPath, fileName));
            }
            else {
                return fileNames;
            }
        });
    }
    /**
     * An async version of {@link FileSystem.readFolderItemNames}.
     */
    static async readFolderItemNamesAsync(folderPath, options) {
        return await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, READ_FOLDER_DEFAULT_OPTIONS), options);
            const fileNames = await fsx.readdir(folderPath);
            if (options.absolutePaths) {
                return fileNames.map((fileName) => nodeJsPath.resolve(folderPath, fileName));
            }
            else {
                return fileNames;
            }
        });
    }
    /**
     * Reads the contents of the folder, not including "." or "..", returning objects including the
     * entry names and types.
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItems(folderPath, options) {
        return FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, READ_FOLDER_DEFAULT_OPTIONS), options);
            const folderEntries = fsx.readdirSync(folderPath, { withFileTypes: true });
            if (options.absolutePaths) {
                return folderEntries.map((folderEntry) => {
                    folderEntry.name = nodeJsPath.resolve(folderPath, folderEntry.name);
                    return folderEntry;
                });
            }
            else {
                return folderEntries;
            }
        });
    }
    /**
     * An async version of {@link FileSystem.readFolderItems}.
     */
    static async readFolderItemsAsync(folderPath, options) {
        return await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, READ_FOLDER_DEFAULT_OPTIONS), options);
            const folderEntries = await LegacyAdapters_1.LegacyAdapters.convertCallbackToPromise(fs.readdir, folderPath, { withFileTypes: true });
            if (options.absolutePaths) {
                return folderEntries.map((folderEntry) => {
                    folderEntry.name = nodeJsPath.resolve(folderPath, folderEntry.name);
                    return folderEntry;
                });
            }
            else {
                return folderEntries;
            }
        });
    }
    /**
     * Deletes a folder, including all of its contents.
     * Behind the scenes is uses `fs-extra.removeSync()`.
     * @remarks
     * Does not throw if the folderPath does not exist.
     * @param folderPath - The absolute or relative path to the folder which should be deleted.
     */
    static deleteFolder(folderPath) {
        FileSystem._wrapException(() => {
            fsx.removeSync(folderPath);
        });
    }
    /**
     * An async version of {@link FileSystem.deleteFolder}.
     */
    static async deleteFolderAsync(folderPath) {
        await FileSystem._wrapExceptionAsync(() => {
            return fsx.remove(folderPath);
        });
    }
    /**
     * Deletes the content of a folder, but not the folder itself. Also ensures the folder exists.
     * Behind the scenes it uses `fs-extra.emptyDirSync()`.
     * @remarks
     * This is a workaround for a common race condition, where the virus scanner holds a lock on the folder
     * for a brief period after it was deleted, causing EBUSY errors for any code that tries to recreate the folder.
     * @param folderPath - The absolute or relative path to the folder which should have its contents deleted.
     */
    static ensureEmptyFolder(folderPath) {
        FileSystem._wrapException(() => {
            fsx.emptyDirSync(folderPath);
        });
    }
    /**
     * An async version of {@link FileSystem.ensureEmptyFolder}.
     */
    static async ensureEmptyFolderAsync(folderPath) {
        await FileSystem._wrapExceptionAsync(() => {
            return fsx.emptyDir(folderPath);
        });
    }
    // ===============
    // FILE OPERATIONS
    // ===============
    /**
     * Writes a text string to a file on disk, overwriting the file if it already exists.
     * Behind the scenes it uses `fs.writeFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static writeFile(filePath, contents, options) {
        FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, WRITE_FILE_DEFAULT_OPTIONS), options);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents.toString(), options.convertLineEndings);
            }
            try {
                fsx.writeFileSync(filePath, contents, { encoding: options.encoding });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(filePath);
                    FileSystem.ensureFolder(folderPath);
                    fsx.writeFileSync(filePath, contents, { encoding: options.encoding });
                }
                else {
                    throw error;
                }
            }
        });
    }
    /**
     * Writes the contents of multiple Uint8Arrays to a file on disk, overwriting the file if it already exists.
     * Behind the scenes it uses `fs.writevSync()`.
     *
     * This API is useful for writing large files efficiently, especially if the input is being concatenated from
     * multiple sources.
     *
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The content that should be written to the file.
     * @param options - Optional settings that can change the behavior.
     */
    static writeBuffersToFile(filePath, contents, options) {
        FileSystem._wrapException(() => {
            // Need a mutable copy of the iterable to handle incomplete writes,
            // since writev() doesn't take an argument for where to start writing.
            const toCopy = [...contents];
            let fd;
            try {
                fd = fsx.openSync(filePath, 'w');
            }
            catch (error) {
                if (!(options === null || options === void 0 ? void 0 : options.ensureFolderExists) || !FileSystem.isNotExistError(error)) {
                    throw error;
                }
                const folderPath = nodeJsPath.dirname(filePath);
                FileSystem.ensureFolder(folderPath);
                fd = fsx.openSync(filePath, 'w');
            }
            try {
                // In practice this loop will have exactly 1 iteration, but the spec allows
                // for a writev call to write fewer bytes than requested
                while (toCopy.length) {
                    let bytesWritten = fsx.writevSync(fd, toCopy);
                    let buffersWritten = 0;
                    while (buffersWritten < toCopy.length) {
                        const bytesInCurrentBuffer = toCopy[buffersWritten].byteLength;
                        if (bytesWritten < bytesInCurrentBuffer) {
                            // This buffer was partially written.
                            toCopy[buffersWritten] = toCopy[buffersWritten].subarray(bytesWritten);
                            break;
                        }
                        bytesWritten -= bytesInCurrentBuffer;
                        buffersWritten++;
                    }
                    if (buffersWritten > 0) {
                        // Avoid cost of shifting the array more than needed.
                        toCopy.splice(0, buffersWritten);
                    }
                }
            }
            finally {
                fsx.closeSync(fd);
            }
        });
    }
    /**
     * An async version of {@link FileSystem.writeFile}.
     */
    static async writeFileAsync(filePath, contents, options) {
        await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, WRITE_FILE_DEFAULT_OPTIONS), options);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents.toString(), options.convertLineEndings);
            }
            try {
                await fsx.writeFile(filePath, contents, { encoding: options.encoding });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(filePath);
                    await FileSystem.ensureFolderAsync(folderPath);
                    await fsx.writeFile(filePath, contents, { encoding: options.encoding });
                }
                else {
                    throw error;
                }
            }
        });
    }
    /**
     * An async version of {@link FileSystem.writeBuffersToFile}.
     */
    static async writeBuffersToFileAsync(filePath, contents, options) {
        await FileSystem._wrapExceptionAsync(async () => {
            // Need a mutable copy of the iterable to handle incomplete writes,
            // since writev() doesn't take an argument for where to start writing.
            const toCopy = [...contents];
            let handle;
            try {
                handle = await fs.promises.open(filePath, 'w');
            }
            catch (error) {
                if (!(options === null || options === void 0 ? void 0 : options.ensureFolderExists) || !FileSystem.isNotExistError(error)) {
                    throw error;
                }
                const folderPath = nodeJsPath.dirname(filePath);
                await FileSystem.ensureFolderAsync(folderPath);
                handle = await fs.promises.open(filePath, 'w');
            }
            try {
                // In practice this loop will have exactly 1 iteration, but the spec allows
                // for a writev call to write fewer bytes than requested
                while (toCopy.length) {
                    let bytesWritten = (await handle.writev(toCopy)).bytesWritten;
                    let buffersWritten = 0;
                    while (buffersWritten < toCopy.length) {
                        const bytesInCurrentBuffer = toCopy[buffersWritten].byteLength;
                        if (bytesWritten < bytesInCurrentBuffer) {
                            // This buffer was partially written.
                            toCopy[buffersWritten] = toCopy[buffersWritten].subarray(bytesWritten);
                            break;
                        }
                        bytesWritten -= bytesInCurrentBuffer;
                        buffersWritten++;
                    }
                    if (buffersWritten > 0) {
                        // Avoid cost of shifting the array more than needed.
                        toCopy.splice(0, buffersWritten);
                    }
                }
            }
            finally {
                await handle.close();
            }
        });
    }
    /**
     * Writes a text string to a file on disk, appending to the file if it already exists.
     * Behind the scenes it uses `fs.appendFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static appendToFile(filePath, contents, options) {
        FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, APPEND_TO_FILE_DEFAULT_OPTIONS), options);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents.toString(), options.convertLineEndings);
            }
            try {
                fsx.appendFileSync(filePath, contents, { encoding: options.encoding });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(filePath);
                    FileSystem.ensureFolder(folderPath);
                    fsx.appendFileSync(filePath, contents, { encoding: options.encoding });
                }
                else {
                    throw error;
                }
            }
        });
    }
    /**
     * An async version of {@link FileSystem.appendToFile}.
     */
    static async appendToFileAsync(filePath, contents, options) {
        await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, APPEND_TO_FILE_DEFAULT_OPTIONS), options);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents.toString(), options.convertLineEndings);
            }
            try {
                await fsx.appendFile(filePath, contents, { encoding: options.encoding });
            }
            catch (error) {
                if (options.ensureFolderExists) {
                    if (!FileSystem.isNotExistError(error)) {
                        throw error;
                    }
                    const folderPath = nodeJsPath.dirname(filePath);
                    await FileSystem.ensureFolderAsync(folderPath);
                    await fsx.appendFile(filePath, contents, { encoding: options.encoding });
                }
                else {
                    throw error;
                }
            }
        });
    }
    /**
     * Reads the contents of a file into a string.
     * Behind the scenes it uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFileOptions`
     */
    static readFile(filePath, options) {
        return FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, READ_FILE_DEFAULT_OPTIONS), options);
            let contents = FileSystem.readFileToBuffer(filePath).toString(options.encoding);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents, options.convertLineEndings);
            }
            return contents;
        });
    }
    /**
     * An async version of {@link FileSystem.readFile}.
     */
    static async readFileAsync(filePath, options) {
        return await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, READ_FILE_DEFAULT_OPTIONS), options);
            let contents = (await FileSystem.readFileToBufferAsync(filePath)).toString(options.encoding);
            if (options.convertLineEndings) {
                contents = Text_1.Text.convertTo(contents, options.convertLineEndings);
            }
            return contents;
        });
    }
    /**
     * Reads the contents of a file into a buffer.
     * Behind the scenes is uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     */
    static readFileToBuffer(filePath) {
        return FileSystem._wrapException(() => {
            return fsx.readFileSync(filePath);
        });
    }
    /**
     * An async version of {@link FileSystem.readFileToBuffer}.
     */
    static async readFileToBufferAsync(filePath) {
        return await FileSystem._wrapExceptionAsync(() => {
            return fsx.readFile(filePath);
        });
    }
    /**
     * Copies a single file from one location to another.
     * By default, destinationPath is overwritten if it already exists.
     *
     * @remarks
     * The `copyFile()` API cannot be used to copy folders.  It copies at most one file.
     * Use {@link FileSystem.copyFiles} if you need to recursively copy a tree of folders.
     *
     * The implementation is based on `copySync()` from the `fs-extra` package.
     */
    static copyFile(options) {
        options = Object.assign(Object.assign({}, COPY_FILE_DEFAULT_OPTIONS), options);
        if (FileSystem.getStatistics(options.sourcePath).isDirectory()) {
            throw new Error('The specified path refers to a folder; this operation expects a file object:\n' + options.sourcePath);
        }
        FileSystem._wrapException(() => {
            fsx.copySync(options.sourcePath, options.destinationPath, {
                errorOnExist: options.alreadyExistsBehavior === AlreadyExistsBehavior.Error,
                overwrite: options.alreadyExistsBehavior === AlreadyExistsBehavior.Overwrite
            });
        });
    }
    /**
     * An async version of {@link FileSystem.copyFile}.
     */
    static async copyFileAsync(options) {
        options = Object.assign(Object.assign({}, COPY_FILE_DEFAULT_OPTIONS), options);
        if ((await FileSystem.getStatisticsAsync(options.sourcePath)).isDirectory()) {
            throw new Error('The specified path refers to a folder; this operation expects a file object:\n' + options.sourcePath);
        }
        await FileSystem._wrapExceptionAsync(() => {
            return fsx.copy(options.sourcePath, options.destinationPath, {
                errorOnExist: options.alreadyExistsBehavior === AlreadyExistsBehavior.Error,
                overwrite: options.alreadyExistsBehavior === AlreadyExistsBehavior.Overwrite
            });
        });
    }
    /**
     * Copies a file or folder from one location to another, recursively copying any folder contents.
     * By default, destinationPath is overwritten if it already exists.
     *
     * @remarks
     * If you only intend to copy a single file, it is recommended to use {@link FileSystem.copyFile}
     * instead to more clearly communicate the intended operation.
     *
     * The implementation is based on `copySync()` from the `fs-extra` package.
     */
    static copyFiles(options) {
        options = Object.assign(Object.assign({}, COPY_FILES_DEFAULT_OPTIONS), options);
        FileSystem._wrapException(() => {
            fsx.copySync(options.sourcePath, options.destinationPath, {
                dereference: !!options.dereferenceSymlinks,
                errorOnExist: options.alreadyExistsBehavior === AlreadyExistsBehavior.Error,
                overwrite: options.alreadyExistsBehavior === AlreadyExistsBehavior.Overwrite,
                preserveTimestamps: !!options.preserveTimestamps,
                filter: options.filter
            });
        });
    }
    /**
     * An async version of {@link FileSystem.copyFiles}.
     */
    static async copyFilesAsync(options) {
        options = Object.assign(Object.assign({}, COPY_FILES_DEFAULT_OPTIONS), options);
        await FileSystem._wrapExceptionAsync(async () => {
            await fsx.copy(options.sourcePath, options.destinationPath, {
                dereference: !!options.dereferenceSymlinks,
                errorOnExist: options.alreadyExistsBehavior === AlreadyExistsBehavior.Error,
                overwrite: options.alreadyExistsBehavior === AlreadyExistsBehavior.Overwrite,
                preserveTimestamps: !!options.preserveTimestamps,
                filter: options.filter
            });
        });
    }
    /**
     * Deletes a file. Can optionally throw if the file doesn't exist.
     * Behind the scenes it uses `fs.unlinkSync()`.
     * @param filePath - The absolute or relative path to the file that should be deleted.
     * @param options - Optional settings that can change the behavior. Type: `IDeleteFileOptions`
     */
    static deleteFile(filePath, options) {
        FileSystem._wrapException(() => {
            options = Object.assign(Object.assign({}, DELETE_FILE_DEFAULT_OPTIONS), options);
            try {
                fsx.unlinkSync(filePath);
            }
            catch (error) {
                if (options.throwIfNotExists || !FileSystem.isNotExistError(error)) {
                    throw error;
                }
            }
        });
    }
    /**
     * An async version of {@link FileSystem.deleteFile}.
     */
    static async deleteFileAsync(filePath, options) {
        await FileSystem._wrapExceptionAsync(async () => {
            options = Object.assign(Object.assign({}, DELETE_FILE_DEFAULT_OPTIONS), options);
            try {
                await fsx.unlink(filePath);
            }
            catch (error) {
                if (options.throwIfNotExists || !FileSystem.isNotExistError(error)) {
                    throw error;
                }
            }
        });
    }
    // ===============
    // LINK OPERATIONS
    // ===============
    /**
     * Gets the statistics of a filesystem object. Does NOT follow the link to its target.
     * Behind the scenes it uses `fs.lstatSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getLinkStatistics(path) {
        return FileSystem._wrapException(() => {
            return fsx.lstatSync(path);
        });
    }
    /**
     * An async version of {@link FileSystem.getLinkStatistics}.
     */
    static async getLinkStatisticsAsync(path) {
        return await FileSystem._wrapExceptionAsync(() => {
            return fsx.lstat(path);
        });
    }
    /**
     * If `path` refers to a symbolic link, this returns the path of the link target, which may be
     * an absolute or relative path.
     *
     * @remarks
     * If `path` refers to a filesystem object that is not a symbolic link, then an `ErrnoException` is thrown
     * with code 'UNKNOWN'.  If `path` does not exist, then an `ErrnoException` is thrown with code `ENOENT`.
     *
     * @param path - The absolute or relative path to the symbolic link.
     * @returns the path of the link target
     */
    static readLink(path) {
        return FileSystem._wrapException(() => {
            return fsx.readlinkSync(path);
        });
    }
    /**
     * An async version of {@link FileSystem.readLink}.
     */
    static async readLinkAsync(path) {
        return await FileSystem._wrapExceptionAsync(() => {
            return fsx.readlink(path);
        });
    }
    /**
     * Creates an NTFS "directory junction" on Windows operating systems; for other operating systems, it
     * creates a regular symbolic link.  The link target must be a folder, not a file.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * For security reasons, Windows operating systems by default require administrator elevation to create
     * symbolic links.  As a result, on Windows it's generally recommended for Node.js tools to use hard links
     * (for files) or NTFS directory junctions (for folders), since regular users are allowed to create them.
     * Hard links and junctions are less vulnerable to symlink attacks because they cannot reference a network share,
     * and their target must exist at the time of link creation.  Non-Windows operating systems generally don't
     * restrict symlink creation, and as such are more vulnerable to symlink attacks.  Note that Windows can be
     * configured to permit regular users to create symlinks, for example by enabling Windows 10 "developer mode."
     *
     * A directory junction requires the link source and target to both be located on local disk volumes;
     * if not, use a symbolic link instead.
     */
    static createSymbolicLinkJunction(options) {
        FileSystem._wrapException(() => {
            return FileSystem._handleLink(() => {
                // For directories, we use a Windows "junction".  On POSIX operating systems, this produces a regular symlink.
                return fsx.symlinkSync(options.linkTargetPath, options.newLinkPath, 'junction');
            }, options);
        });
    }
    /**
     * An async version of {@link FileSystem.createSymbolicLinkJunction}.
     */
    static async createSymbolicLinkJunctionAsync(options) {
        await FileSystem._wrapExceptionAsync(() => {
            return FileSystem._handleLinkAsync(() => {
                // For directories, we use a Windows "junction".  On POSIX operating systems, this produces a regular symlink.
                return fsx.symlink(options.linkTargetPath, options.newLinkPath, 'junction');
            }, options);
        });
    }
    /**
     * Creates a symbolic link to a file.  On Windows operating systems, this may require administrator elevation.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * To avoid administrator elevation on Windows, use {@link FileSystem.createHardLink} instead.
     *
     * On Windows operating systems, the NTFS file system distinguishes file symlinks versus directory symlinks:
     * If the target is not the correct type, the symlink will be created successfully, but will fail to resolve.
     * Other operating systems do not make this distinction, in which case {@link FileSystem.createSymbolicLinkFile}
     * and {@link FileSystem.createSymbolicLinkFolder} can be used interchangeably, but doing so will make your
     * tool incompatible with Windows.
     */
    static createSymbolicLinkFile(options) {
        FileSystem._wrapException(() => {
            return FileSystem._handleLink(() => {
                return fsx.symlinkSync(options.linkTargetPath, options.newLinkPath, 'file');
            }, options);
        });
    }
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFile}.
     */
    static async createSymbolicLinkFileAsync(options) {
        await FileSystem._wrapExceptionAsync(() => {
            return FileSystem._handleLinkAsync(() => {
                return fsx.symlink(options.linkTargetPath, options.newLinkPath, 'file');
            }, options);
        });
    }
    /**
     * Creates a symbolic link to a folder.  On Windows operating systems, this may require administrator elevation.
     * Behind the scenes it uses `fs.symlinkSync()`.
     *
     * @remarks
     * To avoid administrator elevation on Windows, use {@link FileSystem.createSymbolicLinkJunction} instead.
     *
     * On Windows operating systems, the NTFS file system distinguishes file symlinks versus directory symlinks:
     * If the target is not the correct type, the symlink will be created successfully, but will fail to resolve.
     * Other operating systems do not make this distinction, in which case {@link FileSystem.createSymbolicLinkFile}
     * and {@link FileSystem.createSymbolicLinkFolder} can be used interchangeably, but doing so will make your
     * tool incompatible with Windows.
     */
    static createSymbolicLinkFolder(options) {
        FileSystem._wrapException(() => {
            return FileSystem._handleLink(() => {
                return fsx.symlinkSync(options.linkTargetPath, options.newLinkPath, 'dir');
            }, options);
        });
    }
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFolder}.
     */
    static async createSymbolicLinkFolderAsync(options) {
        await FileSystem._wrapExceptionAsync(() => {
            return FileSystem._handleLinkAsync(() => {
                return fsx.symlink(options.linkTargetPath, options.newLinkPath, 'dir');
            }, options);
        });
    }
    /**
     * Creates a hard link.  The link target must be a file, not a folder.
     * Behind the scenes it uses `fs.linkSync()`.
     *
     * @remarks
     * For security reasons, Windows operating systems by default require administrator elevation to create
     * symbolic links.  As a result, on Windows it's generally recommended for Node.js tools to use hard links
     * (for files) or NTFS directory junctions (for folders), since regular users are allowed to create them.
     * Hard links and junctions are less vulnerable to symlink attacks because they cannot reference a network share,
     * and their target must exist at the time of link creation.  Non-Windows operating systems generally don't
     * restrict symlink creation, and as such are more vulnerable to symlink attacks.  Note that Windows can be
     * configured to permit regular users to create symlinks, for example by enabling Windows 10 "developer mode."
     *
     * A hard link requires the link source and target to both be located on same disk volume;
     * if not, use a symbolic link instead.
     */
    static createHardLink(options) {
        FileSystem._wrapException(() => {
            return FileSystem._handleLink(() => {
                return fsx.linkSync(options.linkTargetPath, options.newLinkPath);
            }, Object.assign(Object.assign({}, options), { linkTargetMustExist: true }));
        });
    }
    /**
     * An async version of {@link FileSystem.createHardLink}.
     */
    static async createHardLinkAsync(options) {
        await FileSystem._wrapExceptionAsync(() => {
            return FileSystem._handleLinkAsync(() => {
                return fsx.link(options.linkTargetPath, options.newLinkPath);
            }, Object.assign(Object.assign({}, options), { linkTargetMustExist: true }));
        });
    }
    /**
     * Follows a link to its destination and returns the absolute path to the final target of the link.
     * Behind the scenes it uses `fs.realpathSync()`.
     * @param linkPath - The path to the link.
     */
    static getRealPath(linkPath) {
        return FileSystem._wrapException(() => {
            return fsx.realpathSync(linkPath);
        });
    }
    /**
     * An async version of {@link FileSystem.getRealPath}.
     */
    static async getRealPathAsync(linkPath) {
        return await FileSystem._wrapExceptionAsync(() => {
            return fsx.realpath(linkPath);
        });
    }
    // ===============
    // UTILITY FUNCTIONS
    // ===============
    /**
     * Returns true if the error object indicates the file or folder already exists (`EEXIST`).
     */
    static isExistError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'EEXIST';
    }
    /**
     * Returns true if the error object indicates the file or folder does not exist (`ENOENT` or `ENOTDIR`)
     */
    static isNotExistError(error) {
        return FileSystem.isFileDoesNotExistError(error) || FileSystem.isFolderDoesNotExistError(error);
    }
    /**
     * Returns true if the error object indicates the file does not exist (`ENOENT`).
     */
    static isFileDoesNotExistError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'ENOENT';
    }
    /**
     * Returns true if the error object indicates the folder does not exist (`ENOTDIR`).
     */
    static isFolderDoesNotExistError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'ENOTDIR';
    }
    /**
     * Returns true if the error object indicates the target is a directory (`EISDIR`).
     */
    static isDirectoryError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'EISDIR';
    }
    /**
     * Returns true if the error object indicates the target is not a directory (`ENOTDIR`).
     */
    static isNotDirectoryError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'ENOTDIR';
    }
    /**
     * Returns true if the error object indicates that the `unlink` system call failed
     * due to a permissions issue (`EPERM`).
     */
    static isUnlinkNotPermittedError(error) {
        return FileSystem.isErrnoException(error) && error.code === 'EPERM' && error.syscall === 'unlink';
    }
    /**
     * Detects if the provided error object is a `NodeJS.ErrnoException`
     */
    static isErrnoException(error) {
        const typedError = error;
        return (typeof typedError.code === 'string' &&
            typeof typedError.errno === 'number' &&
            typeof typedError.path === 'string' &&
            typeof typedError.syscall === 'string');
    }
    static _handleLink(linkFn, options) {
        try {
            linkFn();
        }
        catch (error) {
            if (FileSystem.isExistError(error)) {
                // Link exists, handle it
                switch (options.alreadyExistsBehavior) {
                    case AlreadyExistsBehavior.Ignore:
                        break;
                    case AlreadyExistsBehavior.Overwrite:
                        // fsx.linkSync does not allow overwriting so we must manually delete. If it's
                        // a folder, it will throw an error.
                        this.deleteFile(options.newLinkPath);
                        linkFn();
                        break;
                    case AlreadyExistsBehavior.Error:
                    default:
                        throw error;
                }
            }
            else {
                // When attempting to create a link in a directory that does not exist, an ENOENT
                // or ENOTDIR error is thrown, so we should ensure the directory exists before
                // retrying. There are also cases where the target file must exist, so validate in
                // those cases to avoid confusing the missing directory with the missing target file.
                if (FileSystem.isNotExistError(error) &&
                    (!options.linkTargetMustExist || FileSystem.exists(options.linkTargetPath))) {
                    this.ensureFolder(nodeJsPath.dirname(options.newLinkPath));
                    linkFn();
                }
                else {
                    throw error;
                }
            }
        }
    }
    static async _handleLinkAsync(linkFn, options) {
        try {
            await linkFn();
        }
        catch (error) {
            if (FileSystem.isExistError(error)) {
                // Link exists, handle it
                switch (options.alreadyExistsBehavior) {
                    case AlreadyExistsBehavior.Ignore:
                        break;
                    case AlreadyExistsBehavior.Overwrite:
                        // fsx.linkSync does not allow overwriting so we must manually delete. If it's
                        // a folder, it will throw an error.
                        await this.deleteFileAsync(options.newLinkPath);
                        await linkFn();
                        break;
                    case AlreadyExistsBehavior.Error:
                    default:
                        throw error;
                }
            }
            else {
                // When attempting to create a link in a directory that does not exist, an ENOENT
                // or ENOTDIR error is thrown, so we should ensure the directory exists before
                // retrying. There are also cases where the target file must exist, so validate in
                // those cases to avoid confusing the missing directory with the missing target file.
                if (FileSystem.isNotExistError(error) &&
                    (!options.linkTargetMustExist || (await FileSystem.existsAsync(options.linkTargetPath)))) {
                    await this.ensureFolderAsync(nodeJsPath.dirname(options.newLinkPath));
                    await linkFn();
                }
                else {
                    throw error;
                }
            }
        }
    }
    static _wrapException(fn) {
        try {
            return fn();
        }
        catch (error) {
            FileSystem._updateErrorMessage(error);
            throw error;
        }
    }
    static async _wrapExceptionAsync(fn) {
        try {
            return await fn();
        }
        catch (error) {
            FileSystem._updateErrorMessage(error);
            throw error;
        }
    }
    static _updateErrorMessage(error) {
        if (FileSystem.isErrnoException(error)) {
            if (FileSystem.isFileDoesNotExistError(error)) {
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `File does not exist: ${error.path}\n${error.message}`;
            }
            else if (FileSystem.isFolderDoesNotExistError(error)) {
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `Folder does not exist: ${error.path}\n${error.message}`;
            }
            else if (FileSystem.isExistError(error)) {
                // Oddly, the typing does not include the `dest` property even though the documentation
                // indicates it is there: https://nodejs.org/docs/latest-v10.x/api/errors.html#errors_error_dest
                const extendedError = error;
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `File or folder already exists: ${extendedError.dest}\n${error.message}`;
            }
            else if (FileSystem.isUnlinkNotPermittedError(error)) {
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `File or folder could not be deleted: ${error.path}\n${error.message}`;
            }
            else if (FileSystem.isDirectoryError(error)) {
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `Target is a folder, not a file: ${error.path}\n${error.message}`;
            }
            else if (FileSystem.isNotDirectoryError(error)) {
                // eslint-disable-line @typescript-eslint/no-use-before-define
                error.message = `Target is not a folder: ${error.path}\n${error.message}`;
            }
        }
    }
}
exports.FileSystem = FileSystem;
//# sourceMappingURL=FileSystem.js.map