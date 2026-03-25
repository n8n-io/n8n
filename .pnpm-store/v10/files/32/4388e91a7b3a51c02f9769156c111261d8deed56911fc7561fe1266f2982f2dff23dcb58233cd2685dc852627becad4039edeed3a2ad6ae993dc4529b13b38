import type { FileSystemStats } from './FileSystem';
/**
 * Interface which represents the flags about which mode the file should be opened in.
 * @public
 */
export interface IFileWriterFlags {
    /**
     * Open file for appending.
     */
    append?: boolean;
    /**
     * Fails if path exists. The exclusive flag ensures that path is newly created.
     *
     * @remarks
     * On POSIX-like operating systems, path is considered to exist even if it is a symlink to a
     * non-existent file.  The exclusive flag may or may not work with network file systems.
     *
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    exclusive?: boolean;
}
/**
 * API for interacting with file handles.
 * @public
 */
export declare class FileWriter {
    /**
     * The `filePath` that was passed to {@link FileWriter.open}.
     */
    readonly filePath: string;
    private _fileDescriptor;
    private constructor();
    /**
     * Opens a new file handle to the file at the specified path and given mode.
     * Behind the scenes it uses `fs.openSync()`.
     * The behaviour of this function is platform specific.
     * See: https://nodejs.org/docs/latest-v8.x/api/fs.html#fs_fs_open_path_flags_mode_callback
     * @param filePath - The absolute or relative path to the file handle that should be opened.
     * @param flags - The flags for opening the handle
     */
    static open(filePath: string, flags?: IFileWriterFlags): FileWriter;
    /**
     * Helper function to convert the file writer array to a Node.js style string (e.g. "wx" or "a").
     * @param flags - The flags that should be converted.
     */
    private static _convertFlagsForNode;
    /**
     * Writes some text to the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.writeSync()`.
     * @param text - The text to write to the file.
     */
    write(text: string): void;
    /**
     * Closes the file handle permanently. No operations can be made on this file handle after calling this.
     * Behind the scenes it uses `fs.closeSync()` and releases the file descriptor to be re-used.
     *
     * @remarks
     * The `close()` method can be called more than once; additional calls are ignored.
     */
    close(): void;
    /**
     * Gets the statistics for the given file handle. Throws if the file handle has been closed.
     * Behind the scenes it uses `fs.statSync()`.
     */
    getStatistics(): FileSystemStats;
}
//# sourceMappingURL=FileWriter.d.ts.map