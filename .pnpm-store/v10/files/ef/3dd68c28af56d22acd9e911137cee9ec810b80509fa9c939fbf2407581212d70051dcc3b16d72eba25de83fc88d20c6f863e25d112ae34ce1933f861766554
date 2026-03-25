import { FileLike } from "../FileLike";
/**
 * Check if given object is `File`.
 *
 * Note that this function will return `false` for Blob, because the FormDataEncoder expects FormData to return File when a value is binary data.
 *
 * @param value an object to test
 *
 * @api public
 *
 * This function will return `true` for FileAPI compatible `File` objects:
 *
 * ```
 * import {isFileLike} from "form-data-encoder"
 *
 * isFileLike(new File(["Content"], "file.txt")) // -> true
 * ```
 *
 * However, if you pass a Node.js `Buffer` or `ReadStream`, it will return `false`:
 *
 * ```js
 * import {isFileLike} from "form-data-encoder"
 *
 * isFileLike(Buffer.from("Content")) // -> false
 * isFileLike(fs.createReadStream("path/to/a/file.txt")) // -> false
 * ```
 */
export declare const isFileLike: (value?: unknown) => value is FileLike;
