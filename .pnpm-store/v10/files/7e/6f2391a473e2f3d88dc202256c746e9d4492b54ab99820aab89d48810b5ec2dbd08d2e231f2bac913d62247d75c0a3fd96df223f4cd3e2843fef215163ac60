/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "dependencies", "optionalDependencies", and "devDependencies" fields.
 * @public
 */
export interface IPackageJsonDependencyTable {
    /**
     * The key is the name of a dependency.  The value is a Semantic Versioning (SemVer)
     * range specifier.
     */
    [dependencyName: string]: string;
}
/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "scripts" field.
 * @public
 */
export interface IPackageJsonScriptTable {
    /**
     * The key is the name of the script hook.  The value is the script body which may
     * be a file path or shell script command.
     */
    [scriptName: string]: string;
}
/**
 * This interface is part of the {@link IPackageJson} file format.  It is used for the
 * "repository" field.
 * @public
 */
export interface IPackageJsonRepository {
    /**
     * The source control type for the repository that hosts the project. This is typically "git".
     */
    type: string;
    /**
     * The URL of the repository that hosts the project.
     */
    url: string;
    /**
     * If the project does not exist at the root of the repository, its path is specified here.
     */
    directory?: string;
}
/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the
 * "peerDependenciesMeta" field.
 * @public
 */
export interface IPeerDependenciesMetaTable {
    [dependencyName: string]: {
        optional?: boolean;
    };
}
/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the
 * "dependenciesMeta" field.
 * @public
 */
export interface IDependenciesMetaTable {
    [dependencyName: string]: {
        injected?: boolean;
    };
}
/**
 * This interface is part of the {@link IPackageJson} file format. It is used for the values
 * of the "exports" field.
 *
 * See {@link https://nodejs.org/api/packages.html#conditional-exports | Node.js documentation on Conditional Exports} and
 * {@link https://nodejs.org/api/packages.html#community-conditions-definitions | Node.js documentation on Community Conditional Exports}.
 *
 * @public
 */
export interface IPackageJsonExports {
    /**
     * This export is like {@link IPackageJsonExports.node} in that it matches for any NodeJS environment.
     * This export is specifically for native C++ addons.
     */
    'node-addons'?: string | IPackageJsonExports;
    /**
     * This export matches for any NodeJS environment.
     */
    node?: string | IPackageJsonExports;
    /**
     * This export matches when loaded via ESM syntax (i.e. - `import '...'` or `import('...')`).
     * This is always mutually exclusive with {@link IPackageJsonExports.require}.
     */
    import?: string | IPackageJsonExports;
    /**
     * This export matches when loaded via `require()`.
     * This is always mutually exclusive with {@link IPackageJsonExports.import}.
     */
    require?: string | IPackageJsonExports;
    /**
     * This export matches as a fallback when no other conditions match. Because exports are evaluated in
     * the order that they are specified in the `package.json` file, this condition should always come last
     * as no later exports will match if this one does.
     */
    default?: string | IPackageJsonExports;
    /**
     * This export matches when loaded by the typing system (i.e. - the TypeScript compiler).
     */
    types?: string | IPackageJsonExports;
    /**
     * Any web browser environment.
     */
    browser?: string | IPackageJsonExports;
    /**
     * This export matches in development-only environments.
     * This is always mutually exclusive with {@link IPackageJsonExports.production}.
     */
    development?: string | IPackageJsonExports;
    /**
     * This export matches in production-only environments.
     * This is always mutually exclusive with {@link IPackageJsonExports.development}.
     */
    production?: string | IPackageJsonExports;
}
/**
 * An interface for accessing common fields from a package.json file whose version field may be missing.
 *
 * @remarks
 * This interface is the same as {@link IPackageJson}, except that the `version` field is optional.
 * According to the {@link https://docs.npmjs.com/files/package.json | NPM documentation}
 * and {@link http://wiki.commonjs.org/wiki/Packages/1.0 | CommonJS Packages specification}, the `version` field
 * is normally a required field for package.json files.
 *
 * However, NodeJS relaxes this requirement for its `require()` API.  The
 * {@link https://nodejs.org/dist/latest-v10.x/docs/api/modules.html#modules_folders_as_modules
 * | "Folders as Modules" section} from the NodeJS documentation gives an example of a package.json file
 * that has only the `name` and `main` fields.  NodeJS does not consider the `version` field during resolution,
 * so it can be omitted.  Some libraries do this.
 *
 * Use the `INodePackageJson` interface when loading such files.  Use `IPackageJson` for package.json files
 * that are installed from an NPM registry, or are otherwise known to have a `version` field.
 *
 * @public
 */
