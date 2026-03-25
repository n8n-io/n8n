import * as storybook_internal_types from 'storybook/internal/types';
import { CLIOptions, LoadOptions, BuilderOptions, StorybookConfigRaw, PresetConfig, CoreCommon_ResolvedAddonPreset, CoreCommon_ResolvedAddonVirtual, LoadedPreset, Presets, CoreCommon_AddonInfo, SupportedFramework, SupportedRenderer, SupportedBuilder, Options as Options$2, CoreWebpackCompiler, CoreCommon_StorybookInfo, Ref, StorybookConfig, StoriesEntry, NormalizedStoriesSpecifier, PackageJson } from 'storybook/internal/types';
export { PackageJson } from 'storybook/internal/types';
import { WriteStream } from 'node:fs';
import { Buffer } from 'node:buffer';
import { ChildProcess } from 'node:child_process';
import { Readable, Writable, Stream } from 'node:stream';
import { ConfigFile } from 'storybook/internal/csf-tools';
import { types } from 'storybook/internal/babel';

declare const _default: {
    '@storybook/addon-a11y': string;
    '@storybook/addon-docs': string;
    '@storybook/addon-links': string;
    '@storybook/addon-onboarding': string;
    'storybook-addon-pseudo-states': string;
    '@storybook/addon-themes': string;
    '@storybook/addon-vitest': string;
    '@storybook/builder-vite': string;
    '@storybook/builder-webpack5': string;
    storybook: string;
    '@storybook/angular': string;
    '@storybook/ember': string;
    '@storybook/html-vite': string;
    '@storybook/nextjs': string;
    '@storybook/nextjs-vite': string;
    '@storybook/preact-vite': string;
    '@storybook/react-native-web-vite': string;
    '@storybook/react-vite': string;
    '@storybook/react-webpack5': string;
    '@storybook/server-webpack5': string;
    '@storybook/svelte-vite': string;
    '@storybook/sveltekit': string;
    '@storybook/vue3-vite': string;
    '@storybook/web-components-vite': string;
    sb: string;
    '@storybook/cli': string;
    '@storybook/codemod': string;
    '@storybook/core-webpack': string;
    'create-storybook': string;
    '@storybook/csf-plugin': string;
    'eslint-plugin-storybook': string;
    '@storybook/react-dom-shim': string;
    '@storybook/preset-create-react-app': string;
    '@storybook/preset-react-webpack': string;
    '@storybook/preset-server-webpack': string;
    '@storybook/html': string;
    '@storybook/preact': string;
    '@storybook/react': string;
    '@storybook/server': string;
    '@storybook/svelte': string;
    '@storybook/vue3': string;
    '@storybook/web-components': string;
};

type InterPresetOptions = Omit<CLIOptions & LoadOptions & BuilderOptions & {
    isCritical?: boolean;
    build?: StorybookConfigRaw['build'];
}, 'frameworkPresets'>;
declare function filterPresetsConfig(presetsConfig: PresetConfig[]): PresetConfig[];
/**
 * Parse an addon into either a managerEntries or a preset. Throw on invalid input.
 *
 * Valid inputs:
 *
 * - `'@storybook/addon-docs/preset' => { type: 'presets', item }`
 * - `'@storybook/addon-docs' => { type: 'presets', item: '@storybook/addon-docs/preset' }`
 * - `{ name: '@storybook/addon-docs(/preset)?', options: { } } => { type: 'presets', item: { name:
 *   '@storybook/addon-docs/preset', options } }`
 */
declare const resolveAddonName: (configDir: string, name: string, options: any) => CoreCommon_ResolvedAddonPreset | CoreCommon_ResolvedAddonVirtual | undefined;
declare function loadPreset(input: PresetConfig, level: number, storybookOptions: InterPresetOptions): Promise<LoadedPreset[]>;
declare function getPresets(presets: PresetConfig[], storybookOptions: InterPresetOptions): Promise<Presets>;
declare function loadAllPresets(options: CLIOptions & LoadOptions & BuilderOptions & {
    corePresets: PresetConfig[];
    overridePresets: PresetConfig[];
    /** Whether preset failures should be critical or not */
    isCritical?: boolean;
    build?: StorybookConfigRaw['build'];
}): Promise<Presets>;

interface FileSystemCacheOptions {
    ns?: string;
    prefix?: string;
    hash_alg?: string;
    basePath?: string;
    ttl?: number;
}
interface CacheItem {
    key: string;
    content?: any;
    value?: any;
}
interface CacheSetOptions {
    ttl?: number;
    encoding?: BufferEncoding;
}
declare class FileSystemCache {
    private prefix;
    private hash_alg;
    private cache_dir;
    private ttl;
    constructor(options?: FileSystemCacheOptions);
    private generateHash;
    private isExpired;
    private parseCacheData;
    private parseSetData;
    get<T = any>(name: string, fallback?: T): Promise<T>;
    getSync<T>(name: string, fallback?: T): T;
    set<T>(name: string, data: T, orgOpts?: CacheSetOptions | number): Promise<void>;
    setSync<T>(name: string, data: T, orgOpts?: CacheSetOptions | number): void;
    setMany(items: CacheItem[], options?: CacheSetOptions): Promise<void>;
    setManySync(items: CacheItem[], options?: CacheSetOptions): void;
    remove(name: string): Promise<void>;
    removeSync(name: string): void;
    clear(): Promise<void>;
    clearSync(): void;
    getAll(): Promise<CacheItem[]>;
    load(): Promise<{
        files: CacheItem[];
    }>;
}
declare function createFileSystemCache(options: FileSystemCacheOptions): FileSystemCache;

declare const cache: FileSystemCache;

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

// Helper type. Not useful on its own.
type Without<FirstType, SecondType> = {[KeyType in Exclude<keyof FirstType, keyof SecondType>]?: never};

/**
Create a type that has mutually exclusive keys.

This type was inspired by [this comment](https://github.com/Microsoft/TypeScript/issues/14094#issuecomment-373782604).

This type works with a helper type, called `Without`. `Without<FirstType, SecondType>` produces a type that has only keys from `FirstType` which are not present on `SecondType` and sets the value type for these keys to `never`. This helper type is then used in `MergeExclusive` to remove keys from either `FirstType` or `SecondType`.

@example
```
import type {MergeExclusive} from 'type-fest';

interface ExclusiveVariation1 {
	exclusive1: boolean;
}

interface ExclusiveVariation2 {
	exclusive2: string;
}

type ExclusiveOptions = MergeExclusive<ExclusiveVariation1, ExclusiveVariation2>;

let exclusiveOptions: ExclusiveOptions;

exclusiveOptions = {exclusive1: true};
//=> Works
exclusiveOptions = {exclusive2: 'hi'};
//=> Works
exclusiveOptions = {exclusive1: true, exclusive2: 'hi'};
//=> Error
```

@category Object
*/
type MergeExclusive<FirstType, SecondType> =
	(FirstType | SecondType) extends object ?
		(Without<FirstType, SecondType> & SecondType) | (Without<SecondType, FirstType> & FirstType) :
		FirstType | SecondType;

