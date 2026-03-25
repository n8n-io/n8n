import { Assumptions } from "./assumptions";
export interface Plugin {
    (module: Program): Program;
}
export type ParseOptions = ParserConfig & {
    comments?: boolean;
    script?: boolean;
    /**
     * Defaults to es3.
     */
    target?: JscTarget;
};
export type TerserEcmaVersion = 5 | 2015 | 2016 | string | number;
export interface JsMinifyOptions {
    compress?: TerserCompressOptions | boolean;
    format?: JsFormatOptions & ToSnakeCaseProperties<JsFormatOptions>;
    mangle?: TerserMangleOptions | boolean;
    ecma?: TerserEcmaVersion;
    keep_classnames?: boolean;
    keep_fnames?: boolean;
    module?: boolean | "unknown";
    safari10?: boolean;
    toplevel?: boolean;
    sourceMap?: boolean;
    outputPath?: string;
    inlineSourcesContent?: boolean;
}
/**
 * @example ToSnakeCase<'indentLevel'> == 'indent_level'
 */
type ToSnakeCase<T extends string> = T extends `${infer A}${infer B}` ? `${A extends Lowercase<A> ? A : `_${Lowercase<A>}`}${ToSnakeCase<B>}` : T;
/**
 * @example ToSnakeCaseProperties<{indentLevel: 3}> == {indent_level: 3}
 */
type ToSnakeCaseProperties<T> = {
    [K in keyof T as K extends string ? ToSnakeCase<K> : K]: T[K];
};
/**
 * These properties are mostly not implemented yet,
 * but it exists to support passing terser config to swc minify
 * without modification.
 */
export interface JsFormatOptions {
    /**
     * Currently noop.
     * @default false
     * @alias ascii_only
     */
    asciiOnly?: boolean;
    /**
     * Currently noop.
     * @default false
     */
    beautify?: boolean;
    /**
     * Currently noop.
     * @default false
     */
    braces?: boolean;
    /**
     * - `false`: removes all comments
     * - `'some'`: preserves some comments
     * - `'all'`: preserves all comments
     * - `{ regex: string }`: preserves comments that match the regex
     * @default false
     */
    comments?: false | "some" | "all" | {
        regex: string;
    };
    /**
     * Currently noop.
     * @default 5
     */
    ecma?: TerserEcmaVersion;
    /**
     * Currently noop.
     * @alias indent_level
     */
    indentLevel?: number;
    /**
     * Currently noop.
     * @alias indent_start
     */
    indentStart?: number;
    /**
     * Currently noop.
     * @alias inline_script
     */
    inlineScript?: boolean;
    /**
     * Currently noop.
     * @alias keep_numbers
     */
    keepNumbers?: number;
    /**
     * Currently noop.
     * @alias keep_quoted_props
     */
    keepQuotedProps?: boolean;
    /**
     * Currently noop.
     * @alias max_line_len
     */
    maxLineLen?: number | false;
    /**
     * Currently noop.
     */
    preamble?: string;
    /**
     * Currently noop.
     * @alias quote_keys
     */
    quoteKeys?: boolean;
    /**
     * Currently noop.
     * @alias quote_style
     */
    quoteStyle?: boolean;
    /**
     * Currently noop.
     * @alias preserve_annotations
     */
    preserveAnnotations?: boolean;
    /**
     * Currently noop.
     */
    safari10?: boolean;
    /**
     * Currently noop.
     */
    semicolons?: boolean;
    /**
     * Currently noop.
     */
    shebang?: boolean;
    /**
     * Currently noop.
     */
    webkit?: boolean;
    /**
     * Currently noop.
     * @alias wrap_iife
     */
    wrapIife?: boolean;
    /**
     * Currently noop.
     * @alias wrap_func_args
     */
    wrapFuncArgs?: boolean;
}
export interface TerserCompressOptions {
    arguments?: boolean;
    arrows?: boolean;
    booleans?: boolean;
    booleans_as_integers?: boolean;
    collapse_vars?: boolean;
    comparisons?: boolean;
    computed_props?: boolean;
    conditionals?: boolean;
    dead_code?: boolean;
    defaults?: boolean;
    directives?: boolean;
    drop_console?: boolean;
    drop_debugger?: boolean;
    ecma?: TerserEcmaVersion;
    evaluate?: boolean;
    expression?: boolean;
    global_defs?: any;
    hoist_funs?: boolean;
    hoist_props?: boolean;
    hoist_vars?: boolean;
    ie8?: boolean;
    if_return?: boolean;
    inline?: 0 | 1 | 2 | 3;
    join_vars?: boolean;
    keep_classnames?: boolean;
    keep_fargs?: boolean;
    keep_fnames?: boolean;
    keep_infinity?: boolean;
    loops?: boolean;
    negate_iife?: boolean;
    passes?: number;
    properties?: boolean;
    pure_getters?: any;
    pure_funcs?: string[];
    reduce_funcs?: boolean;
    reduce_vars?: boolean;
    sequences?: any;
    side_effects?: boolean;
    switches?: boolean;
    top_retain?: any;
    toplevel?: any;
    typeofs?: boolean;
    unsafe?: boolean;
    unsafe_passes?: boolean;
    unsafe_arrows?: boolean;
    unsafe_comps?: boolean;
    unsafe_function?: boolean;
    unsafe_math?: boolean;
    unsafe_symbols?: boolean;
    unsafe_methods?: boolean;
    unsafe_proto?: boolean;
    unsafe_regexp?: boolean;
    unsafe_undefined?: boolean;
    unused?: boolean;
    const_to_let?: boolean;
    module?: boolean;
}
export interface TerserMangleOptions {
    props?: TerserManglePropertiesOptions;
    /**
     * Pass `true` to mangle names declared in the top level scope.
     */
    topLevel?: boolean;
    /**
     * @deprecated An alias for compatibility with terser.
     */
    toplevel?: boolean;
    /**
     * Pass `true` to not mangle class names.
     */
    keepClassNames?: boolean;
    /**
     * @deprecated An alias for compatibility with terser.
     */
    keep_classnames?: boolean;
    /**
     * Pass `true` to not mangle function names.
     */
    keepFnNames?: boolean;
    /**
     * @deprecated An alias for compatibility with terser.
     */
    keep_fnames?: boolean;
    /**
     * Pass `true` to not mangle private props.
     */
    keepPrivateProps?: boolean;
    /**
     * @deprecated An alias for compatibility with terser.
     */
    keep_private_props?: boolean;
    ie8?: boolean;
    safari10?: boolean;
    reserved?: string[];
}
export interface TerserManglePropertiesOptions {
}
/**
 * Programmatic options.
 */
