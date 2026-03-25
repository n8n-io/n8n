import { F as File, e as FilePropertyBag } from './File-cfd9c54a.js';

/**
 * Checks if given value is a File, Blob or file-look-a-like object.
 *
 * @param value A value to test
 */
declare const isFile: (value: unknown) => value is File;

type FileFromPathOptions = Omit<FilePropertyBag, "lastModified">;
/**
 * Creates a `File` referencing the one on a disk by given path. Synchronous version of the `fileFromPath`
 *
 * @param path Path to a file
 * @param filename Optional name of the file. Will be passed as the second argument in `File` constructor. If not presented, the name will be taken from the file's path.
 * @param options Additional `File` options, except for `lastModified`.
 *
 * @example
 *
 * ```js
 * import {FormData, File} from "formdata-node"
 * import {fileFromPathSync} from "formdata-node/file-from-path"
 *
 * const form = new FormData()
 *
 * const file = fileFromPathSync("/path/to/some/file.txt")
 *
 * form.set("file", file)
 *
 * form.get("file") // -> Your `File` object
 * ```
 */
declare function fileFromPathSync(path: string): File;
declare function fileFromPathSync(path: string, filename?: string): File;
declare function fileFromPathSync(path: string, options?: FileFromPathOptions): File;
declare function fileFromPathSync(path: string, filename?: string, options?: FileFromPathOptions): File;
/**
 * Creates a `File` referencing the one on a disk by given path.
 *
 * @param path Path to a file
 * @param filename Optional name of the file. Will be passed as the second argument in `File` constructor. If not presented, the name will be taken from the file's path.
 * @param options Additional `File` options, except for `lastModified`.
 *
 * @example
 *
 * ```js
 * import {FormData, File} from "formdata-node"
 * import {fileFromPath} from "formdata-node/file-from-path"
 *
 * const form = new FormData()
 *
 * const file = await fileFromPath("/path/to/some/file.txt")
 *
 * form.set("file", file)
 *
 * form.get("file") // -> Your `File` object
 * ```
 */
declare function fileFromPath(path: string): Promise<File>;
declare function fileFromPath(path: string, filename?: string): Promise<File>;
declare function fileFromPath(path: string, options?: FileFromPathOptions): Promise<File>;
declare function fileFromPath(path: string, filename?: string, options?: FileFromPathOptions): Promise<File>;

export { FileFromPathOptions, fileFromPath, fileFromPathSync, isFile };