declare function temporaryDirectory({ prefix }?: {
    prefix?: string | undefined;
}): Promise<string>;
type FileOptions = MergeExclusive<{
    /**
     * File extension.
     *
     * Mutually exclusive with the `name` option.
     *
     * _You usually won't need this option. Specify it only when actually needed._
     */
    readonly extension?: string;
}, {
    /**
     * Filename.
     *
     * Mutually exclusive with the `extension` option.
     *
     * _You usually won't need this option. Specify it only when actually needed._
     */
    readonly name?: string;
}>;
declare function temporaryFile({ name, extension }?: FileOptions): Promise<string>;
declare function parseList(str: string): string[];
declare function getEnvConfig(program: Record<string, any>, configEnv: Record<string, any>): void;
/**
 * Given a file name, creates an object with utilities to manage a log file. It creates a temporary
 * log file which you can manage with the returned functions. You can then decide whether to move
 * the log file to the users project, or remove it.
 *
 * @example
 *
 * ```ts
 * const { logStream, moveLogFile, removeLogFile, clearLogFile, readLogFile } =
 *   await createLogStream('my-log-file.log');
 *
 * // SCENARIO 1:
 * // you can write custom messages to generate a log file
 * logStream.write('my log message');
 * await moveLogFile();
 *
 * // SCENARIO 2:
 * // or you can pass it to stdio and capture the output of that command
 * try {
 *   await executeCommand({
 *     command: 'pnpm',
 *     args: ['info', packageName, ...args],
 *     // do not output to the user, and send stdio and stderr to log file
 *     stdio: ['ignore', logStream, logStream],
 *   });
 * } catch (err) {
 *   // do something with the log file content
 *   const output = await readLogFile();
 *   // move the log file to the users project
 *   await moveLogFile();
 * }
 * // success, no need to keep the log file
 * await removeLogFile();
 * ```
 */
declare const createLogStream: (logFileName?: string) => Promise<{
    moveLogFile: () => Promise<void>;
    removeLogFile: () => Promise<void>;
    clearLogFile: () => Promise<void>;
    readLogFile: () => Promise<string>;
    logStream: WriteStream;
}>;
declare const isCorePackage: (pkg: string) => boolean;
declare const isSatelliteAddon: (pkg: string) => boolean;

interface Options$1 {
    before: CoreCommon_AddonInfo;
    after: CoreCommon_AddonInfo;
    configFile: string;
    getConfig: (path: string) => any;
}
declare const checkAddonOrder: ({ before, after, configFile, getConfig }: Options$1) => Promise<void>;

declare function loadEnvs(options?: {
    production?: boolean;
}): Promise<{
    stringified: Record<string, string>;
    raw: Record<string, string>;
}>;
declare const stringifyEnvs: (raw: Record<string, string>) => Record<string, string>;
declare const stringifyProcessEnvs: (raw: Record<string, string>) => Record<string, string>;
declare const optionalEnvToBoolean: (input: string | undefined) => boolean | undefined;
/**
 * Consistently determine if we are in a CI environment
 *
 * Doing Boolean(process.env.CI) or !process.env.CI is not enough, because users might set CI=false
 * or CI=0, which would be truthy, and thus return true in those cases.
 */
declare function isCI(): boolean | undefined;

declare const commonGlobOptions: (glob: string) => {
    ignore?: undefined;
} | {
    ignore: string[];
};

declare const frameworkToRenderer: Record<SupportedFramework | SupportedRenderer, SupportedRenderer>;
declare const frameworkToBuilder: Record<SupportedFramework, SupportedBuilder>;

/**
 * Builder options can be specified in `core.builder.options` or `framework.options.builder`.
 * Preference is given here to `framework.options.builder` if both are specified.
 */
declare function getBuilderOptions<T extends Record<string, any>>(options: Options$2): Promise<T | Record<string, never>>;

/** Framework can be a string or an object. This utility always returns the string name. */
declare function getFrameworkName(options: Options$2): Promise<string>;
/**
 * Extracts the proper framework name from the given framework field. The framework field can be the
 * framework package name or a path to the framework package.
 *
 * @example
 *
 * ```ts
 * extractFrameworkPackageName('/path/to/@storybook/angular'); // => '@storybook/angular'
 * extractFrameworkPackageName('@third-party/framework'); // => '@third-party/framework'
 * ```
 */
declare const extractFrameworkPackageName: (framework: string) => string;

/**
 * Render is set as a string on core. It must be set by the framework It falls back to the framework
 * name if not set
 */
declare function getRendererName(options: Options$2): Promise<string>;
/**
 * Extracts the proper renderer name from the given framework name.
 *
 * @example
 *
 * ```ts
 * extractRenderer('@storybook/react'); // => 'react'
 * extractRenderer('@storybook/angular'); // => 'angular'
 * extractRenderer('@third-party/framework'); // => null
 * ```
 *
 * @param frameworkName The name of the framework.
 * @returns The name of the renderer.
 */
declare function extractRenderer(frameworkName: string): Promise<storybook_internal_types.SupportedRenderer | null>;

declare function getStorybookConfiguration(storybookScript: string, shortName: string, longName: string): string | null;

declare const rendererPackages: Record<string, SupportedRenderer>;
declare const frameworkPackages: Record<string, SupportedFramework>;
declare const builderPackages: Record<string, SupportedBuilder>;
declare const compilerPackages: Record<string, CoreWebpackCompiler>;
declare const findConfigFile: (prefix: string, configDir: string) => string | null;
declare const getConfigInfo: (configDir?: string) => {
    configDir: string;
    mainConfigPath: string | null;
    previewConfigPath: string | null;
    managerConfigPath: string | null;
};
declare const getStorybookInfo: (configDir?: string, cwd?: string) => Promise<CoreCommon_StorybookInfo>;

declare const getAutoRefs: (options: Options$2) => Promise<Record<string, Ref>>;
declare function getRefs(options: Options$2): Promise<Record<string, Ref>>;

declare function globToRegexp(glob: string): RegExp;

declare class HandledError extends Error {
    handled: boolean;
    constructor(error: unknown);
}

/**
 * Return a string corresponding to template filled with bindings using following pattern: For each
 * (key, value) of `bindings` replace, in template, `{{key}}` by escaped version of `value`
 *
 * @param template {String} Template with `{{binding}}`
 * @param bindings {Object} key-value object use to fill the template, `{{key}}` will be replaced by
 *   `escaped(value)`
 * @returns {String} Filled template
 */
declare const interpolate: (template: string, bindings: Record<string, string>) => string;

interface PackageMeta {
    name: string;
    version: string;
    [key: string]: any;
}

interface ToString {
    toString(): string;
}

type StringOrToString = string | ToString;

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
type readFileCallback = (err: Error | null, file?: StringOrToString) => void;

/**
 * Callback invoked when resolving a potential symlink
 *
 * @param error
 * @param resolved Absolute path to the resolved file
 */
type realpathCallback = (err: Error | null, resolved?: string) => void;

/**
 * Callback invoked when reading and parsing a package.json file
 *
 * @param error
 * @param resolved Absolute path to the resolved file
 */
