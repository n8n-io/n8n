/**
 * The k6 experimental filesystem module provides an API for handling file operations
 * in your k6 tests. It allows you to read files within your test scripts.
 */

/**
 * Opens a file and returns a promise that resolves to an instance of the `File` class.
 *
 * Note: As the k6 init context doesn't support 'await', use the following pattern:
 *
 * Example:
 * ```
 * let fileHandle;
 * (async function() {
 *   fileHandle = await open("example.txt");
 * }());
 * ```
 *
 * @param path - The file path as a string. Relative paths are resolved relative to the k6 script.
 * @returns Promise<File> - A promise that resolves to a `File` instance.
 */
export function open(path: string): Promise<File>;

/**
 * Represents a file and provides methods to interact with file data.
 * This class offers read-only access to file contents.
 */
export class File {
    /**
     * The absolute path of the file.
     *
     * This is resolved relative to the k6 script.
     */
    path: string;

    /**
     * Reads the file into a specified buffer type and returns the number of bytes read.
     * Resolves to `null` if there's nothing to read (EOF or empty file).
     *
     * Example:
     * ```
     * const buffer = new Uint8Array(100);
     * const bytesRead = await file.read(buffer);
     * console.log(`Read ${bytesRead} bytes`);
     * ```
     *
     * @param p - A Uint8Array buffer to read the file into.
     * @returns Promise<number> - Number of bytes read or `null`.
     */
    read(p: Uint8Array): Promise<number>;

    /**
     * Moves the file pointer to a new location, based on `offset` and `whence`.
     * Resolves to the new position within the file (in bytes).
     *
     * When using `SeekMode.Start`, the offset must be greater than or equal to zero.
     * When using `SeekMode.Current`, the offset can be positive or negative.
     * When using `SeekMode.End`, the offset must be less than or equal to zero.
     *
     * Example:
     * ```
     * const newOffset = await file.seek(10, SeekMode.Start);
     * console.log(`Pointer moved to position ${newOffset}`);
     * ```
     *
     * @param offset - The offset to seek to.
     * @param whence - The position from where offset is added (Start, Current, or End).
     * @returns Promise<number> - The new position in the file.
     */
    seek(offset: number, whence: SeekMode): Promise<number>;

    /**
     * Retrieves information about the file.
     * Resolves to a `FileInfo` object describing the file.
     *
     * Example:
     * ```
     * const fileInfo = await file.stat();
     * console.log(`File size: ${fileInfo.size} bytes`);
     * ```
     *
     * @returns Promise<FileInfo> - Information about the file.
     */
    stat(): Promise<FileInfo>;
}

/**
 * Contains information about a file, including its name and size.
 */
export interface FileInfo {
    name: string; // The name of the file
    size: number; // The size of the file in bytes
}

/**
 * Enumeration for file seek modes.
 */
export enum SeekMode {
    Start = 0, // Seek from the start of the file
    Current = 1, // Seek from the current file position.
    End = 2, // Seek from the end of the file
}
