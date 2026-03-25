import * as fs from 'fs';
import { type NewlineKind, Encoding } from './Text';
import { PosixModeBits } from './PosixModeBits';
/**
 * An alias for the Node.js `fs.Stats` object.
 *
 * @remarks
 * This avoids the need to import the `fs` package when using the {@link FileSystem} API.
 * @public
 */
export type FileSystemStats = fs.Stats;
/**
 * An alias for the Node.js `fs.Dirent` object.
 *
 * @remarks
 * This avoids the need to import the `fs` package when using the {@link FileSystem} API.
 * @public
 */
export type FolderItem = fs.Dirent;
/**
 * The options for {@link FileSystem.readFolderItems} and {@link FileSystem.readFolderItemNames}.
 * @public
 */
export interface IFileSystemReadFolderOptions {
    /**
     * If true, returns the absolute paths of the files in the folder.
     * @defaultValue false
     */
    absolutePaths?: boolean;
}
/**
 * The options for {@link FileSystem.writeBuffersToFile}
 * @public
 */
export interface IFileSystemWriteBinaryFileOptions {
    /**
     * If true, will ensure the folder is created before writing the file.
     * @defaultValue false
     */
    ensureFolderExists?: boolean;
}
/**
 * The options for {@link FileSystem.writeFile}
 * @public
 */
export interface IFileSystemWriteFileOptions extends IFileSystemWriteBinaryFileOptions {
    /**
     * If specified, will normalize line endings to the specified style of newline.
     * @defaultValue `undefined` which means no conversion will be performed
     */
    convertLineEndings?: NewlineKind;
    /**
     * If specified, will change the encoding of the file that will be written.
     * @defaultValue "utf8"
     */
    encoding?: Encoding;
}
/**
 * The options for {@link FileSystem.readFile}
 * @public
 */
export interface IFileSystemReadFileOptions {
    /**
     * If specified, will change the encoding of the file that will be written.
     * @defaultValue Encoding.Utf8
     */
    encoding?: Encoding;
    /**
     * If specified, will normalize line endings to the specified style of newline.
     * @defaultValue `undefined` which means no conversion will be performed
     */
    convertLineEndings?: NewlineKind;
}
/**
 * The options for {@link FileSystem.move}
 * @public
 */
export interface IFileSystemMoveOptions {
    /**
     * The path of the existing object to be moved.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * The new path for the object.
     * The path may be absolute or relative.
     */
    destinationPath: string;
    /**
     * If true, will overwrite the file if it already exists.
     * @defaultValue true
     */
    overwrite?: boolean;
    /**
     * If true, will ensure the folder is created before writing the file.
     * @defaultValue false
     */
    ensureFolderExists?: boolean;
}
/**
 * @public
 */