export interface Options extends Config {
    /**
     * If true, a file is parsed as a script instead of module.
     */
    script?: boolean;
    /**
     * The working directory that all paths in the programmatic
     * options will be resolved relative to.
     *
     * Defaults to `process.cwd()`.
     */
    cwd?: string;
    caller?: CallerOptions;
    /** The filename associated with the code currently being compiled,
     * if there is one. The filename is optional, but not all of Swc's
     * functionality is available when the filename is unknown, because a
     * subset of options rely on the filename for their functionality.
     *
     * The three primary cases users could run into are:
     *
     * - The filename is exposed to plugins. Some plugins may require the
     * presence of the filename.
     * - Options like "test", "exclude", and "ignore" require the filename
     * for string/RegExp matching.
     * - .swcrc files are loaded relative to the file being compiled.
     * If this option is omitted, Swc will behave as if swcrc: false has been set.
     */
    filename?: string;
    /**
     * The initial path that will be processed based on the "rootMode" to
     * determine the conceptual root folder for the current Swc project.
     * This is used in two primary cases:
     *
     * - The base directory when checking for the default "configFile" value
     * - The default value for "swcrcRoots".
     *
     * Defaults to `opts.cwd`
     */
    root?: string;
    /**
     * This option, combined with the "root" value, defines how Swc chooses
     * its project root. The different modes define different ways that Swc
     * can process the "root" value to get the final project root.
     *
     * "root" - Passes the "root" value through as unchanged.
     * "upward" - Walks upward from the "root" directory, looking for a directory
     * containing a swc.config.js file, and throws an error if a swc.config.js
     * is not found.
     * "upward-optional" - Walk upward from the "root" directory, looking for
     * a directory containing a swc.config.js file, and falls back to "root"
     *  if a swc.config.js is not found.
     *
     *
     * "root" is the default mode because it avoids the risk that Swc
     * will accidentally load a swc.config.js that is entirely outside
     * of the current project folder. If you use "upward-optional",
     * be aware that it will walk up the directory structure all the
     * way to the filesystem root, and it is always possible that someone
     * will have a forgotten swc.config.js in their home directory,
     * which could cause unexpected errors in your builds.
     *
     *
     * Users with monorepo project structures that run builds/tests on a
     * per-package basis may well want to use "upward" since monorepos
     * often have a swc.config.js in the project root. Running Swc
     * in a monorepo subdirectory without "upward", will cause Swc
     * to skip loading any swc.config.js files in the project root,
     * which can lead to unexpected errors and compilation failure.
     */
    rootMode?: "root" | "upward" | "upward-optional";
    /**
     * The current active environment used during configuration loading.
     * This value is used as the key when resolving "env" configs,
     * and is also available inside configuration functions, plugins,
     * and presets, via the api.env() function.
     *
     * Defaults to `process.env.SWC_ENV || process.env.NODE_ENV || "development"`
     */
    envName?: string;
    /**
     * Defaults to searching for a default `.swcrc` file, but can
     * be passed the path of any JS or JSON5 config file.
     *
     *
     * NOTE: This option does not affect loading of .swcrc files,
     * so while it may be tempting to do configFile: "./foo/.swcrc",
     * it is not recommended. If the given .swcrc is loaded via the
     * standard file-relative logic, you'll end up loading the same
     * config file twice, merging it with itself. If you are linking
     * a specific config file, it is recommended to stick with a
     * naming scheme that is independent of the "swcrc" name.
     *
     * Defaults to `path.resolve(opts.root, ".swcrc")`
     */
    configFile?: string | boolean;
    /**
     * true will enable searching for configuration files relative to the "filename" provided to Swc.
     *
     * A swcrc value passed in the programmatic options will override one set within a configuration file.
     *
     * Note: .swcrc files are only loaded if the current "filename" is inside of
     *  a package that matches one of the "swcrcRoots" packages.
     *
     *
     * Defaults to true as long as the filename option has been specified
     */
    swcrc?: boolean;
    /**
     * By default, Babel will only search for .babelrc files within the "root" package
     *  because otherwise Babel cannot know if a given .babelrc is meant to be loaded,
     *  or if it's "plugins" and "presets" have even been installed, since the file
     *  being compiled could be inside node_modules, or have been symlinked into the project.
     *
     *
     * This option allows users to provide a list of other packages that should be
     * considered "root" packages when considering whether to load .babelrc files.
     *
     *
     * For example, a monorepo setup that wishes to allow individual packages
     * to have their own configs might want to do
     *
     *
     *
     * Defaults to `opts.root`
     */
    swcrcRoots?: boolean | MatchPattern | MatchPattern[];
    /**
     * `true` will attempt to load an input sourcemap from the file itself, if it
     * contains a //# sourceMappingURL=... comment. If no map is found, or the
     * map fails to load and parse, it will be silently discarded.
     *
     *  If an object is provided, it will be treated as the source map object itself.
     *
     * Defaults to `true`.
     */
    inputSourceMap?: boolean | string;
    /**
     * The name to use for the file inside the source map object.
     *
     * Defaults to `path.basename(opts.filenameRelative)` when available, or `"unknown"`.
     */
    sourceFileName?: string;
    /**
     * The sourceRoot fields to set in the generated source map, if one is desired.
     */
    sourceRoot?: string;
    plugin?: Plugin;
    isModule?: boolean | "unknown" | "commonjs";
    /**
     * Destination path. Note that this value is used only to fix source path
     * of source map files and swc does not write output to this path.
     */
    outputPath?: string;
}
export interface CallerOptions {
    name: string;
    [key: string]: any;
}
export type Swcrc = Config | Config[];
/**
 * .swcrc
 */
export interface Config {
    /**
     * Note: The type is string because it follows rust's regex syntax.
     */
    test?: string | string[];
    /**
     * Note: The type is string because it follows rust's regex syntax.
     */
    exclude?: string | string[];
    env?: EnvConfig;
    jsc?: JscConfig;
    module?: ModuleConfig;
    minify?: boolean;
    /**
     * - true to generate a sourcemap for the code and include it in the result object.
     * - "inline" to generate a sourcemap and append it as a data URL to the end of the code, but not include it in the result object.
     *
     * `swc-cli` overloads some of these to also affect how maps are written to disk:
     *
     * - true will write the map to a .map file on disk
     * - "inline" will write the file directly, so it will have a data: containing the map
     * - Note: These options are bit weird, so it may make the most sense to just use true
     *  and handle the rest in your own code, depending on your use case.
     */
    sourceMaps?: boolean | "inline";
    inlineSourcesContent?: boolean;
}
/**
 * Configuration ported from babel-preset-env
 */
export interface EnvConfig {
    mode?: "usage" | "entry";
    debug?: boolean;
    dynamicImport?: boolean;
    loose?: boolean;
    /**
     * Transpiles the broken syntax to the closest non-broken modern syntax
     *
     * Defaults to false.
     */
    bugfixes?: boolean;
    skip?: string[];
    include?: string[];
    exclude?: string[];
    /**
     * The version of the used core js.
     *
     */
    coreJs?: string;
    targets?: any;
    path?: string;
    shippedProposals?: boolean;
    /**
     * Enable all transforms
     */
    forceAllTransforms?: boolean;
}
export interface JscConfig {
    assumptions?: Assumptions;
    loose?: boolean;
    /**
     * Defaults to EsParserConfig
     */
    parser?: ParserConfig;
    transform?: TransformConfig;
    /**
     * Use `@swc/helpers` instead of inline helpers.
     */
    externalHelpers?: boolean;
    /**
     * Defaults to `es3` (which enabled **all** pass).
     */
    target?: JscTarget;
    /**
     * Keep class names.
     */
    keepClassNames?: boolean;
    /**
     * This is experimental, and can be removed without a major version bump.
     */
    experimental?: {
        optimizeHygiene?: boolean;
        /**
         * Preserve `with` in imports and exports.
         *
         * @deprecated Use `keepImportAssertions` instead.
         */
        keepImportAttributes?: boolean;
        /**
         * Use `assert` instead of `with` for imports and exports.
         * This option only works when `keepImportAttributes` is `true`.
         */
        emitAssertForImportAttributes?: boolean;
        /**
         * Specify the location where SWC stores its intermediate cache files.
         * Currently only transform plugin uses this. If not specified, SWC will
         * create `.swc` directories.
         */
        cacheRoot?: string;
        /**
         * List of custom transform plugins written in WebAssembly.
         * First parameter of tuple indicates the name of the plugin - it can be either
         * a name of the npm package can be resolved, or absolute path to .wasm binary.
         *
         * Second parameter of tuple is JSON based configuration for the plugin.
         */
        plugins?: WasmPlugin[];
        /**
         * Run Wasm plugins before stripping TypeScript or decorators.
         *
         * See https://github.com/swc-project/swc/issues/9132 for more details.
         */
        runPluginFirst?: boolean;
        /**
         * Disable builtin transforms. If enabled, only Wasm plugins are used.
         */
        disableBuiltinTransformsForInternalTesting?: boolean;
        /**
         * Emit isolated dts files for each module.
         */
        emitIsolatedDts?: boolean;
        /**
         * Disable all lint rules.
         */
        disableAllLints?: boolean;
        /**
         * Keep import assertions.
         */
        keepImportAssertions?: boolean;
    };
    baseUrl?: string;
    paths?: {
        [from: string]: string[];
    };
    minify?: JsMinifyOptions;
    preserveAllComments?: boolean;
    output?: {
        /**
         * This can be used to keep the output ascii-only.
         * If this option is set, `minify.format.asciiOnly` will be ignored.
         * @default 'utf8'
         */
        charset?: 'utf8' | 'ascii';
    };
}
export type JscTarget = "es3" | "es5" | "es2015" | "es2016" | "es2017" | "es2018" | "es2019" | "es2020" | "es2021" | "es2022" | "es2023" | "es2024" | "esnext";
export type ParserConfig = TsParserConfig | EsParserConfig;
export interface TsParserConfig {
    syntax: "typescript";
    /**
     * Defaults to `false`.
     */
    tsx?: boolean;
    /**
     * Defaults to `false`.
     */
    decorators?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    dynamicImport?: boolean;
}
export interface EsParserConfig {
    syntax: "ecmascript";
    /**
     * Defaults to false.
     */
    jsx?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    numericSeparator?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    classPrivateProperty?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    privateMethod?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    classProperty?: boolean;
    /**
     * Defaults to `false`
     */
    functionBind?: boolean;
    /**
     * Defaults to `false`
     */
    decorators?: boolean;
    /**
     * Defaults to `false`
     */
    decoratorsBeforeExport?: boolean;
    /**
     * Defaults to `false`
     */
    exportDefaultFrom?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    exportNamespaceFrom?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    dynamicImport?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    nullishCoalescing?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    optionalChaining?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    importMeta?: boolean;
    /**
     * @deprecated Always true because it's in ecmascript spec.
     */
    topLevelAwait?: boolean;
    /**
     * @deprecated An alias of `importAttributes`
     */
    importAssertions?: boolean;
    /**
     * @deprecated Always true in swc
     */
    importAttributes?: boolean;
    /**
     * Defaults to `false`
     */
    allowSuperOutsideMethod?: boolean;
    /**
     * Defaults to `false`
     */
    allowReturnOutsideFunction?: boolean;
    /**
     * Defaults to `false`
     */
    autoAccessors?: boolean;
    /**
     * Defaults to `false`
     */
    explicitResourceManagement?: boolean;
}
/**
 * Options for transform.
 */
