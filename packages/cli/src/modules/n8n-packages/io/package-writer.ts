/**
 * The write surface the entity exporters depend on: append files and
 * directories, then `finalize()` into the target-specific output. `finalize`'s
 * result is generic since it differs by target (`Readable` for tar, `void` for
 * directory); it defaults to `void` so write-only consumers can use the bare type.
 */
export interface PackageWriter<TFinalized = void> {
	writeFile(path: string, content: string | Buffer): void;
	writeDirectory(path: string): void;
	finalize(): TFinalized;
}
