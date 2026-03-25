import * as nodeFs from 'fs';
import * as nodePath from 'path';
/**
 * Arguments used to create a function that resolves symlinked node_modules in a path
 * @public
 */
export interface IRealNodeModulePathResolverOptions {
    fs?: Partial<Pick<typeof nodeFs, 'lstatSync' | 'readlinkSync'>>;
    path?: Partial<Pick<typeof nodePath, 'isAbsolute' | 'join' | 'resolve' | 'sep'>>;
    /**
     * If set to true, the resolver will not throw if part of the path does not exist.
     * @defaultValue false
     */
    ignoreMissingPaths?: boolean;
}
/**
 * This class encapsulates a caching resolver for symlinks in node_modules directories.
 * It assumes that the only symlinks that exist in input paths are those that correspond to
 * npm packages.
 *
 * @remarks
 * In a repository with a symlinked node_modules installation, some symbolic links need to be mapped for
 * node module resolution to produce correct results. However, calling `fs.realpathSync.native` on every path,
 * as is commonly done by most resolvers, involves an enormous number of file system operations (for reference,
 * each invocation of `fs.realpathSync.native` involves a series of `fs.readlinkSync` calls, up to one for each
 * path segment in the input).
 *
 * @public
 */
export declare class RealNodeModulePathResolver {
    /**
     * Similar in function to `fs.realpathSync.native`, but assumes the only symlinks present are npm packages.
     *
     * @param input - A path to a file or directory, where the path separator is `${require('node:path').sep}`
     * @returns The real path to the input, resolving the node_modules symlinks in the path
     * @public
     */
    readonly realNodeModulePath: (input: string) => string;
    private readonly _cache;
    private readonly _errorCache;
    private readonly _fs;
    private readonly _path;
    private readonly _lstatOptions;
    constructor(options?: IRealNodeModulePathResolverOptions);
    /**
     * Clears the cache of resolved symlinks.
     * @public
     */
    clearCache(): void;
    /**
     * Tries to read a symbolic link at the specified path.
     * If the input is not a symbolic link, returns undefined.
     * @param link - The link to try to read
     * @returns The target of the symbolic link, or undefined if the input is not a symbolic link
     */
    private _tryReadLink;
}
//# sourceMappingURL=RealNodeModulePath.d.ts.map