export interface TransformConfig {
    /**
     * Effective only if `syntax` supports ƒ.
     */
    react?: ReactConfig;
    constModules?: ConstModulesConfig;
    /**
     * Defaults to null, which skips optimizer pass.
     */
    optimizer?: OptimizerConfig;
    /**
     * https://swc.rs/docs/configuration/compilation#jsctransformlegacydecorator
     */
    legacyDecorator?: boolean;
    /**
     * https://swc.rs/docs/configuration/compilation#jsctransformdecoratormetadata
     */
    decoratorMetadata?: boolean;
    /**
     * https://swc.rs/docs/configuration/compilation#jsctransformdecoratorversion
     */
    decoratorVersion?: "2021-12" | "2022-03";
    treatConstEnumAsEnum?: boolean;
    /**
     * https://www.typescriptlang.org/tsconfig#useDefineForClassFields
     */
    useDefineForClassFields?: boolean;
    /**
     * https://www.typescriptlang.org/tsconfig#verbatimModuleSyntax
     */
    verbatimModuleSyntax?: boolean;
    tsEnumIsMutable?: boolean;
}
export interface ReactConfig {
    /**
     * Replace the function used when compiling JSX expressions.
     *
     * Defaults to `React.createElement`.
     */
    pragma?: string;
    /**
     * Replace the component used when compiling JSX fragments.
     *
     * Defaults to `React.Fragment`
     */
    pragmaFrag?: string;
    /**
     * Toggles whether or not to throw an error if a XML namespaced tag name is used. For example:
     * `<f:image />`
     *
     * Though the JSX spec allows this, it is disabled by default since React's
     * JSX does not currently have support for it.
     *
     */
    throwIfNamespace?: boolean;
    /**
     * Toggles plugins that aid in development, such as @swc/plugin-transform-react-jsx-self
     * and @swc/plugin-transform-react-jsx-source.
     *
     * Defaults to `false`,
     *
     */
    development?: boolean;
    /**
     * Use `Object.assign()` instead of `_extends`. Defaults to false.
     * @deprecated
     */
    useBuiltins?: boolean;
    /**
     * Enable fast refresh feature for React app
     */
    refresh?: boolean | {
        /**
         * Identifier for the `react-refresh` register function.
         *
         * Defaults to `$RefreshReg$`
         */
        refreshReg?: string;
        /**
         * Identifier for the `react-refresh` signature function.
         *
         * Defaults to `$RefreshSig$`
         */
        refreshSig?: string;
        /**
         * Flag to emit full signatures.
         *
         * Defaults to `false`
         */
        emitFullSignatures?: boolean;
    };
    /**
     * Decides which runtime to use when transforming JSX.
     * - `"automatic"` - Automatically imports the functions that JSX transpiles to.
     * This is the modern approach introduced in React 17+ that eliminates the need to
     * manually import React in every file that uses JSX.
     * - `"classic"` - Uses the traditional JSX transform that relies on `React.createElement`
     * calls. Requires React to be in scope, which was the standard behavior before React 17.
     * - `"preserve"` - Leaves JSX syntax unchanged without transforming it.
     * @default "classic"
     */
    runtime?: "automatic" | "classic" | "preserve";
    /**
     * Declares the module specifier to be used for importing the `jsx` and `jsxs` factory
     * functions when using `runtime` 'automatic'
     * @default "react"
     */
    importSource?: string;
}
/**
 *  - `import { DEBUG } from '@ember/env-flags';`
 *  - `import { FEATURE_A, FEATURE_B } from '@ember/features';`
 *
 * See: https://github.com/swc-project/swc/issues/18#issuecomment-466272558
 */
export interface ConstModulesConfig {
    globals?: {
        [module: string]: {
            [name: string]: string;
        };
    };
}
export interface OptimizerConfig {
    simplify?: boolean;
    globals?: GlobalPassOption;
    jsonify?: {
        minCost: number;
    };
}
/**
 * Options for inline-global pass.
 */
