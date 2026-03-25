import * as semver from 'semver';
import { JsPackageManager as JsPackageManager$1, PackageJson } from 'storybook/internal/common';
import { SupportedFramework as SupportedFramework$1, SupportedRenderer, SupportedLanguage, Feature, PackageJson as PackageJson$1, NormalizedProjectAnnotations, ProjectAnnotations, ComposedStoryFn } from 'storybook/internal/types';
import { Buffer } from 'node:buffer';
import { ChildProcess } from 'node:child_process';
import { Readable, Writable, Stream } from 'node:stream';

declare function detectPnp(): Promise<boolean>;

declare function readFileAsJson(jsonPath: string, allowComments?: boolean): any;
declare const writeFileAsJson: (jsonPath: string, content: unknown) => boolean;
/**
 * Detect if any babel dependencies need to be added to the project This is currently used by
 * react-native generator
 *
 * @example
 *
 * ```ts
 * const babelDependencies = await getBabelDependencies(
 *   packageManager,
 *   npmOptions,
 *   packageJson
 * ); // you can then spread the result when using installDependencies
 * installDependencies(npmOptions, [
 *   `@storybook/react@${storybookVersion}`,
 *   ...babelDependencies,
 * ]);
 * ```
 *
 * @param packageJson The current package.json so we can inspect its contents
 * @returns Contains the packages and versions that need to be installed
 */
declare function getBabelDependencies(packageManager: JsPackageManager$1): Promise<string[]>;
declare function addToDevDependenciesIfNotPresent(packageJson: PackageJson, name: string, packageVersion: string): void;
declare function copyTemplate(templateRoot: string, destination?: string): void;
type CopyTemplateFilesOptions = {
    packageManager: JsPackageManager$1;
    templateLocation: SupportedFramework$1 | SupportedRenderer;
    language: SupportedLanguage;
    commonAssetsDir?: string;
    destination?: string;
    features: Set<Feature>;
};
/**
 * Return the installed version of a package, or the coerced version specifier from package.json if
 * it's a dependency but not installed (e.g. in a fresh project)
 */
declare function getVersionSafe(packageManager: JsPackageManager$1, packageName: string): Promise<string | undefined>;
declare const cliStoriesTargetPath: () => Promise<"./src/stories" | "./stories">;
declare function copyTemplateFiles({ packageManager, templateLocation, language, destination, commonAssetsDir, features, }: CopyTemplateFilesOptions): Promise<void>;
declare function adjustTemplate(templatePath: string, templateData: Record<string, any>): Promise<void>;
declare function coerceSemver(version: string): semver.SemVer;
declare function hasStorybookDependencies(packageManager: JsPackageManager$1): boolean;

declare const ANGULAR_JSON_PATH = "angular.json";
declare class AngularJSON {
    json: {
        projects: Record<string, {
            root: string;
            projectType: string;
            architect: Record<string, any>;
        }>;
    };
    constructor();
    get projects(): Record<string, {
        root: string;
        projectType: string;
        architect: Record<string, any>;
    }>;
    get projectsWithoutStorybook(): string[];
    get hasStorybookBuilder(): boolean;
    get rootProject(): {
        root: string;
        projectType: string;
        architect: Record<string, any>;
    } | null;
    getProjectSettingsByName(projectName: string): {
        root: string;
        projectType: string;
        architect: Record<string, any>;
    };
    getProjectName(): Promise<string>;
    addStorybookEntries({ angularProjectName, storybookFolder, useCompodoc, root, }: {
        angularProjectName: string;
        storybookFolder: string;
        useCompodoc: boolean;
        root: string;
    }): void;
    write(): void;
}

declare function getRendererDir(packageManager: JsPackageManager$1, renderer: SupportedFramework$1 | SupportedRenderer): Promise<string | null>;

declare enum ProjectType {
    ANGULAR = "angular",
    EMBER = "ember",
    HTML = "html",
    NEXTJS = "nextjs",
    NUXT = "nuxt",
    NX = "nx",
    PREACT = "preact",
    QWIK = "qwik",
    REACT = "react",
    REACT_NATIVE = "react_native",
    REACT_NATIVE_AND_RNW = "react_native_and_rnw",
    REACT_NATIVE_WEB = "react_native_web",
    REACT_SCRIPTS = "react_scripts",
    SERVER = "server",
    SOLID = "solid",
    SVELTE = "svelte",
    SVELTEKIT = "sveltekit",
    UNDETECTED = "undetected",
    UNSUPPORTED = "unsupported",
    VUE3 = "vue3",
    WEB_COMPONENTS = "web_components"
}

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

type PackageJsonWithDepsAndDevDeps = PackageJson$1 & Required<Pick<PackageJson$1, 'dependencies' | 'devDependencies'>>;

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
    abstract getModulePackageJSON(packageName: string, cwd?: string): Promise<PackageJson$1 | null>;
    isStorybookInMonorepo(): boolean;
    installDependencies(options?: {
        force?: boolean;
    }): Promise<void>;
    dedupeDependencies(options?: {
        force?: boolean;
    }): Promise<void>;
    /** Read the `package.json` file available in the provided directory */
    static getPackageJson(packageJsonPath: string): PackageJsonWithDepsAndDevDeps;
    writePackageJson(packageJson: PackageJson$1, directory?: string): void;
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
    protected abstract getResolutions(packageJson: PackageJson$1, versions: Record<string, string>): Record<string, any>;
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

type NpmOptions = Parameters<JsPackageManager['addDependencies']>[0];

declare const SUPPORTED_ESLINT_EXTENSIONS: string[];
declare const findEslintFile: (instanceDir: string) => string | undefined;
declare const configureFlatConfig: (code: string) => Promise<string>;
declare function extractEslintInfo(packageManager: JsPackageManager$1): Promise<{
    hasEslint: boolean;
    isStorybookPluginInstalled: boolean;
    eslintConfigFile: string | undefined;
    unsupportedExtension?: string;
    isFlatConfig: boolean;
}>;
declare const normalizeExtends: (existingExtends: any) => string[];
declare function configureEslintPlugin({ eslintConfigFile, packageManager, isFlatConfig, }: {
    eslintConfigFile: string | undefined;
    packageManager: JsPackageManager$1;
    isFlatConfig: boolean;
}): Promise<void>;
declare const suggestESLintPlugin: () => Promise<boolean>;

type Primitive = string | number | symbol | bigint | boolean | null | undefined;

declare namespace util {
    type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
    export type isAny<T> = 0 extends 1 & T ? true : false;
    export const assertEqual: <A, B>(_: AssertEqual<A, B>) => void;
    export function assertIs<T>(_arg: T): void;
    export function assertNever(_x: never): never;
    export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
    export type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>;
    export type MakePartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
    export type Exactly<T, X> = T & Record<Exclude<keyof X, keyof T>, never>;
    export type InexactPartial<T> = {
        [k in keyof T]?: T[k] | undefined;
    };
    export const arrayToEnum: <T extends string, U extends [T, ...T[]]>(items: U) => { [k in U[number]]: k; };
    export const getValidEnumValues: (obj: any) => any[];
    export const objectValues: (obj: any) => any[];
    export const objectKeys: ObjectConstructor["keys"];
    export const find: <T>(arr: T[], checker: (arg: T) => any) => T | undefined;
    export type identity<T> = objectUtil.identity<T>;
    export type flatten<T> = objectUtil.flatten<T>;
    export type noUndefined<T> = T extends undefined ? never : T;
    export const isInteger: NumberConstructor["isInteger"];
    export function joinValues<T extends any[]>(array: T, separator?: string): string;
    export const jsonStringifyReplacer: (_: string, value: any) => any;
    export {  };
}
declare namespace objectUtil {
    export type MergeShapes<U, V> = keyof U & keyof V extends never ? U & V : {
        [k in Exclude<keyof U, keyof V>]: U[k];
    } & V;
    type optionalKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? k : never;
    }[keyof T];
    type requiredKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? never : k;
    }[keyof T];
    export type addQuestionMarks<T extends object, _O = any> = {
        [K in requiredKeys<T>]: T[K];
    } & {
        [K in optionalKeys<T>]?: T[K];
    } & {
        [k in keyof T]?: unknown;
    };
    export type identity<T> = T;
    export type flatten<T> = identity<{
        [k in keyof T]: T[k];
    }>;
    export type noNeverKeys<T> = {
        [k in keyof T]: [T[k]] extends [never] ? never : k;
    }[keyof T];
    export type noNever<T> = identity<{
        [k in noNeverKeys<T>]: k extends keyof T ? T[k] : never;
    }>;
    export const mergeShapes: <U, T>(first: U, second: T) => T & U;
    export type extendShape<A extends object, B extends object> = keyof A & keyof B extends never ? A & B : {
        [K in keyof A as K extends keyof B ? never : K]: A[K];
    } & {
        [K in keyof B]: B[K];
    };
    export {  };
}
declare const ZodParsedType: {
    string: "string";
    nan: "nan";
    number: "number";
    integer: "integer";
    float: "float";
    boolean: "boolean";
    date: "date";
    bigint: "bigint";
    symbol: "symbol";
    function: "function";
    undefined: "undefined";
    null: "null";
    array: "array";
    object: "object";
    unknown: "unknown";
    promise: "promise";
    void: "void";
    never: "never";
    map: "map";
    set: "set";
};
type ZodParsedType = keyof typeof ZodParsedType;