type readPackageCallback = (err: Error | null, package?: Record<string, unknown>) => void;

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

// https://github.com/Microsoft/TypeScript/issues/3496#issuecomment-128553540
type JSONValue = string | number | boolean | JSONObject | JSONArray;
interface JSONObject {
    [x: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}

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

declare namespace resolve {
    export type PackageJSON = JSONObject;

    interface Opts {
        /** directory to begin resolving from (defaults to __dirname) */
        basedir?: string | undefined;
        /** package.json data applicable to the module being loaded */
        package?: any;
        /** set to false to exclude node core modules (e.g. fs) from the search */
        includeCoreModules?: boolean | undefined;
        /** array of file extensions to search in order (defaults to ['.js']) */
        extensions?: string | readonly string[] | undefined;
        /** transform the parsed package.json contents before looking at the "main" field */
        packageFilter?: ((pkg: PackageJSON, pkgFile: string, dir: string) => PackageJSON) | undefined;
        /** transform a path within a package */
        pathFilter?: ((pkg: PackageJSON, path: string, relativePath: string) => string) | undefined;
        /** require.paths array to use if nothing is found on the normal node_modules recursive walk (probably don't use this) */
        paths?: string | readonly string[] | undefined;
        /** return the list of candidate paths where the packages sources may be found (probably don't use this) */
        packageIterator?:
            | ((request: string, start: string, getPackageCandidates: () => string[], opts: Opts) => string[])
            | undefined;
        /** directory (or directories) in which to recursively look for modules. (default to 'node_modules') */
        moduleDirectory?: string | readonly string[] | undefined;
        /**
         * if true, doesn't resolve `basedir` to real path before resolving.
         * This is the way Node resolves dependencies when executed with the --preserve-symlinks flag.
         *
         * Note: this property is currently true by default but it will be changed to false in the next major version because Node's resolution
         * algorithm does not preserve symlinks by default.
         */
        preserveSymlinks?: boolean | undefined;
    }

    interface BaseAsyncOpts extends Opts {
        /** function to asynchronously test whether a file exists */
        isFile?: ((file: string, cb: existsCallback) => void) | undefined;
        /** function to asynchronously test whether a directory exists */
        isDirectory?: ((directory: string, cb: existsCallback) => void) | undefined;
        /** function to asynchronously resolve a potential symlink to its real path */
        realpath?: ((file: string, cb: realpathCallback) => void) | undefined;
    }

    export type AsyncOpts =
        & BaseAsyncOpts
        & ({
            /** how to read files asynchronously (defaults to fs.readFile) */
            readFile?: ((file: string, cb: readFileCallback) => void) | undefined;
            /** function to asynchronously read and parse a package.json file */
            readPackage?: never | undefined;
        } | {
            /** how to read files asynchronously (defaults to fs.readFile) */
            readFile?: never | undefined;
            /** function to asynchronously read and parse a package.json file */
            readPackage?:
                | ((
                    readFile: (file: string, cb: readFileCallback) => void,
                    pkgfile: string,
                    cb: readPackageCallback,
                ) => void)
                | undefined;
        });

    interface BaseSyncOpts extends Opts {
        /** function to synchronously test whether a file exists */
        isFile?: ((file: string) => boolean) | undefined;
        /** function to synchronously test whether a directory exists */
        isDirectory?: ((directory: string) => boolean) | undefined;
        /** function to synchronously resolve a potential symlink to its real path */
        realpathSync?: ((file: string) => string) | undefined;
    }

    export type SyncOpts =
        & BaseSyncOpts
        & ({
            /** how to read files synchronously (defaults to fs.readFileSync) */
            readFileSync?: ((file: string) => StringOrToString) | undefined;
            /** function to synchronously read and parse a package.json file */
            readPackageSync?: never | undefined;
        } | {
            /** how to read files synchronously (defaults to fs.readFileSync) */
            readFileSync?: never | undefined;
            /** function to synchronously read and parse a package.json file */
            readPackageSync?:
                | ((
                    readFileSync: (file: string) => StringOrToString,
                    pkgfile: string,
                ) => Record<string, unknown> | undefined)
                | undefined;
        });

