/**
 * Common options shared by {@link IImportResolveModuleOptions} and {@link IImportResolvePackageOptions}
 * @public
 */
export interface IImportResolveOptions {
    /**
     * The path from which {@link IImportResolveModuleOptions.modulePath} or
     * {@link IImportResolvePackageOptions.packageName} should be resolved.
     */
    baseFolderPath: string;
    /**
     * If true, if the package name matches a Node.js system module, then the return
     * value will be the package name without any path.
     *
     * @remarks
     * This will take precedence over an installed NPM package of the same name.
     *
     * Example:
     * ```ts
     * // Returns the string "fs" indicating the Node.js system module
     * Import.resolveModulePath({
     *   resolvePath: "fs",
     *   basePath: process.cwd()
     * })
     * ```
     */
    includeSystemModules?: boolean;
    /**
     * If true, then resolvePath is allowed to refer to the package.json of the active project.
     *
     * @remarks
     * This will take precedence over any installed dependency with the same name.
     * Note that this requires an additional PackageJsonLookup calculation.
     *
     * Example:
     * ```ts
     * // Returns an absolute path to the current package
     * Import.resolveModulePath({
     *   resolvePath: "current-project",
     *   basePath: process.cwd(),
     *   allowSelfReference: true
     * })
     * ```
     */
    allowSelfReference?: boolean;
    /**
     * A function used to resolve the realpath of a provided file path.
     *
     * @remarks
     * This is used to resolve symlinks and other non-standard file paths. By default, this uses the
     * {@link FileSystem.getRealPath} function. However, it can be overridden to use a custom implementation
     * which may be faster, more accurate, or provide support for additional non-standard file paths.
     */
    getRealPath?: (filePath: string) => string;
}
/**
 * Common options shared by {@link IImportResolveModuleAsyncOptions} and {@link IImportResolvePackageAsyncOptions}
 * @public
 */
export interface IImportResolveAsyncOptions extends IImportResolveOptions {
    /**
     * A function used to resolve the realpath of a provided file path.
     *
     * @remarks
     * This is used to resolve symlinks and other non-standard file paths. By default, this uses the
     * {@link FileSystem.getRealPath} function. However, it can be overridden to use a custom implementation
     * which may be faster, more accurate, or provide support for additional non-standard file paths.
     */
    getRealPathAsync?: (filePath: string) => Promise<string>;
}
/**
 * Options for {@link Import.resolveModule}
 * @public
 */
export interface IImportResolveModuleOptions extends IImportResolveOptions {
    /**
     * The module identifier to resolve. For example "\@rushstack/node-core-library" or
     * "\@rushstack/node-core-library/lib/index.js"
     */
    modulePath: string;
}
/**
 * Options for {@link Import.resolveModuleAsync}
 * @public
 */
export interface IImportResolveModuleAsyncOptions extends IImportResolveAsyncOptions {
    /**
     * The module identifier to resolve. For example "\@rushstack/node-core-library" or
     * "\@rushstack/node-core-library/lib/index.js"
     */
    modulePath: string;
}
/**
 * Options for {@link Import.resolvePackage}
 * @public
 */
export interface IImportResolvePackageOptions extends IImportResolveOptions {
    /**
     * The package name to resolve. For example "\@rushstack/node-core-library"
     */
    packageName: string;
    /**
     * If true, then the module path will be resolved using Node.js's built-in resolution algorithm.
     *
     * @remarks
     * This allows reusing Node's built-in resolver cache.
     * This implies `allowSelfReference: true`. The passed `getRealPath` will only be used on `baseFolderPath`.
     */
    useNodeJSResolver?: boolean;
}
/**
 * Options for {@link Import.resolvePackageAsync}
 * @public
 */
export interface IImportResolvePackageAsyncOptions extends IImportResolveAsyncOptions {
    /**
     * The package name to resolve. For example "\@rushstack/node-core-library"
     */
    packageName: string;
}
/**
 * Helpers for resolving and importing Node.js modules.
 * @public
 */
