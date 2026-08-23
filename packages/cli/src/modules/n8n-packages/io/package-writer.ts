/** Write surface for exporters: append files and directories. */
export interface PackageWriter {
	writeFile(path: string, content: string | Buffer): void | Promise<void>;
	writeDirectory(path: string): void | Promise<void>;
}