    export var sync: typeof resolveSync;
    export var isCore: typeof resolveIsCore;
}

declare const supportedExtensions: readonly [".js", ".ts", ".jsx", ".tsx", ".mjs", ".mts", ".mtsx", ".cjs", ".cts", ".ctsx"];
declare function getInterpretedFile(pathToFile: string): string | undefined;
declare function resolveImport(id: string, options: resolve.SyncOpts): string;

declare function serverRequire(filePath: string | string[]): Promise<any> | null;

declare function loadMainConfig({ configDir, cwd, skipCache, }: {
    configDir: string;
    cwd?: string;
    skipCache?: boolean;
}): Promise<StorybookConfig>;

declare function loadManagerOrAddonsFile({ configDir }: {
    configDir: string;
}): string | undefined;

declare function loadPreviewOrConfigFile({ configDir }: {
    configDir: string;
}): string | undefined;

declare function logConfig(caption: unknown, config: unknown): void;

declare const DEFAULT_FILES_PATTERN = "**/*.@(mdx|stories.@(js|jsx|mjs|ts|tsx))";
declare const getDirectoryFromWorkingDir: ({ configDir, workingDir, directory, }: NormalizeOptions & {
    directory: string;
}) => string;
declare const normalizeStoriesEntry: (entry: StoriesEntry, { configDir, workingDir, defaultFilesPattern }: NormalizeOptions) => NormalizedStoriesSpecifier;
interface NormalizeOptions {
    configDir: string;
    workingDir: string;
    defaultFilesPattern?: string;
}
declare const normalizeStories: (entries: StoriesEntry[], options: NormalizeOptions) => NormalizedStoriesSpecifier[];

declare const getProjectRoot: () => string;
declare const invalidateProjectRootCache: () => void;
/** Finds files in the directory tree up to the project root */
declare const findFilesUp: (matchers: string[], baseDir?: string) => string[];
declare const nodePathsToArray: (nodePath: string) => string[];
/** Ensures that a path starts with `./` or `../`, or is entirely `.` or `..` */
declare function normalizeStoryPath(filename: string): string;

declare function readTemplate(filename: string): Promise<string>;

type StdioOption =
	| 'pipe'
	| 'overlapped'
	| 'ipc'
	| 'ignore'
	| 'inherit'
	| Stream
	| number
	| undefined;

type EncodingOption =
  | 'utf8'
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  | 'utf-8'
  | 'utf16le'
  | 'utf-16le'
  | 'ucs2'
  | 'ucs-2'
  | 'latin1'
  | 'binary'
  | 'ascii'
  | 'hex'
  | 'base64'
  | 'base64url'
  | 'buffer'
  | null
  | undefined;
type DefaultEncodingOption = 'utf8';

type CommonOptions<EncodingType extends EncodingOption = DefaultEncodingOption> = {
	/**
	Kill the spawned process when the parent process exits unless either:
		- the spawned process is [`detached`](https://nodejs.org/api/child_process.html#child_process_options_detached)
		- the parent process is terminated abruptly, for example, with `SIGKILL` as opposed to `SIGTERM` or a normal exit

	@default true
	*/
	readonly cleanup?: boolean;

	/**
	Prefer locally installed binaries when looking for a binary to execute.

	If you `$ npm install foo`, you can then `execa('foo')`.

	@default `true` with `$`, `false` otherwise
	*/
	readonly preferLocal?: boolean;

	/**
	Preferred path to find locally installed binaries in (use with `preferLocal`).

	@default process.cwd()
	*/
	readonly localDir?: string | URL;

	/**
	Path to the Node.js executable to use in child processes.

	This can be either an absolute path or a path relative to the `cwd` option.

	Requires `preferLocal` to be `true`.

	For example, this can be used together with [`get-node`](https://github.com/ehmicky/get-node) to run a specific Node.js version in a child process.

	@default process.execPath
	*/
	readonly execPath?: string;

	/**
	Buffer the output from the spawned process. When set to `false`, you must read the output of `stdout` and `stderr` (or `all` if the `all` option is `true`). Otherwise the returned promise will not be resolved/rejected.

	If the spawned process fails, `error.stdout`, `error.stderr`, and `error.all` will contain the buffered data.

	@default true
	*/
	readonly buffer?: boolean;

	/**
	Same options as [`stdio`](https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_options_stdio).

	@default `inherit` with `$`, `pipe` otherwise
	*/
	readonly stdin?: StdioOption;

	/**
	Same options as [`stdio`](https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_options_stdio).

	@default 'pipe'
	*/
	readonly stdout?: StdioOption;

	/**
	Same options as [`stdio`](https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_options_stdio).

	@default 'pipe'
	*/
	readonly stderr?: StdioOption;

	/**
	Setting this to `false` resolves the promise with the error instead of rejecting it.

	@default true
	*/
	readonly reject?: boolean;

	/**
	Add an `.all` property on the promise and the resolved value. The property contains the output of the process with `stdout` and `stderr` interleaved.

	@default false
	*/
	readonly all?: boolean;

	/**
	Strip the final [newline character](https://en.wikipedia.org/wiki/Newline) from the output.

	@default true
	*/
	readonly stripFinalNewline?: boolean;

	/**
	Set to `false` if you don't want to extend the environment variables when providing the `env` property.

	@default true
	*/
	readonly extendEnv?: boolean;

	/**
	Current working directory of the child process.

	@default process.cwd()
	*/
	readonly cwd?: string | URL;

	/**
	Environment key-value pairs. Extends automatically from `process.env`. Set `extendEnv` to `false` if you don't want this.

	@default process.env
	*/
	readonly env?: NodeJS.ProcessEnv;

	/**
	Explicitly set the value of `argv[0]` sent to the child process. This will be set to `command` or `file` if not specified.
	*/
	readonly argv0?: string;

	/**
	Child's [stdio](https://nodejs.org/api/child_process.html#child_process_options_stdio) configuration.

	@default 'pipe'
	*/
	readonly stdio?: 'pipe' | 'overlapped' | 'ignore' | 'inherit' | readonly StdioOption[];

	/**
	Specify the kind of serialization used for sending messages between processes when using the `stdio: 'ipc'` option or `execaNode()`:
		- `json`: Uses `JSON.stringify()` and `JSON.parse()`.
		- `advanced`: Uses [`v8.serialize()`](https://nodejs.org/api/v8.html#v8_v8_serialize_value)

	[More info.](https://nodejs.org/api/child_process.html#child_process_advanced_serialization)

	@default 'json'
	*/
	readonly serialization?: 'json' | 'advanced';

	/**
	Prepare child to run independently of its parent process. Specific behavior [depends on the platform](https://nodejs.org/api/child_process.html#child_process_options_detached).

	@default false
	*/
	readonly detached?: boolean;

	/**
	Sets the user identity of the process.
	*/
	readonly uid?: number;

	/**
	Sets the group identity of the process.
	*/
	readonly gid?: number;

	/**
	If `true`, runs `command` inside of a shell. Uses `/bin/sh` on UNIX and `cmd.exe` on Windows. A different shell can be specified as a string. The shell should understand the `-c` switch on UNIX or `/d /s /c` on Windows.

	We recommend against using this option since it is:
	- not cross-platform, encouraging shell-specific syntax.
	- slower, because of the additional shell interpretation.
	- unsafe, potentially allowing command injection.

	@default false
	*/
	readonly shell?: boolean | string;

	/**
	Specify the character encoding used to decode the `stdout` and `stderr` output. If set to `'buffer'` or `null`, then `stdout` and `stderr` will be a `Buffer` instead of a string.

	@default 'utf8'
	*/
	readonly encoding?: EncodingType;

	/**
	If `timeout` is greater than `0`, the parent will send the signal identified by the `killSignal` property (the default is `SIGTERM`) if the child runs longer than `timeout` milliseconds.

	@default 0
	*/
	readonly timeout?: number;

	/**
	Largest amount of data in bytes allowed on `stdout` or `stderr`. Default: 100 MB.

	@default 100_000_000
	*/
	readonly maxBuffer?: number;

	/**
	Signal value to be used when the spawned process will be killed.

	@default 'SIGTERM'
	*/
	readonly killSignal?: string | number;

	/**
	You can abort the spawned process using [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).

	When `AbortController.abort()` is called, [`.isCanceled`](https://github.com/sindresorhus/execa#iscanceled) becomes `true`.

	@example
	```
	import {execa} from 'execa';

	const abortController = new AbortController();
	const subprocess = execa('node', [], {signal: abortController.signal});

	setTimeout(() => {
		abortController.abort();
	}, 1000);

	try {
		await subprocess;
	} catch (error) {
		console.log(subprocess.killed); // true
		console.log(error.isCanceled); // true
	}
	```
	*/
	readonly signal?: AbortSignal;

	/**
	If `true`, no quoting or escaping of arguments is done on Windows. Ignored on other platforms. This is set to `true` automatically when the `shell` option is `true`.

	@default false
	*/
	readonly windowsVerbatimArguments?: boolean;

	/**
	On Windows, do not create a new console window. Please note this also prevents `CTRL-C` [from working](https://github.com/nodejs/node/issues/29837) on Windows.

	@default true
	*/
	readonly windowsHide?: boolean;

	/**
	Print each command on `stderr` before executing it.

	This can also be enabled by setting the `NODE_DEBUG=execa` environment variable in the current process.

	@default false
	*/
	readonly verbose?: boolean;
};

type Options<EncodingType extends EncodingOption = DefaultEncodingOption> = {
	/**
	Write some input to the `stdin` of your binary.

	If the input is a file, use the `inputFile` option instead.
	*/
	readonly input?: string | Buffer | Readable;

	/**
	Use a file as input to the the `stdin` of your binary.

	If the input is not a file, use the `input` option instead.
	*/
	readonly inputFile?: string;
} & CommonOptions<EncodingType>;

type NodeOptions<EncodingType extends EncodingOption = DefaultEncodingOption> = {
	/**
	The Node.js executable to use.

	@default process.execPath
	*/
	readonly nodePath?: string;

	/**
	List of [CLI options](https://nodejs.org/api/cli.html#cli_options) passed to the Node.js executable.

	@default process.execArgv
	*/
	readonly nodeOptions?: string[];
} & Options<EncodingType>;

type StdoutStderrAll = string | Buffer | undefined;

type ExecaReturnBase<StdoutStderrType extends StdoutStderrAll> = {
	/**
	The file and arguments that were run, for logging purposes.

	This is not escaped and should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	command: string;

	/**
	Same as `command` but escaped.

	This is meant to be copy and pasted into a shell, for debugging purposes.
	Since the escaping is fairly basic, this should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	escapedCommand: string;

	/**
	The numeric exit code of the process that was run.
	*/
	exitCode: number;

	/**
	The output of the process on stdout.
	*/
	stdout: StdoutStderrType;

	/**
	The output of the process on stderr.
	*/
	stderr: StdoutStderrType;

	/**
	Whether the process failed to run.
	*/
	failed: boolean;

	/**
	Whether the process timed out.
	*/
	timedOut: boolean;

	/**
	Whether the process was killed.
	*/
	killed: boolean;

	/**
	The name of the signal that was used to terminate the process. For example, `SIGFPE`.

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`.
	*/
	signal?: string;

	/**
	A human-friendly description of the signal that was used to terminate the process. For example, `Floating point arithmetic error`.

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`. It is also `undefined` when the signal is very uncommon which should seldomly happen.
	*/
	signalDescription?: string;

	/**
	The `cwd` of the command if provided in the command options. Otherwise it is `process.cwd()`.
	*/
	cwd: string;
};

type ExecaSyncReturnValue<StdoutStderrType extends StdoutStderrAll = string> = {
} & ExecaReturnBase<StdoutStderrType>;

/**
Result of a child process execution. On success this is a plain object. On failure this is also an `Error` instance.

The child process fails when:
- its exit code is not `0`
- it was killed with a signal
- timing out
- being canceled
- there's not enough memory or there are already too many child processes
*/
type ExecaReturnValue<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	The output of the process with `stdout` and `stderr` interleaved.