export interface GlobalPassOption {
    /**
     * Global variables that should be inlined with passed value.
     *
     * e.g. `{ __DEBUG__: true }`
     */
    vars?: Record<string, string>;
    /**
     * Names of environment variables that should be inlined with the value of corresponding env during build.
     *
     * Defaults to `["NODE_ENV", "SWC_ENV"]`
     */
    envs?: string[] | Record<string, string>;
    /**
     * Replaces typeof calls for passed variables with corresponding value
     *
     * e.g. `{ window: 'object' }`
     */
    typeofs?: Record<string, string>;
}
export type ModuleConfig = Es6Config | CommonJsConfig | UmdConfig | AmdConfig | NodeNextConfig | SystemjsConfig;
export interface BaseModuleConfig {
    /**
     * By default, when using exports with babel a non-enumerable `__esModule`
     * property is exported. In some cases this property is used to determine
     * if the import is the default export or if it contains the default export.
     *
     * In order to prevent the __esModule property from being exported, you
     *  can set the strict option to true.
     *
     * Defaults to `false`.
     */
    strict?: boolean;
    /**
     * Emits 'use strict' directive.
     *
     * Defaults to `true`.
     */
    strictMode?: boolean;
    /**
     * Changes Babel's compiled import statements to be lazily evaluated when their imported bindings are used for the first time.
     *
     * This can improve initial load time of your module because evaluating dependencies up
     *  front is sometimes entirely un-necessary. This is especially the case when implementing
     *  a library module.
     *
     *
     * The value of `lazy` has a few possible effects:
     *
     *  - `false` - No lazy initialization of any imported module.
     *  - `true` - Do not lazy-initialize local `./foo` imports, but lazy-init `foo` dependencies.
     *
     * Local paths are much more likely to have circular dependencies, which may break if loaded lazily,
     * so they are not lazy by default, whereas dependencies between independent modules are rarely cyclical.
     *
     *  - `Array<string>` - Lazy-initialize all imports with source matching one of the given strings.
     *
     * -----
     *
     * The two cases where imports can never be lazy are:
     *
     *  - `import "foo";`
     *
     * Side-effect imports are automatically non-lazy since their very existence means
     *  that there is no binding to later kick off initialization.
     *
     *  - `export * from "foo"`
     *
     * Re-exporting all names requires up-front execution because otherwise there is no
     * way to know what names need to be exported.
     *
     * Defaults to `false`.
     */
    lazy?: boolean | string[];
    /**
     * @deprecated  Use the `importInterop` option instead.
     *
     * By default, when using exports with swc a non-enumerable __esModule property is exported.
     * This property is then used to determine if the import is the default export or if
     *  it contains the default export.
     *
     * In cases where the auto-unwrapping of default is not needed, you can set the noInterop option
     *  to true to avoid the usage of the interopRequireDefault helper (shown in inline form above).
     *
     * Defaults to `false`.
     */
    noInterop?: boolean;
    /**
     * Defaults to `swc`.
     *
     * CommonJS modules and ECMAScript modules are not fully compatible.
     * However, compilers, bundlers and JavaScript runtimes developed different strategies
     * to make them work together as well as possible.
     *
     * - `swc` (alias: `babel`)
     *
     * When using exports with `swc` a non-enumerable `__esModule` property is exported
     * This property is then used to determine if the import is the default export
     * or if it contains the default export.
     *
     * ```javascript
     * import foo from "foo";
     * import { bar } from "bar";
     * foo;
     * bar;
     *
     * // Is compiled to ...
     *
     * "use strict";
     *
     * function _interop_require_default(obj) {
     *   return obj && obj.__esModule ? obj : { default: obj };
     * }
     *
     * var _foo = _interop_require_default(require("foo"));
     * var _bar = require("bar");
     *
     * _foo.default;
     * _bar.bar;
     * ```
     *
     * When this import interop is used, if both the imported and the importer module are compiled
     * with swc they behave as if none of them was compiled.
     *
     * This is the default behavior.
     *
     * - `node`
     *
     * When importing CommonJS files (either directly written in CommonJS, or generated with a compiler)
     * Node.js always binds the `default` export to the value of `module.exports`.
     *
     * ```javascript
     * import foo from "foo";
     * import { bar } from "bar";
     * foo;
     * bar;
     *
     * // Is compiled to ...
     *
     * "use strict";
     *
     * var _foo = require("foo");
     * var _bar = require("bar");
     *
     * _foo;
     * _bar.bar;
     * ```
     * This is not exactly the same as what Node.js does since swc allows accessing any property of `module.exports`
     * as a named export, while Node.js only allows importing statically analyzable properties of `module.exports`.
     * However, any import working in Node.js will also work when compiled with swc using `importInterop: "node"`.
     *
     * - `none`
     *
     * If you know that the imported file has been transformed with a compiler that stores the `default` export on
     * `exports.default` (such as swc or Babel), you can safely omit the `_interop_require_default` helper.
     *
     * ```javascript
     * import foo from "foo";
     * import { bar } from "bar";
     * foo;
     * bar;
     *
     * // Is compiled to ...
     *
     * "use strict";
     *
     * var _foo = require("foo");
     * var _bar = require("bar");
     *
     * _foo.default;
     * _bar.bar;
     * ```
     */
    importInterop?: "swc" | "babel" | "node" | "none";
    /**
     * Output extension for generated files.
     *
     * Defaults to `js`.
     */
    outFileExtension?: "js" | "mjs" | "cjs";
    /**
     * Emits `cjs-module-lexer` annotation
     * `cjs-module-lexer` is used in Node.js core for detecting the named exports available when importing a CJS module into ESM.
     * swc will emit `cjs-module-lexer` detectable annotation with this option enabled.
     *
     * Defaults to `true` if import_interop is Node, else `false`
     */
    exportInteropAnnotation?: boolean;
    /**
     * If set to true, dynamic imports will be preserved.
     */
    ignoreDynamic?: boolean;
    allowTopLevelThis?: boolean;
    preserveImportMeta?: boolean;
    /**
     * If set to true, This will resolve top .mjs
     */
    resolveFully?: boolean;
}
export interface Es6Config extends BaseModuleConfig {
    type: "es6";
}
export interface NodeNextConfig extends BaseModuleConfig {
    type: "nodenext";
}
export interface CommonJsConfig extends BaseModuleConfig {
    type: "commonjs";
}
export interface UmdConfig extends BaseModuleConfig {
    type: "umd";
    globals?: {
        [key: string]: string;
    };
}
export interface AmdConfig extends BaseModuleConfig {
    type: "amd";
    moduleId?: string;
}
export interface SystemjsConfig {
    type: "systemjs";
    allowTopLevelThis?: boolean;
}
export interface Output {
    /**
     * Transformed code
     */
    code: string;
    /**
     * Sourcemap (**not** base64 encoded)
     */
    map?: string;
}
export interface MatchPattern {
}
export interface Span {
    start: number;
    end: number;
    ctxt: number;
}
export interface Node {
    type: string;
}
export interface HasSpan {
    span: Span;
}
export interface HasDecorator {
    decorators?: Decorator[];
}
export interface Class extends HasSpan, HasDecorator {
    body: ClassMember[];
    superClass?: Expression;
    isAbstract: boolean;
    typeParams?: TsTypeParameterDeclaration;
    superTypeParams?: TsTypeParameterInstantiation;
    implements: TsExpressionWithTypeArguments[];
}
export type ClassMember = Constructor | ClassMethod | PrivateMethod | ClassProperty | PrivateProperty | TsIndexSignature | EmptyStatement | StaticBlock;
export interface ClassPropertyBase extends Node, HasSpan, HasDecorator {
    value?: Expression;
    typeAnnotation?: TsTypeAnnotation;
    isStatic: boolean;
    accessibility?: Accessibility;
    isOptional: boolean;
    isOverride: boolean;
    readonly: boolean;
    definite: boolean;
}
export interface ClassProperty extends ClassPropertyBase {
    type: "ClassProperty";
    key: PropertyName;
    isAbstract: boolean;
    declare: boolean;
}
export interface PrivateProperty extends ClassPropertyBase {
    type: "PrivateProperty";
    key: PrivateName;
}
export interface Param extends Node, HasSpan, HasDecorator {
    type: "Parameter";
    pat: Pattern;
}
export interface Constructor extends Node, HasSpan {
    type: "Constructor";
    key: PropertyName;
    params: (TsParameterProperty | Param)[];
    body?: BlockStatement;
    accessibility?: Accessibility;
    isOptional: boolean;
}
export interface ClassMethodBase extends Node, HasSpan {
    function: Fn;
    kind: MethodKind;
    isStatic: boolean;
    accessibility?: Accessibility;
    isAbstract: boolean;
    isOptional: boolean;
    isOverride: boolean;
}
export interface ClassMethod extends ClassMethodBase {
    type: "ClassMethod";
    key: PropertyName;
}
export interface PrivateMethod extends ClassMethodBase {
    type: "PrivateMethod";
    key: PrivateName;
}
export interface StaticBlock extends Node, HasSpan {
    type: "StaticBlock";
    body: BlockStatement;
}
export interface Decorator extends Node, HasSpan {
    type: "Decorator";
    expression: Expression;
}
export type MethodKind = "method" | "getter" | "setter";
export type Declaration = ClassDeclaration | FunctionDeclaration | VariableDeclaration | TsInterfaceDeclaration | TsTypeAliasDeclaration | TsEnumDeclaration | TsModuleDeclaration;
export interface FunctionDeclaration extends Fn {
    type: "FunctionDeclaration";
    identifier: Identifier;
    declare: boolean;
}
export interface ClassDeclaration extends Class, Node {
    type: "ClassDeclaration";
    identifier: Identifier;
    declare: boolean;
}
export interface VariableDeclaration extends Node, HasSpan {
    type: "VariableDeclaration";
    kind: VariableDeclarationKind;
    declare: boolean;
    declarations: VariableDeclarator[];
}
export type VariableDeclarationKind = "var" | "let" | "const";
export interface VariableDeclarator extends Node, HasSpan {
    type: "VariableDeclarator";
    id: Pattern;
    init?: Expression;
    definite: boolean;
}
export type Expression = ThisExpression | ArrayExpression | ObjectExpression | FunctionExpression | UnaryExpression | UpdateExpression | BinaryExpression | AssignmentExpression | MemberExpression | SuperPropExpression | ConditionalExpression | CallExpression | NewExpression | SequenceExpression | Identifier | Literal | TemplateLiteral | TaggedTemplateExpression | ArrowFunctionExpression | ClassExpression | YieldExpression | MetaProperty | AwaitExpression | ParenthesisExpression | JSXMemberExpression | JSXNamespacedName | JSXEmptyExpression | JSXElement | JSXFragment | TsTypeAssertion | TsConstAssertion | TsNonNullExpression | TsAsExpression | TsSatisfiesExpression | TsInstantiation | PrivateName | OptionalChainingExpression | Invalid;
interface ExpressionBase extends Node, HasSpan {
}
export interface Identifier extends ExpressionBase {
    type: "Identifier";
    value: string;
    optional: boolean;
}
export interface OptionalChainingExpression extends ExpressionBase {
    type: "OptionalChainingExpression";
    questionDotToken: Span;
    /**
     * Call expression or member expression.
     */
    base: MemberExpression | OptionalChainingCall;
}
export interface OptionalChainingCall extends ExpressionBase {
    type: "CallExpression";
    callee: Expression;
    arguments: ExprOrSpread[];
    typeArguments?: TsTypeParameterInstantiation;
}
export interface ThisExpression extends ExpressionBase {
    type: "ThisExpression";
}
export interface ArrayExpression extends ExpressionBase {
    type: "ArrayExpression";
    elements: (ExprOrSpread | undefined)[];
}
export interface ExprOrSpread {
    spread?: Span;
    expression: Expression;
}
export interface ObjectExpression extends ExpressionBase {
    type: "ObjectExpression";
    properties: (SpreadElement | Property)[];
}
export interface Argument {
    spread?: Span;
    expression: Expression;
}
export interface SpreadElement extends Node {
    type: "SpreadElement";
    spread: Span;
    arguments: Expression;
}
export interface UnaryExpression extends ExpressionBase {
    type: "UnaryExpression";
    operator: UnaryOperator;
    argument: Expression;
}
export interface UpdateExpression extends ExpressionBase {
    type: "UpdateExpression";
    operator: UpdateOperator;
    prefix: boolean;
    argument: Expression;
}
export interface BinaryExpression extends ExpressionBase {
    type: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}