type allKeys<T> = T extends any ? keyof T : never;
type typeToFlattenedError<T, U = string> = {
    formErrors: U[];
    fieldErrors: {
        [P in allKeys<T>]?: U[];
    };
};
declare const ZodIssueCode: {
    invalid_type: "invalid_type";
    invalid_literal: "invalid_literal";
    custom: "custom";
    invalid_union: "invalid_union";
    invalid_union_discriminator: "invalid_union_discriminator";
    invalid_enum_value: "invalid_enum_value";
    unrecognized_keys: "unrecognized_keys";
    invalid_arguments: "invalid_arguments";
    invalid_return_type: "invalid_return_type";
    invalid_date: "invalid_date";
    invalid_string: "invalid_string";
    too_small: "too_small";
    too_big: "too_big";
    invalid_intersection_types: "invalid_intersection_types";
    not_multiple_of: "not_multiple_of";
    not_finite: "not_finite";
};
type ZodIssueCode = keyof typeof ZodIssueCode;
type ZodIssueBase = {
    path: (string | number)[];
    message?: string | undefined;
};
interface ZodInvalidTypeIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_type;
    expected: ZodParsedType;
    received: ZodParsedType;
}
interface ZodInvalidLiteralIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_literal;
    expected: unknown;
    received: unknown;
}
interface ZodUnrecognizedKeysIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.unrecognized_keys;
    keys: string[];
}
interface ZodInvalidUnionIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_union;
    unionErrors: ZodError[];
}
interface ZodInvalidUnionDiscriminatorIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_union_discriminator;
    options: Primitive[];
}
interface ZodInvalidEnumValueIssue extends ZodIssueBase {
    received: string | number;
    code: typeof ZodIssueCode.invalid_enum_value;
    options: (string | number)[];
}
interface ZodInvalidArgumentsIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_arguments;
    argumentsError: ZodError;
}
interface ZodInvalidReturnTypeIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_return_type;
    returnTypeError: ZodError;
}
interface ZodInvalidDateIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_date;
}
type StringValidation = "email" | "url" | "emoji" | "uuid" | "nanoid" | "regex" | "cuid" | "cuid2" | "ulid" | "datetime" | "date" | "time" | "duration" | "ip" | "cidr" | "base64" | "jwt" | "base64url" | {
    includes: string;
    position?: number | undefined;
} | {
    startsWith: string;
} | {
    endsWith: string;
};
interface ZodInvalidStringIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_string;
    validation: StringValidation;
}
interface ZodTooSmallIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.too_small;
    minimum: number | bigint;
    inclusive: boolean;
    exact?: boolean;
    type: "array" | "string" | "number" | "set" | "date" | "bigint";
}
interface ZodTooBigIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.too_big;
    maximum: number | bigint;
    inclusive: boolean;
    exact?: boolean;
    type: "array" | "string" | "number" | "set" | "date" | "bigint";
}
interface ZodInvalidIntersectionTypesIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_intersection_types;
}
interface ZodNotMultipleOfIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.not_multiple_of;
    multipleOf: number | bigint;
}
interface ZodNotFiniteIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.not_finite;
}
interface ZodCustomIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.custom;
    params?: {
        [k: string]: any;
    };
}
type ZodIssueOptionalMessage = ZodInvalidTypeIssue | ZodInvalidLiteralIssue | ZodUnrecognizedKeysIssue | ZodInvalidUnionIssue | ZodInvalidUnionDiscriminatorIssue | ZodInvalidEnumValueIssue | ZodInvalidArgumentsIssue | ZodInvalidReturnTypeIssue | ZodInvalidDateIssue | ZodInvalidStringIssue | ZodTooSmallIssue | ZodTooBigIssue | ZodInvalidIntersectionTypesIssue | ZodNotMultipleOfIssue | ZodNotFiniteIssue | ZodCustomIssue;
type ZodIssue = ZodIssueOptionalMessage & {
    fatal?: boolean | undefined;
    message: string;
};
type recursiveZodFormattedError<T> = T extends [any, ...any[]] ? {
    [K in keyof T]?: ZodFormattedError<T[K]>;
} : T extends any[] ? {
    [k: number]: ZodFormattedError<T[number]>;
} : T extends object ? {
    [K in keyof T]?: ZodFormattedError<T[K]>;
} : unknown;
type ZodFormattedError<T, U = string> = {
    _errors: U[];
} & recursiveZodFormattedError<NonNullable<T>>;
declare class ZodError<T = any> extends Error {
    issues: ZodIssue[];
    get errors(): ZodIssue[];
    constructor(issues: ZodIssue[]);
    format(): ZodFormattedError<T>;
    format<U>(mapper: (issue: ZodIssue) => U): ZodFormattedError<T, U>;
    static create: (issues: ZodIssue[]) => ZodError<any>;
    static assert(value: unknown): asserts value is ZodError;
    toString(): string;
    get message(): string;
    get isEmpty(): boolean;
    addIssue: (sub: ZodIssue) => void;
    addIssues: (subs?: ZodIssue[]) => void;
    flatten(): typeToFlattenedError<T>;
    flatten<U>(mapper?: (issue: ZodIssue) => U): typeToFlattenedError<T, U>;
    get formErrors(): typeToFlattenedError<T, string>;
}
type stripPath<T extends object> = T extends any ? util.OmitKeys<T, "path"> : never;
type IssueData = stripPath<ZodIssueOptionalMessage> & {
    path?: (string | number)[];
    fatal?: boolean | undefined;
};
type ErrorMapCtx = {
    defaultError: string;
    data: any;
};
type ZodErrorMap = (issue: ZodIssueOptionalMessage, _ctx: ErrorMapCtx) => {
    message: string;
};

type ParseParams = {
    path: (string | number)[];
    errorMap: ZodErrorMap;
    async: boolean;
};
type ParsePathComponent = string | number;
type ParsePath = ParsePathComponent[];
interface ParseContext {
    readonly common: {
        readonly issues: ZodIssue[];
        readonly contextualErrorMap?: ZodErrorMap | undefined;
        readonly async: boolean;
    };
    readonly path: ParsePath;
    readonly schemaErrorMap?: ZodErrorMap | undefined;
    readonly parent: ParseContext | null;
    readonly data: any;
    readonly parsedType: ZodParsedType;
}
type ParseInput = {
    data: any;
    path: (string | number)[];
    parent: ParseContext;
};
declare class ParseStatus {
    value: "aborted" | "dirty" | "valid";
    dirty(): void;
    abort(): void;
    static mergeArray(status: ParseStatus, results: SyncParseReturnType<any>[]): SyncParseReturnType;
    static mergeObjectAsync(status: ParseStatus, pairs: {
        key: ParseReturnType<any>;
        value: ParseReturnType<any>;
    }[]): Promise<SyncParseReturnType<any>>;
    static mergeObjectSync(status: ParseStatus, pairs: {
        key: SyncParseReturnType<any>;
        value: SyncParseReturnType<any>;
        alwaysSet?: boolean;
    }[]): SyncParseReturnType;
}
type INVALID = {
    status: "aborted";
};
declare const INVALID: INVALID;
type DIRTY<T> = {
    status: "dirty";
    value: T;
};
declare const DIRTY: <T>(value: T) => DIRTY<T>;
type OK<T> = {
    status: "valid";
    value: T;
};
declare const OK: <T>(value: T) => OK<T>;
type SyncParseReturnType<T = any> = OK<T> | DIRTY<T> | INVALID;
type AsyncParseReturnType<T> = Promise<SyncParseReturnType<T>>;
type ParseReturnType<T> = SyncParseReturnType<T> | AsyncParseReturnType<T>;