	This is `undefined` if either:
	- the `all` option is `false` (default value)
	- `execaSync()` was used
	*/
	all?: StdoutStderrType;

	/**
	Whether the process was canceled.

	You can cancel the spawned process using the [`signal`](https://github.com/sindresorhus/execa#signal-1) option.
	*/
	isCanceled: boolean;
} & ExecaSyncReturnValue<StdoutStderrType>;

type ExecaSyncError<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	Error message when the child process failed to run. In addition to the underlying error message, it also contains some information related to why the child process errored.

	The child process stderr then stdout are appended to the end, separated with newlines and not interleaved.
	*/
	message: string;

	/**
	This is the same as the `message` property except it does not include the child process stdout/stderr.
	*/
	shortMessage: string;

	/**
	Original error message. This is the same as the `message` property except it includes neither the child process stdout/stderr nor some additional information added by Execa.

	This is `undefined` unless the child process exited due to an `error` event or a timeout.
	*/
	originalMessage?: string;
} & Error & ExecaReturnBase<StdoutStderrType>;

type ExecaError<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	The output of the process with `stdout` and `stderr` interleaved.

	This is `undefined` if either:
	- the `all` option is `false` (default value)
	- `execaSync()` was used
	*/
	all?: StdoutStderrType;

	/**
	Whether the process was canceled.
	*/
	isCanceled: boolean;
} & ExecaSyncError<StdoutStderrType>;

type KillOptions = {
	/**
	Milliseconds to wait for the child process to terminate before sending `SIGKILL`.

	Can be disabled with `false`.

	@default 5000
	*/
	forceKillAfterTimeout?: number | false;
};

type ExecaChildPromise<StdoutStderrType extends StdoutStderrAll> = {
	/**
	Stream combining/interleaving [`stdout`](https://nodejs.org/api/child_process.html#child_process_subprocess_stdout) and [`stderr`](https://nodejs.org/api/child_process.html#child_process_subprocess_stderr).

	This is `undefined` if either:
		- the `all` option is `false` (the default value)
		- both `stdout` and `stderr` options are set to [`'inherit'`, `'ipc'`, `Stream` or `integer`](https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_options_stdio)
	*/
	all?: Readable;

	catch<ResultType = never>(
		onRejected?: (reason: ExecaError<StdoutStderrType>) => ResultType | PromiseLike<ResultType>
	): Promise<ExecaReturnValue<StdoutStderrType> | ResultType>;

	/**
	Same as the original [`child_process#kill()`](https://nodejs.org/api/child_process.html#child_process_subprocess_kill_signal), except if `signal` is `SIGTERM` (the default value) and the child process is not terminated after 5 seconds, force it by sending `SIGKILL`. Note that this graceful termination does not work on Windows, because Windows [doesn't support signals](https://nodejs.org/api/process.html#process_signal_events) (`SIGKILL` and `SIGTERM` has the same effect of force-killing the process immediately.) If you want to achieve graceful termination on Windows, you have to use other means, such as [`taskkill`](https://github.com/sindresorhus/taskkill).
	*/
	kill(signal?: string, options?: KillOptions): void;

	/**
	Similar to [`childProcess.kill()`](https://nodejs.org/api/child_process.html#child_process_subprocess_kill_signal). This used to be preferred when cancelling the child process execution as the error is more descriptive and [`childProcessResult.isCanceled`](#iscanceled) is set to `true`. But now this is deprecated and you should either use `.kill()` or the `signal` option when creating the child process.
	*/
	cancel(): void;

	/**
	[Pipe](https://nodejs.org/api/stream.html#readablepipedestination-options) the child process's `stdout` to `target`, which can be:
	- Another `execa()` return value
	- A writable stream
	- A file path string

	If the `target` is another `execa()` return value, it is returned. Otherwise, the original `execa()` return value is returned. This allows chaining `pipeStdout()` then `await`ing the final result.

	The `stdout` option] must be kept as `pipe`, its default value.
	*/
	pipeStdout?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeStdout?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;

	/**
	Like `pipeStdout()` but piping the child process's `stderr` instead.

	The `stderr` option must be kept as `pipe`, its default value.
	*/
	pipeStderr?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeStderr?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;

	/**
	Combines both `pipeStdout()` and `pipeStderr()`.

	Either the `stdout` option or the `stderr` option must be kept as `pipe`, their default value. Also, the `all` option must be set to `true`.
	*/
	pipeAll?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeAll?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;
};

type ExecaChildProcess<StdoutStderrType extends StdoutStderrAll = string> = ChildProcess &
ExecaChildPromise<StdoutStderrType> &
Promise<ExecaReturnValue<StdoutStderrType>>;

type ExecuteCommandOptions = CommonOptions<'utf8'> & {
    command: string;
    args?: string[];
    cwd?: string;
    ignoreError?: boolean;
    env?: Record<string, any>;
};
declare function executeCommand(options: ExecuteCommandOptions): ExecaChildProcess;
declare function executeCommandSync(options: ExecuteCommandOptions): string;
declare function executeNodeCommand({ scriptPath, args, options, }: {
    scriptPath: string;
    args?: string[];
    options?: NodeOptions;
}): ExecaChildProcess;