export interface FunctionExpression extends Fn, ExpressionBase {
    type: "FunctionExpression";
    identifier?: Identifier;
}
export interface ClassExpression extends Class, ExpressionBase {
    type: "ClassExpression";
    identifier?: Identifier;
}
export interface AssignmentExpression extends ExpressionBase {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Expression | Pattern;
    right: Expression;
}
export interface MemberExpression extends ExpressionBase {
    type: "MemberExpression";
    object: Expression;
    property: Identifier | PrivateName | ComputedPropName;
}
export interface SuperPropExpression extends ExpressionBase {
    type: "SuperPropExpression";
    obj: Super;
    property: Identifier | ComputedPropName;
}
export interface ConditionalExpression extends ExpressionBase {
    type: "ConditionalExpression";
    test: Expression;
    consequent: Expression;
    alternate: Expression;
}
export interface Super extends Node, HasSpan {
    type: "Super";
}
export interface Import extends Node, HasSpan {
    type: "Import";
}
export interface CallExpression extends ExpressionBase {
    type: "CallExpression";
    callee: Super | Import | Expression;
    arguments: Argument[];
    typeArguments?: TsTypeParameterInstantiation;
}
export interface NewExpression extends ExpressionBase {
    type: "NewExpression";
    callee: Expression;
    arguments?: Argument[];
    typeArguments?: TsTypeParameterInstantiation;
}
export interface SequenceExpression extends ExpressionBase {
    type: "SequenceExpression";
    expressions: Expression[];
}
export interface ArrowFunctionExpression extends ExpressionBase {
    type: "ArrowFunctionExpression";
    params: Pattern[];
    body: BlockStatement | Expression;
    async: boolean;
    generator: boolean;
    typeParameters?: TsTypeParameterDeclaration;
    returnType?: TsTypeAnnotation;
}
export interface YieldExpression extends ExpressionBase {
    type: "YieldExpression";
    argument?: Expression;
    delegate: boolean;
}
export interface MetaProperty extends Node, HasSpan {
    type: "MetaProperty";
    kind: "new.target" | "import.meta";
}
export interface AwaitExpression extends ExpressionBase {
    type: "AwaitExpression";
    argument: Expression;
}
export interface TemplateLiteral extends ExpressionBase {
    type: "TemplateLiteral";
    expressions: Expression[];
    quasis: TemplateElement[];
}
export interface TaggedTemplateExpression extends ExpressionBase {
    type: "TaggedTemplateExpression";
    tag: Expression;
    typeParameters?: TsTypeParameterInstantiation;
    template: TemplateLiteral;
}
export interface TemplateElement extends ExpressionBase {
    type: "TemplateElement";
    tail: boolean;
    cooked?: string;
    raw: string;
}
export interface ParenthesisExpression extends ExpressionBase {
    type: "ParenthesisExpression";
    expression: Expression;
}
export interface Fn extends HasSpan, HasDecorator {
    params: Param[];
    body?: BlockStatement;
    generator: boolean;
    async: boolean;
    typeParameters?: TsTypeParameterDeclaration;
    returnType?: TsTypeAnnotation;
}
interface PatternBase extends Node, HasSpan {
    typeAnnotation?: TsTypeAnnotation;
}
export interface PrivateName extends ExpressionBase {
    type: "PrivateName";
    id: Identifier;
}
export type JSXObject = JSXMemberExpression | Identifier;
export interface JSXMemberExpression extends Node {
    type: "JSXMemberExpression";
    object: JSXObject;
    property: Identifier;
}
/**
 * XML-based namespace syntax:
 */
