import type { IPackageJson, INodePackageJson } from './IPackageJson';
/**
 * Constructor parameters for {@link PackageJsonLookup}
 *
 * @public
 */
export interface IPackageJsonLookupParameters {
    /**
     * Certain package.json fields such as "contributors" can be very large, and may
     * significantly increase the memory footprint for the PackageJsonLookup cache.
     * By default, PackageJsonLookup only loads a subset of standard commonly used
     * fields names.  Set loadExtraFields=true to always return all fields.
     */
    loadExtraFields?: boolean;
}
/**
 * This class provides methods for finding the nearest "package.json" for a folder
 * and retrieving the name of the package.  The results are cached.
 *
 * @public
 */
export declare class PackageJsonLookup {
    private static _instance;
    /**
     * A singleton instance of `PackageJsonLookup`, which is useful for short-lived processes
     * that can reasonably assume that the file system will not be modified after the cache
     * is populated.
     *
     * @remarks
     * For long-running processes that need to clear the cache at appropriate times,
     * it is recommended to create your own instance of `PackageJsonLookup` instead
     * of relying on this instance.
     */
    static get instance(): PackageJsonLookup;
    private _loadExtraFields;
    private _packageFolderCache;
    private _packageJsonCache;
    constructor(parameters?: IPackageJsonLookupParameters);
    /**
     * A helper for loading the caller's own package.json file.
     *
     * @remarks
     *
     * This function provides a concise and efficient way for an NPM package to report metadata about itself.
     * For example, a tool might want to report its version.
     *
     * The `loadOwnPackageJson()` probes upwards from the caller's folder, expecting to find a package.json file,
     * which is assumed to be the caller's package.  The result is cached, under the assumption that a tool's
     * own package.json (and intermediary folders) will never change during the lifetime of the process.
     *
     * @example
     * ```ts
     * // Report the version of our NPM package
     * const myPackageVersion: string = PackageJsonLookup.loadOwnPackageJson(__dirname).version;
     * console.log(`Cool Tool - Version ${myPackageVersion}`);
     * ```
     *
     * @param dirnameOfCaller - The NodeJS `__dirname` macro for the caller.
     * @returns This function always returns a valid `IPackageJson` object.  If any problems are encountered during
     * loading, an exception will be thrown instead.
     */
    static loadOwnPackageJson(dirnameOfCaller: string): IPackageJson;
    /**
     * Clears the internal file cache.
     * @remarks
     * Call this method if changes have been made to the package.json files on disk.
     */
    clearCache(): void;
    /**
     * Returns the absolute path of a folder containing a package.json file, by looking
     * upwards from the specified fileOrFolderPath.  If no package.json can be found,
     * undefined is returned.
     *
     * @remarks
     * The fileOrFolderPath is not required to actually exist on disk.
     * The fileOrFolderPath itself can be the return value, if it is a folder containing
     * a package.json file.
     * Both positive and negative lookup results are cached.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to a folder containing a package.json file
     */
    tryGetPackageFolderFor(fileOrFolderPath: string): string | undefined;
    /**
     * If the specified file or folder is part of a package, this returns the absolute path
     * to the associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an absolute path to * package.json file
     */
    tryGetPackageJsonFilePathFor(fileOrFolderPath: string): string | undefined;
    /**
     * If the specified file or folder is part of a package, this loads and returns the
     * associated package.json file.
     *
     * @remarks
     * The package folder is determined using the same algorithm
     * as {@link PackageJsonLookup.tryGetPackageFolderFor}.
     *
     * @param fileOrFolderPath - a relative or absolute path to a source file or folder
     * that may be part of a package
     * @returns an IPackageJson object, or undefined if the fileOrFolderPath does not
     * belong to a package
     */
    tryLoadPackageJsonFor(fileOrFolderPath: string): IPackageJson | undefined;
    /**
     * This function is similar to {@link PackageJsonLookup.tryLoadPackageJsonFor}, except that it does not report
     * an error if the `version` field is missing from the package.json file.
     */
    tryLoadNodePackageJsonFor(fileOrFolderPath: string): INodePackageJson | undefined;
    /**
     * Loads the specified package.json file, if it is not already present in the cache.
     *
     * @remarks
     * Unless {@link IPackageJsonLookupParameters.loadExtraFields} was specified,
     * the returned IPackageJson object will contain a subset of essential fields.
     * The returned object should be considered to be immutable; the caller must never
     * modify it.
     *
     * @param jsonFilename - a relative or absolute path to a package.json file
     */
    loadPackageJson(jsonFilename: string): IPackageJson;
    /**
     * This function is similar to {@link PackageJsonLookup.loadPackageJson}, except that it does not report an error
     * if the `version` field is missing from the package.json file.
     */
    loadNodePackageJson(jsonFilename: string): INodePackageJson;
    private _loadPackageJsonInner;
    /**
     * Try to load a package.json file as an INodePackageJson,
     * returning undefined if the found file does not contain a `name` field.
     */
    private _tryLoadNodePackageJsonInner;
    private _tryGetPackageFolderFor;
}
//# sourceMappingURL=PackageJsonLookup.d.ts.map