type PackageJsonWithDepsAndDevDeps = PackageJson & Required<Pick<PackageJson, 'dependencies' | 'devDependencies'>>;
type PackageJsonWithMaybeDeps = Partial<Pick<PackageJson, 'dependencies' | 'devDependencies' | 'peerDependencies' | 'files'>>;

type PackageMetadata = {
    version: string;
    location?: string;
    reasons?: string[];
};
type InstallationMetadata = {
    dependencies: Record<string, PackageMetadata[]>;
    duplicatedDependencies: Record<string, string[]>;
    infoCommand: string;
    dedupeCommand: string;
};

declare enum PackageManagerName {
    NPM = "npm",
    YARN1 = "yarn1",
    YARN2 = "yarn2",
    PNPM = "pnpm",
    BUN = "bun"
}
/**
 * Extract package name and version from input
 *
 * @param pkg A string like `@storybook/cli`, `react` or `react@^16`
 * @returns A tuple of 2 elements: [packageName, packageVersion]
 */
declare function getPackageDetails(pkg: string): [string, string?];
interface JsPackageManagerOptions {
    cwd?: string;
    configDir?: string;
    storiesPaths?: string[];
}
type PackageJsonInfo = {
    packageJsonPath: string;
    operationDir: string;
    packageJson: PackageJsonWithDepsAndDevDeps;
};
declare abstract class JsPackageManager {
    #private;
    abstract readonly type: PackageManagerName;
    /** The path to the primary package.json file (contains the `storybook` dependency). */
    readonly primaryPackageJson: PackageJsonInfo;
    /** The paths to all package.json files in the project root. */
    packageJsonPaths: string[];
    /**
     * The path to the Storybook instance directory. This is used to find the primary package.json
     * file in a repository.
     */
    readonly instanceDir: string;
    /** The current working directory. */
    protected readonly cwd: string;
    /** Cache for latest version results to avoid repeated network calls. */
    static readonly latestVersionCache: Map<string, string | null>;
    /** Cache for installed version results to avoid repeated file system calls. */
    static readonly installedVersionCache: Map<string, string | null>;
    /** Cache for package.json files to avoid repeated file system calls. */
    static readonly packageJsonCache: Map<string, PackageJsonWithDepsAndDevDeps>;
    constructor(options?: JsPackageManagerOptions);
    /** Runs arbitrary package scripts (as a string for display). */
    abstract getRunCommand(command: string): string;
    /** Returns the command to run the binary of a local package */
    abstract getPackageCommand(args: string[]): string;
    /** Get the package.json file for a given module. */
    abstract getModulePackageJSON(packageName: string, cwd?: string): Promise<PackageJson | null>;
    isStorybookInMonorepo(): boolean;
    installDependencies(options?: {
        force?: boolean;
    }): Promise<void>;
    dedupeDependencies(options?: {
        force?: boolean;
    }): Promise<void>;
    /** Read the `package.json` file available in the provided directory */
    static getPackageJson(packageJsonPath: string): PackageJsonWithDepsAndDevDeps;
    writePackageJson(packageJson: PackageJson, directory?: string): void;
    getAllDependencies(): Record<string, string>;
    isDependencyInstalled(dependency: string): boolean;
    /**
     * Add dependencies to a project using `yarn add` or `npm install`.
     *
     * @example
     *
     * ```ts
     * addDependencies(options, [
     *   `@storybook/react@${storybookVersion}`,
     *   `@storybook/addon-links@${linksVersion}`,
     * ]);
     * ```
     *
     * @param {Object} options Contains `skipInstall`, `packageJson` and `installAsDevDependencies`
     *   which we use to determine how we install packages.
     * @param {Array} dependencies Contains a list of packages to add.
     */
    addDependencies(options: {
        skipInstall: true;
        type: 'dependencies' | 'devDependencies' | 'peerDependencies';
        writeOutputToFile?: boolean;
        packageJsonInfo?: PackageJsonInfo;
    } | {
        skipInstall?: false;
        type: 'dependencies' | 'devDependencies';
        writeOutputToFile?: boolean;
        packageJsonInfo?: PackageJsonInfo;
    }, dependencies: string[]): Promise<void | ExecaChildProcess>;
    /**
     * Removing dependencies from the package.json file, which is found first starting from the
     * instance root. The method does not run a package manager install like `npm install`.
     *
     * @example
     *
     * ```ts
     * removeDependencies([`@storybook/react`]);
     * ```
     *
     * @param dependencies Contains a list of packages to remove.
     */
    removeDependencies(dependencies: string[]): Promise<void>;
    /**
     * Return an array of strings matching following format: `<package_name>@<package_latest_version>`
     *
     * For packages in the storybook monorepo, when the latest version is equal to the version of the
     * current CLI the version is not added to the string.
     *
     * When a package is in the monorepo, and the version is not equal to the CLI version, the version
     * is taken from the versions.ts file and added to the string.
     *
     * @param packages
     */
    getVersionedPackages(packages: string[]): Promise<string[]>;
    /**
     * Return an array of string standing for the latest version of the input packages. To be able to
     * identify which version goes with which package the order of the input array is keep.
     *
     * @param packageNames
     */
    getVersions(...packageNames: string[]): Promise<string[]>;
    /**
     * Return the latest version of the input package available on npmjs registry. If constraint are
     * provided it return the latest version matching the constraints.
     *
     * For `@storybook/*` packages the latest version is retrieved from `cli/src/versions.json` file
     * directly
     *
     * @param packageName The name of the package
     * @param constraint A valid semver constraint, example: '1.x || >=2.5.0 || 5.0.0 - 7.2.3'
     */
    getVersion(packageName: string, constraint?: string): Promise<string>;
    /**
     * Get the latest version of the package available on npmjs.com. If constraint is set then it
     * returns a version satisfying it, otherwise the latest version available is returned.
     *
     * @param packageName Name of the package
     * @param constraint Version range to use to constraint the returned version
     */
    latestVersion(packageName: string, constraint?: string): Promise<string | null>;
    /**
     * Clear the latest version cache. Useful for testing or when you want to refresh version
     * information.
     *
     * @param packageName Optional package name to clear only specific entries. If not provided,
     *   clears all cache.
     */
    static clearLatestVersionCache(packageName?: string): void;
    /**
     * Clear the installed version cache for a specific package or all packages.
     *
     * @param packageName Optional package name to clear from cache. If not provided, clears all.
     */
    clearInstalledVersionCache(packageName?: string): void;
    /**
     * Clear both the latest version cache and installed version cache. This should be called after
     * any operation that modifies dependencies.
     */
    clearAllVersionCaches(): void;
    addStorybookCommandInScripts(options?: {
        port: number;
        preCommand?: string;
    }): void;
    addScripts(scripts: Record<string, string>): void;
    addPackageResolutions(versions: Record<string, string>): void;
    protected abstract runInstall(options?: {
        force?: boolean;
    }): ExecaChildProcess;
    protected abstract runAddDeps(dependencies: string[], installAsDevDependencies: boolean, writeOutputToFile?: boolean): ExecaChildProcess;
    protected abstract getResolutions(packageJson: PackageJson, versions: Record<string, string>): Record<string, any>;
    /**
     * Get the latest or all versions of the input package available on npmjs.com
     *
     * @param packageName Name of the package
     * @param fetchAllVersions Should return
     */
    protected abstract runGetVersions<T extends boolean>(packageName: string, fetchAllVersions: T): Promise<T extends true ? string[] : string>;
    abstract getRegistryURL(): Promise<string | undefined>;
    abstract runInternalCommand(command: string, args: string[], cwd?: string, stdio?: 'inherit' | 'pipe' | 'ignore'): ExecaChildProcess;
    abstract runPackageCommand(options: Omit<ExecuteCommandOptions, 'command'> & {
        args: string[];
    }): ExecaChildProcess;
    abstract findInstallations(pattern?: string[]): Promise<InstallationMetadata | undefined>;
    abstract findInstallations(pattern?: string[], options?: {
        depth: number;
    }): Promise<InstallationMetadata | undefined>;
    abstract parseErrorFromLogs(logs?: string): string;
    /** Returns the installed (within node_modules or pnp zip) version of a specified package */
    getInstalledVersion(packageName: string): Promise<string | null>;
    isPackageInstalled(packageName: string): Promise<boolean>;
    /**
     * Searches for a dependency/devDependency in all package.json files and returns the version of
     * the dependency.
     */
    getDependencyVersion(dependency: string): string | null;
    static hasStorybookDependency(packageJsonPath: string): boolean;
    static hasAnyStorybookDependency(packageJsonPath: string): boolean;
    /** List all package.json files starting from the given directory and stopping at the project root. */
    static listAllPackageJsonPaths(instanceDir: string, storiesPaths?: string[]): string[];
    static getPackageJsonInfo(packageJsonPath: string): PackageJsonInfo;
}

