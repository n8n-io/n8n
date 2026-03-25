import { File, FilePropertyBag } from "./File";
export * from "./isFile";
export declare type FileFromPathOptions = Omit<FilePropertyBag, "lastModified">;
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
export declare function fileFromPathSync(path: string): File;
export declare function fileFromPathSync(path: string, filename?: string): File;
export declare function fileFromPathSync(path: string, options?: FileFromPathOptions): File;
export declare function fileFromPathSync(path: string, filename?: string, options?: FileFromPathOptions): File;
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
export declare function fileFromPath(path: string): Promise<File>;
export declare function fileFromPath(path: string, filename?: string): Promise<File>;
export declare function fileFromPath(path: string, options?: FileFromPathOptions): Promise<File>;
export declare function fileFromPath(path: string, filename?: string, options?: FileFromPathOptions): Promise<File>;