export interface IFileSystemCopyFileBaseOptions {
    /**
     * The path of the existing object to be copied.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * Specifies what to do if the destination path already exists.
     * @defaultValue {@link AlreadyExistsBehavior.Overwrite}
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
}
/**
 * The options for {@link FileSystem.copyFile}
 * @public
 */
export interface IFileSystemCopyFileOptions extends IFileSystemCopyFileBaseOptions {
    /**
     * The path that the object will be copied to.
     * The path may be absolute or relative.
     */
    destinationPath: string;
}
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
export declare enum AlreadyExistsBehavior {
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
    Overwrite = "overwrite",
    /**
     * If the output file path already exists, the operation will fail, and an error
     * will be reported.
     */
    Error = "error",
    /**
     * If the output file path already exists, skip this item, and continue the operation.
     */
    Ignore = "ignore"
}
/**
 * Callback function type for {@link IFileSystemCopyFilesAsyncOptions.filter}
 * @public
 */
export type FileSystemCopyFilesAsyncFilter = (sourcePath: string, destinationPath: string) => Promise<boolean>;
/**
 * Callback function type for {@link IFileSystemCopyFilesOptions.filter}
 * @public
 */
export type FileSystemCopyFilesFilter = (sourcePath: string, destinationPath: string) => boolean;
/**
 * The options for {@link FileSystem.copyFilesAsync}
 * @public
 */
export interface IFileSystemCopyFilesAsyncOptions {
    /**
     * The starting path of the file or folder to be copied.
     * The path may be absolute or relative.
     */
    sourcePath: string;
    /**
     * The path that the files will be copied to.
     * The path may be absolute or relative.
     */
    destinationPath: string;
    /**
     * If true, then when copying symlinks, copy the target object instead of copying the link.
     */
    dereferenceSymlinks?: boolean;
    /**
     * Specifies what to do if a destination path already exists.
     *
     * @remarks
     * This setting is applied individually for each file being copied.
     * For example, `AlreadyExistsBehavior.Overwrite` will not recursively delete a folder
     * whose path corresponds to an individual file that is being copied to that location.
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
    /**
     * If true, then the target object will be assigned "last modification" and "last access" timestamps
     * that are the same as the source.  Otherwise, the OS default timestamps are assigned.
     */
    preserveTimestamps?: boolean;
    /**
     * A callback that will be invoked for each path that is copied.  The callback can return `false`
     * to cause the object to be excluded from the operation.
     */
    filter?: FileSystemCopyFilesAsyncFilter | FileSystemCopyFilesFilter;
}
/**
 * The options for {@link FileSystem.copyFiles}
 * @public
 */
export interface IFileSystemCopyFilesOptions extends IFileSystemCopyFilesAsyncOptions {
    /**  {@inheritdoc IFileSystemCopyFilesAsyncOptions.filter} */
    filter?: FileSystemCopyFilesFilter;
}
/**
 * The options for {@link FileSystem.deleteFile}
 * @public
 */
export interface IFileSystemDeleteFileOptions {
    /**
     * If true, will throw an exception if the file did not exist before `deleteFile()` was called.
     * @defaultValue false
     */
    throwIfNotExists?: boolean;
}
/**
 * The options for {@link FileSystem.updateTimes}
 * Both times must be specified.
 * @public
 */
export interface IFileSystemUpdateTimeParameters {
    /**
     * The POSIX epoch time or Date when this was last accessed.
     */
    accessedTime: number | Date;
    /**
     * The POSIX epoch time or Date when this was last modified
     */
    modifiedTime: number | Date;
}
/**
 * The options for {@link FileSystem.createSymbolicLinkJunction}, {@link FileSystem.createSymbolicLinkFile},
 * {@link FileSystem.createSymbolicLinkFolder}, and {@link FileSystem.createHardLink}.
 *
 * @public
 */
export interface IFileSystemCreateLinkOptions {
    /**
     * The newly created symbolic link will point to `linkTargetPath` as its target.
     */
    linkTargetPath: string;
    /**
     * The newly created symbolic link will have this path.
     */
    newLinkPath: string;
    /**
     * Specifies what to do if the path to create already exists.
     * The default is `AlreadyExistsBehavior.Error`.
     */
    alreadyExistsBehavior?: AlreadyExistsBehavior;
}
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
export declare class FileSystem {
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
    static exists(path: string): boolean;
    /**
     * An async version of {@link FileSystem.exists}.
     */
    static existsAsync(path: string): Promise<boolean>;
    /**
     * Gets the statistics for a particular filesystem object.
     * If the path is a link, this function follows the link and returns statistics about the link target.
     * Behind the scenes it uses `fs.statSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getStatistics(path: string): FileSystemStats;
    /**
     * An async version of {@link FileSystem.getStatistics}.
     */
    static getStatisticsAsync(path: string): Promise<FileSystemStats>;
    /**
     * Updates the accessed and modified timestamps of the filesystem object referenced by path.
     * Behind the scenes it uses `fs.utimesSync()`.
     * The caller should specify both times in the `times` parameter.
     * @param path - The path of the file that should be modified.
     * @param times - The times that the object should be updated to reflect.
     */
    static updateTimes(path: string, times: IFileSystemUpdateTimeParameters): void;
    /**
     * An async version of {@link FileSystem.updateTimes}.
     */
    static updateTimesAsync(path: string, times: IFileSystemUpdateTimeParameters): Promise<void>;
    /**
     * Changes the permissions (i.e. file mode bits) for a filesystem object.
     * Behind the scenes it uses `fs.chmodSync()`.
     * @param path - The absolute or relative path to the object that should be updated.
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static changePosixModeBits(path: string, modeBits: PosixModeBits): void;
    /**
     * An async version of {@link FileSystem.changePosixModeBits}.
     */
    static changePosixModeBitsAsync(path: string, mode: PosixModeBits): Promise<void>;
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
    static getPosixModeBits(path: string): PosixModeBits;
    /**
     * An async version of {@link FileSystem.getPosixModeBits}.
     */
    static getPosixModeBitsAsync(path: string): Promise<PosixModeBits>;
    /**
     * Returns a 10-character string representation of a PosixModeBits value similar to what
     * would be displayed by a command such as "ls -l" on a POSIX-like operating system.
     * @remarks
     * For example, `PosixModeBits.AllRead | PosixModeBits.AllWrite` would be formatted as "-rw-rw-rw-".
     * @param modeBits - POSIX-style file mode bits specified using the {@link PosixModeBits} enum
     */
    static formatPosixModeBits(modeBits: PosixModeBits): string;
    /**
     * Moves a file. The folder must exist, unless the `ensureFolderExists` option is provided.
     * Behind the scenes it uses `fs-extra.moveSync()`
     */
    static move(options: IFileSystemMoveOptions): void;
    /**
     * An async version of {@link FileSystem.move}.
     */
    static moveAsync(options: IFileSystemMoveOptions): Promise<void>;
    /**
     * Recursively creates a folder at a given path.
     * Behind the scenes is uses `fs-extra.ensureDirSync()`.
     * @remarks
     * Throws an exception if anything in the folderPath is not a folder.
     * @param folderPath - The absolute or relative path of the folder which should be created.
     */
    static ensureFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.ensureFolder}.
     */
    static ensureFolderAsync(folderPath: string): Promise<void>;
    /**
     * Reads the names of folder entries, not including "." or "..".
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItemNames(folderPath: string, options?: IFileSystemReadFolderOptions): string[];
    /**
     * An async version of {@link FileSystem.readFolderItemNames}.
     */
    static readFolderItemNamesAsync(folderPath: string, options?: IFileSystemReadFolderOptions): Promise<string[]>;
    /**
     * Reads the contents of the folder, not including "." or "..", returning objects including the
     * entry names and types.
     * Behind the scenes it uses `fs.readdirSync()`.
     * @param folderPath - The absolute or relative path to the folder which should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFolderOptions`
     */
    static readFolderItems(folderPath: string, options?: IFileSystemReadFolderOptions): FolderItem[];
    /**
     * An async version of {@link FileSystem.readFolderItems}.
     */
    static readFolderItemsAsync(folderPath: string, options?: IFileSystemReadFolderOptions): Promise<FolderItem[]>;
    /**
     * Deletes a folder, including all of its contents.
     * Behind the scenes is uses `fs-extra.removeSync()`.
     * @remarks
     * Does not throw if the folderPath does not exist.
     * @param folderPath - The absolute or relative path to the folder which should be deleted.
     */
    static deleteFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.deleteFolder}.
     */
    static deleteFolderAsync(folderPath: string): Promise<void>;
    /**
     * Deletes the content of a folder, but not the folder itself. Also ensures the folder exists.
     * Behind the scenes it uses `fs-extra.emptyDirSync()`.
     * @remarks
     * This is a workaround for a common race condition, where the virus scanner holds a lock on the folder
     * for a brief period after it was deleted, causing EBUSY errors for any code that tries to recreate the folder.
     * @param folderPath - The absolute or relative path to the folder which should have its contents deleted.
     */
    static ensureEmptyFolder(folderPath: string): void;
    /**
     * An async version of {@link FileSystem.ensureEmptyFolder}.
     */
    static ensureEmptyFolderAsync(folderPath: string): Promise<void>;
    /**
     * Writes a text string to a file on disk, overwriting the file if it already exists.
     * Behind the scenes it uses `fs.writeFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static writeFile(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): void;
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
    static writeBuffersToFile(filePath: string, contents: ReadonlyArray<Uint8Array>, options?: IFileSystemWriteBinaryFileOptions): void;
    /**
     * An async version of {@link FileSystem.writeFile}.
     */
    static writeFileAsync(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): Promise<void>;
    /**
     * An async version of {@link FileSystem.writeBuffersToFile}.
     */
    static writeBuffersToFileAsync(filePath: string, contents: ReadonlyArray<Uint8Array>, options?: IFileSystemWriteBinaryFileOptions): Promise<void>;
    /**
     * Writes a text string to a file on disk, appending to the file if it already exists.
     * Behind the scenes it uses `fs.appendFileSync()`.
     * @remarks
     * Throws an error if the folder doesn't exist, unless ensureFolder=true.
     * @param filePath - The absolute or relative path of the file.
     * @param contents - The text that should be written to the file.
     * @param options - Optional settings that can change the behavior. Type: `IWriteFileOptions`
     */
    static appendToFile(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): void;
    /**
     * An async version of {@link FileSystem.appendToFile}.
     */
    static appendToFileAsync(filePath: string, contents: string | Buffer, options?: IFileSystemWriteFileOptions): Promise<void>;
    /**
     * Reads the contents of a file into a string.
     * Behind the scenes it uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     * @param options - Optional settings that can change the behavior. Type: `IReadFileOptions`
     */
    static readFile(filePath: string, options?: IFileSystemReadFileOptions): string;
    /**
     * An async version of {@link FileSystem.readFile}.
     */
    static readFileAsync(filePath: string, options?: IFileSystemReadFileOptions): Promise<string>;
    /**
     * Reads the contents of a file into a buffer.
     * Behind the scenes is uses `fs.readFileSync()`.
     * @param filePath - The relative or absolute path to the file whose contents should be read.
     */
    static readFileToBuffer(filePath: string): Buffer;
    /**
     * An async version of {@link FileSystem.readFileToBuffer}.
     */
    static readFileToBufferAsync(filePath: string): Promise<Buffer>;
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
    static copyFile(options: IFileSystemCopyFileOptions): void;
    /**
     * An async version of {@link FileSystem.copyFile}.
     */
    static copyFileAsync(options: IFileSystemCopyFileOptions): Promise<void>;
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
    static copyFiles(options: IFileSystemCopyFilesOptions): void;
    /**
     * An async version of {@link FileSystem.copyFiles}.
     */
    static copyFilesAsync(options: IFileSystemCopyFilesAsyncOptions): Promise<void>;
    /**
     * Deletes a file. Can optionally throw if the file doesn't exist.
     * Behind the scenes it uses `fs.unlinkSync()`.
     * @param filePath - The absolute or relative path to the file that should be deleted.
     * @param options - Optional settings that can change the behavior. Type: `IDeleteFileOptions`
     */
    static deleteFile(filePath: string, options?: IFileSystemDeleteFileOptions): void;
    /**
     * An async version of {@link FileSystem.deleteFile}.
     */
    static deleteFileAsync(filePath: string, options?: IFileSystemDeleteFileOptions): Promise<void>;
    /**
     * Gets the statistics of a filesystem object. Does NOT follow the link to its target.
     * Behind the scenes it uses `fs.lstatSync()`.
     * @param path - The absolute or relative path to the filesystem object.
     */
    static getLinkStatistics(path: string): FileSystemStats;
    /**
     * An async version of {@link FileSystem.getLinkStatistics}.
     */
    static getLinkStatisticsAsync(path: string): Promise<FileSystemStats>;
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
    static readLink(path: string): string;
    /**
     * An async version of {@link FileSystem.readLink}.
     */
    static readLinkAsync(path: string): Promise<string>;
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
    static createSymbolicLinkJunction(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkJunction}.
     */
    static createSymbolicLinkJunctionAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
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
    static createSymbolicLinkFile(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFile}.
     */
    static createSymbolicLinkFileAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
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
    static createSymbolicLinkFolder(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createSymbolicLinkFolder}.
     */
    static createSymbolicLinkFolderAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
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
    static createHardLink(options: IFileSystemCreateLinkOptions): void;
    /**
     * An async version of {@link FileSystem.createHardLink}.
     */
    static createHardLinkAsync(options: IFileSystemCreateLinkOptions): Promise<void>;
    /**
     * Follows a link to its destination and returns the absolute path to the final target of the link.
     * Behind the scenes it uses `fs.realpathSync()`.
     * @param linkPath - The path to the link.
     */
    static getRealPath(linkPath: string): string;
    /**
     * An async version of {@link FileSystem.getRealPath}.
     */
    static getRealPathAsync(linkPath: string): Promise<string>;
    /**
     * Returns true if the error object indicates the file or folder already exists (`EEXIST`).
     */
    static isExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the file or folder does not exist (`ENOENT` or `ENOTDIR`)
     */
    static isNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the file does not exist (`ENOENT`).
     */
    static isFileDoesNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the folder does not exist (`ENOTDIR`).
     */
    static isFolderDoesNotExistError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the target is a directory (`EISDIR`).
     */
    static isDirectoryError(error: Error): boolean;
    /**
     * Returns true if the error object indicates the target is not a directory (`ENOTDIR`).
     */
    static isNotDirectoryError(error: Error): boolean;
    /**
     * Returns true if the error object indicates that the `unlink` system call failed
     * due to a permissions issue (`EPERM`).
     */
    static isUnlinkNotPermittedError(error: Error): boolean;
    /**
     * Detects if the provided error object is a `NodeJS.ErrnoException`
     */
    static isErrnoException(error: Error): error is NodeJS.ErrnoException;
    private static _handleLink;
    private static _handleLinkAsync;
    private static _wrapException;
    private static _wrapExceptionAsync;
    private static _updateErrorMessage;
}
//# sourceMappingURL=FileSystem.d.ts.map