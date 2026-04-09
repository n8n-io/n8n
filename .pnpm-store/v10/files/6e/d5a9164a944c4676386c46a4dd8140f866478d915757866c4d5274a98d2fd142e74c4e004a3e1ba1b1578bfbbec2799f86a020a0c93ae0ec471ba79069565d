import { Tag as Tag$1, Parameters, StoryId, StoryName, ComponentTitle, Args, ArgTypes, ComponentId, StoryKind, Globals, GlobalTypes, InputType, StoryContext, PartialStoryFn, LegacyStoryFn, ArgsStoryFn, StoryFn, DecoratorFunction, LoaderFunction, Renderer as Renderer$1, ViewMode as ViewMode$1, ProjectAnnotations as ProjectAnnotations$2, StrictArgTypes, StrictGlobalTypes, StepRunner, BeforeAll, ComponentAnnotations, StoryAnnotations, StoryContextForEnhancers, CleanupCallback, Canvas, StoryIdentifier, StoryAnnotationsOrFn, AnnotatedStoryFn } from '@storybook/core/csf';
export { AfterEach, AnnotatedStoryFn, ArgTypes, ArgTypesEnhancer, Args, ArgsEnhancer, ArgsFromMeta, ArgsStoryFn, BaseAnnotations, ProjectAnnotations as BaseProjectAnnotations, BeforeAll, BeforeEach, Canvas, CleanupCallback, ComponentAnnotations, ComponentId, ComponentTitle, Conditional, DecoratorApplicator, DecoratorFunction, GlobalTypes, Globals, IncludeExcludeOptions, InputType, LegacyAnnotatedStoryFn, LegacyStoryAnnotationsOrFn, LegacyStoryFn, LoaderFunction, Parameters, PartialStoryFn, PlayFunction, PlayFunctionContext, SBArrayType, SBEnumType, SBIntersectionType, SBObjectType, SBOtherType, SBScalarType, SBType, SBUnionType, SeparatorOptions, StepFunction, StepLabel, StepRunner, StoryAnnotations, StoryAnnotationsOrFn, StoryContext, StoryContextForEnhancers, StoryContextForLoaders, StoryContextUpdate, StoryFn, StoryId, StoryIdentifier, StoryKind, StoryName, StrictArgTypes, StrictArgs, StrictGlobalTypes, StrictInputType, Tag } from '@storybook/core/csf';
import { ReactElement, FC, ReactNode, PropsWithChildren } from 'react';
import { Addon_TestProviderType as Addon_TestProviderType$1, NormalizedProjectAnnotations as NormalizedProjectAnnotations$1, ProjectAnnotations as ProjectAnnotations$1, ComposedStoryFn as ComposedStoryFn$1 } from '@storybook/core/types';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { Server as Server$1 } from 'net';
import { Channel as Channel$1 } from '@storybook/core/channels';

type DateNow = number;
type TestProviderConfig = Addon_TestProviderType$1;
type TestingModuleProgressReportProgress = {
    startedAt: DateNow;
    finishedAt?: DateNow;
    numTotalTests?: number;
    numPassedTests?: number;
    numFailedTests?: number;
    numPendingTests?: number;
    percentageCompleted?: number;
};

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations$1<any>;
    var defaultProjectAnnotations: ProjectAnnotations$1<any>;
}
type WrappedStoryRef = {
    __pw_type: 'jsx' | 'importRef';
};
type UnwrappedJSXStoryRef = {
    __pw_type: 'jsx';
    type: UnwrappedImportStoryRef;
};
type UnwrappedImportStoryRef = ComposedStoryFn$1;
declare global {
    function __pwUnwrapObject(storyRef: WrappedStoryRef): Promise<UnwrappedJSXStoryRef | UnwrappedImportStoryRef>;
}

interface Report<T = unknown> {
    type: string;
    version?: number;
    result: T;
    status: 'failed' | 'passed' | 'warning';
}
declare class ReporterAPI {
    reports: Report[];
    addReport(report: Report): Promise<void>;
}

/**
 * A URL pathname, beginning with a /.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.pathname
 */
declare type Pathname = string;
/**
 * A URL search string, beginning with a ?.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.search
 */
declare type Search = string;
/**
 * A URL fragment identifier, beginning with a #.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.hash
 */
declare type Hash = string;
/**
 * A unique string associated with a location. May be used to safely store
 * and retrieve data in some other storage API, like `localStorage`.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.key
 */
declare type Key = string;
/**
 * The pathname, search, and hash values of a URL.
 */
interface Path$1 {
    /**
     * A URL pathname, beginning with a /.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.pathname
     */
    pathname: Pathname;
    /**
     * A URL search string, beginning with a ?.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.search
     */
    search: Search;
    /**
     * A URL fragment identifier, beginning with a #.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.hash
     */
    hash: Hash;
}
/**
 * An entry in a history stack. A location contains information about the
 * URL path, as well as possibly some arbitrary state and a key.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location
 */
interface Location extends Path$1 {
    /**
     * A value of arbitrary data associated with this location.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.state
     */
    state: unknown;
    /**
     * A unique string associated with this location. May be used to safely store
     * and retrieve data in some other storage API, like `localStorage`.
     *
     * Note: This value is always "default" on the initial location.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.key
     */
    key: Key;
}
/**
 * Describes a location that is the destination of some navigation, either via
 * `history.push` or `history.replace`. May be either a URL or the pieces of a
 * URL path.
 */
declare type To = string | Partial<Path$1>;

interface NavigateOptions$1 {
    replace?: boolean;
    state?: any;
}

interface StoryData {
    viewMode?: string;
    storyId?: string;
    refId?: string;
}

interface Other extends StoryData {
    path: string;
    singleStory?: boolean;
}
type NavigateOptions = NavigateOptions$1 & {
    plain?: boolean;
};
type NavigateFunction = (to: To | number, options?: NavigateOptions) => void;
type RouterData = {
    location: Partial<Location>;
    navigate: NavigateFunction;
} & Other;
type RenderData = Pick<RouterData, 'location'> & Other;

interface ThemeVars extends ThemeVarsBase, ThemeVarsColors {
}
interface ThemeVarsBase {
    base: 'light' | 'dark';
}
interface ThemeVarsColors {
    colorPrimary: string;
    colorSecondary: string;
    appBg: string;
    appContentBg: string;
    appPreviewBg: string;
    appBorderColor: string;
    appBorderRadius: number;
    fontBase: string;
    fontCode: string;
    textColor: string;
    textInverseColor: string;
    textMutedColor: string;
    barTextColor: string;
    barHoverColor: string;
    barSelectedColor: string;
    barBg: string;
    buttonBg: string;
    buttonBorder: string;
    booleanBg: string;
    booleanSelectedBg: string;
    inputBg: string;
    inputBorder: string;
    inputTextColor: string;
    inputBorderRadius: number;
    brandTitle?: string;
    brandUrl?: string;
    brandImage?: string;
    brandTarget?: string;
    gridCellSize?: number;
}

type ChannelHandler = (event: ChannelEvent) => void;
interface ChannelTransport {
    send(event: ChannelEvent, options?: any): void;
    setHandler(handler: ChannelHandler): void;
}
interface ChannelEvent {
    type: string;
    from: string;
    args: any[];
}
interface Listener {
    (...args: any[]): void;
}
interface ChannelArgsSingle {
    transport?: ChannelTransport;
    async?: boolean;
}
interface ChannelArgsMulti {
    transports: ChannelTransport[];
    async?: boolean;
}

declare class Channel {
    readonly isAsync: boolean;
    private sender;
    private events;
    private data;
    private readonly transports;
    constructor(input: ChannelArgsMulti);
    constructor(input: ChannelArgsSingle);
    get hasTransport(): boolean;
    addListener(eventName: string, listener: Listener): void;
    emit(eventName: string, ...args: any): void;
    last(eventName: string): any;
    eventNames(): string[];
    listenerCount(eventName: string): number;
    listeners(eventName: string): Listener[] | undefined;
    once(eventName: string, listener: Listener): void;
    removeAllListeners(eventName?: string): void;
    removeListener(eventName: string, listener: Listener): void;
    on(eventName: string, listener: Listener): void;
    off(eventName: string, listener: Listener): void;
    private handleEvent;
    private onceListener;
}

interface Options$1 {
    allowRegExp: boolean;
    allowFunction: boolean;
    allowSymbol: boolean;
    allowDate: boolean;
    allowUndefined: boolean;
    allowClass: boolean;
    allowError: boolean;
    maxDepth: number;
    space: number | undefined;
    lazyEval: boolean;
}

/**
Matches any [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive).

@category Type
*/
type Primitive =
	| null
	| undefined
	| string
	| number
	| boolean
	| symbol
	| bigint;

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

/**
Allows creating a union type by combining primitive types and literal types without sacrificing auto-completion in IDEs for the literal type part of the union.

Currently, when a union type of a primitive type is combined with literal types, TypeScript loses all information about the combined literals. Thus, when such type is used in an IDE with autocompletion, no suggestions are made for the declared literals.

This type is a workaround for [Microsoft/TypeScript#29729](https://github.com/Microsoft/TypeScript/issues/29729). It will be removed as soon as it's not needed anymore.

@example
```
import type {LiteralUnion} from 'type-fest';

// Before

type Pet = 'dog' | 'cat' | string;

const pet: Pet = '';
// Start typing in your TypeScript-enabled IDE.
// You **will not** get auto-completion for `dog` and `cat` literals.

// After

type Pet2 = LiteralUnion<'dog' | 'cat', string>;

const pet: Pet2 = '';
// You **will** get auto-completion for `dog` and `cat` literals.
```

@category Type
*/
type LiteralUnion<
	LiteralType,
	BaseType extends Primitive,
> = LiteralType | (BaseType & Record<never, never>);

declare namespace PackageJson$1 {
	/**
	A person who has been involved in creating or maintaining the package.
	*/
	export type Person =
		| string
		| {
			name: string;
			url?: string;
			email?: string;
		};

	export type BugsLocation =
		| string
		| {
			/**
			The URL to the package's issue tracker.
			*/
			url?: string;

			/**
			The email address to which issues should be reported.
			*/
			email?: string;
		};

	export interface DirectoryLocations {
		[directoryType: string]: unknown;

		/**
		Location for executable scripts. Sugar to generate entries in the `bin` property by walking the folder.
		*/
		bin?: string;

		/**
		Location for Markdown files.
		*/
		doc?: string;

		/**
		Location for example scripts.
		*/
		example?: string;

		/**
		Location for the bulk of the library.
		*/
		lib?: string;

		/**
		Location for man pages. Sugar to generate a `man` array by walking the folder.
		*/
		man?: string;

		/**
		Location for test files.
		*/
		test?: string;
	}

