/// <reference types="node" />
import fs from 'fs';
interface Result {
    files: Array<string>;
    directories: Array<string>;
}
interface FileSystem {
    join(pathA: string, pathB: string): string;
    basename(path: string): string;
    stat(path: string): Promise<fs.Stats>;
    readdir(path: string): Promise<string[]>;
}
declare type Validate = (path: string) => boolean;
export declare const defaultFilesystem: FileSystem;
declare function scanDirectory(path: string, { recursive, validate, concurrency, fileSystem, }?: {
    recursive?: boolean;
    validate?: Validate | null;
    concurrency?: number;
    fileSystem?: Partial<FileSystem>;
}): Promise<Result>;
export default scanDirectory;