export declare class Import {
    private static __builtInModules;
    private static get _builtInModules();
    /**
     * Provides a way to improve process startup times by lazy-loading imported modules.
     *
     * @remarks
     * This is a more structured wrapper for the {@link https://www.npmjs.com/package/import-lazy|import-lazy}
     * package.  It enables you to replace an import like this:
     *
     * ```ts
     * import * as example from 'example'; // <-- 100ms load time
     *
     * if (condition) {
     *   example.doSomething();
     * }
     * ```
     *
     * ...with a pattern like this:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     *
     * if (condition) {
     *   example.doSomething(); // <-- 100ms load time occurs here, only if needed
     * }
     * ```
     *
     * The implementation relies on JavaScript's `Proxy` feature to intercept access to object members.  Thus
     * it will only work correctly with certain types of module exports.  If a particular export isn't well behaved,
     * you may need to find (or introduce) some other module in your dependency graph to apply the optimization to.
     *
     * Usage guidelines:
     *
     * - Always specify types using `typeof` as shown above.
     *
     * - Never apply lazy-loading in a way that would convert the module's type to `any`. Losing type safety
     *   seriously impacts the maintainability of the code base.
     *
     * - In cases where the non-runtime types are needed, import them separately using the `Types` suffix:
     *
     * ```ts
     * const example: typeof import('example') = Import.lazy('example', require);
     * import type * as exampleTypes from 'example';
     * ```
     *
     * - If the imported module confusingly has the same name as its export, then use the Module suffix:
     *
     * ```ts
     * const exampleModule: typeof import('../../logic/Example') = Import.lazy(
     *   '../../logic/Example', require);
     * import type * as exampleTypes from '../../logic/Example';
     * ```
     *
     * - If the exports cause a lot of awkwardness (e.g. too many expressions need to have `exampleModule.` inserted
     *   into them), or if some exports cannot be proxied (e.g. `Import.lazy('example', require)` returns a function
     *   signature), then do not lazy-load that module.  Instead, apply lazy-loading to some other module which is
     *   better behaved.
     *
     * - It's recommended to sort imports in a standard ordering:
     *
     * ```ts
     * // 1. external imports
     * import * as path from 'path';
     * import { Import, JsonFile, JsonObject } from '@rushstack/node-core-library';
     *
     * // 2. local imports
     * import { LocalFile } from './path/LocalFile';
     *
     * // 3. lazy-imports (which are technically variables, not imports)
     * const semver: typeof import('semver') = Import.lazy('semver', require);
     * ```
     */
    static lazy(moduleName: string, require: (id: string) => unknown): any;
    /**
     * This resolves a module path using similar logic as the Node.js `require.resolve()` API,
     * but supporting extra features such as specifying the base folder.
     *
     * @remarks
     * A module path is a text string that might appear in a statement such as
     * `import { X } from "____";` or `const x = require("___");`.  The implementation is based
     * on the popular `resolve` NPM package.
     *
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     *
     * // Returns "/path/to/project/node_modules/example/lib/other.js"
     * Import.resolveModule({ modulePath: 'example/lib/other' });
     * ```
     * If you need to determine the containing package folder
     * (`/path/to/project/node_modules/example`), use {@link Import.resolvePackage} instead.
     *
     * @returns the absolute path of the resolved module.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolveModule(options: IImportResolveModuleOptions): string;
    /**
     * Async version of {@link Import.resolveModule}.
     */
    static resolveModuleAsync(options: IImportResolveModuleAsyncOptions): Promise<string>;
    /**
     * Performs module resolution to determine the folder where a package is installed.
     *
     * @remarks
     * Suppose `example` is an NPM package whose entry point is `lib/index.js`:
     * ```ts
     * // Returns "/path/to/project/node_modules/example"
     * Import.resolvePackage({ packageName: 'example' });
     * ```
     *
     * If you need to resolve a module path, use {@link Import.resolveModule} instead:
     * ```ts
     * // Returns "/path/to/project/node_modules/example/lib/index.js"
     * Import.resolveModule({ modulePath: 'example' });
     * ```
     *
     * @returns the absolute path of the package folder.
     * If {@link IImportResolveOptions.includeSystemModules} is specified
     * and a system module is found, then its name is returned without any file path.
     */
    static resolvePackage(options: IImportResolvePackageOptions): string;
    /**
     * Async version of {@link Import.resolvePackage}.
     */
    static resolvePackageAsync(options: IImportResolvePackageAsyncOptions): Promise<string>;
    private static _getPackageName;
}
//# sourceMappingURL=Import.d.ts.map