	export type Scripts = {
		/**
		Run **before** the package is published (Also run on local `npm install` without any arguments).
		*/
		prepublish?: string;

		/**
		Run both **before** the package is packed and published, and on local `npm install` without any arguments. This is run **after** `prepublish`, but **before** `prepublishOnly`.
		*/
		prepare?: string;

		/**
		Run **before** the package is prepared and packed, **only** on `npm publish`.
		*/
		prepublishOnly?: string;

		/**
		Run **before** a tarball is packed (on `npm pack`, `npm publish`, and when installing git dependencies).
		*/
		prepack?: string;

		/**
		Run **after** the tarball has been generated and moved to its final destination.
		*/
		postpack?: string;

		/**
		Run **after** the package is published.
		*/
		publish?: string;

		/**
		Run **after** the package is published.
		*/
		postpublish?: string;

		/**
		Run **before** the package is installed.
		*/
		preinstall?: string;

		/**
		Run **after** the package is installed.
		*/
		install?: string;

		/**
		Run **after** the package is installed and after `install`.
		*/
		postinstall?: string;

		/**
		Run **before** the package is uninstalled and before `uninstall`.
		*/
		preuninstall?: string;

		/**
		Run **before** the package is uninstalled.
		*/
		uninstall?: string;

		/**
		Run **after** the package is uninstalled.
		*/
		postuninstall?: string;

		/**
		Run **before** bump the package version and before `version`.
		*/
		preversion?: string;

		/**
		Run **before** bump the package version.
		*/
		version?: string;

		/**
		Run **after** bump the package version.
		*/
		postversion?: string;

		/**
		Run with the `npm test` command, before `test`.
		*/
		pretest?: string;

		/**
		Run with the `npm test` command.
		*/
		test?: string;

		/**
		Run with the `npm test` command, after `test`.
		*/
		posttest?: string;

		/**
		Run with the `npm stop` command, before `stop`.
		*/
		prestop?: string;

		/**
		Run with the `npm stop` command.
		*/
		stop?: string;

		/**
		Run with the `npm stop` command, after `stop`.
		*/
		poststop?: string;

		/**
		Run with the `npm start` command, before `start`.
		*/
		prestart?: string;

		/**
		Run with the `npm start` command.
		*/
		start?: string;

		/**
		Run with the `npm start` command, after `start`.
		*/
		poststart?: string;

		/**
		Run with the `npm restart` command, before `restart`. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		prerestart?: string;

		/**
		Run with the `npm restart` command. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		restart?: string;

		/**
		Run with the `npm restart` command, after `restart`. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		postrestart?: string;
	} & Partial<Record<string, string>>;

	/**
	Dependencies of the package. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or Git URL.
	*/
	export type Dependency = Partial<Record<string, string>>;

	/**
	Conditions which provide a way to resolve a package entry point based on the environment.
	*/
	export type ExportCondition = LiteralUnion<
		| 'import'
		| 'require'
		| 'node'
		| 'node-addons'
		| 'deno'
		| 'browser'
		| 'electron'
		| 'react-native'
		| 'default',
		string
	>;

	type ExportConditions = {[condition in ExportCondition]: Exports};

	/**
	Entry points of a module, optionally with conditions and subpath exports.
	*/
	export type Exports =
	| null
	| string
	| Array<string | ExportConditions>
	| ExportConditions
	| {[path: string]: Exports}; // eslint-disable-line @typescript-eslint/consistent-indexed-object-style

	/**
	Import map entries of a module, optionally with conditions.
	*/
	export type Imports = { // eslint-disable-line @typescript-eslint/consistent-indexed-object-style
		[key: string]: string | {[key in ExportCondition]: Exports};
	};

	export interface NonStandardEntryPoints {
		/**
		An ECMAScript module ID that is the primary entry point to the program.
		*/
		module?: string;

		/**
		A module ID with untranspiled code that is the primary entry point to the program.
		*/
		esnext?:
		| string
		| {
			[moduleName: string]: string | undefined;
			main?: string;
			browser?: string;
		};

		/**
		A hint to JavaScript bundlers or component tools when packaging modules for client side use.
		*/
		browser?:
		| string
		| Partial<Record<string, string | false>>;

		/**
		Denote which files in your project are "pure" and therefore safe for Webpack to prune if unused.

		[Read more.](https://webpack.js.org/guides/tree-shaking/)
		*/
		sideEffects?: boolean | string[];
	}

	export interface TypeScriptConfiguration {
		/**
		Location of the bundled TypeScript declaration file.
		*/
		types?: string;

		/**
		Version selection map of TypeScript.
		*/
		typesVersions?: Partial<Record<string, Partial<Record<string, string[]>>>>;

		/**
		Location of the bundled TypeScript declaration file. Alias of `types`.
		*/
		typings?: string;
	}

	/**
	An alternative configuration for Yarn workspaces.
	*/
	export interface WorkspaceConfig {
		/**
		An array of workspace pattern strings which contain the workspace packages.
		*/
		packages?: WorkspacePattern[];

		/**
		Designed to solve the problem of packages which break when their `node_modules` are moved to the root workspace directory - a process known as hoisting. For these packages, both within your workspace, and also some that have been installed via `node_modules`, it is important to have a mechanism for preventing the default Yarn workspace behavior. By adding workspace pattern strings here, Yarn will resume non-workspace behavior for any package which matches the defined patterns.

		[Read more](https://classic.yarnpkg.com/blog/2018/02/15/nohoist/)
		*/
		nohoist?: WorkspacePattern[];
	}

	/**
	A workspace pattern points to a directory or group of directories which contain packages that should be included in the workspace installation process.

	The patterns are handled with [minimatch](https://github.com/isaacs/minimatch).

	@example
	`docs` → Include the docs directory and install its dependencies.
	`packages/*` → Include all nested directories within the packages directory, like `packages/cli` and `packages/core`.
	*/
	type WorkspacePattern = string;

	export interface YarnConfiguration {
		/**
		Used to configure [Yarn workspaces](https://classic.yarnpkg.com/docs/workspaces/).

		Workspaces allow you to manage multiple packages within the same repository in such a way that you only need to run `yarn install` once to install all of them in a single pass.

		Please note that the top-level `private` property of `package.json` **must** be set to `true` in order to use workspaces.
		*/
		workspaces?: WorkspacePattern[] | WorkspaceConfig;

		/**
		If your package only allows one version of a given dependency, and you’d like to enforce the same behavior as `yarn install --flat` on the command-line, set this to `true`.

		Note that if your `package.json` contains `"flat": true` and other packages depend on yours (e.g. you are building a library rather than an app), those other packages will also need `"flat": true` in their `package.json` or be installed with `yarn install --flat` on the command-line.
		*/
		flat?: boolean;

		/**
		Selective version resolutions. Allows the definition of custom package versions inside dependencies without manual edits in the `yarn.lock` file.
		*/
		resolutions?: Dependency;
	}

	export interface JSPMConfiguration {
		/**
		JSPM configuration.
		*/
		jspm?: PackageJson$1;
	}

	/**
	Type for [npm's `package.json` file](https://docs.npmjs.com/creating-a-package-json-file). Containing standard npm properties.
	*/
	export interface PackageJsonStandard {
		/**
		The name of the package.
		*/
		name?: string;

		/**
		Package version, parseable by [`node-semver`](https://github.com/npm/node-semver).
		*/
		version?: string;

		/**
		Package description, listed in `npm search`.
		*/
		description?: string;

		/**
		Keywords associated with package, listed in `npm search`.
		*/
		keywords?: string[];

		/**
		The URL to the package's homepage.
		*/
		homepage?: LiteralUnion<'.', string>;

		/**
		The URL to the package's issue tracker and/or the email address to which issues should be reported.
		*/
		bugs?: BugsLocation;

		/**
		The license for the package.
		*/
		license?: string;

		/**
		The licenses for the package.
		*/
		licenses?: Array<{
			type?: string;
			url?: string;
		}>;

		author?: Person;

		/**
		A list of people who contributed to the package.
		*/
		contributors?: Person[];

		/**
		A list of people who maintain the package.
		*/
		maintainers?: Person[];

		/**
		The files included in the package.
		*/
		files?: string[];

		/**
		Resolution algorithm for importing ".js" files from the package's scope.

		[Read more.](https://nodejs.org/api/esm.html#esm_package_json_type_field)
		*/
		type?: 'module' | 'commonjs';

		/**
		The module ID that is the primary entry point to the program.
		*/
		main?: string;

		/**
		Subpath exports to define entry points of the package.

		[Read more.](https://nodejs.org/api/packages.html#subpath-exports)
		*/
		exports?: Exports;

		/**
		Subpath imports to define internal package import maps that only apply to import specifiers from within the package itself.

		[Read more.](https://nodejs.org/api/packages.html#subpath-imports)
		*/
		imports?: Imports;

		/**
		The executable files that should be installed into the `PATH`.
		*/
		bin?:
		| string
		| Partial<Record<string, string>>;

		/**
		Filenames to put in place for the `man` program to find.
		*/
		man?: string | string[];

		/**
		Indicates the structure of the package.
		*/
		directories?: DirectoryLocations;

		/**
		Location for the code repository.
		*/
		repository?:
		| string
		| {
			type: string;
			url: string;

			/**
			Relative path to package.json if it is placed in non-root directory (for example if it is part of a monorepo).

			[Read more.](https://github.com/npm/rfcs/blob/latest/implemented/0010-monorepo-subdirectory-declaration.md)
			*/
			directory?: string;
		};

		/**
		Script commands that are run at various times in the lifecycle of the package. The key is the lifecycle event, and the value is the command to run at that point.
		*/
		scripts?: Scripts;

		/**
		Is used to set configuration parameters used in package scripts that persist across upgrades.
		*/
		config?: Record<string, unknown>;

		/**
		The dependencies of the package.
		*/
		dependencies?: Dependency;

		/**
		Additional tooling dependencies that are not required for the package to work. Usually test, build, or documentation tooling.
		*/
		devDependencies?: Dependency;

		/**
		Dependencies that are skipped if they fail to install.
		*/
		optionalDependencies?: Dependency;

		/**
		Dependencies that will usually be required by the package user directly or via another dependency.
		*/
		peerDependencies?: Dependency;

		/**
		Indicate peer dependencies that are optional.
		*/
		peerDependenciesMeta?: Partial<Record<string, {optional: true}>>;

		/**
		Package names that are bundled when the package is published.
		*/
		bundledDependencies?: string[];

		/**
		Alias of `bundledDependencies`.
		*/
		bundleDependencies?: string[];

		/**
		Engines that this package runs on.
		*/
		engines?: {
			[EngineName in 'npm' | 'node' | string]?: string;
		};

		/**
		@deprecated
		*/
		engineStrict?: boolean;

		/**
		Operating systems the module runs on.
		*/
		os?: Array<LiteralUnion<
		| 'aix'
		| 'darwin'
		| 'freebsd'
		| 'linux'
		| 'openbsd'
		| 'sunos'
		| 'win32'
		| '!aix'
		| '!darwin'
		| '!freebsd'
		| '!linux'
		| '!openbsd'
		| '!sunos'
		| '!win32',
		string
		>>;

		/**
		CPU architectures the module runs on.
		*/
		cpu?: Array<LiteralUnion<
		| 'arm'
		| 'arm64'
		| 'ia32'
		| 'mips'
		| 'mipsel'
		| 'ppc'
		| 'ppc64'
		| 's390'
		| 's390x'
		| 'x32'
		| 'x64'
		| '!arm'
		| '!arm64'
		| '!ia32'
		| '!mips'
		| '!mipsel'
		| '!ppc'
		| '!ppc64'
		| '!s390'
		| '!s390x'
		| '!x32'
		| '!x64',
		string
		>>;

		/**
		If set to `true`, a warning will be shown if package is installed locally. Useful if the package is primarily a command-line application that should be installed globally.

		@deprecated
		*/
		preferGlobal?: boolean;

		/**
		If set to `true`, then npm will refuse to publish it.
		*/
		private?: boolean;

		/**
		A set of config values that will be used at publish-time. It's especially handy to set the tag, registry or access, to ensure that a given package is not tagged with 'latest', published to the global public registry or that a scoped module is private by default.
		*/
		publishConfig?: PublishConfig;

		/**
		Describes and notifies consumers of a package's monetary support information.

		[Read more.](https://github.com/npm/rfcs/blob/latest/accepted/0017-add-funding-support.md)
		*/
		funding?: string | {
			/**
			The type of funding.
			*/
			type?: LiteralUnion<
			| 'github'
			| 'opencollective'
			| 'patreon'
			| 'individual'
			| 'foundation'
			| 'corporation',
			string
			>;

			/**
			The URL to the funding page.
			*/
			url: string;
		};
	}

	export interface PublishConfig {
		/**
		Additional, less common properties from the [npm docs on `publishConfig`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#publishconfig).
		*/
		[additionalProperties: string]: unknown;

		/**
		When publishing scoped packages, the access level defaults to restricted. If you want your scoped package to be publicly viewable (and installable) set `--access=public`. The only valid values for access are public and restricted. Unscoped packages always have an access level of public.
		*/
		access?: 'public' | 'restricted';

		/**
		The base URL of the npm registry.

		Default: `'https://registry.npmjs.org/'`
		*/
		registry?: string;

		/**
		The tag to publish the package under.

		Default: `'latest'`
		*/
		tag?: string;
	}
}

/**
Type for [npm's `package.json` file](https://docs.npmjs.com/creating-a-package-json-file). Also includes types for fields used by other popular projects, like TypeScript and Yarn.

@category File
*/
type PackageJson$1 =
PackageJson$1.PackageJsonStandard &
PackageJson$1.NonStandardEntryPoints &
PackageJson$1.TypeScriptConfiguration &
PackageJson$1.YarnConfiguration &
PackageJson$1.JSPMConfiguration;

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

type ExportName = string;
type MetaId = string;
interface StoriesSpecifier {
    /** When auto-titling, what to prefix all generated titles with (default: '') */
    titlePrefix?: string;
    /** Where to start looking for story files */
    directory: string;
    /**
     * What does the filename of a story file look like? (a glob, relative to directory, no leading
     * `./`) If unset, we use `** / *.@(mdx|stories.@(mdx|js|jsx|mjs|ts|tsx))` (no spaces)
     */
    files?: string;
}
type StoriesEntry = string | StoriesSpecifier;
type NormalizedStoriesSpecifier = Required<StoriesSpecifier> & {
    importPathMatcher: RegExp;
};
interface IndexerOptions {
    makeTitle: (userTitle?: string) => string;
}
interface IndexedStory {
    id: string;
    name: string;
    tags?: Tag$1[];
    parameters?: Parameters;
}
interface IndexedCSFFile {
    meta: {
        id?: string;
        title?: string;
        tags?: Tag$1[];
    };
    stories: IndexedStory[];
}
/**
 * FIXME: This is a temporary type to allow us to deprecate the old indexer API. We should remove
 * this type and the deprecated indexer API in 8.0.
 */
type BaseIndexer = {
    /** A regular expression that should match all files to be handled by this indexer */
    test: RegExp;
};
/**
 * An indexer describes which filenames it handles, and how to index each individual file - turning
 * it into an entry in the index.
 */
type Indexer = BaseIndexer & {
    /**
     * Indexes a file containing stories or docs.
     *
     * @param fileName The name of the file to index.
     * @param options {@link IndexerOptions} for indexing the file.
     * @returns A promise that resolves to an array of {@link IndexInput} objects.
     */
    createIndex: (fileName: string, options: IndexerOptions) => Promise<IndexInput[]>;
};
interface BaseIndexEntry {
    id: StoryId;
    name: StoryName;
    title: ComponentTitle;
    tags?: Tag$1[];
    importPath: Path;
}
type StoryIndexEntry = BaseIndexEntry & {
    type: 'story';
};
type DocsIndexEntry = BaseIndexEntry & {
    storiesImports: Path[];
    type: 'docs';
};
type IndexEntry = StoryIndexEntry | DocsIndexEntry;
interface IndexInputStats {
    loaders?: boolean;
    play?: boolean;
    render?: boolean;
    storyFn?: boolean;
    mount?: boolean;
    beforeEach?: boolean;
    moduleMock?: boolean;
    globals?: boolean;
    factory?: boolean;
    tags?: boolean;
}
/** The base input for indexing a story or docs entry. */
type BaseIndexInput = {
    /** The file to import from e.g. the story file. */
    importPath: Path;
    /** The raw path/package of the file that provides meta.component, if one exists */
    rawComponentPath?: Path;
    /** The name of the export to import. */
    exportName: ExportName;
    /** The name of the entry, auto-generated from {@link exportName} if unspecified. */
    name?: StoryName;
    /** The location in the sidebar, auto-generated from {@link importPath} if unspecified. */
    title?: ComponentTitle;
    /**
     * The custom id optionally set at `meta.id` if it needs to differ from the id generated via
     * {@link title}. If unspecified, the meta id will be auto-generated from {@link title}. If
     * specified, the meta in the CSF file _must_ have a matching id set at `meta.id`, to be correctly
     * matched.
     */
    metaId?: MetaId;
    /** Tags for filtering entries in Storybook and its tools. */
    tags?: Tag$1[];
    /**
     * The id of the entry, auto-generated from {@link title}/{@link metaId} and {@link exportName} if
     * unspecified. If specified, the story in the CSF file _must_ have a matching id set at
     * `parameters.__id`, to be correctly matched. Only use this if you need to override the
     * auto-generated id.
     */
    __id?: StoryId;
    /** Stats about language feature usage that the indexer can optionally report */
    __stats?: IndexInputStats;
};
/** The input for indexing a story entry. */
type StoryIndexInput = BaseIndexInput & {
    type: 'story';
};
/** The input for indexing a docs entry. */
type DocsIndexInput = BaseIndexInput & {
    type: 'docs';
    /** Paths to story files that must be pre-loaded for this docs entry. */
    storiesImports?: Path[];
};
type IndexInput = StoryIndexInput | DocsIndexInput;
interface V3CompatIndexEntry extends Omit<StoryIndexEntry, 'type' | 'tags'> {
    kind: ComponentTitle;
    story: StoryName;
    parameters: Parameters;
}
interface StoryIndexV2 {
    v: number;
    stories: Record<StoryId, Omit<V3CompatIndexEntry, 'title' | 'name' | 'importPath'> & {
        name?: StoryName;
    }>;
}
interface StoryIndexV3 {
    v: number;
    stories: Record<StoryId, V3CompatIndexEntry>;
}
interface StoryIndex {
    v: number;
    entries: Record<StoryId, IndexEntry>;
}

/** ⚠️ This file contains internal WIP types they MUST NOT be exported outside this package for now! */
type BuilderName = 'webpack5' | '@storybook/builder-webpack5' | string;
type RendererName = string;
interface ServerChannel {
    emit(type: string, args?: any): void;
}
interface CoreConfig {
    builder?: BuilderName | {
        name: BuilderName;
        options?: Record<string, any>;
    };
    renderer?: RendererName;
    disableWebpackDefaults?: boolean;
    channelOptions?: Partial<Options$1>;
    /** Disables the generation of project.json, a file containing Storybook metadata */
    disableProjectJson?: boolean;
    /**
     * Disables Storybook telemetry
     *
     * @see https://storybook.js.org/telemetry
     */
    disableTelemetry?: boolean;
    /** Disables notifications for Storybook updates. */
    disableWhatsNewNotifications?: boolean;
    /**
     * Enable crash reports to be sent to Storybook telemetry
     *
     * @see https://storybook.js.org/telemetry
     */
    enableCrashReports?: boolean;
    /**
     * Enable CORS headings to run document in a "secure context" see:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements
     * This enables these headers in development-mode: Cross-Origin-Opener-Policy: same-origin
     *
     * ```text
     * Cross-Origin-Embedder-Policy: require-corp
     * ```
     */
    crossOriginIsolated?: boolean;
}
interface DirectoryMapping {
    from: string;
    to: string;
}
interface Presets {
    apply(extension: 'typescript', config: TypescriptOptions, args?: Options): Promise<TypescriptOptions>;
    apply(extension: 'framework', config?: {}, args?: any): Promise<Preset>;
    apply(extension: 'babel', config?: {}, args?: any): Promise<any>;
    apply(extension: 'swc', config?: {}, args?: any): Promise<any>;
    apply(extension: 'entries', config?: [], args?: any): Promise<unknown>;
    apply(extension: 'env', config?: {}, args?: any): Promise<any>;
    apply(extension: 'stories', config?: [], args?: any): Promise<StoriesEntry[]>;
    apply(extension: 'managerEntries', config: [], args?: any): Promise<string[]>;
    apply(extension: 'refs', config?: [], args?: any): Promise<StorybookConfigRaw['refs']>;
    apply(extension: 'core', config?: StorybookConfigRaw['core'], args?: any): Promise<NonNullable<StorybookConfigRaw['core']>>;
    apply(extension: 'docs', config?: StorybookConfigRaw['docs'], args?: any): Promise<NonNullable<StorybookConfigRaw['docs']>>;
    apply(extension: 'features', config?: StorybookConfigRaw['features'], args?: any): Promise<NonNullable<StorybookConfigRaw['features']>>;
    apply(extension: 'typescript', config?: StorybookConfigRaw['typescript'], args?: any): Promise<NonNullable<StorybookConfigRaw['typescript']>>;
    apply(extension: 'build', config?: StorybookConfigRaw['build'], args?: any): Promise<NonNullable<StorybookConfigRaw['build']>>;
    apply(extension: 'staticDirs', config?: StorybookConfigRaw['staticDirs'], args?: any): Promise<StorybookConfigRaw['staticDirs']>;
    apply<T>(extension: string, config?: T, args?: unknown): Promise<T>;
}
interface LoadedPreset {
    name: string;
    preset: any;
    options: any;
}
type PresetConfig = string | {
    name: string;
    options?: unknown;
};
interface Ref {
    id: string;
    url: string;
    title: string;
    version: string;
    type?: string;
    disable?: boolean;
}
interface VersionCheck {
    success: boolean;
    cached: boolean;
    data?: any;
    error?: any;
    time: number;
}
interface Stats {
    toJson: () => any;
}
interface BuilderResult {
    totalTime?: ReturnType<typeof process.hrtime>;
    stats?: Stats;
}
type PackageJson = PackageJson$1 & Record<string, any>;
interface LoadOptions {
    packageJson?: PackageJson;
    outputDir?: string;
    configDir?: string;
    cacheKey?: string;
    ignorePreview?: boolean;
    extendServer?: (server: Server) => void;
}
interface CLIOptions {
    port?: number;
    ignorePreview?: boolean;
    previewUrl?: string;
    forceBuildPreview?: boolean;
    disableTelemetry?: boolean;
    enableCrashReports?: boolean;
    host?: string;
    initialPath?: string;
    exactPort?: boolean;
    configDir?: string;
    https?: boolean;
    sslCa?: string[];
    sslCert?: string;
    sslKey?: string;
    smokeTest?: boolean;
    managerCache?: boolean;
    open?: boolean;
    ci?: boolean;
    loglevel?: string;
    quiet?: boolean;
    versionUpdates?: boolean;
    docs?: boolean;
    test?: boolean;
    debugWebpack?: boolean;
    webpackStatsJson?: string | boolean;
    statsJson?: string | boolean;
    outputDir?: string;
}
interface BuilderOptions {
    configType?: 'DEVELOPMENT' | 'PRODUCTION';
    ignorePreview?: boolean;
    cache?: FileSystemCache;
    configDir: string;
    docsMode?: boolean;
    features?: StorybookConfigRaw['features'];
    versionCheck?: VersionCheck;
    disableWebpackDefaults?: boolean;
    serverChannelUrl?: string;
}
interface StorybookConfigOptions {
    presets: Presets;
    presetsList?: LoadedPreset[];
}
type Options = LoadOptions & StorybookConfigOptions & CLIOptions & BuilderOptions & {
    build?: TestBuildConfig;
};
type Middleware<T extends IncomingMessage = IncomingMessage> = (req: T & IncomingMessage, res: ServerResponse, next: (err?: string | Error) => Promise<void> | void) => Promise<void> | void;
interface ServerApp<T extends IncomingMessage = IncomingMessage> {
    server: Server$1;
    use(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    use(...handlers: Middleware<T>[]): this;
    get(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    post(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    put(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    patch(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    delete(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    head(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    options(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    connect(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    trace(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
}
interface Builder<Config, BuilderStats extends Stats = Stats> {
    getConfig: (options: Options) => Promise<Config>;
    start: (args: {
        options: Options;
        startTime: ReturnType<typeof process.hrtime>;
        router: ServerApp;
        server: Server;
        channel: ServerChannel;
    }) => Promise<void | {
        stats?: BuilderStats;
        totalTime: ReturnType<typeof process.hrtime>;
        bail: (e?: Error) => Promise<void>;
    }>;
    build: (arg: {
        options: Options;
        startTime: ReturnType<typeof process.hrtime>;
    }) => Promise<void | BuilderStats>;
    bail: (e?: Error) => Promise<void>;
    corePresets?: string[];
    overridePresets?: string[];
}
/** Options for TypeScript usage within Storybook. */
interface TypescriptOptions {
    /**
     * Enables type checking within Storybook.
     *
     * @default `false`
     */
    check: boolean;
    /**
     * Disable parsing TypeScript files through compiler.
     *
     * @default `false`
     */
    skipCompiler: boolean;
}
type Preset = string | {
    name: string;
    options?: any;
};
/** An additional script that gets injected into the preview or the manager, */
type Entry = string;
type CoreCommon_StorybookRefs = Record<string, {
    title: string;
    url: string;
} | {
    disable: boolean;
    expanded?: boolean;
}>;
type DocsOptions = {
    /** What should we call the generated docs entries? */
    defaultName?: string;
    /**
     * Should we generate a docs entry per CSF file? Set to 'tag' (the default) to generate an entry
     * for every CSF file with the 'autodocs' tag.
     *
     * @deprecated Use `tags: ['autodocs']` in `.storybook/preview.js` instead
     */
    autodocs?: boolean | 'tag';
    /** Only show doc entries in the side bar (usually set with the `--docs` CLI flag) */
    docsMode?: boolean;
};
interface TestBuildFlags {
    /**
     * The package @storybook/blocks will be excluded from the bundle, even when imported in e.g. the
     * preview.
     */
    disableBlocks?: boolean;
    /** Disable specific addons */
    disabledAddons?: string[];
    /** Filter out .mdx stories entries */
    disableMDXEntries?: boolean;
    /** Override autodocs to be disabled */
    disableAutoDocs?: boolean;
    /** Override docgen to be disabled. */
    disableDocgen?: boolean;
    /** Override sourcemaps generation to be disabled. */
    disableSourcemaps?: boolean;
    /** Override tree-shaking (dead code elimination) to be disabled. */
    disableTreeShaking?: boolean;
    /** Minify with ESBuild when using webpack. */
    esbuildMinify?: boolean;
}
interface TestBuildConfig {
    test?: TestBuildFlags;
}
type Tag = string;
interface TagOptions {
    excludeFromSidebar: boolean;
    excludeFromDocsStories: boolean;
}
type TagsOptions = Record<Tag, Partial<TagOptions>>;
/**
 * The interface for Storybook configuration used internally in presets The difference is that these
 * values are the raw values, AKA, not wrapped with `PresetValue<>`
 */
interface StorybookConfigRaw {
    /**
     * Sets the addons you want to use with Storybook.
     *
     * @example
     *
     * ```ts
     * addons = ['@storybook/addon-essentials'];
     * addons = [{ name: '@storybook/addon-essentials', options: { backgrounds: false } }];
     * ```
     */
    addons?: Preset[];
    core?: CoreConfig;
    staticDirs?: (DirectoryMapping | string)[];
    logLevel?: string;
    features?: {
        /** Filter args with a "target" on the type from the render function (EXPERIMENTAL) */
        argTypeTargetsV7?: boolean;
        /** Apply decorators from preview.js before decorators from addons or frameworks */
        legacyDecoratorFileOrder?: boolean;
        /**
         * Disallow implicit actions during rendering. This will be the default in Storybook 8.
         *
         * This will make sure that your story renders the same no matter if docgen is enabled or not.
         */
        disallowImplicitActionsInRenderV8?: boolean;
        /** Enable asynchronous component rendering in React renderer */
        experimentalRSC?: boolean;
        /** Use globals & globalTypes for configuring the viewport addon */
        viewportStoryGlobals?: boolean;
        /** Use globals & globalTypes for configuring the backgrounds addon */
        backgroundsStoryGlobals?: boolean;
        /** Set NODE_ENV to development in built Storybooks for better testability and debuggability */
        developmentModeForBuild?: boolean;
    };
    build?: TestBuildConfig;
    stories: StoriesEntry[];
    framework?: Preset;
    typescript?: Partial<TypescriptOptions>;
    refs?: CoreCommon_StorybookRefs;
    babel?: any;
    swc?: any;
    env?: Record<string, string>;
    babelDefault?: any;
    previewAnnotations?: Entry[];
    experimental_indexers?: Indexer[];
    docs?: DocsOptions;
    previewHead?: string;
    previewBody?: string;
    previewMainTemplate?: string;
    managerHead?: string;
    tags?: TagsOptions;
}
/**
 * The interface for Storybook configuration in `main.ts` files. This interface is public All values
 * should be wrapped with `PresetValue<>`, though there are a few exceptions: `addons`, `framework`
 */
interface StorybookConfig {
    /**
     * Sets the addons you want to use with Storybook.
     *
     * @example
     *
     * ```
     * addons = ['@storybook/addon-essentials'];
     * addons = [{ name: '@storybook/addon-essentials', options: { backgrounds: false } }];
     * ```
     */
    addons?: StorybookConfigRaw['addons'];
    core?: PresetValue<StorybookConfigRaw['core']>;
    /**
     * Sets a list of directories of static files to be loaded by Storybook server
     *
     * @example
     *
     * ```ts
     * staticDirs = ['./public'];
     * staticDirs = [{ from: './public', to: '/assets' }];
     * ```
     */
    staticDirs?: PresetValue<StorybookConfigRaw['staticDirs']>;
    logLevel?: PresetValue<StorybookConfigRaw['logLevel']>;
    features?: PresetValue<StorybookConfigRaw['features']>;
    build?: PresetValue<StorybookConfigRaw['build']>;
    /**
     * Tells Storybook where to find stories.
     *
     * @example
     *
     * ```ts
     * stories = ['./src/*.stories.@(j|t)sx?'];
     * stories = async () => [...(await myCustomStoriesEntryBuilderFunc())];
     * ```
     */
    stories: PresetValue<StorybookConfigRaw['stories']>;
    /** Framework, e.g. '@storybook/react-vite', required in v7 */
    framework?: StorybookConfigRaw['framework'];
    /** Controls how Storybook handles TypeScript files. */
    typescript?: PresetValue<StorybookConfigRaw['typescript']>;
    /** References external Storybooks */
    refs?: PresetValue<StorybookConfigRaw['refs']>;
    /** Modify or return babel config. */
    babel?: PresetValue<StorybookConfigRaw['babel']>;
    /** Modify or return swc config. */
    swc?: PresetValue<StorybookConfigRaw['swc']>;
    /** Modify or return env config. */
    env?: PresetValue<StorybookConfigRaw['env']>;
    /** Modify or return babel config. */
    babelDefault?: PresetValue<StorybookConfigRaw['babelDefault']>;
    /** Add additional scripts to run in the preview a la `.storybook/preview.js` */
    previewAnnotations?: PresetValue<StorybookConfigRaw['previewAnnotations']>;
    /** Process CSF files for the story index. */
    experimental_indexers?: PresetValue<StorybookConfigRaw['experimental_indexers']>;
    /** Docs related features in index generation */
    docs?: PresetValue<StorybookConfigRaw['docs']>;
    /**
     * Programmatically modify the preview head/body HTML. The previewHead and previewBody functions
     * accept a string, which is the existing head/body, and return a modified string.
     */
    previewHead?: PresetValue<StorybookConfigRaw['previewHead']>;
    previewBody?: PresetValue<StorybookConfigRaw['previewBody']>;
    /**
     * Programmatically override the preview's main page template. This should return a reference to a
     * file containing an `.ejs` template that will be interpolated with environment variables.
     *
     * @example
     *
     * ```ts
     * previewMainTemplate = '.storybook/index.ejs';
     * ```
     */
    previewMainTemplate?: PresetValue<StorybookConfigRaw['previewMainTemplate']>;
    /**
     * Programmatically modify the preview head/body HTML. The managerHead function accept a string,
     * which is the existing head content, and return a modified string.
     */
    managerHead?: PresetValue<StorybookConfigRaw['managerHead']>;
    /** Configure non-standard tag behaviors */
    tags?: PresetValue<StorybookConfigRaw['tags']>;
}
type PresetValue<T> = T | ((config: T, options: Options) => T | Promise<T>);
type PresetProperty<K, TStorybookConfig = StorybookConfigRaw> = TStorybookConfig[K extends keyof TStorybookConfig ? K : never] | PresetPropertyFn<K, TStorybookConfig>;
type PresetPropertyFn<K, TStorybookConfig = StorybookConfigRaw, TOptions = {}> = (config: TStorybookConfig[K extends keyof TStorybookConfig ? K : never], options: Options & TOptions) => TStorybookConfig[K extends keyof TStorybookConfig ? K : never] | Promise<TStorybookConfig[K extends keyof TStorybookConfig ? K : never]>;
interface CoreCommon_ResolvedAddonPreset {
    type: 'presets';
    name: string;
}
type PreviewAnnotation = string | {
    bare: string;
    absolute: string;
};
interface CoreCommon_ResolvedAddonVirtual {
    type: 'virtual';
    name: string;
    managerEntries?: string[];
    previewAnnotations?: PreviewAnnotation[];
    presets?: (string | {
        name: string;
        options?: any;
    })[];
}
type CoreCommon_OptionsEntry = {
    name: string;
};
type CoreCommon_AddonEntry = string | CoreCommon_OptionsEntry;
type CoreCommon_AddonInfo = {
    name: string;
    inEssentials: boolean;
};
interface CoreCommon_StorybookInfo {
    version: string;
    framework: string;
    frameworkPackage: string;
    renderer: string;
    rendererPackage: string;
    configDir?: string;
    mainConfig?: string;
    previewConfig?: string;
    managerConfig?: string;
}
/**
 * Given a generic string type, returns that type but ensures that a string in general is compatible
 * with it. We use this construct to ensure that IDEs can provide better autocompletion for string
 * types. This is, for example, needed for main config fields, where we want to ensure that the user
 * can provide a custom string, but also a string that is compatible with the type.
 *
 * @example
 *
 * ```ts
 * type Framework = CompatibleString<'@storybook/nextjs'>;
 * const framework: Framework = '@storybook/nextjs'; // valid and will be autocompleted const framework: Framework =
 * path.dirname(require.resolve(path.join('@storybook/nextjs', 'package.json'))); // valid
 * ```
 */
type CompatibleString<T extends string> = T | (string & {});

interface API_BaseEntry {
    id: StoryId;
    depth: number;
    name: string;
    tags: Tag$1[];
    refId?: string;
    renderLabel?: (item: API_BaseEntry, api: any) => any;
}
interface API_RootEntry extends API_BaseEntry {
    type: 'root';
    startCollapsed?: boolean;
    children: StoryId[];
}
interface API_GroupEntry extends API_BaseEntry {
    type: 'group';
    parent?: StoryId;
    children: StoryId[];
}
interface API_ComponentEntry extends API_BaseEntry {
    type: 'component';
    parent?: StoryId;
    children: StoryId[];
}
interface API_DocsEntry extends API_BaseEntry {
    type: 'docs';
    parent: StoryId;
    title: ComponentTitle;
    importPath: Path;
    prepared: boolean;
    parameters?: {
        [parameterName: string]: any;
    };
}
interface API_StoryEntry extends API_BaseEntry {
    type: 'story';
    parent: StoryId;
    title: ComponentTitle;
    importPath: Path;
    prepared: boolean;
    parameters?: {
        [parameterName: string]: any;
    };
    args?: Args;
    argTypes?: ArgTypes;
    initialArgs?: Args;
}
type API_LeafEntry = API_DocsEntry | API_StoryEntry;
type API_HashEntry = API_RootEntry | API_GroupEntry | API_ComponentEntry | API_DocsEntry | API_StoryEntry;
/**
 * The `IndexHash` is our manager-side representation of the `StoryIndex`. We create entries in the
 * hash not only for each story or docs entry, but also for each "group" of the component (split on
 * '/'), as that's how things are manipulated in the manager (i.e. in the sidebar)
 */
interface API_IndexHash {
    [id: string]: API_HashEntry;
}
type API_PreparedIndexEntry = IndexEntry & {
    parameters?: Parameters;
    argTypes?: ArgTypes;
    args?: Args;
    initialArgs?: Args;
};
interface API_PreparedStoryIndex {
    v: number;
    entries: Record<StoryId, API_PreparedIndexEntry>;
}
type API_OptionsData = {
    docsOptions: DocsOptions;
};
interface API_ReleaseNotes {
    success?: boolean;
    currentVersion?: string;
    showOnFirstLaunch?: boolean;
}
interface API_Settings {
    lastTrackedStoryId: string;
}
interface API_Version {
    version: string;
    info?: {
        plain: string;
    };
    [key: string]: any;
}
interface API_UnknownEntries {
    [key: string]: {
        [key: string]: any;
    };
}
interface API_Versions$1 {
    latest?: API_Version;
    next?: API_Version;
    current?: API_Version;
}
type API_StatusValue = 'pending' | 'success' | 'error' | 'warn' | 'unknown';
interface API_StatusObject {
    status: API_StatusValue;
    title: string;
    description: string;
    data?: any;
    onClick?: () => void;
    sidebarContextMenu?: boolean;
}
type API_StatusState = Record<StoryId, Record<string, API_StatusObject>>;
type API_StatusUpdate = Record<StoryId, API_StatusObject | null>;
type API_FilterFunction = (item: API_PreparedIndexEntry & {
    status: Record<string, API_StatusObject | null>;
}) => boolean;

interface SetStoriesStory {
    id: StoryId;
    name: string;
    refId?: string;
    componentId?: ComponentId;
    kind: StoryKind;
    parameters: {
        fileName: string;
        options: {
            [optionName: string]: any;
        };
        docsOnly?: boolean;
        viewMode?: API_ViewMode;
        [parameterName: string]: any;
    };
    argTypes?: ArgTypes;
    args?: Args;
    initialArgs?: Args;
}
interface SetStoriesStoryData {
    [id: string]: SetStoriesStory;
}
type SetStoriesPayload = {
    v: 2;
    error?: Error;
    globals: Args;
    globalParameters: Parameters;
    stories: SetStoriesStoryData;
    kindParameters: {
        [kind: string]: Parameters;
    };
} | ({
    v?: number;
    stories: SetStoriesStoryData;
} & Record<string, never>);
interface SetGlobalsPayload {
    globals: Globals;
    globalTypes: GlobalTypes;
}
interface GlobalsUpdatedPayload {
    initialGlobals: Globals;
    userGlobals: Globals;
    storyGlobals: Globals;
    globals: Globals;
}
interface StoryPreparedPayload {
    id: StoryId;
    parameters: Parameters;
    argTypes: ArgTypes;
    initialArgs: Args;
    args: Args;
}
interface DocsPreparedPayload {
    id: StoryId;
    parameters: Parameters;
}

type OrString$1<T extends string> = T | (string & {});
type API_ViewMode = OrString$1<'story' | 'docs' | 'settings'> | undefined;
type API_RenderOptions = Addon_RenderOptions;
interface API_RouteOptions {
    storyId: string;
    viewMode: API_ViewMode;
    location: RenderData['location'];
    path: string;
}
interface API_MatchOptions {
    storyId: string;
    viewMode: API_ViewMode;
    location: RenderData['location'];
    path: string;
}
type API_StateMerger<S> = (input: S) => S;
interface API_ProviderData<API> {
    provider: API_Provider<API>;
    docsOptions: DocsOptions;
}
interface API_Provider<API> {
    channel?: Channel;
    /** @deprecated Will be removed in 8.0, please use channel instead */
    serverChannel?: Channel;
    renderPreview?: API_IframeRenderer;
    handleAPI(api: API): void;
    getConfig(): {
        sidebar?: API_SidebarOptions<API>;
        theme?: ThemeVars;
        StoryMapper?: API_StoryMapper;
        [k: string]: any;
    } & Partial<API_UIOptions>;
    [key: string]: any;
}
type API_IframeRenderer = (storyId: string, viewMode: API_ViewMode, id: string, baseUrl: string, scale: number, queryParams: Record<string, any>) => ReactElement<any, any> | null;
interface API_UIOptions {
    name?: string;
    url?: string;
    goFullScreen: boolean;
    showStoriesPanel: boolean;
    showAddonPanel: boolean;
    addonPanelInRight: boolean;
    theme?: ThemeVars;
    selectedPanel?: string;
}
interface API_Layout {
    initialActive: API_ActiveTabsType;
    navSize: number;
    bottomPanelHeight: number;
    rightPanelWidth: number;
    /**
     * The sizes of the panels when they were last visible used to restore the sizes when the panels
     * are shown again eg. when toggling fullscreen, panels, etc.
     */
    recentVisibleSizes: {
        navSize: number;
        bottomPanelHeight: number;
        rightPanelWidth: number;
    };
    panelPosition: API_PanelPositions;
    showTabs: boolean;
    showToolbar: boolean;
    /** @deprecated, will be removed in 8.0 - this API no longer works */
    isToolshown?: boolean;
}
interface API_UI {
    name?: string;
    url?: string;
    enableShortcuts: boolean;
}
type API_PanelPositions = 'bottom' | 'right';
type API_ActiveTabsType = 'sidebar' | 'canvas' | 'addons';
interface API_SidebarOptions<API = any> {
    showRoots?: boolean;
    filters?: Record<string, API_FilterFunction>;
    collapsedRoots?: string[];
    renderLabel?: (item: API_HashEntry, api: API) => any;
}
interface OnClearOptions {
    /** `true` when the user manually dismissed the notification. */
    dismissed: boolean;
    /** `true` when the notification timed out after the set duration. */
    timeout: boolean;
}
interface OnClickOptions {
    /** Function to dismiss the notification. */
    onDismiss: () => void;
}
/**
 * @deprecated Use ReactNode for the icon instead.
 * @see https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#icons-is-deprecated
 */
interface DeprecatedIconType {
    name: string;
    color?: string;
}
interface API_Notification {
    id: string;
    content: {
        headline: string;
        subHeadline?: string | any;
    };
    duration?: number;
    link?: string;
    icon?: React.ReactNode | DeprecatedIconType;
    onClear?: (options: OnClearOptions) => void;
    onClick?: (options: OnClickOptions) => void;
}
type API_Versions = Record<string, string>;
type API_SetRefData = Partial<API_ComposedRef & {
    setStoriesData: SetStoriesStoryData;
    storyIndex: StoryIndex;
}>;
type API_StoryMapper = (ref: API_ComposedRef, story: SetStoriesStory) => SetStoriesStory;
interface API_LoadedRefData {
    index?: API_IndexHash;
    filteredIndex?: API_IndexHash;
    indexError?: Error;
    previewInitialized: boolean;
}
interface API_ComposedRef extends API_LoadedRefData {
    id: string;
    title?: string;
    url: string;
    type?: 'auto-inject' | 'unknown' | 'lazy' | 'server-checked';
    expanded?: boolean;
    versions?: API_Versions;
    loginUrl?: string;
    version?: string;
    sourceUrl?: string;
    /** DO NOT USE THIS */
    internal_index?: StoryIndex;
}
type API_ComposedRefUpdate = Partial<Pick<API_ComposedRef, 'title' | 'type' | 'expanded' | 'index' | 'filteredIndex' | 'versions' | 'loginUrl' | 'version' | 'indexError' | 'previewInitialized' | 'sourceUrl' | 'internal_index'>>;
type API_Refs = Record<string, API_ComposedRef>;
type API_RefId = string;
type API_RefUrl = string;

type Addon_Types = Exclude<Addon_TypesEnum, Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_SIDEBAR_BOTTOM | Addon_TypesEnum.experimental_TEST_PROVIDER | Addon_TypesEnum.experimental_SIDEBAR_TOP>;
interface Addon_ArgType<TArg = unknown> extends InputType {
    defaultValue?: TArg;
}
type Addons_ArgTypes<TArgs = Args> = {
    [key in keyof Partial<TArgs>]: Addon_ArgType<TArgs[key]>;
} & {
    [key in string]: Addon_ArgType<unknown>;
};
type Addon_Comparator<T> = ((a: T, b: T) => boolean) | ((a: T, b: T) => number);
type Addon_StorySortMethod = 'configure' | 'alphabetical';
interface Addon_StorySortObjectParameter {
    method?: Addon_StorySortMethod;
    order?: any[];
    locales?: string;
    includeNames?: boolean;
}
type IndexEntryLegacy = [StoryId, any, Parameters, Parameters];
type Addon_StorySortComparator = Addon_Comparator<IndexEntryLegacy>;
type Addon_StorySortParameter = Addon_StorySortComparator | Addon_StorySortObjectParameter;
type Addon_StorySortComparatorV7 = Addon_Comparator<IndexEntry>;
type Addon_StorySortParameterV7 = Addon_StorySortComparatorV7 | Addon_StorySortObjectParameter;
interface Addon_OptionsParameter extends Object {
    storySort?: Addon_StorySortParameter;
    theme?: {
        base: string;
        brandTitle?: string;
    };
    [key: string]: any;
}
interface Addon_OptionsParameterV7 extends Object {
    storySort?: Addon_StorySortParameterV7;
    theme?: {
        base: string;
        brandTitle?: string;
    };
    [key: string]: any;
}
type Addon_StoryContext<TRenderer extends Renderer = Renderer> = StoryContext<TRenderer>;
type Addon_StoryContextUpdate = Partial<Addon_StoryContext>;
interface Addon_ReturnTypeFramework<ReturnType> extends Renderer {
    component: any;
    storyResult: ReturnType;
    canvasElement: any;
}
type Addon_PartialStoryFn<ReturnType = unknown> = PartialStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_LegacyStoryFn<ReturnType = unknown> = LegacyStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_ArgsStoryFn<ReturnType = unknown> = ArgsStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_StoryFn<ReturnType = unknown> = StoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_DecoratorFunction<StoryFnReturnType = unknown> = DecoratorFunction<Addon_ReturnTypeFramework<StoryFnReturnType>>;
type Addon_LoaderFunction = LoaderFunction<Addon_ReturnTypeFramework<unknown>>;
interface Addon_WrapperSettings {
    options: object;
    parameters: {
        [key: string]: any;
    };
}
type Addon_StoryWrapper = (storyFn: Addon_LegacyStoryFn, context: Addon_StoryContext, settings: Addon_WrapperSettings) => any;
type Addon_MakeDecoratorResult = (...args: any) => any;
interface Addon_AddStoryArgs<StoryFnReturnType = unknown> {
    id: StoryId;
    kind: StoryKind;
    name: StoryName;
    storyFn: Addon_StoryFn<StoryFnReturnType>;
    parameters: Parameters;
}
type Addon_ClientApiAddon<StoryFnReturnType = unknown> = Addon_Type & {
    apply: (a: Addon_StoryApi<StoryFnReturnType>, b: any[]) => any;
};
interface Addon_ClientApiAddons<StoryFnReturnType> {
    [key: string]: Addon_ClientApiAddon<StoryFnReturnType>;
}
type Addon_ClientApiReturnFn<StoryFnReturnType = unknown> = (...args: any[]) => Addon_StoryApi<StoryFnReturnType>;
interface Addon_StoryApi<StoryFnReturnType = unknown> {
    kind: StoryKind;
    add: (storyName: StoryName, storyFn: Addon_StoryFn<StoryFnReturnType>, parameters?: Parameters) => Addon_StoryApi<StoryFnReturnType>;
    addDecorator: (decorator: Addon_DecoratorFunction<StoryFnReturnType>) => Addon_StoryApi<StoryFnReturnType>;
    addLoader: (decorator: Addon_LoaderFunction) => Addon_StoryApi<StoryFnReturnType>;
    addParameters: (parameters: Parameters) => Addon_StoryApi<StoryFnReturnType>;
    [k: string]: string | Addon_ClientApiReturnFn<StoryFnReturnType>;
}
interface Addon_ClientStoryApi<StoryFnReturnType = unknown> {
}
type Addon_LoadFn = () => any;
type Addon_RequireContext = any;
type Addon_Loadable = Addon_RequireContext | [Addon_RequireContext] | Addon_LoadFn;
type Addon_BaseDecorators<StoryFnReturnType> = Array<(story: () => StoryFnReturnType, context: Addon_StoryContext) => StoryFnReturnType>;
interface Addon_BaseAnnotations<TArgs, StoryFnReturnType, TRenderer extends Renderer = Renderer> {
    /**
     * Dynamic data that are provided (and possibly updated by) Storybook and its addons.
     *
     * @see [Arg story inputs](https://storybook.js.org/docs/api/csf#args-story-inputs)
     */
    args?: Partial<TArgs>;
    /**
     * ArgTypes encode basic metadata for args, such as `name`, `description`, `defaultValue` for an
     * arg. These get automatically filled in by Storybook Docs.
     *
     * @see [Arg types](https://storybook.js.org/docs/api/arg-types)
     */
    argTypes?: Addons_ArgTypes<TArgs>;
    /**
     * Custom metadata for a story.
     *
     * @see [Parameters](https://storybook.js.org/docs/writing-stories/parameters)
     */
    parameters?: Parameters;
    /**
     * Wrapper components or Storybook decorators that wrap a story.
     *
     * Decorators defined in Meta will be applied to every story variation.
     *
     * @see [Decorators](https://storybook.js.org/docs/writing-stories/decorators)
     */
    decorators?: Addon_BaseDecorators<StoryFnReturnType>;
    /**
     * Define a custom render function for the story(ies). If not passed, a default render function by
     * the framework will be used.
     */
    render?: (args: TArgs, context: Addon_StoryContext<TRenderer>) => StoryFnReturnType;
    /** Function that is executed after the story is rendered. */
    play?: (context: Addon_StoryContext<TRenderer>) => Promise<void> | void;
}
interface Addon_Annotations<TArgs, StoryFnReturnType> extends Addon_BaseAnnotations<TArgs, StoryFnReturnType> {
    /**
     * Used to only include certain named exports as stories. Useful when you want to have non-story
     * exports such as mock data or ignore a few stories.
     *
     * @example
     *
     * ```ts
     * includeStories: ['SimpleStory', 'ComplexStory'];
     * includeStories: /.*Story$/;
     * ```
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    includeStories?: string[] | RegExp;
    /**
     * Used to exclude certain named exports. Useful when you want to have non-story exports such as
     * mock data or ignore a few stories.
     *
     * @example
     *
     * ```ts
     * excludeStories: ['simpleData', 'complexData'];
     * excludeStories: /.*Data$/;
     * ```
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    excludeStories?: string[] | RegExp;
}
interface Addon_BaseMeta<ComponentType> {
    /**
     * Title of the story which will be presented in the navigation. **Should be unique.**
     *
     * Stories can be organized in a nested structure using "/" as a separator.
     *
     * Since CSF 3.0 this property is optional.
     *
     * @example
     *
     * ```ts
     * export default { title: 'Design System/Atoms/Button' };
     * ```
     *
     * @see [Story Hierarchy](https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy)
     */
    title?: string;
    /**
     * Manually set the id of a story, which in particular is useful if you want to rename stories
     * without breaking permalinks.
     *
     * Storybook will prioritize the id over the title for ID generation, if provided, and will
     * prioritize the story.storyName over the export key for display.
     *
     * @see [Sidebar and URLs](https://storybook.js.org/docs/configure/user-interface/sidebar-and-urls#permalink-to-stories)
     */
    id?: string;
    /**
     * The primary component for your story.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     */
    component?: ComponentType;
    /**
     * Auxiliary sub-components that are part of the stories.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     *
     * @deprecated
     * @example
     *
     * ```ts
     * import { Button, ButtonGroup } from './components';
     *
     * export default {
     *   subcomponents: { Button, ButtonGroup },
     * };
     * ```
     *
     * By defining them each component will have its tab in the args table.
     */
    subcomponents?: Record<string, ComponentType>;
}
type Addon_BaseStoryObject<TArgs, StoryFnReturnType> = {
    /** Override the display name in the UI */
    storyName?: string;
};
type Addon_BaseStoryFn<TArgs, StoryFnReturnType> = {
    (args: TArgs, context: Addon_StoryContext): StoryFnReturnType;
} & Addon_BaseStoryObject<TArgs, StoryFnReturnType>;
type BaseStory<TArgs, StoryFnReturnType> = Addon_BaseStoryFn<TArgs, StoryFnReturnType> | Addon_BaseStoryObject<TArgs, StoryFnReturnType>;
interface Addon_RenderOptions {
    active: boolean;
}
type Addon_Type = Addon_BaseType | Addon_PageType | Addon_WrapperType | Addon_SidebarBottomType | Addon_SidebarTopType | Addon_TestProviderType<Addon_TestProviderState>;
interface Addon_BaseType {
    /**
     * The title of the addon. This can be a simple string, but it can also be a
     * React.FunctionComponent or a React.ReactElement.
     */
    title: FC | ReactNode | (() => string);
    /**
     * The type of the addon.
     *
     * @example
     *
     * ```ts
     * Addon_TypesEnum.PANEL;
     * ```
     */
    type: Exclude<Addon_Types, Addon_TypesEnum.PREVIEW | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_SIDEBAR_BOTTOM | Addon_TypesEnum.experimental_SIDEBAR_TOP | Addon_TypesEnum.experimental_TEST_PROVIDER>;
    /**
     * The unique id of the addon.
     *
     * @example 'my-org-name/my-addon-name';
     *
     * @warn This will become non-optional in 8.0
     *
     * This needs to be globally unique, so we recommend prefixing it with your org name or npm package name.
     *
     * Do not prefix with `storybook`, this is reserved for core storybook feature and core addons.
     */
    id?: string;
    /**
     * This component will wrap your `render` function.
     *
     * With it you can determine if you want your addon to be rendered or not.
     *
     * This is to facilitate addons keeping state, and keep listening for events even when they are
     * not currently on screen/rendered.
     */
    route?: (routeOptions: RenderData) => string;
    /** This will determine the value of `active` prop of your render function. */
    match?: (matchOptions: RenderData & {
        tabId?: string;
    }) => boolean;
    /**
     * The actual contents of your addon.
     *
     * This is called as a function, so if you want to use hooks, your function needs to return a
     * JSX.Element within which components are rendered
     */
    render: (props: Partial<Addon_RenderOptions>) => ReturnType<FC<Partial<Addon_RenderOptions>>>;
    /** @unstable */
    paramKey?: string;
    /** @unstable */
    disabled?: boolean | ((parameters: API_StoryEntry['parameters']) => boolean);
    /** @unstable */
    hidden?: boolean;
}
interface Addon_PageType {
    type: Addon_TypesEnum.experimental_PAGE;
    /** The unique id of the page. */
    id: string;
    /** The URL to navigate to when Storybook needs to navigate to this page. */
    url: string;
    /** The title is used in mobile mode to represent the page in the navigation. */
    title: FC | string | ReactElement | ReactNode;
    /**
     * The main content of the addon, a function component without any props. Storybook will render
     * your component always.
     *
     * If you want to render your component only when the URL matches, use the `Route` component.
     *
     * @example
     *
     * ```jsx
     * import { Route } from '@storybook/core/router';
     *
     * Render: () => {
     *   return (
     *     <Route path="/my-addon">
     *       {' '}
     *       <MyAddonContent />{' '}
     *     </Route>
     *   );
     * };
     * ```
     */
    render: FC;
}
interface Addon_WrapperType {
    type: Addon_TypesEnum.PREVIEW;
    /** The unique id of the page. */
    id: string;
    /**
     * A React.FunctionComponent that wraps the story.
     *
     * This component must accept a children prop, and render it.
     */
    render: FC<PropsWithChildren<{
        index: number;
        children: ReactNode;
        id: string;
        storyId: StoryId;
    }>>;
}
/** @deprecated This doesn't do anything anymore and will be removed in Storybook 9.0. */
interface Addon_SidebarBottomType {
    type: Addon_TypesEnum.experimental_SIDEBAR_BOTTOM;
    /** The unique id of the tool. */
    id: string;
    /** A React.FunctionComponent. */
    render: FC;
}
/** @deprecated This will be removed in Storybook 9.0. */
interface Addon_SidebarTopType {
    type: Addon_TypesEnum.experimental_SIDEBAR_TOP;
    /** The unique id of the tool. */
    id: string;
    /** A React.FunctionComponent. */
    render: FC;
}
interface Addon_TestProviderType<Details extends {
    [key: string]: any;
} = NonNullable<unknown>> {
    type: Addon_TypesEnum.experimental_TEST_PROVIDER;
    /** The unique id of the test provider. */
    id: string;
    name: string;
    /** @deprecated Use render instead */
    title?: (state: TestProviderConfig & Addon_TestProviderState<Details>) => ReactNode;
    /** @deprecated Use render instead */
    description?: (state: TestProviderConfig & Addon_TestProviderState<Details>) => ReactNode;
    render?: (state: TestProviderConfig & Addon_TestProviderState<Details>) => ReactNode;
    sidebarContextMenu?: (options: {
        context: API_HashEntry;
        state: TestProviderConfig & Addon_TestProviderState<Details>;
    }) => ReactNode;
    stateUpdater?: (state: TestProviderConfig & Addon_TestProviderState<Details>, update: Partial<Addon_TestProviderState<Details>>) => void | Partial<TestProviderConfig & Addon_TestProviderState<Details>>;
    runnable?: boolean;
}
type Addon_TestProviderState<Details extends {
    [key: string]: any;
} = NonNullable<unknown>> = Pick<Addon_TestProviderType, 'runnable'> & {
    progress?: TestingModuleProgressReportProgress;
    details: Details;
    cancellable: boolean;
    cancelling: boolean;
    running: boolean;
    failed: boolean;
    crashed: boolean;
    error?: {
        name: string;
        message?: string;
    };
};
type Addon_TypeBaseNames = Exclude<Addon_TypesEnum, Addon_TypesEnum.PREVIEW | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_SIDEBAR_BOTTOM | Addon_TypesEnum.experimental_SIDEBAR_TOP | Addon_TypesEnum.experimental_TEST_PROVIDER>;
interface Addon_TypesMapping extends Record<Addon_TypeBaseNames, Addon_BaseType> {
    [Addon_TypesEnum.PREVIEW]: Addon_WrapperType;
    [Addon_TypesEnum.experimental_PAGE]: Addon_PageType;
    [Addon_TypesEnum.experimental_SIDEBAR_BOTTOM]: Addon_SidebarBottomType;
    [Addon_TypesEnum.experimental_SIDEBAR_TOP]: Addon_SidebarTopType;
    [Addon_TypesEnum.experimental_TEST_PROVIDER]: Addon_TestProviderType<Addon_TestProviderState>;
}
type Addon_Loader<API> = (api: API) => void;
interface Addon_Loaders<API> {
    [key: string]: Addon_Loader<API>;
}
interface Addon_Collection<T = Addon_Type> {
    [key: string]: T;
}
interface Addon_Elements {
    [key: string]: Addon_Collection;
}
interface Addon_ToolbarConfig {
    hidden?: boolean;
}
interface Addon_Config {
    theme?: ThemeVars;
    toolbar?: {
        [id: string]: Addon_ToolbarConfig;
    };
    sidebar?: API_SidebarOptions;
    [key: string]: any;
}
declare enum Addon_TypesEnum {
    /**
     * This API is used to create a tab the toolbar above the canvas, This API might be removed in the
     * future.
     *
     * @unstable
     */
    TAB = "tab",
    /** This adds panels to the addons side panel. */
    PANEL = "panel",
    /** This adds items in the toolbar above the canvas - on the left side. */
    TOOL = "tool",
    /** This adds items in the toolbar above the canvas - on the right side. */
    TOOLEXTRA = "toolextra",
    /**
     * This adds wrapper components around the canvas/iframe component storybook renders.
     *
     * @unstable this API is not stable yet, and is likely to change in 8.0.
     */
    PREVIEW = "preview",
    /**
     * This adds pages that render instead of the canvas.
     *
     * @unstable
     */
    experimental_PAGE = "page",
    /**
     * This adds items in the bottom of the sidebar.
     *
     * @deprecated This doesn't do anything anymore and will be removed in Storybook 9.0.
     */
    experimental_SIDEBAR_BOTTOM = "sidebar-bottom",
    /**
     * This adds items in the top of the sidebar.
     *
     * @deprecated This will be removed in Storybook 9.0.
     */
    experimental_SIDEBAR_TOP = "sidebar-top",
    /** This adds items to the Testing Module in the sidebar. */
    experimental_TEST_PROVIDER = "test-provider"
}

interface Renderer extends Renderer$1 {
}

type OrString<T extends string> = T | (string & {});
type ViewMode = OrString<ViewMode$1 | 'settings'> | undefined;
type Layout = 'centered' | 'fullscreen' | 'padded' | 'none';
interface StorybookParameters {
    options?: Addon_OptionsParameter;
    /**
     * The layout property defines basic styles added to the preview body where the story is rendered.
     *
     * If you pass `none`, no styles are applied.
     */
    layout?: Layout;
}
interface StorybookInternalParameters extends StorybookParameters {
    fileName?: string;
    docsOnly?: true;
}
type Path = string;

interface WebRenderer extends Renderer {
    canvasElement: HTMLElement;
}
type ModuleExport = any;
type ModuleExports = Record<string, ModuleExport>;
type ModuleImportFn = (path: Path) => Promise<ModuleExports>;
type MaybePromise<T> = Promise<T> | T;
type TeardownRenderToCanvas = () => MaybePromise<void>;
type RenderToCanvas<TRenderer extends Renderer> = (context: RenderContext<TRenderer>, element: TRenderer['canvasElement']) => MaybePromise<void | TeardownRenderToCanvas>;
interface ProjectAnnotations<TRenderer extends Renderer> extends ProjectAnnotations$2<TRenderer> {
    addons?: ProjectAnnotations<TRenderer>[];
    testingLibraryRender?: (...args: never[]) => {
        unmount: () => void;
    };
    renderToCanvas?: RenderToCanvas<TRenderer>;
    renderToDOM?: RenderToCanvas<TRenderer>;
}
type NamedExportsOrDefault<TExport> = TExport | {
    default: TExport;
};
type NamedOrDefaultProjectAnnotations<TRenderer extends Renderer = Renderer> = NamedExportsOrDefault<ProjectAnnotations<TRenderer>>;
type NormalizedProjectAnnotations<TRenderer extends Renderer = Renderer> = Omit<ProjectAnnotations<TRenderer>, 'decorators' | 'loaders' | 'runStep' | 'beforeAll'> & {
    argTypes?: StrictArgTypes;
    globalTypes?: StrictGlobalTypes;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction<TRenderer>[];
    runStep: StepRunner<TRenderer>;
    beforeAll: BeforeAll;
};
type NormalizedComponentAnnotations<TRenderer extends Renderer = Renderer> = Omit<ComponentAnnotations<TRenderer>, 'decorators' | 'loaders'> & {
    id: ComponentId;
    title: ComponentTitle;
    argTypes?: StrictArgTypes;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction<TRenderer>[];
};
type NormalizedStoryAnnotations<TRenderer extends Renderer = Renderer> = Omit<StoryAnnotations<TRenderer>, 'storyName' | 'story' | 'decorators' | 'loaders'> & {
    moduleExport: ModuleExport;
    id: StoryId;
    argTypes?: StrictArgTypes;
    name: StoryName;
    userStoryFn?: StoryFn<TRenderer>;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction<TRenderer>[];
};
type CSFFile<TRenderer extends Renderer = Renderer> = {
    meta: NormalizedComponentAnnotations<TRenderer>;
    stories: Record<StoryId, NormalizedStoryAnnotations<TRenderer>>;
    projectAnnotations?: NormalizedProjectAnnotations<TRenderer>;
    moduleExports: ModuleExports;
};
type PreparedStory<TRenderer extends Renderer = Renderer> = StoryContextForEnhancers<TRenderer> & {
    moduleExport: ModuleExport;
    originalStoryFn: StoryFn<TRenderer>;
    undecoratedStoryFn: LegacyStoryFn<TRenderer>;
    unboundStoryFn: LegacyStoryFn<TRenderer>;
    applyLoaders: (context: StoryContext<TRenderer>) => Promise<StoryContext<TRenderer>['loaded']>;
    applyBeforeEach: (context: StoryContext<TRenderer>) => Promise<CleanupCallback[]>;
    applyAfterEach: (context: StoryContext<TRenderer>) => Promise<void>;
    playFunction?: (context: StoryContext<TRenderer>) => Promise<void> | void;
    runStep: StepRunner<TRenderer>;
    mount: (context: StoryContext<TRenderer>) => () => Promise<Canvas>;
    testingLibraryRender?: (...args: never[]) => unknown;
    renderToCanvas?: ProjectAnnotations<TRenderer>['renderToCanvas'];
    usesMount: boolean;
    storyGlobals: Globals;
};
type PreparedMeta<TRenderer extends Renderer = Renderer> = Omit<StoryContextForEnhancers<TRenderer>, 'name' | 'story'> & {
    moduleExport: ModuleExport;
};
type BoundStory<TRenderer extends Renderer = Renderer> = PreparedStory<TRenderer> & {
    storyFn: PartialStoryFn<TRenderer>;
};
declare type RenderContext<TRenderer extends Renderer = Renderer> = StoryIdentifier & {
    showMain: () => void;
    showError: (error: {
        title: string;
        description: string;
    }) => void;
    showException: (err: Error) => void;
    forceRemount: boolean;
    storyContext: StoryContext<TRenderer>;
    storyFn: PartialStoryFn<TRenderer>;
    unboundStoryFn: LegacyStoryFn<TRenderer>;
};

interface BuilderStats {
    toJson: () => any;
}
type Builder_WithRequiredProperty<Type, Key extends keyof Type> = Type & {
    [Property in Key]-?: Type[Property];
};
type Builder_Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
type Builder_EnvsRaw = Record<string, string>;

type RenderContextCallbacks<TRenderer extends Renderer> = Pick<RenderContext<TRenderer>, 'showMain' | 'showError' | 'showException'>;
type StoryRenderOptions = {
    autoplay?: boolean;
    forceInitialArgs?: boolean;
};
type ResolvedModuleExportType = 'component' | 'meta' | 'story';
/**
 * What do we know about an of={} call?
 *
 * Technically, the type names aren't super accurate:
 *
 * - Meta === `CSFFile`
 * - Story === `PreparedStory` But these shorthands capture the idea of what is being talked about
 */
type ResolvedModuleExportFromType<TType extends ResolvedModuleExportType, TRenderer extends Renderer = Renderer> = TType extends 'component' ? {
    type: 'component';
    component: TRenderer['component'];
    projectAnnotations: NormalizedProjectAnnotations<Renderer>;
} : TType extends 'meta' ? {
    type: 'meta';
    csfFile: CSFFile<TRenderer>;
    preparedMeta: PreparedMeta;
} : {
    type: 'story';
    story: PreparedStory<TRenderer>;
};
type ResolvedModuleExport<TRenderer extends Renderer = Renderer> = {
    type: ResolvedModuleExportType;
} & (ResolvedModuleExportFromType<'component', TRenderer> | ResolvedModuleExportFromType<'meta', TRenderer> | ResolvedModuleExportFromType<'story', TRenderer>);
interface DocsContextProps<TRenderer extends Renderer = Renderer> {
    /**
     * Register a CSF file that this docs entry uses. Used by the `<Meta of={} />` block to attach,
     * and the `<Story meta={} />` bloc to reference
     */
    referenceMeta: (metaExports: ModuleExports, attach: boolean) => void;
    /**
     * Find a component, meta or story object from the direct export(s) from the CSF file. This is the
     * API that drives the `of={}` syntax.
     */
    resolveOf<TType extends ResolvedModuleExportType>(moduleExportOrType: ModuleExport | TType, validTypes?: TType[]): ResolvedModuleExportFromType<TType, TRenderer>;
    /**
     * Find a story's id from the name of the story. This is primarily used by the `<Story name={} />
     * block. Note that the story must be part of the primary CSF file of the docs entry.
     */
    storyIdByName: (storyName: StoryName) => StoryId;
    /**
     * Syncronously find a story by id (if the id is not provided, this will look up the primary story
     * in the CSF file, if such a file exists).
     */
    storyById: (id?: StoryId) => PreparedStory<TRenderer>;
    /** Syncronously find all stories of the component referenced by the CSF file. */
    componentStories: () => PreparedStory<TRenderer>[];
    /** Syncronously find all stories by CSF file. */
    componentStoriesFromCSFFile: (csfFile: CSFFile<TRenderer>) => PreparedStory<TRenderer>[];
    /** Get the story context of the referenced story. */
    getStoryContext: (story: PreparedStory<TRenderer>) => Omit<StoryContext<TRenderer>, 'abortSignal' | 'canvasElement' | 'step' | 'context'>;
    /** Asyncronously load an arbitrary story by id. */
    loadStory: (id: StoryId) => Promise<PreparedStory<TRenderer>>;
    /** Render a story to a given HTML element and keep it up to date across context changes */
    renderStoryToElement: (story: PreparedStory<TRenderer>, element: HTMLElement, callbacks: RenderContextCallbacks<TRenderer>, options: StoryRenderOptions) => () => Promise<void>;
    /** Storybook channel -- use for low level event watching/emitting */
    channel: Channel$1;
    /** Project annotations -- can be read to get the project's global annotations */
    projectAnnotations: NormalizedProjectAnnotations<TRenderer>;
}
type DocsRenderFunction<TRenderer extends Renderer> = (docsContext: DocsContextProps<TRenderer>, docsParameters: Parameters, element: HTMLElement) => Promise<void>;

type Store_CSFExports<TRenderer extends Renderer$1 = Renderer$1, TArgs extends Args = Args> = {
    default: ComponentAnnotations<TRenderer, TArgs>;
    __esModule?: boolean;
    __namedExportsOrder?: string[];
};
/** A story function with partial args, used internally by composeStory */
type PartialArgsStoryFn<TRenderer extends Renderer$1 = Renderer$1, TArgs = Args> = (args?: TArgs) => (TRenderer & {
    T: TArgs;
})['storyResult'];
/**
 * A story that got recomposed for portable stories, containing all the necessary data to be
 * rendered in external environments
 */
type ComposedStoryFn<TRenderer extends Renderer$1 = Renderer$1, TArgs = Args> = PartialArgsStoryFn<TRenderer, TArgs> & {
    args: TArgs;
    id: StoryId;
    play?: (context?: Partial<StoryContext<TRenderer, Partial<TArgs>>>) => Promise<void>;
    run: (context?: Partial<StoryContext<TRenderer, Partial<TArgs>>>) => Promise<void>;
    load: () => Promise<void>;
    storyName: string;
    parameters: Parameters;
    argTypes: StrictArgTypes<TArgs>;
    reporting: ReporterAPI;
    tags: Tag$1[];
    globals: Globals;
};
/**
 * Based on a module of stories, it returns all stories within it, filtering non-stories Each story
 * will have partial props, as their props should be handled when composing stories
 */
type StoriesWithPartialProps<TRenderer extends Renderer$1, TModule> = {
    [K in keyof TModule as TModule[K] extends StoryAnnotationsOrFn<infer _, infer _TProps> ? K : never]: TModule[K] extends StoryAnnotationsOrFn<infer _, infer TProps> ? ComposedStoryFn<TRenderer, Partial<TProps>> : unknown;
};
/**
 * Type used for integrators of portable stories, as reference when creating their own composeStory
 * function
 */
interface ComposeStoryFn<TRenderer extends Renderer$1 = Renderer$1, TArgs extends Args = Args> {
    (storyAnnotations: AnnotatedStoryFn<TRenderer, TArgs> | StoryAnnotations<TRenderer, TArgs>, componentAnnotations: ComponentAnnotations<TRenderer, TArgs>, projectAnnotations: ProjectAnnotations$2<TRenderer>, exportsName?: string): ComposedStoryFn;
}

type SupportedFrameworks = 'angular' | 'ember' | 'experimental-nextjs-vite' | 'html-vite' | 'html-webpack5' | 'nextjs' | 'preact-vite' | 'preact-webpack5' | 'react-native-web-vite' | 'react-vite' | 'react-webpack5' | 'server-webpack5' | 'svelte-vite' | 'svelte-webpack5' | 'sveltekit' | 'vue3-vite' | 'vue3-webpack5' | 'web-components-vite' | 'web-components-webpack5' | 'qwik' | 'solid' | 'nuxt' | 'react-rsbuild' | 'vue3-rsbuild';

type SupportedRenderers = 'react' | 'react-native' | 'vue3' | 'angular' | 'ember' | 'preact' | 'svelte' | 'qwik' | 'html' | 'web-components' | 'server' | 'solid' | 'nuxt';

export { type API_ActiveTabsType, type API_BaseEntry, type API_ComponentEntry, type API_ComposedRef, type API_ComposedRefUpdate, type API_DocsEntry, type API_FilterFunction, type API_GroupEntry, type API_HashEntry, type API_IframeRenderer, type API_IndexHash, type API_Layout, type API_LeafEntry, type API_LoadedRefData, type API_MatchOptions, type API_Notification, type API_OptionsData, type API_PanelPositions, type API_PreparedIndexEntry, type API_PreparedStoryIndex, type API_Provider, type API_ProviderData, type API_RefId, type API_RefUrl, type API_Refs, type API_ReleaseNotes, type API_RenderOptions, type API_RootEntry, type API_RouteOptions, type API_SetRefData, type API_Settings, type API_SidebarOptions, type API_StateMerger, type API_StatusObject, type API_StatusState, type API_StatusUpdate, type API_StatusValue, type API_StoryEntry, type API_StoryMapper, type API_UI, type API_UIOptions, type API_UnknownEntries, type API_Version, type API_Versions$1 as API_Versions, type API_ViewMode, type Addon_AddStoryArgs, type Addon_Annotations, type Addon_ArgType, type Addon_ArgsStoryFn, type Addon_BaseAnnotations, type Addon_BaseDecorators, type Addon_BaseMeta, type Addon_BaseStoryFn, type Addon_BaseStoryObject, type Addon_BaseType, type Addon_ClientApiAddon, type Addon_ClientApiAddons, type Addon_ClientApiReturnFn, type Addon_ClientStoryApi, type Addon_Collection, type Addon_Comparator, type Addon_Config, type Addon_DecoratorFunction, type Addon_Elements, type Addon_LegacyStoryFn, type Addon_LoadFn, type Addon_Loadable, type Addon_Loader, type Addon_LoaderFunction, type Addon_Loaders, type Addon_MakeDecoratorResult, type Addon_OptionsParameter, type Addon_OptionsParameterV7, type Addon_PageType, type Addon_PartialStoryFn, type Addon_RenderOptions, type Addon_RequireContext, type Addon_SidebarBottomType, type Addon_SidebarTopType, type Addon_StoryApi, type Addon_StoryContext, type Addon_StoryContextUpdate, type Addon_StoryFn, type Addon_StorySortComparator, type Addon_StorySortComparatorV7, type Addon_StorySortMethod, type Addon_StorySortObjectParameter, type Addon_StorySortParameter, type Addon_StorySortParameterV7, type Addon_StoryWrapper, type Addon_TestProviderState, type Addon_TestProviderType, type Addon_ToolbarConfig, type Addon_Type, type Addon_Types, Addon_TypesEnum, type Addon_TypesMapping, type Addon_WrapperSettings, type Addon_WrapperType, type Addons_ArgTypes, type BaseIndexEntry, type BaseIndexInput, type BaseStory, type BoundStory, type Builder, type BuilderName, type BuilderOptions, type BuilderResult, type BuilderStats, type Builder_EnvsRaw, type Builder_Unpromise, type Builder_WithRequiredProperty, type CLIOptions, type CSFFile, type CompatibleString, type ComposeStoryFn, type ComposedStoryFn, type CoreCommon_AddonEntry, type CoreCommon_AddonInfo, type CoreCommon_OptionsEntry, type CoreCommon_ResolvedAddonPreset, type CoreCommon_ResolvedAddonVirtual, type CoreCommon_StorybookInfo, type CoreConfig, type DocsContextProps, type DocsIndexEntry, type DocsIndexInput, type DocsOptions, type DocsPreparedPayload, type DocsRenderFunction, type Entry, type GlobalsUpdatedPayload, type IndexEntry, type IndexEntryLegacy, type IndexInput, type IndexInputStats, type IndexedCSFFile, type IndexedStory, type Indexer, type IndexerOptions, type LoadOptions, type LoadedPreset, type Middleware, type ModuleExport, type ModuleExports, type ModuleImportFn, type NamedOrDefaultProjectAnnotations, type NormalizedComponentAnnotations, type NormalizedProjectAnnotations, type NormalizedStoriesSpecifier, type NormalizedStoryAnnotations, type Options, type PackageJson, type PartialArgsStoryFn, type Path, type PreparedMeta, type PreparedStory, type Preset, type PresetConfig, type PresetProperty, type PresetPropertyFn, type PresetValue, type Presets, type PreviewAnnotation, type ProjectAnnotations, type Ref, type RenderContext, type RenderContextCallbacks, type RenderToCanvas, type Renderer, type RendererName, type ResolvedModuleExport, type ResolvedModuleExportFromType, type ResolvedModuleExportType, type SetGlobalsPayload, type SetStoriesPayload, type SetStoriesStory, type SetStoriesStoryData, type Stats, type Store_CSFExports, type StoriesEntry, type StoriesSpecifier, type StoriesWithPartialProps, type StoryIndex, type StoryIndexEntry, type StoryIndexInput, type StoryIndexV2, type StoryIndexV3, type StoryPreparedPayload, type StoryRenderOptions, type StorybookConfig, type StorybookConfigOptions, type StorybookConfigRaw, type StorybookInternalParameters, type StorybookParameters, type SupportedFrameworks, type SupportedRenderers, type TagOptions, type TagsOptions, type TeardownRenderToCanvas, type TestBuildConfig, type TestBuildFlags, type TypescriptOptions, type V3CompatIndexEntry, type VersionCheck, type ViewMode, type WebRenderer };
