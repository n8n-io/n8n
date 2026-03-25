import "ansis";
import { BuildOptions, ExternalOption, InputOption, InputOptions, InternalModuleFormat, MinifyOptions, ModuleFormat, ModuleTypes, OutputAsset, OutputChunk, OutputOptions, Plugin, TreeshakingOptions } from "rolldown";
import { Hookable } from "hookable";
import { Options as DtsOptions } from "rolldown-plugin-dts";
import { CheckPackageOptions } from "@arethetypeswrong/core";
import { StartOptions } from "@vitejs/devtools/cli-commands";
import { PackageJson } from "pkg-types";
import { Options as PublintOptions } from "publint";
import { Options as UnusedOptions } from "unplugin-unused";

//#region src/utils/types.d.ts
type Overwrite<T, U> = Omit<T, keyof U> & U;
type Awaitable<T> = T | Promise<T>;
type MarkPartial<T, K extends keyof T> = Omit<Required<T>, K> & Partial<Pick<T, K>>;
type Arrayable<T> = T | T[];
//#endregion
//#region src/features/attw.d.ts
interface AttwOptions extends CheckPackageOptions {
  /**
  * Profiles select a set of resolution modes to require/ignore. All are evaluated but failures outside
  * of those required are ignored.
  *
  * The available profiles are:
  * - `strict`: requires all resolutions
  * - `node16`: ignores node10 resolution failures
  * - `esmOnly`: ignores CJS resolution failures
  *
  * @default 'strict'
  */
  profile?: "strict" | "node16" | "esmOnly";
  /**
  * The level of the check.
  *
  * The available levels are:
  * - `error`: fails the build
  * - `warn`: warns the build
  *
  * @default 'warn'
  */
  level?: "error" | "warn";
}
//#endregion
//#region src/features/copy.d.ts
interface CopyEntry {
  from: string;
  to: string;
}
type CopyOptions = Arrayable<string | CopyEntry>;
type CopyOptionsFn = (options: ResolvedConfig) => Awaitable<CopyOptions>;
//#endregion
//#region src/features/debug.d.ts
interface DebugOptions extends NonNullable<InputOptions["debug"]> {
  /**
  * **[experimental]** Enable devtools integration. `@vitejs/devtools` must be installed as a dependency.
  *
  * Defaults to true, if `@vitejs/devtools` is installed.
  */
  devtools?: boolean | Partial<StartOptions>;
  /**
  * Clean devtools stale sessions.
  *
  * @default true
  */
  clean?: boolean;
}
//#endregion
//#region src/features/exports.d.ts
type TsdownChunks = Partial<Record<NormalizedFormat, Array<OutputChunk | OutputAsset>>>;
interface ExportsOptions {
  /**
  * Generate exports that link to source code during development.
  * - string: add as a custom condition.
  * - true: all conditions point to source files, and add dist exports to `publishConfig`.
  */
  devExports?: boolean | string;
  /**
  * Exports for all files.
  */
  all?: boolean;
  customExports?: (exports: Record<string, any>, context: {
    pkg: PackageJson;
    chunks: TsdownChunks;
    outDir: string;
    isPublish: boolean;
  }) => Awaitable<Record<string, any>>;
}
//#endregion
//#region src/features/hooks.d.ts
interface BuildContext {
  options: ResolvedConfig;
  hooks: Hookable<TsdownHooks>;
}
interface RolldownContext {
  buildOptions: BuildOptions;
}
/**
* Hooks for tsdown.
*/
interface TsdownHooks {
  /**
  * Invoked before each tsdown build starts.
  * Use this hook to perform setup or preparation tasks.
  */
  "build:prepare": (ctx: BuildContext) => void | Promise<void>;
  /**
  * Invoked before each Rolldown build.
  * For dual-format builds, this hook is called for each format.
  * Useful for configuring or modifying the build context before bundling.
  */
  "build:before": (ctx: BuildContext & RolldownContext) => void | Promise<void>;
  /**
  * Invoked after each tsdown build completes.
  * Use this hook for cleanup or post-processing tasks.
  */
  "build:done": (ctx: BuildContext) => void | Promise<void>;
}
//#endregion
//#region src/utils/package.d.ts
type PackageType = "module" | "commonjs" | undefined;
//#endregion
//#region src/features/output.d.ts
interface OutExtensionContext {
  options: InputOptions;
  format: NormalizedFormat;
  /** "type" field in project's package.json */
  pkgType?: PackageType;
}
interface OutExtensionObject {
  js?: string;
  dts?: string;
}
type OutExtensionFactory = (context: OutExtensionContext) => OutExtensionObject | undefined;
interface ChunkAddonObject {
  js?: string;
  css?: string;
  dts?: string;
}
type ChunkAddonFunction = (ctx: {
  format: Format;
  fileName: string;
}) => ChunkAddonObject | string | undefined;
type ChunkAddon = ChunkAddonObject | ChunkAddonFunction | string;
//#endregion
//#region src/utils/logger.d.ts
type LogType = "error" | "warn" | "info";
type LogLevel = LogType | "silent";
interface Logger {
  level: LogLevel;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  warnOnce: (...args: any[]) => void;
  error: (...args: any[]) => void;
  success: (...args: any[]) => void;
}
declare const globalLogger: Logger;
//#endregion
//#region src/features/report.d.ts
interface ReportOptions {
  /**
  * Enable/disable gzip-compressed size reporting.
  * Compressing large output files can be slow, so disabling this may increase build performance for large projects.
  *
  * @default true
  */
  gzip?: boolean;
  /**
  * Enable/disable brotli-compressed size reporting.
  * Compressing large output files can be slow, so disabling this may increase build performance for large projects.
  *
  * @default false
  */
  brotli?: boolean;
  /**
  * Skip reporting compressed size for files larger than this size.
  * @default 1_000_000 // 1MB
  */
  maxCompressSize?: number;
}
declare function ReportPlugin(userOptions: ReportOptions, logger: Logger, cwd: string, cjsDts?: boolean, name?: string, isMultiFormat?: boolean): Plugin;
//#endregion
//#region src/config/types.d.ts
type Sourcemap = boolean | "inline" | "hidden";
type Format = ModuleFormat;
type NormalizedFormat = InternalModuleFormat;
interface Workspace {
  /**
  * Workspace directories. Glob patterns are supported.
  * - `auto`: Automatically detect `package.json` files in the workspace.
  * @default 'auto'
  */
  include?: Arrayable<string> | "auto";
  /**
  * Exclude directories from workspace.
  * Defaults to all `node_modules`, `dist`, `test`, `tests`, `temp`, and `tmp` directories.
  */
  exclude?: Arrayable<string>;
  /**
  * Path to the workspace configuration file.
  */
  config?: boolean | string;
}
type NoExternalFn = (id: string, importer: string | undefined) => boolean | null | undefined | void;
/**
* Options for tsdown.
*/
interface UserConfig {
  /**
  * Defaults to `'src/index.ts'` if it exists.
  */
  entry?: InputOption;
  external?: ExternalOption;
  noExternal?: Arrayable<string | RegExp> | NoExternalFn;
  /**
  * Bundle only the dependencies listed here; throw an error if any others are missing.
  *
  * Note: Be sure to include all required sub-dependencies as well.
  */
  inlineOnly?: Arrayable<string | RegExp>;
  /**
  * Skip bundling `node_modules`.
  * @default false
  */
  skipNodeModulesBundle?: boolean;
  alias?: Record<string, string>;
  tsconfig?: string | boolean;
  /**
  * Specifies the target runtime platform for the build.
  *
  * - `node`: Node.js and compatible runtimes (e.g., Deno, Bun).
  *   For CJS format, this is always set to `node` and cannot be changed.
  * - `neutral`: A platform-agnostic target with no specific runtime assumptions.
  * - `browser`: Web browsers.
  *
  * @default 'node'
  * @see https://tsdown.dev/options/platform
  */
  platform?: "node" | "neutral" | "browser";
  /**
  * Specifies the compilation target environment(s).
  *
  * Determines the JavaScript version or runtime(s) for which the code should be compiled.
  * If not set, defaults to the value of `engines.node` in your project's `package.json`.
  * If no `engines.node` field exists, no syntax transformations are applied.
  *
  * Accepts a single target (e.g., `'es2020'`, `'node18'`), an array of targets, or `false` to disable all transformations.
  *
  * @see {@link https://tsdown.dev/options/target#supported-targets} for a list of valid targets and more details.
  *
  * @example
  * ```jsonc
  * // Target a single environment
  * { "target": "node18" }
  * ```
  *
  * @example
  * ```jsonc
  * // Target multiple environments
  * { "target": ["node18", "es2020"] }
  * ```
  *
  * @example
  * ```jsonc
  * // Disable all syntax transformations
  * { "target": false }
  * ```
  */
  target?: string | string[] | false;
  /**
  * Compile-time env variables.
  * @example
  * ```json
  * {
  *   "DEBUG": true,
  *   "NODE_ENV": "production"
  * }
  * ```
  */
  env?: Record<string, any>;
  define?: Record<string, string>;
  /** @default false */
  shims?: boolean;
  /**
  * Configure tree shaking options.
  * @see {@link https://rolldown.rs/options/treeshake} for more details.
  * @default true
  */
  treeshake?: boolean | TreeshakingOptions;
  /**
  * Sets how input files are processed.
  * For example, use 'js' to treat files as JavaScript or 'base64' for images.
  * Lets you import or require files like images or fonts.
  * @example
  * ```json
  * { '.jpg': 'asset', '.png': 'base64' }
  * ```
  */
  loader?: ModuleTypes;
  /**
  * If enabled, strips the `node:` protocol prefix from import source.
  *
  * @default false
  * @deprecated Use `nodeProtocol: 'strip'` instead.
  *
  * @example
  * // With removeNodeProtocol enabled:
  * import('node:fs'); // becomes import('fs')
  */
  removeNodeProtocol?: boolean;
  /**
  * - If `true`, add `node:` prefix to built-in modules.
  * - If `'strip'`, strips the `node:` protocol prefix from import source.
  * - If `false`, does not modify the import source.
  *
  * @default false
  *
  * @example
  * // With nodeProtocol enabled:
  * import('fs'); // becomes import('node:fs')
  * // With nodeProtocol set to 'strip':
  * import('node:fs'); // becomes import('fs')
  * // With nodeProtocol set to false:
  * import('node:fs'); // remains import('node:fs')
  *
  */
  nodeProtocol?: "strip" | boolean;
  plugins?: InputOptions["plugins"];
  /**
  * Use with caution; ensure you understand the implications.
  */
  inputOptions?: InputOptions | ((options: InputOptions, format: NormalizedFormat, context: {
    cjsDts: boolean;
  }) => Awaitable<InputOptions | void | null>);
  /** @default ['es'] */
  format?: Format | Format[];
  globalName?: string;
  /** @default 'dist' */
  outDir?: string;
  /**
  * Whether to generate source map files.
  *
  * Note that this option will always be `true` if you have
  * [`declarationMap`](https://www.typescriptlang.org/tsconfig/#declarationMap)
  * option enabled in your `tsconfig.json`.
  *
  * @default false
  */
  sourcemap?: Sourcemap;
  /**
  * Clean directories before build.
  *
  * Default to output directory.
  * @default true
  */
  clean?: boolean | string[];
  /**
  * @default false
  */
  minify?: boolean | "dce-only" | MinifyOptions;
  footer?: ChunkAddon;
  banner?: ChunkAddon;
  /**
  * Determines whether unbundle mode is enabled.
  * When set to true, the output files will mirror the input file structure.
  * @default false
  */
  unbundle?: boolean;
  /**
  * @deprecated Use `unbundle` instead.
  * @default true
  */
  bundle?: boolean;
  /**
  * Use a fixed extension for output files.
  * The extension will always be `.cjs` or `.mjs`.
  * Otherwise, it will depend on the package type.
  *
  * Defaults to `true` if `platform` is set to `node`, `false` otherwise.
  */
  fixedExtension?: boolean;
  /**
  * Custom extensions for output files.
  * `fixedExtension` will be overridden by this option.
  */
  outExtensions?: OutExtensionFactory;
  /**
  * If enabled, appends hash to chunk filenames.
  * @default true
  */
  hash?: boolean;
  /**
  * @default true
  */
  cjsDefault?: boolean;
  /**
  * Use with caution; ensure you understand the implications.
  */
  outputOptions?: OutputOptions | ((options: OutputOptions, format: NormalizedFormat, context: {
    cjsDts: boolean;
  }) => Awaitable<OutputOptions | void | null>);
  /**
  * The working directory of the config file.
  * - Defaults to `process.cwd()` for root config.
  * - Defaults to the package directory for workspace config.
  */
  cwd?: string;
  /**
  * The name to show in CLI output. This is useful for monorepos or workspaces.
  * When using workspace mode, this option defaults to the package name from package.json.
  * In non-workspace mode, this option must be set explicitly for the name to show in the CLI output.
  */
  name?: string;
  /**
  * @default false
  * @deprecated Use `logLevel` instead.
  */
  silent?: boolean;
  /**
  * Log level.
  * @default 'info'
  */
  logLevel?: LogLevel;
  /**
  * If true, fails the build on warnings.
  * @default false
  */
  failOnWarn?: boolean;
  /**
  * Custom logger.
  */
  customLogger?: Logger;
  /**
  * Reuse config from Vite or Vitest (experimental)
  * @default false
  */
  fromVite?: boolean | "vitest";
  /**
  * @default false
  */
  watch?: boolean | Arrayable<string>;
  ignoreWatch?: Arrayable<string | RegExp>;
  /**
  * You can specify command to be executed after a successful build, specially useful for Watch mode
  */
  onSuccess?: string | ((config: ResolvedConfig, signal: AbortSignal) => void | Promise<void>);
  /**
  * **[experimental]** Enable debug mode.
  *
  * Both debug mode and Vite DevTools are still under development, and this is for early testers only.
  *
  * This may slow down the build process significantly.
  *
  * @default false
  */
  debug?: boolean | DebugOptions;
  /**
  * Enables generation of TypeScript declaration files (`.d.ts`).
  *
  * By default, this option is auto-detected based on your project's `package.json`:
  * - If the `types` field is present, or if the main `exports` contains a `types` entry, declaration file generation is enabled by default.
  * - Otherwise, declaration file generation is disabled by default.
  */
  dts?: boolean | DtsOptions;
  /**
  * Enable unused dependencies check with `unplugin-unused`
  * Requires `unplugin-unused` to be installed.
  * @default false
  */
  unused?: boolean | UnusedOptions;
  /**
  * Run publint after bundling.
  * Requires `publint` to be installed.
  * @default false
  */
  publint?: boolean | PublintOptions;
  /**
  * Run `arethetypeswrong` after bundling.
  * Requires `@arethetypeswrong/core` to be installed.
  *
  * @default false
  * @see https://github.com/arethetypeswrong/arethetypeswrong.github.io
  */
  attw?: boolean | AttwOptions;
  /**
  * Enable size reporting after bundling.
  * @default true
  */
  report?: boolean | ReportOptions;
  /**
  * `import.meta.glob` support.
  * @see https://vite.dev/guide/features.html#glob-import
  * @default true
  */
  globImport?: boolean;
  /**
  * **[experimental]** Generate package exports for `package.json`.
  *
  * This will set the `main`, `module`, `types`, `exports` fields in `package.json`
  * to point to the generated files.
  */
  exports?: boolean | ExportsOptions;
  /**
  * @deprecated Alias for `copy`, will be removed in the future.
  */
  publicDir?: CopyOptions | CopyOptionsFn;
  /**
  * Copy files to another directory.
  * @example
  * ```ts
  * [
  *   'src/assets',
  *   { from: 'src/assets', to: 'dist/assets' },
  * ]
  * ```
  */
  copy?: CopyOptions | CopyOptionsFn;
  hooks?: Partial<TsdownHooks> | ((hooks: Hookable<TsdownHooks>) => Awaitable<void>);
  /**
  * **[experimental]** Enable workspace mode.
  * This allows you to build multiple packages in a monorepo.
  */
  workspace?: Workspace | Arrayable<string> | true;
}
interface InlineConfig extends UserConfig {
  /**
  * Config file path
  */
  config?: boolean | string;
  /**
  * Config loader to use. It can only be set via CLI or API.
  * @default 'auto'
  */
  configLoader?: "auto" | "native" | "unconfig" | "unrun";
  /**
  * Filter workspace packages. This option is only available in workspace mode.
  */
  filter?: RegExp | string | string[];
}
type UserConfigFn = (inlineConfig: InlineConfig) => Awaitable<Arrayable<UserConfig>>;
type UserConfigExport = Awaitable<Arrayable<UserConfig> | UserConfigFn>;
type ResolvedConfig = Overwrite<MarkPartial<Omit<UserConfig, "workspace" | "fromVite" | "publicDir" | "silent" | "bundle" | "removeNodeProtocol" | "logLevel" | "failOnWarn" | "customLogger">, "globalName" | "inputOptions" | "outputOptions" | "minify" | "define" | "alias" | "external" | "onSuccess" | "outExtensions" | "hooks" | "copy" | "loader" | "name" | "banner" | "footer">, {
  format: NormalizedFormat[];
  target?: string[];
  clean: string[];
  dts: false | DtsOptions;
  report: false | ReportOptions;
  tsconfig: false | string;
  pkg?: PackageJson;
  exports: false | ExportsOptions;
  nodeProtocol: "strip" | boolean;
  logger: Logger;
  ignoreWatch: Array<string | RegExp>;
  noExternal?: NoExternalFn;
  inlineOnly?: Array<string | RegExp>;
  debug: false | DebugOptions;
}>;
//#endregion
export { TsdownChunks as A, OutExtensionFactory as C, RolldownContext as D, BuildContext as E, AttwOptions as F, CopyEntry as M, CopyOptions as N, TsdownHooks as O, CopyOptionsFn as P, OutExtensionContext as S, PackageType as T, Logger as _, NormalizedFormat as a, ChunkAddonFunction as b, Sourcemap as c, UserConfig as d, UserConfigExport as f, ReportPlugin as g, ReportOptions as h, NoExternalFn as i, DebugOptions as j, ExportsOptions as k, TreeshakingOptions as l, Workspace as m, Format as n, PublintOptions as o, UserConfigFn as p, InlineConfig as r, ResolvedConfig as s, DtsOptions as t, UnusedOptions as u, globalLogger as v, OutExtensionObject as w, ChunkAddonObject as x, ChunkAddon as y };