declare class JsPackageManagerFactory {
    /** Cache for package manager instances */
    private static cache;
    /** Generate a cache key based on the parameters */
    private static getCacheKey;
    /** Clear the package manager cache */
    static clearCache(): void;
    /**
     * Determine which package manager type to use based on lockfiles, commands, and environment
     *
     * @param cwd - Current working directory
     * @returns Package manager type as string: 'npm', 'pnpm', 'bun', 'yarn1', or 'yarn2'
     * @throws Error if no usable package manager is found
     */
    static getPackageManagerType(cwd?: string): PackageManagerName;
    static getPackageManager({ force, configDir, storiesPaths, ignoreCache, }?: {
        force?: PackageManagerName;
        configDir?: string;
        storiesPaths?: string[];
        ignoreCache?: boolean;
    }, cwd?: string): JsPackageManager;
    /** Look up map of package manager proxies by name */
    private static PROXY_MAP;
    /**
     * Infer the package manager based on the command the user is running. Each package manager sets
     * the `npm_config_user_agent` environment variable with its name and version e.g. "npm/7.24.0"
     * Which is really useful when invoking commands via npx/pnpx/yarn create/etc.
     */
    private static inferPackageManagerFromUserAgent;
}

type RemoveAddonOptions = {
    packageManager: JsPackageManager;
    configDir?: string;
    skipInstall?: boolean;
};
/**
 * Remove the given addon package and remove it from main.js
 *
 * @example
 *
 * ```sh
 * sb remove @storybook/addon-links
 * ```
 */
declare function removeAddon(addon: string, options: RemoveAddonOptions): Promise<void>;

/**
 * Get the path of the file or directory with input name inside the Storybook cache directory:
 *
 * - `node_modules/.cache/storybook/{directoryName}` in a Node.js project or npm package
 * - `.cache/storybook/{directoryName}` otherwise
 *
 * @param fileOrDirectoryName {string} Name of the file or directory
 * @returns {string} Absolute path to the file or directory
 */
declare function resolvePathInStorybookCache(fileOrDirectoryName: string, sub?: string): string;

declare function isPreservingSymlinks(): boolean | undefined;

declare function getPreviewBodyTemplate(configDirPath: string, interpolations?: Record<string, string>): string;
declare function getPreviewHeadTemplate(configDirPath: string, interpolations?: Record<string, string>): string;

declare function validateFrameworkName(frameworkName: string | undefined): asserts frameworkName is string;

declare function validateConfigurationFiles(configDir: string, cwd?: string): Promise<void>;

/** Mimicking the satisfies operator until we can upgrade to TS4.9 */
declare function satisfies<A>(): <T extends A>(x: T) => T;

interface Prettier {
    resolveConfig: (filePath: string, options?: {
        editorconfig?: boolean;
    }) => Promise<any>;
    format: (content: string, options?: any) => Promise<string> | string;
    check: (content: string, options?: any) => Promise<boolean>;
    clearConfigCache: () => Promise<void>;
    formatWithCursor: (content: string, options?: any) => Promise<{
        formatted: string;
        cursorOffset: number;
    }>;
    getFileInfo: (filePath: string, options?: any) => Promise<{
        ignored: boolean;
        inferredParser: string | null;
    }>;
    getSupportInfo: () => Promise<{
        languages: any[];
        options: any[];
    }>;
    resolveConfigFile: (filePath?: string) => Promise<string | null>;
    version: string;
    AstPath: any;
    doc: any;
    util: any;
}
declare function getPrettier(): Promise<Prettier>;
/**
 * Format the content of a file using prettier. If prettier is not available in the user's project,
 * it will fallback to use editorconfig settings if available and formats the file by a
 * prettier-fallback.
 */
declare function formatFileContent(filePath: string, content: string): Promise<string>;

interface StoryIdData {
    storyFilePath: string;
    exportedStoryName: string;
}
type GetStoryIdOptions = StoryIdData & {
    configDir: string;
    stories: StoriesEntry[];
    workingDir?: string;
    userTitle?: string;
    storyFilePath: string;
};
declare function getStoryId(data: StoryIdData, options: Options$2): Promise<{
    storyId: string;
    kind: string;
}>;
declare function getStoryTitle({ storyFilePath, configDir, stories, workingDir, userTitle, }: Omit<GetStoryIdOptions, 'exportedStoryName'>): string | undefined;

/** Replaces the path separator with forward slashes */
declare const posix: (localPath: string, seperator?: string) => string;

declare function syncStorybookAddons(mainConfig: StorybookConfig, previewConfigPath: string, configDir: string): Promise<void>;
declare function syncPreviewAddonsWithMainConfig(mainConfig: StorybookConfig, previewConfig: ConfigFile, configDir: string): Promise<ConfigFile>;

interface SetupAddonInConfigOptions {
    addonName: string;
    mainConfigCSFFile: ConfigFile;
    previewConfigPath: string | undefined;
    configDir: string;
}
/**
 * Setup an addon in the Storybook configuration by adding it to the addons array in main config and
 * syncing it with preview config.
 *
 * @param options Configuration options for setting up the addon
 */
declare function setupAddonInConfig({ addonName, previewConfigPath, configDir, mainConfigCSFFile, }: SetupAddonInConfigOptions): Promise<void>;

