/**
 * A system for sharing tool configurations between projects without duplicating config files.
 *
 * @remarks
 * The `config/rig.json` file is a system that Node.js build tools can support, in order to eliminate
 * duplication of config files when many projects share a common configuration.  This is particularly valuable
 * in a setup where hundreds of projects may be built using a small set of reusable recipes.
 *
 * @packageDocumentation
 */

/**
 * Options for {@link RigConfig.loadForProjectFolder}.
 *
 * @public
 */
export declare interface ILoadForProjectFolderOptions {
    /**
     * The path to the folder of the project to be analyzed.  This folder should contain a `package.json` file.
     */
    projectFolderPath: string;
    /**
     * If specified, instead of loading the `config/rig.json` from disk, this object will be substituted instead.
     */
    overrideRigJsonObject?: IRigConfigJson;
    /**
     * If specified, force a fresh load instead of returning a cached entry, if one existed.
     */
    bypassCache?: boolean;
}

/**
 * This is the main API for loading the `config/rig.json` file format.
 *
 * @public
 */
export declare interface IRigConfig {
    /**
     * The project folder path that was passed to {@link RigConfig.loadForProjectFolder},
     * which maybe an absolute or relative path.
     *
     * @remarks
     * Example: `.`
     */
    readonly projectFolderOriginalPath: string;
    /**
     * The absolute path for the project folder path that was passed to {@link RigConfig.loadForProjectFolder}.
     *
     * @remarks
     * Example: `/path/to/your-project`
     */
    readonly projectFolderPath: string;
    /**
     * Returns `true` if `config/rig.json` was found, or `false` otherwise.
     */
    readonly rigFound: boolean;
    /**
     * The full path to the `rig.json` file that was found, or `""` if none was found.
     *
     * @remarks
     * Example: `/path/to/your-project/config/rig.json`
     */
    readonly filePath: string;
    /**
     * The `"rigPackageName"` field from `rig.json`, or `""` if the file was not found.
     *
     * @remarks
     * The name must be a valid NPM package name, and must end with the `-rig` suffix.
     *
     * Example: `example-rig`
     */
    readonly rigPackageName: string;
    /**
     * The `"rigProfile"` value that was loaded from `rig.json`, or `""` if the file was not found.
     *
     * @remarks
     * The name must consist of lowercase alphanumeric words separated by hyphens, for example `"sample-profile"`.
     * If the `rig.json` file exists, but the `"rigProfile"` is not specified, then the profile
     * name will be `"default"`.
     *
     * Example: `example-profile`
     */
    readonly rigProfile: string;
    /**
     * The relative path to the rig profile specified by `rig.json`, or `""` if the file was not found.
     *
     * @remarks
     * Example: `profiles/example-profile`
     */
    readonly relativeProfileFolderPath: string;
    /**
     * Performs Node.js module resolution to locate the rig package folder, then returns the absolute path
     * of the rig profile folder specified by `rig.json`.
     *
     * @remarks
     * If no `rig.json` file was found, then this method throws an error.  The first time this method
     * is called, the result is cached and will be returned by all subsequent calls.
     *
     * Example: `/path/to/your-project/node_modules/example-rig/profiles/example-profile`
     */
    getResolvedProfileFolder(): string;
    /**
     * An async variant of {@link IRigConfig.getResolvedProfileFolder}
     */
    getResolvedProfileFolderAsync(): Promise<string>;
    /**
     * This lookup first checks for the specified relative path under `projectFolderPath`; if it does
     * not exist there, then it checks in the resolved rig profile folder.  If the file is found,
     * its absolute path is returned. Otherwise, `undefined` is returned.
     *
     * @remarks
     * For example, suppose the rig profile is:
     *
     * `/path/to/your-project/node_modules/example-rig/profiles/example-profile`
     *
     * And suppose `configFileRelativePath` is `folder/file.json`. Then the following locations will be checked:
     *
     * `/path/to/your-project/folder/file.json`
     *
     * `/path/to/your-project/node_modules/example-rig/profiles/example-profile/folder/file.json`
     */
    tryResolveConfigFilePath(configFileRelativePath: string): string | undefined;
    /**
     * An async variant of {@link IRigConfig.tryResolveConfigFilePath}
     */
    tryResolveConfigFilePathAsync(configFileRelativePath: string): Promise<string | undefined>;
}

