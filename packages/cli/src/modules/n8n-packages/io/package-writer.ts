/**
 * The write surface the entity exporters depend on: append files and
 * directories to a package. Finalizing is left to each concrete writer, since
 * the output differs by target — `TarPackageWriter.finalize()` returns a
 * `Readable` (a streamed archive), while `DirectoryPackageWriter.finalize()`
 * flushes the buffered entries to disk and resolves `void`.
 */
export interface PackageWriter {
	writeFile(path: string, content: string | Buffer): void;
	writeDirectory(path: string): void;
}
