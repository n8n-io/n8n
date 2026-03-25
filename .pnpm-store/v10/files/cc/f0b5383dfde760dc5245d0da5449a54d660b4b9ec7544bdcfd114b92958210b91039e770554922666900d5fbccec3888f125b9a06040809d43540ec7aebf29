// Type definitions for resolve 1.17.0
// Project: https://github.com/browserify/resolve
// Definitions by: Mario Nebl <https://github.com/marionebl>
//                 Klaus Meinhardt <https://github.com/ajafff>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

interface PackageMeta {
  name: string;
  version: string;
  [key: string]: any;
}

/**
 * Callback invoked when resolving asynchronously
 *
 * @param error
 * @param resolved Absolute path to resolved identifier
 */
type resolveCallback = (err: Error | null, resolved?: string, pkg?: PackageMeta) => void;

/**
 * Callback invoked when checking if a file or directory exists
 *
 * @param error
 * @param exists If the given file or directory exists
 */
type existsCallback = (err: Error | null, isFile?: boolean) => void;

/**
 * Callback invoked when reading a file
 *
 * @param error
 * @param isFile If the given file exists
 */
type readFileCallback = (err: Error | null, file?: Buffer) => void;

/**
 * Callback invoked when resolving a potential symlink
 *
 * @param error
 * @param resolved Absolute path to the resolved file
 */
type realpathCallback = (err: Error | null, resolved?: string) => void;

/**
 * Asynchronously resolve the module path string id into cb(err, res [, pkg]), where pkg (if defined) is the data from package.json
 *
 * @param id Identifier to resolve
 * @param callback
 */
declare function resolve(id: string, cb: resolveCallback): void;

/**
 * Asynchronously resolve the module path string id into cb(err, res [, pkg]), where pkg (if defined) is the data from package.json
 *
 * @param id Identifier to resolve
 * @param options Options to use for resolving, optional.
 * @param callback
 */
declare function resolve(id: string, opts: resolve.AsyncOpts, cb: resolveCallback): void;

/**
 * Synchronously resolve the module path string id, returning the result and throwing an error when id can't be resolved.
 *
 * @param id Identifier to resolve
 * @param options Options to use for resolving, optional.
 */
declare function resolveSync(id: string, opts?: resolve.SyncOpts): string;

/**
 * Return whether a package is in core
 */
declare function resolveIsCore(id: string): boolean | undefined;

declare namespace resolve {
  interface Opts {
    /** directory to begin resolving from (defaults to __dirname) */
    basedir?: string;
    /** package.json data applicable to the module being loaded */
    package?: any;
    /** array of file extensions to search in order (defaults to ['.js']) */
    extensions?: string | ReadonlyArray<string>;
    /** transform the parsed package.json contents before looking at the "main" field */
    packageFilter?: (pkg: any, pkgfile: string) => any;
    /** transform a path within a package */
    pathFilter?: (pkg: any, path: string, relativePath: string) => string;
    /** require.paths array to use if nothing is found on the normal node_modules recursive walk (probably don't use this) */
    paths?: string | ReadonlyArray<string>;
    /** return the list of candidate paths where the packages sources may be found (probably don't use this) */
    packageIterator?: (request: string, start: string, getPackageCandidates: () => string[], opts: Opts) => string[];
    /** directory (or directories) in which to recursively look for modules. (default to 'node_modules') */
    moduleDirectory?: string | ReadonlyArray<string>;
    /**
     * if true, doesn't resolve `basedir` to real path before resolving.
     * This is the way Node resolves dependencies when executed with the --preserve-symlinks flag.
     *
     * Note: this property is currently true by default but it will be changed to false in the next major version because Node's resolution
     * algorithm does not preserve symlinks by default.
    */
    preserveSymlinks?: boolean;
  }

  export interface AsyncOpts extends Opts {
    /** how to read files asynchronously (defaults to fs.readFile) */
    readFile?: (file: string, cb: readFileCallback) => void;
    /** function to asynchronously test whether a file exists */
    isFile?: (file: string, cb: existsCallback) => void;
    /** function to asynchronously test whether a directory exists */
    isDirectory?: (directory: string, cb: existsCallback) => void;
    /** function to asynchronously resolve a potential symlink to its real path */
    realpath?: (file: string, cb: realpathCallback) => void;
  }

  export interface SyncOpts extends Opts {
    /** how to read files synchronously (defaults to fs.readFileSync) */
    readFileSync?: (file: string, encoding: BufferEncoding) => string | Buffer;
    /** function to synchronously test whether a file exists */
    isFile?: (file: string) => boolean;
    /** function to synchronously test whether a directory exists */
    isDirectory?: (directory: string) => boolean;
    /** function to synchronously resolve a potential symlink to its real path */
    realpathSync?: (file: string) => string;
  }

  export var sync: typeof resolveSync;
  export var isCore: typeof resolveIsCore;
}

export = resolve;
