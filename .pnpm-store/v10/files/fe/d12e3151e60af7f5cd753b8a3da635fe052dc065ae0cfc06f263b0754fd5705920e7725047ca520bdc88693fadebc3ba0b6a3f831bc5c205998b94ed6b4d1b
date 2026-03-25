
declare module 'replace-in-file' {
  export function replaceInFile(config: ReplaceInFileConfig): Promise<ReplaceResult[]>;
  export function replaceInFile(config: ReplaceInFileConfig, cb: (error: Error, results: ReplaceResult[]) => void): void;
  export default replaceInFile;

  namespace replaceInFile {
    export function sync(config: ReplaceInFileConfig): ReplaceResult[];
    export function replaceInFileSync(config: ReplaceInFileConfig): ReplaceResult[];
    export function replaceInFile(config: ReplaceInFileConfig): Promise<ReplaceResult[]>;
    export function replaceInFile(config: ReplaceInFileConfig, cb: (error: Error, results: ReplaceResult[]) => void): void;
  }

  export function sync(config: ReplaceInFileConfig): ReplaceResult[];
  export function replaceInFileSync(config: ReplaceInFileConfig): ReplaceResult[];

  export type From = string | RegExp | FromCallback;
  export type To = string | ToCallback;

  export interface ReplaceInFileConfig {
    files: string | string[];
    ignore?: string | string[];
    from: From | Array<From>;
    to: To | Array<To>;
    countMatches?: boolean;
    allowEmptyPaths?: boolean,
    disableGlobs?: boolean,
    encoding?: string,
    dry?:boolean
    glob?:object
  }

  export interface ReplaceResult {
    file: string;
    hasChanged: boolean;
    numMatches?: number,
    numReplacements?: number,
  }
}

type FromCallback = (file: string) => string | RegExp | string[] | RegExp[];
type ToCallback = (match: string, file: string) => string | string[];