export interface JSXNamespacedName extends Node {
    type: "JSXNamespacedName";
    namespace: Identifier;
    name: Identifier;
}
export interface JSXEmptyExpression extends Node, HasSpan {
    type: "JSXEmptyExpression";
}
export interface JSXExpressionContainer extends Node, HasSpan {
    type: "JSXExpressionContainer";
    expression: JSXExpression;
}
export type JSXExpression = JSXEmptyExpression | Expression;
export interface JSXSpreadChild extends Node, HasSpan {
    type: "JSXSpreadChild";
    expression: Expression;
}
export type JSXElementName = Identifier | JSXMemberExpression | JSXNamespacedName;
export interface JSXOpeningElement extends Node, HasSpan {
    type: "JSXOpeningElement";
    name: JSXElementName;
    attributes: JSXAttributeOrSpread[];
    selfClosing: boolean;
    typeArguments?: TsTypeParameterInstantiation;
}
export type JSXAttributeOrSpread = JSXAttribute | SpreadElement;
export interface JSXClosingElement extends Node, HasSpan {
    type: "JSXClosingElement";
    name: JSXElementName;
}
export interface JSXAttribute extends Node, HasSpan {
    type: "JSXAttribute";
    name: JSXAttributeName;
    value?: JSXAttrValue;
}
export type JSXAttributeName = Identifier | JSXNamespacedName;
export type JSXAttrValue = Literal | JSXExpressionContainer | JSXElement | JSXFragment;
export interface JSXText extends Node, HasSpan {
    type: "JSXText";
    value: string;
    raw: string;
}
export interface JSXElement extends Node, HasSpan {
    type: "JSXElement";
    opening: JSXOpeningElement;
    children: JSXElementChild[];
    closing?: JSXClosingElement;
}
export type JSXElementChild = JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement | JSXFragment;
export interface JSXFragment extends Node, HasSpan {
    type: "JSXFragment";
    opening: JSXOpeningFragment;
    children: JSXElementChild[];
    closing: JSXClosingFragment;
}
export interface JSXOpeningFragment extends Node, HasSpan {
    type: "JSXOpeningFragment";
}
export interface JSXClosingFragment extends Node, HasSpan {
    type: "JSXClosingFragment";
}
export type Literal = StringLiteral | BooleanLiteral | NullLiteral | NumericLiteral | BigIntLiteral | RegExpLiteral | JSXText;
export interface StringLiteral extends Node, HasSpan {
    type: "StringLiteral";
    value: string;
    raw?: string;
}
export interface BooleanLiteral extends Node, HasSpan {
    type: "BooleanLiteral";
    value: boolean;
}
export interface NullLiteral extends Node, HasSpan {
    type: "NullLiteral";
}
export interface RegExpLiteral extends Node, HasSpan {
    type: "RegExpLiteral";
    pattern: string;
    flags: string;
}
export interface NumericLiteral extends Node, HasSpan {
    type: "NumericLiteral";
    value: number;
    raw?: string;
}
export interface BigIntLiteral extends Node, HasSpan {
    type: "BigIntLiteral";
    value: bigint;
    raw?: string;
}
export type ModuleDeclaration = ImportDeclaration | ExportDeclaration | ExportNamedDeclaration | ExportDefaultDeclaration | ExportDefaultExpression | ExportAllDeclaration | TsImportEqualsDeclaration | TsExportAssignment | TsNamespaceExportDeclaration;
export interface ExportDefaultExpression extends Node, HasSpan {
    type: "ExportDefaultExpression";
    expression: Expression;
}
export interface ExportDeclaration extends Node, HasSpan {
    type: "ExportDeclaration";
    declaration: Declaration;
}
export interface ImportDeclaration extends Node, HasSpan {
    type: "ImportDeclaration";
    specifiers: ImportSpecifier[];
    source: StringLiteral;
    typeOnly: boolean;
    asserts?: ObjectExpression;
}
export interface ExportAllDeclaration extends Node, HasSpan {
    type: "ExportAllDeclaration";
    source: StringLiteral;
    asserts?: ObjectExpression;
}
/**
 * - `export { foo } from 'mod'`
 * - `export { foo as bar } from 'mod'`
 */
export interface ExportNamedDeclaration extends Node, HasSpan {
    type: "ExportNamedDeclaration";
    specifiers: ExportSpecifier[];
    source?: StringLiteral;
    typeOnly: boolean;
    asserts?: ObjectExpression;
}
export interface ExportDefaultDeclaration extends Node, HasSpan {
    type: "ExportDefaultDeclaration";
    decl: DefaultDecl;
}
export type DefaultDecl = ClassExpression | FunctionExpression | TsInterfaceDeclaration;
export type ImportSpecifier = NamedImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier;
/**
 * e.g. `import foo from 'mod.js'`
 */
export interface ImportDefaultSpecifier extends Node, HasSpan {
    type: "ImportDefaultSpecifier";
    local: Identifier;
}
/**
 * e.g. `import * as foo from 'mod.js'`.
 */
export interface ImportNamespaceSpecifier extends Node, HasSpan {
    type: "ImportNamespaceSpecifier";
    local: Identifier;
}
/**
 * e.g. - `import { foo } from 'mod.js'`
 *
 * local = foo, imported = None
 *
 * e.g. `import { foo as bar } from 'mod.js'`
 *
 * local = bar, imported = Some(foo) for
 */
export interface NamedImportSpecifier extends Node, HasSpan {
    type: "ImportSpecifier";
    local: Identifier;
    imported?: ModuleExportName;
    isTypeOnly: boolean;
}
export type ModuleExportName = Identifier | StringLiteral;
export type ExportSpecifier = ExportNamespaceSpecifier | ExportDefaultSpecifier | NamedExportSpecifier;
/**
 * `export * as foo from 'src';`
 */
export interface ExportNamespaceSpecifier extends Node, HasSpan {
    type: "ExportNamespaceSpecifier";
    name: ModuleExportName;
}
export interface ExportDefaultSpecifier extends Node, HasSpan {
    type: "ExportDefaultSpecifier";
    exported: Identifier;
}
export interface NamedExportSpecifier extends Node, HasSpan {
    type: "ExportSpecifier";
    orig: ModuleExportName;
    /**
     * `Some(bar)` in `export { foo as bar }`
     */
    exported?: ModuleExportName;
    isTypeOnly: boolean;
}
interface HasInterpreter {
    /**
     * e.g. `/usr/bin/node` for `#!/usr/bin/node`
     */
    interpreter: string;
}
export type Program = Module | Script;
export interface Module extends Node, HasSpan, HasInterpreter {
    type: "Module";
    body: ModuleItem[];
}
export interface Script extends Node, HasSpan, HasInterpreter {
    type: "Script";
    body: Statement[];
}
export type ModuleItem = ModuleDeclaration | Statement;
export type BinaryOperator = "==" | "!=" | "===" | "!==" | "<" | "<=" | ">" | ">=" | "<<" | ">>" | ">>>" | "+" | "-" | "*" | "/" | "%" | "|" | "^" | "&" | "||" | "&&" | "in" | "instanceof" | "**" | "??";
export type AssignmentOperator = "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "|=" | "^=" | "&=" | "**=" | "&&=" | "||=" | "??=";
export type UpdateOperator = "++" | "--";
export type UnaryOperator = "-" | "+" | "!" | "~" | "typeof" | "void" | "delete";
export type Pattern = BindingIdentifier | ArrayPattern | RestElement | ObjectPattern | AssignmentPattern | Invalid | Expression;
export interface BindingIdentifier extends PatternBase {
    type: "Identifier";
    value: string;
    optional: boolean;
}
export interface ArrayPattern extends PatternBase {
    type: "ArrayPattern";
    elements: (Pattern | undefined)[];
    optional: boolean;
}
export interface ObjectPattern extends PatternBase {
    type: "ObjectPattern";
    properties: ObjectPatternProperty[];
    optional: boolean;
}
export interface AssignmentPattern extends PatternBase {
    type: "AssignmentPattern";
    left: Pattern;
    right: Expression;
}
export interface RestElement extends PatternBase {
    type: "RestElement";
    rest: Span;
    argument: Pattern;
}
export type ObjectPatternProperty = KeyValuePatternProperty | AssignmentPatternProperty | RestElement;
/**
 * `{key: value}`
 */
export interface KeyValuePatternProperty extends Node {
    type: "KeyValuePatternProperty";
    key: PropertyName;
    value: Pattern;
}
/**
 * `{key}` or `{key = value}`
 */
