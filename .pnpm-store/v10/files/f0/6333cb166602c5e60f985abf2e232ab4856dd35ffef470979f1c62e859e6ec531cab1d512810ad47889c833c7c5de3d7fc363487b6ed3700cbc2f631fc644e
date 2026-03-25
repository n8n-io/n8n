// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { diag } from "@opentelemetry/api";
import { FileAccessControl } from "./fileAccessControl.js";
import { confirmDirExists, getShallowDirectorySize } from "./fileSystemHelpers.js";
import { readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
/**
 * File system persist class.
 * @internal
 */
export class FileSystemPersist {
    constructor(instrumentationKey, _options) {
        var _a, _b;
        this._options = _options;
        this.fileRetemptionPeriod = 2 * 24 * 60 * 60 * 1000; // 2 days
        this.cleanupTimeOut = 60 * 60 * 1000; // 1 hour
        this.maxBytesOnDisk = 50000000; // ~50MB
        this._tempDirectory = "";
        this._fileCleanupTimer = null;
        this._instrumentationKey = instrumentationKey;
        if ((_a = this._options) === null || _a === void 0 ? void 0 : _a.disableOfflineStorage) {
            this._enabled = false;
            return;
        }
        this._enabled = true;
        FileAccessControl.checkFileProtection();
        if (!FileAccessControl.OS_PROVIDES_FILE_PROTECTION) {
            this._enabled = false;
            diag.error("Sufficient file protection capabilities were not detected. Files will not be persisted");
        }
        if (!this._instrumentationKey) {
            this._enabled = false;
            diag.error(`No instrumentation key was provided to FileSystemPersister. Files will not be persisted`);
        }
        if (this._enabled) {
            this._tempDirectory = join(((_b = this._options) === null || _b === void 0 ? void 0 : _b.storageDirectory) || tmpdir(), "Microsoft", "AzureMonitor", FileSystemPersist.TEMPDIR_PREFIX + this._instrumentationKey);
            // Starts file cleanup task
            if (!this._fileCleanupTimer) {
                this._fileCleanupTimer = setTimeout(() => {
                    this._fileCleanupTask();
                }, this.cleanupTimeOut);
                this._fileCleanupTimer.unref();
            }
        }
    }
    push(value) {
        var _a;
        if (this._enabled) {
            diag.debug("Pushing value to persistent storage", value.toString());
            return this._storeToDisk(JSON.stringify(value));
        }
        // Only return a false promise if the SDK isn't set to disable offline storage
        if (!((_a = this._options) === null || _a === void 0 ? void 0 : _a.disableOfflineStorage)) {
            return new Promise((resolve) => {
                resolve(false);
            });
        }
        return new Promise((resolve) => {
            resolve(true);
        });
    }
    async shift() {
        if (this._enabled) {
            diag.debug("Searching for filesystem persisted files");
            try {
                const buffer = await this._getFirstFileOnDisk();
                if (buffer) {
                    return JSON.parse(buffer.toString("utf8"));
                }
            }
            catch (e) {
                diag.debug("Failed to read persisted file", e);
            }
            return null;
        }
        return new Promise((resolve) => {
            resolve(null);
        });
    }
    /**
     * Check for temp telemetry files
     * reads the first file if exist, deletes it and tries to send its load
     */
    async _getFirstFileOnDisk() {
        try {
            const stats = await stat(this._tempDirectory);
            if (stats.isDirectory()) {
                const origFiles = await readdir(this._tempDirectory);
                const files = origFiles.filter((f) => basename(f).includes(FileSystemPersist.FILENAME_SUFFIX));
                if (files.length === 0) {
                    return null;
                }
                else {
                    const firstFile = files[0];
                    const filePath = join(this._tempDirectory, firstFile);
                    const payload = await readFile(filePath);
                    // delete the file first to prevent double sending
                    await unlink(filePath);
                    return payload;
                }
            }
            return null;
        }
        catch (e) {
            if (e.code === "ENOENT") {
                // File does not exist -- return null instead of throwing
                return null;
            }
            else {
                throw e;
            }
        }
    }
    async _storeToDisk(payload) {
        try {
            await confirmDirExists(this._tempDirectory);
        }
        catch (error) {
            diag.warn(`Error while checking/creating directory: `, error && error.message);
            return false;
        }
        try {
            const size = await getShallowDirectorySize(this._tempDirectory);
            if (size > this.maxBytesOnDisk) {
                diag.warn(`Not saving data due to max size limit being met. Directory size in bytes is: ${size}`);
                return false;
            }
        }
        catch (error) {
            diag.warn(`Error while checking size of persistence directory: `, error && error.message);
            return false;
        }
        const fileName = `${new Date().getTime()}${FileSystemPersist.FILENAME_SUFFIX}`;
        const fileFullPath = join(this._tempDirectory, fileName);
        // Mode 600 is w/r for creator and no read access for others
        diag.info(`saving data to disk at: ${fileFullPath}`);
        try {
            await writeFile(fileFullPath, payload, { mode: 0o600 });
        }
        catch (writeError) {
            diag.warn(`Error writing file to persistent file storage`, writeError);
            return false;
        }
        return true;
    }
    async _fileCleanupTask() {
        try {
            const stats = await stat(this._tempDirectory);
            if (stats.isDirectory()) {
                const origFiles = await readdir(this._tempDirectory);
                const files = origFiles.filter((f) => basename(f).includes(FileSystemPersist.FILENAME_SUFFIX));
                if (files.length === 0) {
                    return false;
                }
                else {
                    files.forEach(async (file) => {
                        // Check expiration
                        const fileCreationDate = new Date(parseInt(file.split(FileSystemPersist.FILENAME_SUFFIX)[0]));
                        const expired = new Date(+new Date() - this.fileRetemptionPeriod) > fileCreationDate;
                        if (expired) {
                            const filePath = join(this._tempDirectory, file);
                            await unlink(filePath);
                        }
                    });
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            diag.info(`Failed cleanup of persistent file storage expired files`, error);
            return false;
        }
    }
}
FileSystemPersist.TEMPDIR_PREFIX = "ot-azure-exporter-";
FileSystemPersist.FILENAME_SUFFIX = ".ai.json";
//# sourceMappingURL=fileSystemPersist.js.map