declare namespace enumUtil {
    type UnionToIntersectionFn<T> = (T extends unknown ? (k: () => T) => void : never) extends (k: infer Intersection) => void ? Intersection : never;
    type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never;
    type UnionToTuple<T, Tuple extends unknown[] = []> = [T] extends [never] ? Tuple : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Tuple]>;
    type CastToStringTuple<T> = T extends [string, ...string[]] ? T : never;
    export type UnionToTupleString<T> = CastToStringTuple<UnionToTuple<T>>;
    export {  };
}

declare namespace errorUtil {
    type ErrMessage = string | {
        message?: string | undefined;
    };
    const errToObj: (message?: ErrMessage) => {
        message?: string | undefined;
    };
    const toString: (message?: ErrMessage) => string | undefined;
}

declare namespace partialUtil {
    type DeepPartial<T extends ZodTypeAny> = T extends ZodObject<ZodRawShape> ? ZodObject<{
        [k in keyof T["shape"]]: ZodOptional<DeepPartial<T["shape"][k]>>;
    }, T["_def"]["unknownKeys"], T["_def"]["catchall"]> : T extends ZodArray<infer Type, infer Card> ? ZodArray<DeepPartial<Type>, Card> : T extends ZodOptional<infer Type> ? ZodOptional<DeepPartial<Type>> : T extends ZodNullable<infer Type> ? ZodNullable<DeepPartial<Type>> : T extends ZodTuple<infer Items> ? {
        [k in keyof Items]: Items[k] extends ZodTypeAny ? DeepPartial<Items[k]> : never;
    } extends infer PI ? PI extends ZodTupleItems ? ZodTuple<PI> : never : never : T;
}

/**
 * The Standard Schema interface.
 */
type StandardSchemaV1<Input = unknown, Output = Input> = {
    /**
     * The Standard Schema properties.
     */
    readonly "~standard": StandardSchemaV1.Props<Input, Output>;
};
declare namespace StandardSchemaV1 {
    /**
     * The Standard Schema properties interface.
     */
    export interface Props<Input = unknown, Output = Input> {
        /**
         * The version number of the standard.
         */
        readonly version: 1;
        /**
         * The vendor name of the schema library.
         */
        readonly vendor: string;
        /**
         * Validates unknown input values.
         */
        readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
        /**
         * Inferred types associated with the schema.
         */
        readonly types?: Types<Input, Output> | undefined;
    }
    /**
     * The result interface of the validate function.
     */
    export type Result<Output> = SuccessResult<Output> | FailureResult;
    /**
     * The result interface if validation succeeds.
     */
    export interface SuccessResult<Output> {
        /**
         * The typed output value.
         */
        readonly value: Output;
        /**
         * The non-existent issues.
         */
        readonly issues?: undefined;
    }
    /**
     * The result interface if validation fails.
     */
    export interface FailureResult {
        /**
         * The issues of failed validation.
         */
        readonly issues: ReadonlyArray<Issue>;
    }
    /**
     * The issue interface of the failure output.
     */
    export interface Issue {
        /**
         * The error message of the issue.
         */
        readonly message: string;
        /**
         * The path of the issue, if any.
         */
        readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
    }
    /**
     * The path segment interface of the issue.
     */
    export interface PathSegment {
        /**
         * The key representing a path segment.
         */
        readonly key: PropertyKey;
    }
    /**
     * The Standard Schema types interface.
     */
    export interface Types<Input = unknown, Output = Input> {
        /**
         * The input type of the schema.
         */
        readonly input: Input;
        /**
         * The output type of the schema.
         */
        readonly output: Output;
    }
    /**
     * Infers the input type of a Standard Schema.
     */
    export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["input"];
    /**
     * Infers the output type of a Standard Schema.
     */
    export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["output"];
    export {  };
}

interface RefinementCtx {
    addIssue: (arg: IssueData) => void;
    path: (string | number)[];
}
type ZodRawShape = {
    [k: string]: ZodTypeAny;
};
type ZodTypeAny = ZodType<any, any, any>;
type TypeOf<T extends ZodType<any, any, any>> = T["_output"];
type input<T extends ZodType<any, any, any>> = T["_input"];
type output<T extends ZodType<any, any, any>> = T["_output"];