/**
 * Checks if the following node declarations exists in the main config file.
 *
 * @example
 *
 * ```ts
 * const <name> = () => {};
 * function <name>() {}
 * ```
 */
declare function doesVariableOrFunctionDeclarationExist(node: types.Node, name: string): boolean;
/**
 * Returns the name of the getAbsolutePath wrapper function if it exists in the main config file.
 *
 * @returns Name of the getAbsolutePath wrapper function (e.g. `getAbsolutePath`).
 */
declare function getAbsolutePathWrapperName(config: ConfigFile): string | null;
/** Check if the node needs to be wrapped with getAbsolutePath wrapper. */
declare function isGetAbsolutePathWrapperNecessary(node: types.Node, cb?: (node: types.StringLiteral | types.ObjectProperty | types.ArrayExpression) => void): boolean;
/**
 * Get all fields that need to be wrapped with getAbsolutePath wrapper.
 *
 * @returns Array of fields that need to be wrapped with getAbsolutePath wrapper.
 */
declare function getFieldsForGetAbsolutePathWrapper(config: ConfigFile): types.Node[];
/**
 * Returns AST for the following function
 *
 * @example
 *
 * ```ts
 * function getAbsolutePath(value) {
 *   return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
 * }
 * ```
 */
declare function getAbsolutePathWrapperAsCallExpression(isConfigTypescript: boolean): types.FunctionDeclaration;
declare function wrapValueWithGetAbsolutePathWrapper(config: ConfigFile, node: types.Node): void;

/**
 * Helper function to scan for files matching a glob pattern and transform them
 *
 * @param options Configuration options
 * @param transform Function to transform the found files
 * @returns Array of errors encountered during transformation
 */
declare function scanAndTransformFiles<T extends Record<string, unknown>>({ promptMessage, defaultGlob, dryRun, force, transformFn, transformOptions, }: {
    promptMessage?: string;
    defaultGlob?: string;
    dryRun: boolean;
    force?: boolean;
    transformFn: (files: string[], options: T, dryRun: boolean) => Promise<Array<{
        file: string;
        error: Error;
    }>>;
    transformOptions: T;
}): Promise<Array<{
    file: string;
    error: Error;
}>>;

declare const transformImportFiles: (files: string[], renamedImports: Record<string, string>, dryRun?: boolean) => Promise<{
    file: string;
    error: Error;
}[]>;

/**
 * This is just an alias for import.meta.resolve. It makes it possible to mock it in Vitest with
 * module-mocking, as Vitest currently does not support import.meta.resolve in tests.
 *
 * @see https://github.com/vitest-dev/vitest/issues/6953
 */
declare const importMetaResolve: (...args: Parameters<ImportMeta["resolve"]>) => string;
/** Resolves the directory of a given package, by resolving its package.json file. */
declare const resolvePackageDir: (pkg: Parameters<ImportMeta["resolve"]>[0], parent?: Parameters<ImportMeta["resolve"]>[0]) => string;
/**
 * Dynamically imports a module with TypeScript support, falling back to require if necessary.
 *
 * @example Import a TypeScript preset
 *
 * ```ts
 * const preset = await importModule('./my-preset.ts');
 * // Returns the default export or the entire module
 * ```
 *
 * @example Import a JavaScript addon
 *
 * ```ts
 * const addon = await importModule('@storybook/addon-essentials');
 * // Returns the default export or the entire module
 * ```
 */
declare function importModule(path: string, { skipCache }?: {
    skipCache?: boolean;
}): Promise<any>;
/**
 * Safely resolves a module specifier to its absolute file path.
 *
 * Attempts to resolve the given module specifier by trying different file extensions until a valid
 * file is found. Returns undefined if the module cannot be resolved.
 *
 * Optionally pass in a list of file extensions to try, defaulting to `.mjs`, `.js`, and `.cjs`.
 *
 * @example
 *
 * ```typescript
 * // Resolve a relative module
 * const path = safeResolveModule({
 *   specifier: './utils',
 *   parent: import.meta.url,
 * });
 *
 * // Resolve with custom extensions
 * const path = safeResolveModule({
 *   specifier: './config',
 *   extensions: ['.json', '.js'],
 * });
 * ```
 */
declare const safeResolveModule: ({ specifier, parent, extensions, }: {
    specifier: string;
    parent?: string;
    extensions?: string[];
}) => string | undefined;

declare const getAddonNames: (mainConfig: StorybookConfig) => string[];

declare const groupBy: <K extends PropertyKey, T>(items: T[], keySelector: (item: T, index: number) => K) => Record<K, T[]>;
declare function invariant(condition: unknown, message?: string | (() => string)): asserts condition;

export { DEFAULT_FILES_PATTERN, type ExecuteCommandOptions, type FileOptions, FileSystemCache, HandledError, type InstallationMetadata, type InterPresetOptions, JsPackageManager, JsPackageManagerFactory, type PackageJsonInfo, type PackageJsonWithDepsAndDevDeps, type PackageJsonWithMaybeDeps, PackageManagerName, type PackageMetadata, type RemoveAddonOptions, type SetupAddonInConfigOptions, builderPackages, cache, checkAddonOrder, commonGlobOptions, compilerPackages, createFileSystemCache, createLogStream, doesVariableOrFunctionDeclarationExist, executeCommand, executeCommandSync, executeNodeCommand, extractFrameworkPackageName, extractRenderer, filterPresetsConfig, findConfigFile, findFilesUp, formatFileContent, frameworkPackages, frameworkToBuilder, frameworkToRenderer, getAbsolutePathWrapperAsCallExpression, getAbsolutePathWrapperName, getAddonNames, getAutoRefs, getBuilderOptions, getConfigInfo, getDirectoryFromWorkingDir, getEnvConfig, getFieldsForGetAbsolutePathWrapper, getFrameworkName, getInterpretedFile, getPackageDetails, getPresets, getPrettier, getPreviewBodyTemplate, getPreviewHeadTemplate, getProjectRoot, getRefs, getRendererName, getStoryId, getStoryTitle, getStorybookConfiguration, getStorybookInfo, globToRegexp, groupBy, importMetaResolve, importModule, interpolate, invalidateProjectRootCache, invariant, isCI, isCorePackage, isGetAbsolutePathWrapperNecessary, isPreservingSymlinks, isSatelliteAddon, loadAllPresets, loadEnvs, loadMainConfig, loadManagerOrAddonsFile, loadPreset, loadPreviewOrConfigFile, logConfig, nodePathsToArray, normalizeStories, normalizeStoriesEntry, normalizeStoryPath, optionalEnvToBoolean, parseList, posix, readTemplate, removeAddon, rendererPackages, resolveAddonName, resolveImport, resolvePackageDir, resolvePathInStorybookCache, safeResolveModule, satisfies, scanAndTransformFiles, serverRequire, setupAddonInConfig, stringifyEnvs, stringifyProcessEnvs, supportedExtensions, syncPreviewAddonsWithMainConfig, syncStorybookAddons, temporaryDirectory, temporaryFile, transformImportFiles, validateConfigurationFiles, validateFrameworkName, _default as versions, wrapValueWithGetAbsolutePathWrapper };