export interface AssignmentPatternProperty extends Node, HasSpan {
    type: "AssignmentPatternProperty";
    key: Identifier;
    value?: Expression;
}
/** Identifier is `a` in `{ a, }` */
export type Property = Identifier | KeyValueProperty | AssignmentProperty | GetterProperty | SetterProperty | MethodProperty;
interface PropBase extends Node {
    key: PropertyName;
}
export interface KeyValueProperty extends PropBase {
    type: "KeyValueProperty";
    value: Expression;
}
export interface AssignmentProperty extends Node {
    type: "AssignmentProperty";
    key: Identifier;
    value: Expression;
}
export interface GetterProperty extends PropBase, HasSpan {
    type: "GetterProperty";
    typeAnnotation?: TsTypeAnnotation;
    body?: BlockStatement;
}
export interface SetterProperty extends PropBase, HasSpan {
    type: "SetterProperty";
    param: Pattern;
    body?: BlockStatement;
}
export interface MethodProperty extends PropBase, Fn {
    type: "MethodProperty";
}
export type PropertyName = Identifier | StringLiteral | NumericLiteral | ComputedPropName | BigIntLiteral;
export interface ComputedPropName extends Node, HasSpan {
    type: "Computed";
    expression: Expression;
}
export interface BlockStatement extends Node, HasSpan {
    type: "BlockStatement";
    stmts: Statement[];
}
export interface ExpressionStatement extends Node, HasSpan {
    type: "ExpressionStatement";
    expression: Expression;
}
export type Statement = BlockStatement | EmptyStatement | DebuggerStatement | WithStatement | ReturnStatement | LabeledStatement | BreakStatement | ContinueStatement | IfStatement | SwitchStatement | ThrowStatement | TryStatement | WhileStatement | DoWhileStatement | ForStatement | ForInStatement | ForOfStatement | Declaration | ExpressionStatement;
export interface EmptyStatement extends Node, HasSpan {
    type: "EmptyStatement";
}
export interface DebuggerStatement extends Node, HasSpan {
    type: "DebuggerStatement";
}
export interface WithStatement extends Node, HasSpan {
    type: "WithStatement";
    object: Expression;
    body: Statement;
}
export interface ReturnStatement extends Node, HasSpan {
    type: "ReturnStatement";
    argument?: Expression;
}
export interface LabeledStatement extends Node, HasSpan {
    type: "LabeledStatement";
    label: Identifier;
    body: Statement;
}
export interface BreakStatement extends Node, HasSpan {
    type: "BreakStatement";
    label?: Identifier;
}
export interface ContinueStatement extends Node, HasSpan {
    type: "ContinueStatement";
    label?: Identifier;
}
export interface IfStatement extends Node, HasSpan {
    type: "IfStatement";
    test: Expression;
    consequent: Statement;
    alternate?: Statement;
}
export interface SwitchStatement extends Node, HasSpan {
    type: "SwitchStatement";
    discriminant: Expression;
    cases: SwitchCase[];
}
export interface ThrowStatement extends Node, HasSpan {
    type: "ThrowStatement";
    argument: Expression;
}
export interface TryStatement extends Node, HasSpan {
    type: "TryStatement";
    block: BlockStatement;
    handler?: CatchClause;
    finalizer?: BlockStatement;
}
export interface WhileStatement extends Node, HasSpan {
    type: "WhileStatement";
    test: Expression;
    body: Statement;
}
export interface DoWhileStatement extends Node, HasSpan {
    type: "DoWhileStatement";
    test: Expression;
    body: Statement;
}
export interface ForStatement extends Node, HasSpan {
    type: "ForStatement";
    init?: VariableDeclaration | Expression;
    test?: Expression;
    update?: Expression;
    body: Statement;
}
export interface ForInStatement extends Node, HasSpan {
    type: "ForInStatement";
    left: VariableDeclaration | Pattern;
    right: Expression;
    body: Statement;
}
export interface ForOfStatement extends Node, HasSpan {
    type: "ForOfStatement";
    /**
     *  Span of the await token.
     *
     *  es2018 for-await-of statements, e.g., `for await (const x of xs) {`
     */
    await?: Span;
    left: VariableDeclaration | Pattern;
    right: Expression;
    body: Statement;
}
export interface SwitchCase extends Node, HasSpan {
    type: "SwitchCase";
    /**
     * Undefined for default case
     */
    test?: Expression;
    consequent: Statement[];
}
export interface CatchClause extends Node, HasSpan {
    type: "CatchClause";
    /**
     * The param is `undefined` if the catch binding is omitted. E.g., `try { foo() } catch {}`
     */
    param?: Pattern;
    body: BlockStatement;
}
export interface TsTypeAnnotation extends Node, HasSpan {
    type: "TsTypeAnnotation";
    typeAnnotation: TsType;
}
export interface TsTypeParameterDeclaration extends Node, HasSpan {
    type: "TsTypeParameterDeclaration";
    parameters: TsTypeParameter[];
}
export interface TsTypeParameter extends Node, HasSpan {
    type: "TsTypeParameter";
    name: Identifier;
    in: boolean;
    out: boolean;
    constraint?: TsType;
    default?: TsType;
}
export interface TsTypeParameterInstantiation extends Node, HasSpan {
    type: "TsTypeParameterInstantiation";
    params: TsType[];
}
export interface TsParameterProperty extends Node, HasSpan, HasDecorator {
    type: "TsParameterProperty";
    accessibility?: Accessibility;
    override: boolean;
    readonly: boolean;
    param: TsParameterPropertyParameter;
}
export type TsParameterPropertyParameter = BindingIdentifier | AssignmentPattern;
export interface TsQualifiedName extends Node {
    type: "TsQualifiedName";
    left: TsEntityName;
    right: Identifier;
}
export type TsEntityName = TsQualifiedName | Identifier;
export type TsTypeElement = TsCallSignatureDeclaration | TsConstructSignatureDeclaration | TsPropertySignature | TsGetterSignature | TsSetterSignature | TsMethodSignature | TsIndexSignature;
export interface TsCallSignatureDeclaration extends Node, HasSpan {
    type: "TsCallSignatureDeclaration";
    params: TsFnParameter[];
    typeAnnotation?: TsTypeAnnotation;
    typeParams?: TsTypeParameterDeclaration;
}
export interface TsConstructSignatureDeclaration extends Node, HasSpan {
    type: "TsConstructSignatureDeclaration";
    params: TsFnParameter[];
    typeAnnotation?: TsTypeAnnotation;
    typeParams?: TsTypeParameterDeclaration;
}
export interface TsPropertySignature extends Node, HasSpan {
    type: "TsPropertySignature";
    readonly: boolean;
    key: Expression;
    computed: boolean;
    optional: boolean;
    typeAnnotation?: TsTypeAnnotation;
}
export interface TsGetterSignature extends Node, HasSpan {
    type: "TsGetterSignature";
    readonly: boolean;
    key: Expression;
    computed: boolean;
    optional: boolean;
    typeAnnotation?: TsTypeAnnotation;
}
export interface TsSetterSignature extends Node, HasSpan {
    type: "TsSetterSignature";
    readonly: boolean;
    key: Expression;
    computed: boolean;
    optional: boolean;
    param: TsFnParameter;
}
export interface TsMethodSignature extends Node, HasSpan {
    type: "TsMethodSignature";
    readonly: boolean;
    key: Expression;
    computed: boolean;
    optional: boolean;
    params: TsFnParameter[];
    typeAnn?: TsTypeAnnotation;
    typeParams?: TsTypeParameterDeclaration;
}
export interface TsIndexSignature extends Node, HasSpan {
    type: "TsIndexSignature";
    params: TsFnParameter[];
    typeAnnotation?: TsTypeAnnotation;
    readonly: boolean;
    static: boolean;
}
export type TsType = TsKeywordType | TsThisType | TsFnOrConstructorType | TsTypeReference | TsTypeQuery | TsTypeLiteral | TsArrayType | TsTupleType | TsOptionalType | TsRestType | TsUnionOrIntersectionType | TsConditionalType | TsInferType | TsParenthesizedType | TsTypeOperator | TsIndexedAccessType | TsMappedType | TsLiteralType | TsTypePredicate | TsImportType;
export type TsFnOrConstructorType = TsFunctionType | TsConstructorType;
export interface TsKeywordType extends Node, HasSpan {
    type: "TsKeywordType";
    kind: TsKeywordTypeKind;
}
export type TsKeywordTypeKind = "any" | "unknown" | "number" | "object" | "boolean" | "bigint" | "string" | "symbol" | "void" | "undefined" | "null" | "never" | "intrinsic";
export interface TsThisType extends Node, HasSpan {
    type: "TsThisType";
}
export type TsFnParameter = BindingIdentifier | ArrayPattern | RestElement | ObjectPattern;
export interface TsFunctionType extends Node, HasSpan {
    type: "TsFunctionType";
    params: TsFnParameter[];
    typeParams?: TsTypeParameterDeclaration;
    typeAnnotation: TsTypeAnnotation;
}
export interface TsConstructorType extends Node, HasSpan {
    type: "TsConstructorType";
    params: TsFnParameter[];
    typeParams?: TsTypeParameterDeclaration;
    typeAnnotation: TsTypeAnnotation;
    isAbstract: boolean;
}
export interface TsTypeReference extends Node, HasSpan {
    type: "TsTypeReference";
    typeName: TsEntityName;
    typeParams?: TsTypeParameterInstantiation;
}
export interface TsTypePredicate extends Node, HasSpan {
    type: "TsTypePredicate";
    asserts: boolean;
    paramName: TsThisTypeOrIdent;
    typeAnnotation?: TsTypeAnnotation;
}
export type TsThisTypeOrIdent = TsThisType | Identifier;
export interface TsImportType extends Node, HasSpan {
    type: "TsImportType";
    argument: StringLiteral;
    qualifier?: TsEntityName;
    typeArguments?: TsTypeParameterInstantiation;
}
/**
 * `typeof` operator
 */
