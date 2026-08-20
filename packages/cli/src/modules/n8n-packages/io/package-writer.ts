/**
 * Write surface for exporters: append files/dirs, then `finalize()`.
 * `TFinalized` varies by target (`Readable` for tar, `void` for directory)
 * and defaults to `void` for write-only consumers.
 */
export interface PackageWriter<TFinalized = void> {
	writeFile(path: string, content: string | Buffer): void | Promise<void>;
	writeDirectory(path: string): void | Promise<void>;
	finalize(): TFinalized;
}