type CustomErrorParams = Partial<util.Omit<ZodCustomIssue, "code">>;
interface ZodTypeDef {
    errorMap?: ZodErrorMap | undefined;
    description?: string | undefined;
}
type RawCreateParams = {
    errorMap?: ZodErrorMap | undefined;
    invalid_type_error?: string | undefined;
    required_error?: string | undefined;
    message?: string | undefined;
    description?: string | undefined;
} | undefined;
type SafeParseSuccess<Output> = {
    success: true;
    data: Output;
    error?: never;
};
type SafeParseError<Input> = {
    success: false;
    error: ZodError<Input>;
    data?: never;
};
type SafeParseReturnType<Input, Output> = SafeParseSuccess<Output> | SafeParseError<Input>;
declare abstract class ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
    readonly _type: Output;
    readonly _output: Output;
    readonly _input: Input;
    readonly _def: Def;
    get description(): string | undefined;
    "~standard": StandardSchemaV1.Props<Input, Output>;
    abstract _parse(input: ParseInput): ParseReturnType<Output>;
    _getType(input: ParseInput): string;
    _getOrReturnCtx(input: ParseInput, ctx?: ParseContext | undefined): ParseContext;
    _processInputParams(input: ParseInput): {
        status: ParseStatus;
        ctx: ParseContext;
    };
    _parseSync(input: ParseInput): SyncParseReturnType<Output>;
    _parseAsync(input: ParseInput): AsyncParseReturnType<Output>;
    parse(data: unknown, params?: util.InexactPartial<ParseParams>): Output;
    safeParse(data: unknown, params?: util.InexactPartial<ParseParams>): SafeParseReturnType<Input, Output>;
    "~validate"(data: unknown): StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>;
    parseAsync(data: unknown, params?: util.InexactPartial<ParseParams>): Promise<Output>;
    safeParseAsync(data: unknown, params?: util.InexactPartial<ParseParams>): Promise<SafeParseReturnType<Input, Output>>;
    /** Alias of safeParseAsync */
    spa: (data: unknown, params?: util.InexactPartial<ParseParams>) => Promise<SafeParseReturnType<Input, Output>>;
    refine<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, RefinedOutput, Input>;
    refine(check: (arg: Output) => unknown | Promise<unknown>, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, Output, Input>;
    refinement<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, RefinedOutput, Input>;
    refinement(check: (arg: Output) => boolean, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, Output, Input>;
    _refinement(refinement: RefinementEffect<Output>["refinement"]): ZodEffects<this, Output, Input>;
    superRefine<RefinedOutput extends Output>(refinement: (arg: Output, ctx: RefinementCtx) => arg is RefinedOutput): ZodEffects<this, RefinedOutput, Input>;
    superRefine(refinement: (arg: Output, ctx: RefinementCtx) => void): ZodEffects<this, Output, Input>;
    superRefine(refinement: (arg: Output, ctx: RefinementCtx) => Promise<void>): ZodEffects<this, Output, Input>;
    constructor(def: Def);
    optional(): ZodOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodOptional<ZodNullable<this>>;
    array(): ZodArray<this>;
    promise(): ZodPromise<this>;
    or<T extends ZodTypeAny>(option: T): ZodUnion<[this, T]>;
    and<T extends ZodTypeAny>(incoming: T): ZodIntersection<this, T>;
    transform<NewOut>(transform: (arg: Output, ctx: RefinementCtx) => NewOut | Promise<NewOut>): ZodEffects<this, NewOut>;
    default(def: util.noUndefined<Input>): ZodDefault<this>;
    default(def: () => util.noUndefined<Input>): ZodDefault<this>;
    brand<B extends string | number | symbol>(brand?: B): ZodBranded<this, B>;
    catch(def: Output): ZodCatch<this>;
    catch(def: (ctx: {
        error: ZodError;
        input: Input;
    }) => Output): ZodCatch<this>;
    describe(description: string): this;
    pipe<T extends ZodTypeAny>(target: T): ZodPipeline<this, T>;
    readonly(): ZodReadonly<this>;
    isOptional(): boolean;
    isNullable(): boolean;
}
type ZodNumberCheck = {
    kind: "min";
    value: number;
    inclusive: boolean;
    message?: string | undefined;
} | {
    kind: "max";
    value: number;
    inclusive: boolean;
    message?: string | undefined;
} | {
    kind: "int";
    message?: string | undefined;
} | {
    kind: "multipleOf";
    value: number;
    message?: string | undefined;
} | {
    kind: "finite";
    message?: string | undefined;
};
interface ZodNumberDef extends ZodTypeDef {
    checks: ZodNumberCheck[];
    typeName: ZodFirstPartyTypeKind.ZodNumber;
    coerce: boolean;
}
declare class ZodNumber extends ZodType<number, ZodNumberDef, number> {
    _parse(input: ParseInput): ParseReturnType<number>;
    static create: (params?: RawCreateParams & {
        coerce?: boolean;
    }) => ZodNumber;
    gte(value: number, message?: errorUtil.ErrMessage): ZodNumber;
    min: (value: number, message?: errorUtil.ErrMessage) => ZodNumber;
    gt(value: number, message?: errorUtil.ErrMessage): ZodNumber;
    lte(value: number, message?: errorUtil.ErrMessage): ZodNumber;
    max: (value: number, message?: errorUtil.ErrMessage) => ZodNumber;
    lt(value: number, message?: errorUtil.ErrMessage): ZodNumber;
    protected setLimit(kind: "min" | "max", value: number, inclusive: boolean, message?: string): ZodNumber;
    _addCheck(check: ZodNumberCheck): ZodNumber;
    int(message?: errorUtil.ErrMessage): ZodNumber;
    positive(message?: errorUtil.ErrMessage): ZodNumber;
    negative(message?: errorUtil.ErrMessage): ZodNumber;
    nonpositive(message?: errorUtil.ErrMessage): ZodNumber;
    nonnegative(message?: errorUtil.ErrMessage): ZodNumber;
    multipleOf(value: number, message?: errorUtil.ErrMessage): ZodNumber;
    step: (value: number, message?: errorUtil.ErrMessage) => ZodNumber;
    finite(message?: errorUtil.ErrMessage): ZodNumber;
    safe(message?: errorUtil.ErrMessage): ZodNumber;
    get minValue(): number | null;
    get maxValue(): number | null;
    get isInt(): boolean;
    get isFinite(): boolean;
}
interface ZodBooleanDef extends ZodTypeDef {
    typeName: ZodFirstPartyTypeKind.ZodBoolean;
    coerce: boolean;
}
declare class ZodBoolean extends ZodType<boolean, ZodBooleanDef, boolean> {
    _parse(input: ParseInput): ParseReturnType<boolean>;
    static create: (params?: RawCreateParams & {
        coerce?: boolean;
    }) => ZodBoolean;
}
interface ZodArrayDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodArray;
    exactLength: {
        value: number;
        message?: string | undefined;
    } | null;
    minLength: {
        value: number;
        message?: string | undefined;
    } | null;
    maxLength: {
        value: number;
        message?: string | undefined;
    } | null;
}
type ArrayCardinality = "many" | "atleastone";
type arrayOutputType<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> = Cardinality extends "atleastone" ? [T["_output"], ...T["_output"][]] : T["_output"][];
declare class ZodArray<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> extends ZodType<arrayOutputType<T, Cardinality>, ZodArrayDef<T>, Cardinality extends "atleastone" ? [T["_input"], ...T["_input"][]] : T["_input"][]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get element(): T;
    min(minLength: number, message?: errorUtil.ErrMessage): this;
    max(maxLength: number, message?: errorUtil.ErrMessage): this;
    length(len: number, message?: errorUtil.ErrMessage): this;
    nonempty(message?: errorUtil.ErrMessage): ZodArray<T, "atleastone">;
    static create: <El extends ZodTypeAny>(schema: El, params?: RawCreateParams) => ZodArray<El>;
}
type UnknownKeysParam = "passthrough" | "strict" | "strip";
interface ZodObjectDef<T extends ZodRawShape = ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    typeName: ZodFirstPartyTypeKind.ZodObject;
    shape: () => T;
    catchall: Catchall;
    unknownKeys: UnknownKeys;
}
type objectOutputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<objectUtil.addQuestionMarks<baseObjectOutputType<Shape>>> & CatchallOutput<Catchall> & PassthroughType<UnknownKeys>;
type baseObjectOutputType<Shape extends ZodRawShape> = {
    [k in keyof Shape]: Shape[k]["_output"];
};
type objectInputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<baseObjectInputType<Shape>> & CatchallInput<Catchall> & PassthroughType<UnknownKeys>;
type baseObjectInputType<Shape extends ZodRawShape> = objectUtil.addQuestionMarks<{
    [k in keyof Shape]: Shape[k]["_input"];
}>;
type CatchallOutput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_output"];
};
type CatchallInput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_input"];
};
type PassthroughType<T extends UnknownKeysParam> = T extends "passthrough" ? {
    [k: string]: unknown;
} : unknown;
type deoptional<T extends ZodTypeAny> = T extends ZodOptional<infer U> ? deoptional<U> : T extends ZodNullable<infer U> ? ZodNullable<deoptional<U>> : T;
declare class ZodObject<T extends ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny, Output = objectOutputType<T, Catchall, UnknownKeys>, Input = objectInputType<T, Catchall, UnknownKeys>> extends ZodType<Output, ZodObjectDef<T, UnknownKeys, Catchall>, Input> {
    private _cached;
    _getCached(): {
        shape: T;
        keys: string[];
    };
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get shape(): T;
    strict(message?: errorUtil.ErrMessage): ZodObject<T, "strict", Catchall>;
    strip(): ZodObject<T, "strip", Catchall>;
    passthrough(): ZodObject<T, "passthrough", Catchall>;
    /**
     * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
     * If you want to pass through unknown properties, use `.passthrough()` instead.
     */
    nonstrict: () => ZodObject<T, "passthrough", Catchall>;
    extend<Augmentation extends ZodRawShape>(augmentation: Augmentation): ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall>;
    /**
     * @deprecated Use `.extend` instead
     *  */
    augment: <Augmentation extends ZodRawShape>(augmentation: Augmentation) => ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall>;
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge<Incoming extends AnyZodObject, Augmentation extends Incoming["shape"]>(merging: Incoming): ZodObject<objectUtil.extendShape<T, Augmentation>, Incoming["_def"]["unknownKeys"], Incoming["_def"]["catchall"]>;
    setKey<Key extends string, Schema extends ZodTypeAny>(key: Key, schema: Schema): ZodObject<T & {
        [k in Key]: Schema;
    }, UnknownKeys, Catchall>;
    catchall<Index extends ZodTypeAny>(index: Index): ZodObject<T, UnknownKeys, Index>;
    pick<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Pick<T, Extract<keyof T, keyof Mask>>, UnknownKeys, Catchall>;
    omit<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Omit<T, keyof Mask>, UnknownKeys, Catchall>;
    /**
     * @deprecated
     */
    deepPartial(): partialUtil.DeepPartial<this>;
    partial(): ZodObject<{
        [k in keyof T]: ZodOptional<T[k]>;
    }, UnknownKeys, Catchall>;
    partial<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? ZodOptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    required(): ZodObject<{
        [k in keyof T]: deoptional<T[k]>;
    }, UnknownKeys, Catchall>;
    required<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? deoptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    keyof(): ZodEnum<enumUtil.UnionToTupleString<keyof T>>;
    static create: <Shape extends ZodRawShape>(shape: Shape, params?: RawCreateParams) => ZodObject<Shape, "strip", ZodTypeAny, objectOutputType<Shape, ZodTypeAny, "strip">, objectInputType<Shape, ZodTypeAny, "strip">>;
    static strictCreate: <Shape extends ZodRawShape>(shape: Shape, params?: RawCreateParams) => ZodObject<Shape, "strict">;
    static lazycreate: <Shape extends ZodRawShape>(shape: () => Shape, params?: RawCreateParams) => ZodObject<Shape, "strip">;
}
type AnyZodObject = ZodObject<any, any, any>;
type ZodUnionOptions = Readonly<[ZodTypeAny, ...ZodTypeAny[]]>;
interface ZodUnionDef<T extends ZodUnionOptions = Readonly<[ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]>> extends ZodTypeDef {
    options: T;
    typeName: ZodFirstPartyTypeKind.ZodUnion;
}
declare class ZodUnion<T extends ZodUnionOptions> extends ZodType<T[number]["_output"], ZodUnionDef<T>, T[number]["_input"]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get options(): T;
    static create: <Options extends Readonly<[ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]>>(types: Options, params?: RawCreateParams) => ZodUnion<Options>;
}
interface ZodIntersectionDef<T extends ZodTypeAny = ZodTypeAny, U extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    left: T;
    right: U;
    typeName: ZodFirstPartyTypeKind.ZodIntersection;
}
declare class ZodIntersection<T extends ZodTypeAny, U extends ZodTypeAny> extends ZodType<T["_output"] & U["_output"], ZodIntersectionDef<T, U>, T["_input"] & U["_input"]> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <TSchema extends ZodTypeAny, USchema extends ZodTypeAny>(left: TSchema, right: USchema, params?: RawCreateParams) => ZodIntersection<TSchema, USchema>;
}
type ZodTupleItems = [ZodTypeAny, ...ZodTypeAny[]];
type AssertArray<T> = T extends any[] ? T : never;
type OutputTypeOfTuple<T extends ZodTupleItems | []> = AssertArray<{
    [k in keyof T]: T[k] extends ZodType<any, any, any> ? T[k]["_output"] : never;
}>;
type OutputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...OutputTypeOfTuple<T>, ...Rest["_output"][]] : OutputTypeOfTuple<T>;
type InputTypeOfTuple<T extends ZodTupleItems | []> = AssertArray<{
    [k in keyof T]: T[k] extends ZodType<any, any, any> ? T[k]["_input"] : never;
}>;
type InputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...InputTypeOfTuple<T>, ...Rest["_input"][]] : InputTypeOfTuple<T>;
interface ZodTupleDef<T extends ZodTupleItems | [] = ZodTupleItems, Rest extends ZodTypeAny | null = null> extends ZodTypeDef {
    items: T;
    rest: Rest;
    typeName: ZodFirstPartyTypeKind.ZodTuple;
}
declare class ZodTuple<T extends ZodTupleItems | [] = ZodTupleItems, Rest extends ZodTypeAny | null = null> extends ZodType<OutputTypeOfTupleWithRest<T, Rest>, ZodTupleDef<T, Rest>, InputTypeOfTupleWithRest<T, Rest>> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get items(): T;
    rest<RestSchema extends ZodTypeAny>(rest: RestSchema): ZodTuple<T, RestSchema>;
    static create: <Items extends [ZodTypeAny, ...ZodTypeAny[]] | []>(schemas: Items, params?: RawCreateParams) => ZodTuple<Items, null>;
}
type EnumValues<T extends string = string> = readonly [T, ...T[]];
type Values<T extends EnumValues> = {
    [k in T[number]]: k;
};
interface ZodEnumDef<T extends EnumValues = EnumValues> extends ZodTypeDef {
    values: T;
    typeName: ZodFirstPartyTypeKind.ZodEnum;
}
type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};
type FilterEnum<Values, ToExclude> = Values extends [] ? [] : Values extends [infer Head, ...infer Rest] ? Head extends ToExclude ? FilterEnum<Rest, ToExclude> : [Head, ...FilterEnum<Rest, ToExclude>] : never;
type typecast<A, T> = A extends T ? A : never;
declare function createZodEnum<U extends string, T extends Readonly<[U, ...U[]]>>(values: T, params?: RawCreateParams): ZodEnum<Writeable<T>>;
declare function createZodEnum<U extends string, T extends [U, ...U[]]>(values: T, params?: RawCreateParams): ZodEnum<T>;
declare class ZodEnum<T extends [string, ...string[]]> extends ZodType<T[number], ZodEnumDef<T>, T[number]> {
    _cache: Set<T[number]> | undefined;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get options(): T;
    get enum(): Values<T>;
    get Values(): Values<T>;
    get Enum(): Values<T>;
    extract<ToExtract extends readonly [T[number], ...T[number][]]>(values: ToExtract, newDef?: RawCreateParams): ZodEnum<Writeable<ToExtract>>;
    exclude<ToExclude extends readonly [T[number], ...T[number][]]>(values: ToExclude, newDef?: RawCreateParams): ZodEnum<typecast<Writeable<FilterEnum<T, ToExclude[number]>>, [string, ...string[]]>>;
    static create: typeof createZodEnum;
}
interface ZodPromiseDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodPromise;
}
declare class ZodPromise<T extends ZodTypeAny> extends ZodType<Promise<T["_output"]>, ZodPromiseDef<T>, Promise<T["_input"]>> {
    unwrap(): T;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <Inner extends ZodTypeAny>(schema: Inner, params?: RawCreateParams) => ZodPromise<Inner>;
}
type RefinementEffect<T> = {
    type: "refinement";
    refinement: (arg: T, ctx: RefinementCtx) => any;
};
type TransformEffect<T> = {
    type: "transform";
    transform: (arg: T, ctx: RefinementCtx) => any;
};
type PreprocessEffect<T> = {
    type: "preprocess";
    transform: (arg: T, ctx: RefinementCtx) => any;
};
type Effect<T> = RefinementEffect<T> | TransformEffect<T> | PreprocessEffect<T>;
interface ZodEffectsDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    schema: T;
    typeName: ZodFirstPartyTypeKind.ZodEffects;
    effect: Effect<any>;
}
declare class ZodEffects<T extends ZodTypeAny, Output = output<T>, Input = input<T>> extends ZodType<Output, ZodEffectsDef<T>, Input> {
    innerType(): T;
    sourceType(): T;
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <I extends ZodTypeAny>(schema: I, effect: Effect<I["_output"]>, params?: RawCreateParams) => ZodEffects<I, I["_output"]>;
    static createWithPreprocess: <I extends ZodTypeAny>(preprocess: (arg: unknown, ctx: RefinementCtx) => unknown, schema: I, params?: RawCreateParams) => ZodEffects<I, I["_output"], unknown>;
}

