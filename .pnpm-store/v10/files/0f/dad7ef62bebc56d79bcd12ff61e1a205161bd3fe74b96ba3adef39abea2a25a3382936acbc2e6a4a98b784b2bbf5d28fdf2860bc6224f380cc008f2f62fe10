import { Buffer } from 'node:buffer';
import { FlatCacheOptions, FlatCache } from 'flat-cache';

type FileEntryCacheOptions = {
    currentWorkingDirectory?: string;
    useModifiedTime?: boolean;
    useCheckSum?: boolean;
    hashAlgorithm?: string;
    cache?: FlatCacheOptions;
};
type GetFileDescriptorOptions = {
    useCheckSum?: boolean;
    useModifiedTime?: boolean;
    currentWorkingDirectory?: string;
};
type FileDescriptor = {
    key: string;
    changed?: boolean;
    meta: FileDescriptorMeta;
    notFound?: boolean;
    err?: Error;
};
type FileDescriptorMeta = {
    size?: number;
    mtime?: number;
    hash?: string;
    data?: unknown;
};
type AnalyzedFiles = {
    changedFiles: string[];
    notFoundFiles: string[];
    notChangedFiles: string[];
};
declare function createFromFile(filePath: string, useCheckSum?: boolean, currentWorkingDirectory?: string): FileEntryCache;
declare function create(cacheId: string, cacheDirectory?: string, useCheckSum?: boolean, currentWorkingDirectory?: string): FileEntryCache;
declare class FileEntryDefault {
    static create: typeof create;
    static createFromFile: typeof createFromFile;
}
declare class FileEntryCache {
    private _cache;
    private _useCheckSum;
    private _useModifiedTime;
    private _currentWorkingDirectory;
    private _hashAlgorithm;
    /**
     * Create a new FileEntryCache instance
     * @param options - The options for the FileEntryCache
     */
    constructor(options?: FileEntryCacheOptions);
    /**
     * Get the cache
     * @returns {FlatCache} The cache
     */
    get cache(): FlatCache;
    /**
     * Set the cache
     * @param {FlatCache} cache - The cache to set
     */
    set cache(cache: FlatCache);
    /**
     * Use the hash to check if the file has changed
     * @returns {boolean} if the hash is used to check if the file has changed
     */
    get useCheckSum(): boolean;
    /**
     * Set the useCheckSum value
     * @param {boolean} value - The value to set
     */
    set useCheckSum(value: boolean);
    /**
     * Use the modified time to check if the file has changed
     * @returns {boolean} if the modified time is used to check if the file has changed
     */
    get useModifiedTime(): boolean;
    /**
     * Set the useModifiedTime value
     * @param {boolean} value - The value to set
     */
    set useModifiedTime(value: boolean);
    /**
     * Get the hash algorithm
     * @returns {string} The hash algorithm
     */
    get hashAlgorithm(): string;
    /**
     * Set the hash algorithm
     * @param {string} value - The value to set
     */
    set hashAlgorithm(value: string);
    /**
     * Get the current working directory
     * @returns {string | undefined} The current working directory
     */
    get currentWorkingDirectory(): string | undefined;
    /**
     * Set the current working directory
     * @param {string | undefined} value - The value to set
     */
    set currentWorkingDirectory(value: string | undefined);
    /**
     * Given a buffer, calculate md5 hash of its content.
     * @method getHash
     * @param  {Buffer} buffer   buffer to calculate hash on
     * @return {String}          content hash digest
     */
    getHash(buffer: Buffer): string;
    /**
     * Create the key for the file path used for caching.
     * @method createFileKey
     * @param {String} filePath
     * @return {String}
     */
    createFileKey(filePath: string, options?: {
        currentWorkingDirectory?: string;
    }): string;
    /**
     * Check if the file path is a relative path
     * @method isRelativePath
     * @param filePath - The file path to check
     * @returns {boolean} if the file path is a relative path, false otherwise
     */
    isRelativePath(filePath: string): boolean;
    /**
    * Delete the cache file from the disk
    * @method deleteCacheFile
    * @return {boolean}       true if the file was deleted, false otherwise
    */
    deleteCacheFile(): boolean;
    /**
    * Remove the cache from the file and clear the memory cache
    * @method destroy
    */
    destroy(): void;
    /**
     * Remove and Entry From the Cache
     * @method removeEntry
     * @param filePath - The file path to remove from the cache
     */
    removeEntry(filePath: string, options?: {
        currentWorkingDirectory?: string;
    }): void;
    /**
     * Reconcile the cache
     * @method reconcile
     */
    reconcile(): void;
    /**
     * Check if the file has changed
     * @method hasFileChanged
     * @param filePath - The file path to check
     * @returns {boolean} if the file has changed, false otherwise
     */
    hasFileChanged(filePath: string): boolean;
    /**
     * Get the file descriptor for the file path
     * @method getFileDescriptor
     * @param filePath - The file path to get the file descriptor for
     * @param options - The options for getting the file descriptor
     * @returns The file descriptor
     */
    getFileDescriptor(filePath: string, options?: GetFileDescriptorOptions): FileDescriptor;
    /**
     * Get the file descriptors for the files
     * @method normalizeEntries
     * @param files?: string[] - The files to get the file descriptors for
     * @returns The file descriptors
     */
    normalizeEntries(files?: string[]): FileDescriptor[];
    /**
     * Analyze the files
     * @method analyzeFiles
     * @param files - The files to analyze
     * @returns {AnalyzedFiles} The analysis of the files
     */
    analyzeFiles(files: string[]): AnalyzedFiles;
    /**
     * Get the updated files
     * @method getUpdatedFiles
     * @param files - The files to get the updated files for
     * @returns {string[]} The updated files
     */
    getUpdatedFiles(files: string[]): string[];
    /**
     * Get the not found files
     * @method getFileDescriptorsByPath
     * @param filePath - the files that you want to get from a path
     * @returns {FileDescriptor[]} The not found files
     */
    getFileDescriptorsByPath(filePath: string): FileDescriptor[];
    /**
     * Get the Absolute Path. If it is already absolute it will return the path as is.
     * @method getAbsolutePath
     * @param filePath - The file path to get the absolute path for
     * @param options - The options for getting the absolute path. The current working directory is used if not provided.
     * @returns {string}
     */
    getAbsolutePath(filePath: string, options?: {
        currentWorkingDirectory?: string;
    }): string;
    /**
     * Rename the absolute path keys. This is used when a directory is changed or renamed.
     * @method renameAbsolutePathKeys
     * @param oldPath - The old path to rename
     * @param newPath - The new path to rename to
     */
    renameAbsolutePathKeys(oldPath: string, newPath: string): void;
}

export { type AnalyzedFiles, type FileDescriptor, type FileDescriptorMeta, FileEntryCache, type FileEntryCacheOptions, type GetFileDescriptorOptions, create, createFromFile, FileEntryDefault as default };
