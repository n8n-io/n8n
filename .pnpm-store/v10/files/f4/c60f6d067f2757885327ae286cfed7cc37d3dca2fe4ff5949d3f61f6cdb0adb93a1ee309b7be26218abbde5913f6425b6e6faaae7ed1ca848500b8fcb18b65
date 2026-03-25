import { fileSync, dirSync, tmpNameSync, setGracefulCleanup } from "tmp";
import { FileOptions, DirOptions, TmpNameOptions } from "tmp";

export interface DirectoryResult {
  path: string;
  cleanup: () => Promise<void>;
}

export interface FileResult extends DirectoryResult {
  fd: number;
}

export function file(options?: FileOptions): Promise<FileResult>;
export function withFile<T>(
  fn: (result: FileResult) => Promise<T>,
  options?: FileOptions
): Promise<T>;

export function dir(options?: DirOptions): Promise<DirectoryResult>;
export function withDir<T>(
  fn: (results: DirectoryResult) => Promise<T>,
  options?: DirOptions
): Promise<T>;

export function tmpName(options?: TmpNameOptions): Promise<string>;

export { fileSync, dirSync, tmpNameSync, setGracefulCleanup };