interface ZodOptionalDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodOptional;
}
declare class ZodOptional<T extends ZodTypeAny> extends ZodType<T["_output"] | undefined, ZodOptionalDef<T>, T["_input"] | undefined> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    unwrap(): T;
    static create: <Inner extends ZodTypeAny>(type: Inner, params?: RawCreateParams) => ZodOptional<Inner>;
}
interface ZodNullableDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodNullable;
}
declare class ZodNullable<T extends ZodTypeAny> extends ZodType<T["_output"] | null, ZodNullableDef<T>, T["_input"] | null> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    unwrap(): T;
    static create: <Inner extends ZodTypeAny>(type: Inner, params?: RawCreateParams) => ZodNullable<Inner>;
}
interface ZodDefaultDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    defaultValue: () => util.noUndefined<T["_input"]>;
    typeName: ZodFirstPartyTypeKind.ZodDefault;
}
declare class ZodDefault<T extends ZodTypeAny> extends ZodType<util.noUndefined<T["_output"]>, ZodDefaultDef<T>, T["_input"] | undefined> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    removeDefault(): T;
    static create: <Inner extends ZodTypeAny>(type: Inner, params: RawCreateParams & {
        default: Inner["_input"] | (() => util.noUndefined<Inner["_input"]>);
    }) => ZodDefault<Inner>;
}
interface ZodCatchDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    catchValue: (ctx: {
        error: ZodError;
        input: unknown;
    }) => T["_input"];
    typeName: ZodFirstPartyTypeKind.ZodCatch;
}
declare class ZodCatch<T extends ZodTypeAny> extends ZodType<T["_output"], ZodCatchDef<T>, unknown> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    removeCatch(): T;
    static create: <Inner extends ZodTypeAny>(type: Inner, params: RawCreateParams & {
        catch: Inner["_output"] | (() => Inner["_output"]);
    }) => ZodCatch<Inner>;
}
interface ZodBrandedDef<T extends ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodBranded;
}
declare const BRAND: unique symbol;
type BRAND<T extends string | number | symbol> = {
    [BRAND]: {
        [k in T]: true;
    };
};
declare class ZodBranded<T extends ZodTypeAny, B extends string | number | symbol> extends ZodType<T["_output"] & BRAND<B>, ZodBrandedDef<T>, T["_input"]> {
    _parse(input: ParseInput): ParseReturnType<any>;
    unwrap(): T;
}
interface ZodPipelineDef<A extends ZodTypeAny, B extends ZodTypeAny> extends ZodTypeDef {
    in: A;
    out: B;
    typeName: ZodFirstPartyTypeKind.ZodPipeline;
}
declare class ZodPipeline<A extends ZodTypeAny, B extends ZodTypeAny> extends ZodType<B["_output"], ZodPipelineDef<A, B>, A["_input"]> {
    _parse(input: ParseInput): ParseReturnType<any>;
    static create<ASchema extends ZodTypeAny, BSchema extends ZodTypeAny>(a: ASchema, b: BSchema): ZodPipeline<ASchema, BSchema>;
}
type BuiltIn = (((...args: any[]) => any) | (new (...args: any[]) => any)) | {
    readonly [Symbol.toStringTag]: string;
} | Date | Error | Generator | Promise<unknown> | RegExp;
type MakeReadonly<T> = T extends Map<infer K, infer V> ? ReadonlyMap<K, V> : T extends Set<infer V> ? ReadonlySet<V> : T extends [infer Head, ...infer Tail] ? readonly [Head, ...Tail] : T extends Array<infer V> ? ReadonlyArray<V> : T extends BuiltIn ? T : Readonly<T>;
interface ZodReadonlyDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodReadonly;
}
declare class ZodReadonly<T extends ZodTypeAny> extends ZodType<MakeReadonly<T["_output"]>, ZodReadonlyDef<T>, MakeReadonly<T["_input"]>> {
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    static create: <Inner extends ZodTypeAny>(type: Inner, params?: RawCreateParams) => ZodReadonly<Inner>;
    unwrap(): T;
}
declare enum ZodFirstPartyTypeKind {
    ZodString = "ZodString",
    ZodNumber = "ZodNumber",
    ZodNaN = "ZodNaN",
    ZodBigInt = "ZodBigInt",
    ZodBoolean = "ZodBoolean",
    ZodDate = "ZodDate",
    ZodSymbol = "ZodSymbol",
    ZodUndefined = "ZodUndefined",
    ZodNull = "ZodNull",
    ZodAny = "ZodAny",
    ZodUnknown = "ZodUnknown",
    ZodNever = "ZodNever",
    ZodVoid = "ZodVoid",
    ZodArray = "ZodArray",
    ZodObject = "ZodObject",
    ZodUnion = "ZodUnion",
    ZodDiscriminatedUnion = "ZodDiscriminatedUnion",
    ZodIntersection = "ZodIntersection",
    ZodTuple = "ZodTuple",
    ZodRecord = "ZodRecord",
    ZodMap = "ZodMap",
    ZodSet = "ZodSet",
    ZodFunction = "ZodFunction",
    ZodLazy = "ZodLazy",
    ZodLiteral = "ZodLiteral",
    ZodEnum = "ZodEnum",
    ZodEffects = "ZodEffects",
    ZodNativeEnum = "ZodNativeEnum",
    ZodOptional = "ZodOptional",
    ZodNullable = "ZodNullable",
    ZodDefault = "ZodDefault",
    ZodCatch = "ZodCatch",
    ZodPromise = "ZodPromise",
    ZodBranded = "ZodBranded",
    ZodPipeline = "ZodPipeline",
    ZodReadonly = "ZodReadonly"
}