export interface INodePackageJson {
    /**
     * The name of the package.
     */
    name: string;
    /**
     * A version number conforming to the Semantic Versioning (SemVer) standard.
     */
    version?: string;
    /**
     * Indicates whether this package is allowed to be published or not.
     */
    private?: boolean;
    /**
     * A brief description of the package.
     */
    description?: string;
    /**
     * The URL of the project's repository.
     */
    repository?: string | IPackageJsonRepository;
    /**
     * The URL to the project's web page.
     */
    homepage?: string;
    /**
     * The name of the license.
     */
    license?: string;
    /**
     * The path to the module file that will act as the main entry point.
     */
    main?: string;
    /**
     * The path to the TypeScript *.d.ts file describing the module file
     * that will act as the main entry point.
     */
    types?: string;
    /**
     * Alias for `types`
     */
    typings?: string;
    /**
     * The path to the TSDoc metadata file.
     * This is still being standardized: https://github.com/microsoft/tsdoc/issues/7#issuecomment-442271815
     * @beta
     */
    tsdocMetadata?: string;
    /**
     * The main entry point for the package.
     */
    bin?: string | Record<string, string>;
    /**
     * An array of dependencies that must always be installed for this package.
     */
    dependencies?: IPackageJsonDependencyTable;
    /**
     * An array of optional dependencies that may be installed for this package.
     */
    optionalDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of dependencies that must only be installed for developers who will
     * build this package.
     */
    devDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of dependencies that must be installed by a consumer of this package,
     * but which will not be automatically installed by this package.
     */
    peerDependencies?: IPackageJsonDependencyTable;
    /**
     * An array of metadata for dependencies declared inside dependencies, optionalDependencies, and devDependencies.
     * https://pnpm.io/package_json#dependenciesmeta
     */
    dependenciesMeta?: IDependenciesMetaTable;
    /**
     * An array of metadata about peer dependencies.
     */
    peerDependenciesMeta?: IPeerDependenciesMetaTable;
    /**
     * A table of script hooks that a package manager or build tool may invoke.
     */
    scripts?: IPackageJsonScriptTable;
    /**
     * A table of package version resolutions. This feature is only implemented by the Yarn package manager.
     *
     * @remarks
     * See the {@link https://github.com/yarnpkg/rfcs/blob/master/implemented/0000-selective-versions-resolutions.md
     * | 0000-selective-versions-resolutions.md RFC} for details.
     */
    resolutions?: Record<string, string>;
    /**
     * A table of TypeScript *.d.ts file paths that are compatible with specific TypeScript version
     * selectors. This data take a form similar to that of the {@link INodePackageJson.exports} field,
     * with fallbacks listed in order in the value array for example:
     *
     * ```JSON
     * "typesVersions": {
     *   ">=3.1": {
     *     "*": ["./types-3.1/*", "./types-3.1-fallback/*"]
     *   },
     *   ">=3.0": {
     *     "*": ["./types-legacy/*"]
     *   }
     * }
     * ```
     *
     * or
     *
     * ```JSON
     * "typesVersions": {
     *   ">=3.1": {
     *     "app/*": ["./app/types-3.1/*"],
     *     "lib/*": ["./lib/types-3.1/*"]
     *   },
     *   ">=3.0": {
     *     "app/*": ["./app/types-legacy/*"],
     *     "lib/*": ["./lib/types-legacy/*"]
     *   }
     * }
     * ```
     *
     * See the
     * {@link https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions
     * | TypeScript documentation} for details.
     */
    typesVersions?: Record<string, Record<string, [string, ...string[]]>>;
    /**
     * The "exports" field is used to specify the entry points for a package.
     * See {@link https://nodejs.org/api/packages.html#exports | Node.js documentation}
     */
    exports?: string | string[] | Record<string, null | string | IPackageJsonExports>;
    /**
     * The "files" field is an array of file globs that should be included in the package during publishing.
     *
     * See the {@link https://docs.npmjs.com/cli/v6/configuring-npm/package-json#files | NPM documentation}.
     */
    files?: string[];
}
/**
 * An interface for accessing common fields from a package.json file.
 *
 * @remarks
 * This interface describes a package.json file format whose `name` and `version` field are required.
 * In some situations, the `version` field is optional; in that case, use the {@link INodePackageJson}
 * interface instead.
 *
 * More fields may be added to this interface in the future.  For documentation about the package.json file format,
 * see the {@link http://wiki.commonjs.org/wiki/Packages/1.0 | CommonJS Packages specification}
 * and the {@link https://docs.npmjs.com/files/package.json | NPM manual page}.
 *
 * @public
 */
export interface IPackageJson extends INodePackageJson {
    /** {@inheritDoc INodePackageJson.version} */
    version: string;
}
//# sourceMappingURL=IPackageJson.d.ts.map