/**
 * Represents the literal contents of the `config/rig.json` file.
 *
 * @public
 */
export declare interface IRigConfigJson {
    /**
     * The name of the rig package to use.
     *
     * @remarks
     * The name must be a valid NPM package name, and must end with the `-rig` suffix.
     *
     * Example: `example-rig`
     */
    rigPackageName: string;
    /**
     * Specify which rig profile to use from the rig package.
     *
     * @remarks
     * The name must consist of lowercase alphanumeric words separated by hyphens, for example `"sample-profile"`.
     * If the `"rigProfile"` is not specified, then the profile name `"default"` will be used.
     *
     * Example: `example-profile`
     */
    rigProfile?: string;
}

/**
 * {@inheritdoc IRigConfig}
 *
 * @public
 */
export declare class RigConfig implements IRigConfig {
    private static readonly _packageNameRegExp;
    private static readonly _rigNameRegExp;
    private static readonly _profileNameRegExp;
    /**
     * Returns the absolute path of the `rig.schema.json` JSON schema file for `config/rig.json`,
     * which is bundled with this NPM package.
     *
     * @remarks
     * The `RigConfig` class already performs schema validation when loading `rig.json`; however
     * this schema file may be useful for integration with other validation tools.
     *
     * @public
     */
    static jsonSchemaPath: string;
    private static _jsonSchemaObject;
    private static readonly _configCache;
    /**
     * {@inheritdoc IRigConfig.projectFolderOriginalPath}
     */
    readonly projectFolderOriginalPath: string;
    /**
     * {@inheritdoc IRigConfig.projectFolderPath}
     */
    readonly projectFolderPath: string;
    /**
     * {@inheritdoc IRigConfig.rigFound}
     */
    readonly rigFound: boolean;
    /**
     * {@inheritdoc IRigConfig.filePath}
     */
    readonly filePath: string;
    /**
     * {@inheritdoc IRigConfig.rigPackageName}
     */
    readonly rigPackageName: string;
    /**
     * {@inheritdoc IRigConfig.rigProfile}
     */
    readonly rigProfile: string;
    /**
     * {@inheritdoc IRigConfig.relativeProfileFolderPath}
     */
    readonly relativeProfileFolderPath: string;
    private _resolvedRigPackageFolder;
    private _resolvedProfileFolder;
    private constructor();
    /**
     * The JSON contents of the {@link RigConfig.jsonSchemaPath} file.
     *
     * @remarks
     * The JSON object will be lazily loaded when this property getter is accessed, and the result
     * will be cached.
     * Accessing this property may make a synchronous filesystem call.
     */
    static get jsonSchemaObject(): object;
    /**
     * Use this method to load the `config/rig.json` file for a given project.
     *
     * @remarks
     * If the file cannot be found, an empty `RigConfig` object will be returned with {@link RigConfig.rigFound}
     * equal to `false`.
     */
    static loadForProjectFolder(options: ILoadForProjectFolderOptions): RigConfig;
    /**
     * An async variant of {@link RigConfig.loadForProjectFolder}
     */
    static loadForProjectFolderAsync(options: ILoadForProjectFolderOptions): Promise<RigConfig>;
    private static _handleConfigError;
    /**
     * {@inheritdoc IRigConfig.getResolvedProfileFolder}
     */
    getResolvedProfileFolder(): string;
    /**
     * {@inheritdoc IRigConfig.getResolvedProfileFolderAsync}
     */
    getResolvedProfileFolderAsync(): Promise<string>;
    /**
     * {@inheritdoc IRigConfig.tryResolveConfigFilePath}
     */
    tryResolveConfigFilePath(configFileRelativePath: string): string | undefined;
    /**
     * {@inheritdoc IRigConfig.tryResolveConfigFilePathAsync}
     */
    tryResolveConfigFilePathAsync(configFileRelativePath: string): Promise<string | undefined>;
    private static _validateSchema;
}

export { }