declare const userSettingSchema: ZodObject<{
    version: ZodNumber;
    userSince: ZodOptional<ZodNumber>;
    init: ZodOptional<ZodObject<{
        skipOnboarding: ZodOptional<ZodBoolean>;
    }, "strip", ZodTypeAny, {
        skipOnboarding?: boolean | undefined;
    }, {
        skipOnboarding?: boolean | undefined;
    }>>;
    checklist: ZodOptional<ZodObject<{
        items: ZodOptional<ZodObject<{
            accessibilityTests: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            autodocs: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            ciTests: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            controls: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            coverage: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            guidedTour: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            installA11y: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            installChromatic: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            installDocs: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            installVitest: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            mdxDocs: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            moreComponents: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            moreStories: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            onboardingSurvey: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            organizeStories: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            publishStorybook: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            renderComponent: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            runTests: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            viewports: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            visualTests: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            whatsNewStorybook10: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
            writeInteractions: ZodOptional<ZodObject<{
                status: ZodOptional<ZodEnum<["open", "accepted", "done", "skipped"]>>;
                mutedAt: ZodOptional<ZodNumber>;
            }, "strict", ZodTypeAny, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }, {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            }>>;
        }, "strip", ZodTypeAny, {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        }, {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        }>>;
        widget: ZodOptional<ZodObject<{
            disable: ZodOptional<ZodBoolean>;
        }, "strip", ZodTypeAny, {
            disable?: boolean | undefined;
        }, {
            disable?: boolean | undefined;
        }>>;
    }, "strip", ZodTypeAny, {
        items?: {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        } | undefined;
        widget?: {
            disable?: boolean | undefined;
        } | undefined;
    }, {
        items?: {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        } | undefined;
        widget?: {
            disable?: boolean | undefined;
        } | undefined;
    }>>;
}, "strip", ZodTypeAny, {
    version: number;
    init?: {
        skipOnboarding?: boolean | undefined;
    } | undefined;
    userSince?: number | undefined;
    checklist?: {
        items?: {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        } | undefined;
        widget?: {
            disable?: boolean | undefined;
        } | undefined;
    } | undefined;
}, {
    version: number;
    init?: {
        skipOnboarding?: boolean | undefined;
    } | undefined;
    userSince?: number | undefined;
    checklist?: {
        items?: {
            controls?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            autodocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            accessibilityTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            ciTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            coverage?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            guidedTour?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installA11y?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installChromatic?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            installVitest?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            mdxDocs?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreComponents?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            moreStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            onboardingSurvey?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            organizeStories?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            publishStorybook?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            renderComponent?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            runTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            viewports?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            visualTests?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            whatsNewStorybook10?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
            writeInteractions?: {
                status?: "open" | "done" | "accepted" | "skipped" | undefined;
                mutedAt?: number | undefined;
            } | undefined;
        } | undefined;
        widget?: {
            disable?: boolean | undefined;
        } | undefined;
    } | undefined;
}>;
declare function globalSettings(filePath?: string): Promise<Settings>;
declare function _clearGlobalSettings(): void;
/**
 * A class for reading and writing settings from a JSON file. Supports nested settings with dot
 * notation.
 */
declare class Settings {
    private filePath;
    value: TypeOf<typeof userSettingSchema>;
    /**
     * Create a new Settings instance
     *
     * @param filePath Path to the JSON settings file
     * @param value Loaded value of settings
     */
    constructor(filePath: string, value: TypeOf<typeof userSettingSchema>);
    /** Save settings to the file */
    save(): Promise<void>;
}

/**
 * Actions represent the type of change to a location value.
 */
declare enum Action {
    /**
     * A POP indicates a change to an arbitrary index in the history stack, such
     * as a back or forward navigation. It does not describe the direction of the
     * navigation, only that the current index changed.
     *
     * Note: This is the default action for newly created history objects.
     */
    Pop = "POP",
    /**
     * A PUSH indicates a new entry being added to the history stack, such as when
     * a link is clicked and a new page loads. When this happens, all subsequent
     * entries in the stack are lost.
     */
    Push = "PUSH",
    /**
     * A REPLACE indicates the entry at the current index in the history stack
     * being replaced by a new one.
     */
    Replace = "REPLACE"
}
/**
 * The pathname, search, and hash values of a URL.
 */
interface Path {
    /**
     * A URL pathname, beginning with a /.
     */
    pathname: string;
    /**
     * A URL search string, beginning with a ?.
     */
    search: string;
    /**
     * A URL fragment identifier, beginning with a #.
     */
    hash: string;
}
/**
 * An entry in a history stack. A location contains information about the
 * URL path, as well as possibly some arbitrary state and a key.
 */
interface Location extends Path {
    /**
     * A value of arbitrary data associated with this location.
     */
    state: any;
    /**
     * A unique string associated with this location. May be used to safely store
     * and retrieve data in some other storage API, like `localStorage`.
     *
     * Note: This value is always "default" on the initial location.
     */
    key: string;
}