export interface TsTypeQuery extends Node, HasSpan {
    type: "TsTypeQuery";
    exprName: TsTypeQueryExpr;
    typeArguments?: TsTypeParameterInstantiation;
}
export type TsTypeQueryExpr = TsEntityName | TsImportType;
export interface TsTypeLiteral extends Node, HasSpan {
    type: "TsTypeLiteral";
    members: TsTypeElement[];
}
export interface TsArrayType extends Node, HasSpan {
    type: "TsArrayType";
    elemType: TsType;
}
export interface TsTupleType extends Node, HasSpan {
    type: "TsTupleType";
    elemTypes: TsTupleElement[];
}
export interface TsTupleElement extends Node, HasSpan {
    type: "TsTupleElement";
    label?: Pattern;
    ty: TsType;
}
export interface TsOptionalType extends Node, HasSpan {
    type: "TsOptionalType";
    typeAnnotation: TsType;
}
export interface TsRestType extends Node, HasSpan {
    type: "TsRestType";
    typeAnnotation: TsType;
}
export type TsUnionOrIntersectionType = TsUnionType | TsIntersectionType;
export interface TsUnionType extends Node, HasSpan {
    type: "TsUnionType";
    types: TsType[];
}
export interface TsIntersectionType extends Node, HasSpan {
    type: "TsIntersectionType";
    types: TsType[];
}
export interface TsConditionalType extends Node, HasSpan {
    type: "TsConditionalType";
    checkType: TsType;
    extendsType: TsType;
    trueType: TsType;
    falseType: TsType;
}
export interface TsInferType extends Node, HasSpan {
    type: "TsInferType";
    typeParam: TsTypeParameter;
}
export interface TsParenthesizedType extends Node, HasSpan {
    type: "TsParenthesizedType";
    typeAnnotation: TsType;
}
export interface TsTypeOperator extends Node, HasSpan {
    type: "TsTypeOperator";
    op: TsTypeOperatorOp;
    typeAnnotation: TsType;
}
export type TsTypeOperatorOp = "keyof" | "unique" | "readonly";
export interface TsIndexedAccessType extends Node, HasSpan {
    type: "TsIndexedAccessType";
    readonly: boolean;
    objectType: TsType;
    indexType: TsType;
}
export type TruePlusMinus = true | "+" | "-";
export interface TsMappedType extends Node, HasSpan {
    type: "TsMappedType";
    readonly?: TruePlusMinus;
    typeParam: TsTypeParameter;
    nameType?: TsType;
    optional?: TruePlusMinus;
    typeAnnotation?: TsType;
}
export interface TsLiteralType extends Node, HasSpan {
    type: "TsLiteralType";
    literal: TsLiteral;
}
export type TsLiteral = NumericLiteral | StringLiteral | BooleanLiteral | BigIntLiteral | TsTemplateLiteralType;
export interface TsTemplateLiteralType extends Node, HasSpan {
    type: "TemplateLiteral";
    types: TsType[];
    quasis: TemplateElement[];
}
export interface TsInterfaceDeclaration extends Node, HasSpan {
    type: "TsInterfaceDeclaration";
    id: Identifier;
    declare: boolean;
    typeParams?: TsTypeParameterDeclaration;
    extends: TsExpressionWithTypeArguments[];
    body: TsInterfaceBody;
}
export interface TsInterfaceBody extends Node, HasSpan {
    type: "TsInterfaceBody";
    body: TsTypeElement[];
}
export interface TsExpressionWithTypeArguments extends Node, HasSpan {
    type: "TsExpressionWithTypeArguments";
    expression: Expression;
    typeArguments?: TsTypeParameterInstantiation;
}
export interface TsTypeAliasDeclaration extends Node, HasSpan {
    type: "TsTypeAliasDeclaration";
    declare: boolean;
    id: Identifier;
    typeParams?: TsTypeParameterDeclaration;
    typeAnnotation: TsType;
}
export interface TsEnumDeclaration extends Node, HasSpan {
    type: "TsEnumDeclaration";
    declare: boolean;
    isConst: boolean;
    id: Identifier;
    members: TsEnumMember[];
}
export interface TsEnumMember extends Node, HasSpan {
    type: "TsEnumMember";
    id: TsEnumMemberId;
    init?: Expression;
}
export type TsEnumMemberId = Identifier | StringLiteral;
export interface TsModuleDeclaration extends Node, HasSpan {
    type: "TsModuleDeclaration";
    declare: boolean;
    global: boolean;
    id: TsModuleName;
    body?: TsNamespaceBody;
}
/**
 * `namespace A.B { }` is a namespace named `A` with another TsNamespaceDecl as its body.
 */
export type TsNamespaceBody = TsModuleBlock | TsNamespaceDeclaration;
export interface TsModuleBlock extends Node, HasSpan {
    type: "TsModuleBlock";
    body: ModuleItem[];
}
export interface TsNamespaceDeclaration extends Node, HasSpan {
    type: "TsNamespaceDeclaration";
    declare: boolean;
    global: boolean;
    id: Identifier;
    body: TsNamespaceBody;
}
export type TsModuleName = Identifier | StringLiteral;
export interface TsImportEqualsDeclaration extends Node, HasSpan {
    type: "TsImportEqualsDeclaration";
    declare: boolean;
    isExport: boolean;
    isTypeOnly: boolean;
    id: Identifier;
    moduleRef: TsModuleReference;
}
export type TsModuleReference = TsEntityName | TsExternalModuleReference;
export interface TsExternalModuleReference extends Node, HasSpan {
    type: "TsExternalModuleReference";
    expression: StringLiteral;
}
export interface TsExportAssignment extends Node, HasSpan {
    type: "TsExportAssignment";
    expression: Expression;
}
export interface TsNamespaceExportDeclaration extends Node, HasSpan {
    type: "TsNamespaceExportDeclaration";
    id: Identifier;
}
export interface TsAsExpression extends ExpressionBase {
    type: "TsAsExpression";
    expression: Expression;
    typeAnnotation: TsType;
}
export interface TsSatisfiesExpression extends ExpressionBase {
    type: "TsSatisfiesExpression";
    expression: Expression;
    typeAnnotation: TsType;
}
export interface TsInstantiation extends Node, HasSpan {
    type: "TsInstantiation";
    expression: Expression;
    typeArguments: TsTypeParameterInstantiation;
}
export interface TsTypeAssertion extends ExpressionBase {
    type: "TsTypeAssertion";
    expression: Expression;
    typeAnnotation: TsType;
}
export interface TsConstAssertion extends ExpressionBase {
    type: "TsConstAssertion";
    expression: Expression;
}
export interface TsNonNullExpression extends ExpressionBase {
    type: "TsNonNullExpression";
    expression: Expression;
}
export type Accessibility = "public" | "protected" | "private";
export interface Invalid extends Node, HasSpan {
    type: "Invalid";
}
export type WasmAnalysisOptions = {
    parser?: ParserConfig;
    module?: true | false | "unknown";
    filename?: string;
    errorFormat?: "json" | "normal";
    cacheRoot?: string;
    plugins: WasmPlugin[];
};
export type WasmPlugin = [wasmPackage: string, config: Record<string, any>];
export {};
//# sourceMappingURL=index.d.ts.map