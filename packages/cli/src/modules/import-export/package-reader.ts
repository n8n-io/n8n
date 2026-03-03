export interface PackageReader {
	readFile(path: string): string;
	hasFile(path: string): boolean;
}