/**
 * Map of routeId -> data returned from a loader/action/error
 */
interface RouteData {
    [routeId: string]: any;
}
declare enum ResultType {
    data = "data",
    deferred = "deferred",
    redirect = "redirect",
    error = "error"
}
/**
 * Successful result from a loader or action
 */
interface SuccessResult {
    type: ResultType.data;
    data: any;
    statusCode?: number;
    headers?: Headers;
}
/**
 * Successful defer() result from a loader or action
 */
interface DeferredResult {
    type: ResultType.deferred;
    deferredData: DeferredData;
    statusCode?: number;
    headers?: Headers;
}
/**
 * Redirect result from a loader or action
 */
interface RedirectResult {
    type: ResultType.redirect;
    status: number;
    location: string;
    revalidate: boolean;
    reloadDocument?: boolean;
}
/**
 * Unsuccessful result from a loader or action
 */
interface ErrorResult {
    type: ResultType.error;
    error: any;
    headers?: Headers;
}
/**
 * Result from a loader or action - potentially successful or unsuccessful
 */
type DataResult = SuccessResult | DeferredResult | RedirectResult | ErrorResult;
type LowerCaseFormMethod = "get" | "post" | "put" | "patch" | "delete";
type UpperCaseFormMethod = Uppercase<LowerCaseFormMethod>;
/**
 * Active navigation/fetcher form methods are exposed in lowercase on the
 * RouterState
 */
type FormMethod = LowerCaseFormMethod;
/**
 * In v7, active navigation/fetcher form methods are exposed in uppercase on the
 * RouterState.  This is to align with the normalization done via fetch().
 */
type V7_FormMethod = UpperCaseFormMethod;
type FormEncType = "application/x-www-form-urlencoded" | "multipart/form-data" | "application/json" | "text/plain";
type JsonObject = {
    [Key in string]: JsonValue;
} & {
    [Key in string]?: JsonValue | undefined;
};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
/**
 * @private
 * Internal interface to pass around for action submissions, not intended for
 * external consumption
 */
type Submission = {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: FormData;
    json: undefined;
    text: undefined;
} | {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: JsonValue;
    text: undefined;
} | {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: undefined;
    text: string;
};
/**
 * @private
 * Arguments passed to route loader/action functions.  Same for now but we keep
 * this as a private implementation detail in case they diverge in the future.
 */
interface DataFunctionArgs {
    request: Request;
    params: Params;
    context?: any;
}
/**
 * Arguments passed to loader functions
 */
interface LoaderFunctionArgs extends DataFunctionArgs {
}
/**
 * Arguments passed to action functions
 */
interface ActionFunctionArgs extends DataFunctionArgs {
}
/**
 * Loaders and actions can return anything except `undefined` (`null` is a
 * valid return value if there is no data to return).  Responses are preferred
 * and will ease any future migration to Remix
 */
type DataFunctionValue = Response | NonNullable<unknown> | null;
/**
 * Route loader function signature
 */
interface LoaderFunction {
    (args: LoaderFunctionArgs): Promise<DataFunctionValue> | DataFunctionValue;
}
/**
 * Route action function signature
 */
interface ActionFunction {
    (args: ActionFunctionArgs): Promise<DataFunctionValue> | DataFunctionValue;
}
/**
 * Route shouldRevalidate function signature.  This runs after any submission
 * (navigation or fetcher), so we flatten the navigation/fetcher submission
 * onto the arguments.  It shouldn't matter whether it came from a navigation
 * or a fetcher, what really matters is the URLs and the formData since loaders
 * have to re-run based on the data models that were potentially mutated.
 */
interface ShouldRevalidateFunction {
    (args: {
        currentUrl: URL;
        currentParams: AgnosticDataRouteMatch["params"];
        nextUrl: URL;
        nextParams: AgnosticDataRouteMatch["params"];
        formMethod?: Submission["formMethod"];
        formAction?: Submission["formAction"];
        formEncType?: Submission["formEncType"];
        text?: Submission["text"];
        formData?: Submission["formData"];
        json?: Submission["json"];
        actionResult?: DataResult;
        defaultShouldRevalidate: boolean;
    }): boolean;
}
/**
 * Keys we cannot change from within a lazy() function. We spread all other keys
 * onto the route. Either they're meaningful to the router, or they'll get
 * ignored.
 */
type ImmutableRouteKey = "lazy" | "caseSensitive" | "path" | "id" | "index" | "children";
type RequireOne<T, Key = keyof T> = Exclude<{
    [K in keyof T]: K extends Key ? Omit<T, K> & Required<Pick<T, K>> : never;
}[keyof T], undefined>;
/**
 * lazy() function to load a route definition, which can add non-matching
 * related properties to a route
 */
interface LazyRouteFunction<R extends AgnosticRouteObject> {
    (): Promise<RequireOne<Omit<R, ImmutableRouteKey>>>;
}
/**
 * Base RouteObject with common props shared by all types of routes
 */
type AgnosticBaseRouteObject = {
    caseSensitive?: boolean;
    path?: string;
    id?: string;
    loader?: LoaderFunction;
    action?: ActionFunction;
    hasErrorBoundary?: boolean;
    shouldRevalidate?: ShouldRevalidateFunction;
    handle?: any;
    lazy?: LazyRouteFunction<AgnosticBaseRouteObject>;
};
/**
 * Index routes must not have children
 */
type AgnosticIndexRouteObject = AgnosticBaseRouteObject & {
    children?: undefined;
    index: true;
};
/**
 * Non-index routes may have children, but cannot have index
 */
type AgnosticNonIndexRouteObject = AgnosticBaseRouteObject & {
    children?: AgnosticRouteObject[];
    index?: false;
};
/**
 * A route object represents a logical route, with (optionally) its child
 * routes organized in a tree-like structure.
 */
type AgnosticRouteObject = AgnosticIndexRouteObject | AgnosticNonIndexRouteObject;
type AgnosticDataIndexRouteObject = AgnosticIndexRouteObject & {
    id: string;
};
type AgnosticDataNonIndexRouteObject = AgnosticNonIndexRouteObject & {
    children?: AgnosticDataRouteObject[];
    id: string;
};
/**
 * A data route object, which is just a RouteObject with a required unique ID
 */
type AgnosticDataRouteObject = AgnosticDataIndexRouteObject | AgnosticDataNonIndexRouteObject;
/**
 * The parameters that were parsed from the URL path.
 */
type Params<Key extends string = string> = {
    readonly [key in Key]: string | undefined;
};
/**
 * A RouteMatch contains info about how a route matched a URL.
 */
interface AgnosticRouteMatch<ParamKey extends string = string, RouteObjectType extends AgnosticRouteObject = AgnosticRouteObject> {
    /**
     * The names and values of dynamic parameters in the URL.
     */
    params: Params<ParamKey>;
    /**
     * The portion of the URL pathname that was matched.
     */
    pathname: string;
    /**
     * The portion of the URL pathname that was matched before child routes.
     */
    pathnameBase: string;
    /**
     * The route object that was used to match.
     */
    route: RouteObjectType;
}
interface AgnosticDataRouteMatch extends AgnosticRouteMatch<string, AgnosticDataRouteObject> {
}
declare class DeferredData {
    private pendingKeysSet;
    private controller;
    private abortPromise;
    private unlistenAbortSignal;
    private subscribers;
    data: Record<string, unknown>;
    init?: ResponseInit;
    deferredKeys: string[];
    constructor(data: Record<string, unknown>, responseInit?: ResponseInit);
    private trackPromise;
    private onSettle;
    private emit;
    subscribe(fn: (aborted: boolean, settledKey?: string) => void): () => boolean;
    cancel(): void;
    resolveData(signal: AbortSignal): Promise<boolean>;
    get done(): boolean;
    get unwrappedData(): {};
    get pendingKeys(): string[];
}

/**
 * State maintained internally by the router.  During a navigation, all states
 * reflect the the "old" location unless otherwise noted.
 */
