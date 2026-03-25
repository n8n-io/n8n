//#region src/utils.d.ts

declare const convertPathToPattern: (path: string) => string;
declare const escapePath: (path: string) => string;
// #endregion
// #region isDynamicPattern
/*
Has a few minor differences with `fast-glob` for better accuracy:

Doesn't necessarily return false on patterns that include `\\`.

Returns true if the pattern includes parentheses,
regardless of them representing one single pattern or not.

Returns true for unfinished glob extensions i.e. `(h`, `+(h`.

Returns true for unfinished brace expansions as long as they include `,` or `..`.
*/
declare function isDynamicPattern(pattern: string, options?: {
  caseSensitiveMatch: boolean;
}): boolean; //#endregion
//#region src/index.d.ts

// #endregion
// #region log
interface GlobOptions {
  absolute?: boolean;
  cwd?: string;
  patterns?: string | string[];
  ignore?: string | string[];
  dot?: boolean;
  deep?: number;
  followSymbolicLinks?: boolean;
  caseSensitiveMatch?: boolean;
  expandDirectories?: boolean;
  onlyDirectories?: boolean;
  onlyFiles?: boolean;
  debug?: boolean;
}
declare function glob(patterns: string | string[], options?: Omit<GlobOptions, "patterns">): Promise<string[]>;
declare function glob(options: GlobOptions): Promise<string[]>;
declare function globSync(patterns: string | string[], options?: Omit<GlobOptions, "patterns">): string[];
declare function globSync(options: GlobOptions): string[];

//#endregion
export { GlobOptions, convertPathToPattern, escapePath, glob, globSync, isDynamicPattern };