interface RouterState {
    /**
     * The action of the most recent navigation
     */
    historyAction: Action;
    /**
     * The current location reflected by the router
     */
    location: Location;
    /**
     * The current set of route matches
     */
    matches: AgnosticDataRouteMatch[];
    /**
     * Tracks whether we've completed our initial data load
     */
    initialized: boolean;
    /**
     * Current scroll position we should start at for a new view
     *  - number -> scroll position to restore to
     *  - false -> do not restore scroll at all (used during submissions)
     *  - null -> don't have a saved position, scroll to hash or top of page
     */
    restoreScrollPosition: number | false | null;
    /**
     * Indicate whether this navigation should skip resetting the scroll position
     * if we are unable to restore the scroll position
     */
    preventScrollReset: boolean;
    /**
     * Tracks the state of the current navigation
     */
    navigation: Navigation;
    /**
     * Tracks any in-progress revalidations
     */
    revalidation: RevalidationState;
    /**
     * Data from the loaders for the current matches
     */
    loaderData: RouteData;
    /**
     * Data from the action for the current matches
     */
    actionData: RouteData | null;
    /**
     * Errors caught from loaders for the current matches
     */
    errors: RouteData | null;
    /**
     * Map of current fetchers
     */
    fetchers: Map<string, Fetcher>;
    /**
     * Map of current blockers
     */
    blockers: Map<string, Blocker>;
}
/**
 * Data that can be passed into hydrate a Router from SSR
 */
type HydrationState = Partial<Pick<RouterState, "loaderData" | "actionData" | "errors">>;
/**
 * Potential states for state.navigation
 */
type NavigationStates = {
    Idle: {
        state: "idle";
        location: undefined;
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        formData: undefined;
        json: undefined;
        text: undefined;
    };
    Loading: {
        state: "loading";
        location: Location;
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        text: Submission["text"] | undefined;
    };
    Submitting: {
        state: "submitting";
        location: Location;
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        formData: Submission["formData"];
        json: Submission["json"];
        text: Submission["text"];
    };
};
type Navigation = NavigationStates[keyof NavigationStates];
type RevalidationState = "idle" | "loading";
/**
 * Potential states for fetchers
 */
type FetcherStates<TData = any> = {
    Idle: {
        state: "idle";
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        text: undefined;
        formData: undefined;
        json: undefined;
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
    Loading: {
        state: "loading";
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        text: Submission["text"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
    Submitting: {
        state: "submitting";
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        text: Submission["text"];
        formData: Submission["formData"];
        json: Submission["json"];
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
};
type Fetcher<TData = any> = FetcherStates<TData>[keyof FetcherStates<TData>];
interface BlockerBlocked {
    state: "blocked";
    reset(): void;
    proceed(): void;
    location: Location;
}
interface BlockerUnblocked {
    state: "unblocked";
    reset: undefined;
    proceed: undefined;
    location: undefined;
}
interface BlockerProceeding {
    state: "proceeding";
    reset: undefined;
    proceed: undefined;
    location: Location;
}
type Blocker = BlockerUnblocked | BlockerBlocked | BlockerProceeding;

/**
 * NOTE: If you refactor this to split up the modules into separate files,
 * you'll need to update the rollup config for react-router-dom-v5-compat.
 */

declare global {
    var __staticRouterHydrationData: HydrationState | undefined;
}

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

declare enum SupportedBuilder {
    WEBPACK5 = "webpack5",
    VITE = "vite",
    RSBUILD = "rsbuild"
}

declare enum SupportedFramework {
    ANGULAR = "angular",
    EMBER = "ember",
    HTML_VITE = "html-vite",
    NEXTJS = "nextjs",
    NEXTJS_VITE = "nextjs-vite",
    PREACT_VITE = "preact-vite",
    REACT_NATIVE_WEB_VITE = "react-native-web-vite",
    REACT_VITE = "react-vite",
    REACT_WEBPACK5 = "react-webpack5",
    SERVER_WEBPACK5 = "server-webpack5",
    SVELTE_VITE = "svelte-vite",
    SVELTEKIT = "sveltekit",
    VUE3_VITE = "vue3-vite",
    WEB_COMPONENTS_VITE = "web-components-vite",
    HTML_RSBUILD = "html-rsbuild",
    NUXT = "nuxt",
    QWIK = "qwik",
    REACT_RSBUILD = "react-rsbuild",
    SOLID = "solid",
    VUE3_RSBUILD = "vue3-rsbuild",
    WEB_COMPONENTS_RSBUILD = "web-components-rsbuild"
}

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations<any>;
    var defaultProjectAnnotations: ProjectAnnotations<any>;
}
type WrappedStoryRef = {
    __pw_type: 'jsx';
    props: Record<string, any>;
} | {
    __pw_type: 'importRef';
};
type UnwrappedJSXStoryRef = {
    __pw_type: 'jsx';
    type: UnwrappedImportStoryRef;
};
type UnwrappedImportStoryRef = ComposedStoryFn;
declare global {
    function __pwUnwrapObject(storyRef: WrappedStoryRef): Promise<UnwrappedJSXStoryRef | UnwrappedImportStoryRef>;
}

type Result = {
    compatible: boolean;
    reasons?: string[];
};
interface AddonVitestCompatibilityOptions {
    builder?: SupportedBuilder;
    framework?: SupportedFramework | null;
    projectRoot?: string;
}
/**
 * Centralized service for @storybook/addon-vitest dependency collection and compatibility
 * validation
 *
 * This service consolidates logic from:
 *
 * - Code/addons/vitest/src/postinstall.ts
 * - Code/lib/create-storybook/src/addon-dependencies/addon-vitest.ts
 * - Code/lib/create-storybook/src/services/FeatureCompatibilityService.ts
 */
declare class AddonVitestService {
    private readonly packageManager;
    constructor(packageManager: JsPackageManager$1);
    /**
     * Collect all dependencies needed for @storybook/addon-vitest
     *
     * Returns versioned package strings ready for installation:
     *
     * - Base packages: vitest, @vitest/browser, playwright
     * - Next.js specific: @storybook/nextjs-vite
     * - Coverage reporter: @vitest/coverage-v8
     */
    collectDependencies(): Promise<string[]>;
    /**
     * Install Playwright browser binaries for @storybook/addon-vitest
     *
     * Installs Chromium with dependencies via `npx playwright install chromium --with-deps`
     *
     * @param packageManager - The package manager to use for installation
     * @param prompt - The prompt instance for displaying progress
     * @param logger - The logger instance for displaying messages
     * @param options - Installation options
     * @returns Array of error messages if installation fails
     */
    installPlaywright(options?: {
        yes?: boolean;
    }): Promise<{
        errors: string[];
        result: 'installed' | 'skipped' | 'aborted' | 'failed';
    }>;
    /**
     * Validate full compatibility for @storybook/addon-vitest
     *
     * Checks:
     *
     * - Webpack configuration compatibility
     * - Builder compatibility (Vite or Next.js)
     * - Renderer/framework support
     * - Vitest version (>=3.0.0)
     * - MSW version (>=2.0.0 if installed)
     * - Next.js installation (if using @storybook/nextjs)
     * - Vitest config files (if configDir provided)
     */
    validateCompatibility(options: AddonVitestCompatibilityOptions): Promise<Result>;
    /**
     * Validate package versions for addon-vitest compatibility Public method to allow early
     * validation before framework detection
     */
    validatePackageVersions(): Promise<Result>;
    /**
     * Validate vitest config files for addon compatibility
     *
     * Public method that can be used by both postinstall and create-storybook flows
     */
    validateConfigFiles(directory: string): Promise<Result>;
    /** Validate workspace config file structure */
    private isValidWorkspaceConfigFile;
    /** Validate Vitest config file structure */
    private isValidVitestConfig;
    private isWorkspaceConfigArray;
    private isDefineWorkspaceExpression;
    private isDefineConfigExpression;
    private isMergeConfigExpression;
    private isSafeToExtendWorkspace;
}

export { ANGULAR_JSON_PATH, type AddonVitestCompatibilityOptions, AddonVitestService, AngularJSON, type NpmOptions, ProjectType, SUPPORTED_ESLINT_EXTENSIONS, Settings, _clearGlobalSettings, addToDevDependenciesIfNotPresent, adjustTemplate, cliStoriesTargetPath, coerceSemver, configureEslintPlugin, configureFlatConfig, copyTemplate, copyTemplateFiles, detectPnp, extractEslintInfo, findEslintFile, getBabelDependencies, getRendererDir, getVersionSafe, globalSettings, hasStorybookDependencies, normalizeExtends, readFileAsJson, suggestESLintPlugin, writeFileAsJson };
