import * as _oxc_project_types0 from "@oxc-project/types";

//#region src/binding.d.cts
type MaybePromise<T> = T | Promise<T>;
type VoidNullable<T = void> = T | null | undefined | void;
type BindingStringOrRegex = string | RegExp;
interface CodegenOptions {
  /**
   * Remove whitespace.
   *
   * @default true
   */
  removeWhitespace?: boolean;
}
interface CompressOptions {
  /**
   * Set desired EcmaScript standard version for output.
   *
   * Set `esnext` to enable all target highering.
   *
   * Example:
   *
   * * `'es2015'`
   * * `['es2020', 'chrome58', 'edge16', 'firefox57', 'node12', 'safari11']`
   *
   * @default 'esnext'
   *
   * @see [esbuild#target](https://esbuild.github.io/api/#target)
   */
  target?: string | Array<string>;
  /**
   * Pass true to discard calls to `console.*`.
   *
   * @default false
   */
  dropConsole?: boolean;
  /**
   * Remove `debugger;` statements.
   *
   * @default true
   */
  dropDebugger?: boolean;
  /**
   * Pass `true` to drop unreferenced functions and variables.
   *
   * Simple direct variable assignments do not count as references unless set to `keep_assign`.
   * @default true
   */
  unused?: boolean | 'keep_assign';
  /** Keep function / class names. */
  keepNames?: CompressOptionsKeepNames;
  /**
   * Join consecutive var, let and const statements.
   *
   * @default true
   */
  joinVars?: boolean;
  /**
   * Join consecutive simple statements using the comma operator.
   *
   * `a; b` -> `a, b`
   *
   * @default true
   */
  sequences?: boolean;
  /**
   * Set of label names to drop from the code.
   *
   * Labeled statements matching these names will be removed during minification.
   *
   * @default []
   */
  dropLabels?: Array<string>;
  /** Limit the maximum number of iterations for debugging purpose. */
  maxIterations?: number;
  /** Treeshake options. */
  treeshake?: TreeShakeOptions;
}
interface CompressOptionsKeepNames {
  /**
   * Keep function names so that `Function.prototype.name` is preserved.
   *
   * This does not guarantee that the `undefined` name is preserved.
   *
   * @default false
   */
  function: boolean;
  /**
   * Keep class names so that `Class.prototype.name` is preserved.
   *
   * This does not guarantee that the `undefined` name is preserved.
   *
   * @default false
   */
  class: boolean;
}
interface MangleOptions {
  /**
   * Pass `true` to mangle names declared in the top level scope.
   *
   * @default false
   */
  toplevel?: boolean;
  /**
   * Preserve `name` property for functions and classes.
   *
   * @default false
   */
  keepNames?: boolean | MangleOptionsKeepNames;
  /** Debug mangled names. */
  debug?: boolean;
}
interface MangleOptionsKeepNames {
  /**
   * Preserve `name` property for functions.
   *
   * @default false
   */
  function: boolean;
  /**
   * Preserve `name` property for classes.
   *
   * @default false
   */
  class: boolean;
}
/** Minify synchronously. */
declare function minify(filename: string, sourceText: string, options?: MinifyOptions | undefined | null): MinifyResult;
interface MinifyOptions {
  /** Use when minifying an ES module. */
  module?: boolean;
  compress?: boolean | CompressOptions;
  mangle?: boolean | MangleOptions;
  codegen?: boolean | CodegenOptions;
  sourcemap?: boolean;
}
interface MinifyResult {
  code: string;
  map?: SourceMap;
  errors: Array<OxcError>;
}
interface TreeShakeOptions {
  /**
   * Whether to respect the pure annotations.
   *
   * Pure annotations are comments that mark an expression as pure.
   * For example: @__PURE__ or #__NO_SIDE_EFFECTS__.
   *
   * @default true
   */
  annotations?: boolean;
  /**
   * Whether to treat this function call as pure.
   *
   * This function is called for normal function calls, new calls, and
   * tagged template calls.
   */
  manualPureFunctions?: Array<string>;
  /**
   * Whether property read accesses have side effects.
   *
   * @default 'always'
   */
  propertyReadSideEffects?: boolean | 'always';
  /**
   * Whether accessing a global variable has side effects.
   *
   * Accessing a non-existing global variable will throw an error.
   * Global variable may be a getter that has side effects.
   *
   * @default true
   */
  unknownGlobalSideEffects?: boolean;
}
interface Comment {
  type: 'Line' | 'Block';
  value: string;
  start: number;
  end: number;
}
interface ErrorLabel {
  message?: string;
  start: number;
  end: number;
}
interface OxcError {
  severity: Severity;
  message: string;
  labels: Array<ErrorLabel>;
  helpMessage?: string;
  codeframe?: string;
}
type Severity = 'Error' | 'Warning' | 'Advice';
declare class ParseResult {
  get program(): _oxc_project_types0.Program;
  get module(): EcmaScriptModule;
  get comments(): Array<Comment>;
  get errors(): Array<OxcError>;
}
interface DynamicImport {
  start: number;
  end: number;
  moduleRequest: Span;
}
interface EcmaScriptModule {
  /**
   * Has ESM syntax.
   *
   * i.e. `import` and `export` statements, and `import.meta`.
   *
   * Dynamic imports `import('foo')` are ignored since they can be used in non-ESM files.
   */
  hasModuleSyntax: boolean;
  /** Import statements. */
  staticImports: Array<StaticImport>;
  /** Export statements. */
  staticExports: Array<StaticExport>;
  /** Dynamic import expressions. */
  dynamicImports: Array<DynamicImport>;
  /** Span positions` of `import.meta` */
  importMetas: Array<Span>;
}
interface ExportExportName {
  kind: ExportExportNameKind;
  name?: string;
  start?: number;
  end?: number;
}
type ExportExportNameKind = /** `export { name } */
'Name' | /** `export default expression` */
'Default' | /** `export * from "mod" */
'None';
interface ExportImportName {
  kind: ExportImportNameKind;
  name?: string;
  start?: number;
  end?: number;
}
type ExportImportNameKind = /** `export { name } */
'Name' | /** `export * as ns from "mod"` */
'All' | /** `export * from "mod"` */
'AllButDefault' | /** Does not have a specifier. */
'None';
interface ExportLocalName {
  kind: ExportLocalNameKind;
  name?: string;
  start?: number;
  end?: number;
}
type ExportLocalNameKind = /** `export { name } */
'Name' | /** `export default expression` */
'Default' |
/**
 * If the exported value is not locally accessible from within the module.
 * `export default function () {}`
 */
'None';
interface ImportName {
  kind: ImportNameKind;
  name?: string;
  start?: number;
  end?: number;
}
type ImportNameKind = /** `import { x } from "mod"` */
'Name' | /** `import * as ns from "mod"` */
'NamespaceObject' | /** `import defaultExport from "mod"` */
'Default';
/**
 * Parse asynchronously.
 *
 * Note: This function can be slower than `parseSync` due to the overhead of spawning a thread.
 */
declare function parseAsync(filename: string, sourceText: string, options?: ParserOptions | undefined | null): Promise<ParseResult>;
interface ParserOptions {
  /** Treat the source text as `js`, `jsx`, `ts`, `tsx` or `dts`. */
  lang?: 'js' | 'jsx' | 'ts' | 'tsx' | 'dts';
  /** Treat the source text as `script` or `module` code. */
  sourceType?: 'script' | 'module' | 'unambiguous' | undefined;
  /**
   * Return an AST which includes TypeScript-related properties, or excludes them.
   *
   * `'js'` is default for JS / JSX files.
   * `'ts'` is default for TS / TSX files.
   * The type of the file is determined from `lang` option, or extension of provided `filename`.
   */
  astType?: 'js' | 'ts';
  /**
   * Controls whether the `range` property is included on AST nodes.
   * The `range` property is a `[number, number]` which indicates the start/end offsets
   * of the node in the file contents.
   *
   * @default false
   */
  range?: boolean;
  /**
   * Emit `ParenthesizedExpression` and `TSParenthesizedType` in AST.
   *
   * If this option is true, parenthesized expressions are represented by
   * (non-standard) `ParenthesizedExpression` and `TSParenthesizedType` nodes that
   * have a single `expression` property containing the expression inside parentheses.
   *
   * @default true
   */
  preserveParens?: boolean;
  /**
   * Produce semantic errors with an additional AST pass.
   * Semantic errors depend on symbols and scopes, where the parser does not construct.
   * This adds a small performance overhead.
   *
   * @default false
   */
  showSemanticErrors?: boolean;
}
/** Parse synchronously. */
declare function parseSync(filename: string, sourceText: string, options?: ParserOptions | undefined | null): ParseResult;
interface Span {
  start: number;
  end: number;
}
interface StaticExport {
  start: number;
  end: number;
  entries: Array<StaticExportEntry>;
}
interface StaticExportEntry {
  start: number;
  end: number;
  moduleRequest?: ValueSpan;
  /** The name under which the desired binding is exported by the module`. */
  importName: ExportImportName;
  /** The name used to export this binding by this module. */
  exportName: ExportExportName;
  /** The name that is used to locally access the exported value from within the importing module. */
  localName: ExportLocalName;
  /**
   * Whether the export is a TypeScript `export type`.
   *
   * Examples:
   *
   * ```ts
   * export type * from 'mod';
   * export type * as ns from 'mod';
   * export type { foo };
   * export { type foo }:
   * export type { foo } from 'mod';
   * ```
   */
  isType: boolean;
}
interface StaticImport {
  /** Start of import statement. */
  start: number;
  /** End of import statement. */
  end: number;
  /**
   * Import source.
   *
   * ```js
   * import { foo } from "mod";
   * //                   ^^^
   * ```
   */
  moduleRequest: ValueSpan;
  /**
   * Import specifiers.
   *
   * Empty for `import "mod"`.
   */
  entries: Array<StaticImportEntry>;
}
interface StaticImportEntry {
  /**
   * The name under which the desired binding is exported by the module.
   *
   * ```js
   * import { foo } from "mod";
   * //       ^^^
   * import { foo as bar } from "mod";
   * //       ^^^
   * ```
   */
  importName: ImportName;
  /**
   * The name that is used to locally access the imported value from within the importing module.
   * ```js
   * import { foo } from "mod";
   * //       ^^^
   * import { foo as bar } from "mod";
   * //              ^^^
   * ```
   */
  localName: ValueSpan;
  /**
   * Whether this binding is for a TypeScript type-only import.
   *
   * `true` for the following imports:
   * ```ts
   * import type { foo } from "mod";
   * import { type foo } from "mod";
   * ```
   */
  isType: boolean;
}
interface ValueSpan {
  value: string;
  start: number;
  end: number;
}
declare class ResolverFactory {
  constructor(options?: NapiResolveOptions | undefined | null);
  static default(): ResolverFactory;
  /** Clone the resolver using the same underlying cache. */
  cloneWithOptions(options: NapiResolveOptions): ResolverFactory;
  /** Clear the underlying cache. */
  clearCache(): void;
  /** Synchronously resolve `specifier` at an absolute path to a `directory`. */
  sync(directory: string, request: string): ResolveResult;
  /** Asynchronously resolve `specifier` at an absolute path to a `directory`. */
  async(directory: string, request: string): Promise<ResolveResult>;
}
/** Node.js builtin module when `Options::builtin_modules` is enabled. */
interface Builtin {
  /**
   * Resolved module.
   *
   * Always prefixed with "node:" in compliance with the ESM specification.
   */
  resolved: string;
  /**
   * Whether the request was prefixed with `node:` or not.
   * `fs` -> `false`.
   * `node:fs` returns `true`.
   */
  isRuntimeModule: boolean;
}
declare enum EnforceExtension {
  Auto = 0,
  Enabled = 1,
  Disabled = 2,
}
type ModuleType = 'module' | 'commonjs' | 'json' | 'wasm' | 'addon';
/**
 * Module Resolution Options
 *
 * Options are directly ported from [enhanced-resolve](https://github.com/webpack/enhanced-resolve#resolver-options).
 *
 * See [webpack resolve](https://webpack.js.org/configuration/resolve/) for information and examples
 */
interface NapiResolveOptions {
  /**
   * Discover tsconfig automatically or use the specified tsconfig.json path.
   *
   * Default `None`
   */
  tsconfig?: 'auto' | TsconfigOptions;
  /**
   * Alias for [ResolveOptions::alias] and [ResolveOptions::fallback].
   *
   * For the second value of the tuple, `None -> AliasValue::Ignore`, Some(String) ->
   * AliasValue::Path(String)`
   * Create aliases to import or require certain modules more easily.
   * A trailing $ can also be added to the given object's keys to signify an exact match.
   * Default `{}`
   */
  alias?: Record<string, Array<string | undefined | null>>;
  /**
   * A list of alias fields in description files.
   * Specify a field, such as `browser`, to be parsed according to [this specification](https://github.com/defunctzombie/package-browser-field-spec).
   * Can be a path to json object such as `["path", "to", "exports"]`.
   *
   * Default `[]`
   */
  aliasFields?: (string | string[])[];
  /**
   * Condition names for exports field which defines entry points of a package.
   * The key order in the exports field is significant. During condition matching, earlier entries have higher priority and take precedence over later entries.
   *
   * Default `[]`
   */
  conditionNames?: Array<string>;
  /**
   * If true, it will not allow extension-less files.
   * So by default `require('./foo')` works if `./foo` has a `.js` extension,
   * but with this enabled only `require('./foo.js')` will work.
   *
   * Default to `true` when [ResolveOptions::extensions] contains an empty string.
   * Use `Some(false)` to disable the behavior.
   * See <https://github.com/webpack/enhanced-resolve/pull/285>
   *
   * Default None, which is the same as `Some(false)` when the above empty rule is not applied.
   */
  enforceExtension?: EnforceExtension;
  /**
   * A list of exports fields in description files.
   * Can be a path to json object such as `["path", "to", "exports"]`.
   *
   * Default `[["exports"]]`.
   */
  exportsFields?: (string | string[])[];
  /**
   * Fields from `package.json` which are used to provide the internal requests of a package
   * (requests starting with # are considered internal).
   *
   * Can be a path to a JSON object such as `["path", "to", "imports"]`.
   *
   * Default `[["imports"]]`.
   */
  importsFields?: (string | string[])[];
  /**
   * An object which maps extension to extension aliases.
   *
   * Default `{}`
   */
  extensionAlias?: Record<string, Array<string>>;
  /**
   * Attempt to resolve these extensions in order.
   * If multiple files share the same name but have different extensions,
   * will resolve the one with the extension listed first in the array and skip the rest.
   *
   * Default `[".js", ".json", ".node"]`
   */
  extensions?: Array<string>;
  /**
   * Redirect module requests when normal resolving fails.
   *
   * Default `{}`
   */
  fallback?: Record<string, Array<string | undefined | null>>;
  /**
   * Request passed to resolve is already fully specified and extensions or main files are not resolved for it (they are still resolved for internal requests).
   *
   * See also webpack configuration [resolve.fullySpecified](https://webpack.js.org/configuration/module/#resolvefullyspecified)
   *
   * Default `false`
   */
  fullySpecified?: boolean;
  /**
   * A list of main fields in description files
   *
   * Default `["main"]`.
   */
  mainFields?: string | string[];
  /**
   * The filename to be used while resolving directories.
   *
   * Default `["index"]`
   */
  mainFiles?: Array<string>;
  /**
   * A list of directories to resolve modules from, can be absolute path or folder name.
   *
   * Default `["node_modules"]`
   */
  modules?: string | string[];
  /**
   * Resolve to a context instead of a file.
   *
   * Default `false`
   */
  resolveToContext?: boolean;
  /**
   * Prefer to resolve module requests as relative requests instead of using modules from node_modules directories.
   *
   * Default `false`
   */
  preferRelative?: boolean;
  /**
   * Prefer to resolve server-relative urls as absolute paths before falling back to resolve in ResolveOptions::roots.
   *
   * Default `false`
   */
  preferAbsolute?: boolean;
  /**
   * A list of resolve restrictions to restrict the paths that a request can be resolved on.
   *
   * Default `[]`
   */
  restrictions?: Array<Restriction>;
  /**
   * A list of directories where requests of server-relative URLs (starting with '/') are resolved.
   * On non-Windows systems these requests are resolved as an absolute path first.
   *
   * Default `[]`
   */
  roots?: Array<string>;
  /**
   * Whether to resolve symlinks to their symlinked location.
   * When enabled, symlinked resources are resolved to their real path, not their symlinked location.
   * Note that this may cause module resolution to fail when using tools that symlink packages (like npm link).
   *
   * Default `true`
   */
  symlinks?: boolean;
  /**
   * Whether to parse [module.builtinModules](https://nodejs.org/api/module.html#modulebuiltinmodules) or not.
   * For example, "zlib" will throw [crate::ResolveError::Builtin] when set to true.
   *
   * Default `false`
   */
  builtinModules?: boolean;
  /**
   * Resolve [ResolveResult::moduleType].
   *
   * Default `false`
   */
  moduleType?: boolean;
  /**
   * Allow `exports` field in `require('../directory')`.
   *
   * This is not part of the spec but some vite projects rely on this behavior.
   * See
   * * <https://github.com/vitejs/vite/pull/20252>
   * * <https://github.com/nodejs/node/issues/58827>
   *
   * Default: `false`
   */
  allowPackageExportsInDirectoryResolve?: boolean;
}
interface ResolveResult {
  path?: string;
  error?: string;
  builtin?: Builtin;
  /**
   * Module type for this path.
   *
   * Enable with `ResolveOptions#moduleType`.
   *
   * The module type is computed `ESM_FILE_FORMAT` from the [ESM resolution algorithm specification](https://nodejs.org/docs/latest/api/esm.html#resolution-algorithm-specification).
   *
   *  The algorithm uses the file extension or finds the closest `package.json` with the `type` field.
   */
  moduleType?: ModuleType;
  /** `package.json` path for the given module. */
  packageJsonPath?: string;
}
/**
 * Alias Value for [ResolveOptions::alias] and [ResolveOptions::fallback].
 * Use struct because napi don't support structured union now
 */
interface Restriction {
  path?: string;
  regex?: string;
}
/**
 * Tsconfig Options
 *
 * Derived from [tsconfig-paths-webpack-plugin](https://github.com/dividab/tsconfig-paths-webpack-plugin#options)
 */
interface TsconfigOptions {
  /**
   * Allows you to specify where to find the TypeScript configuration file.
   * You may provide
   * * a relative path to the configuration file. It will be resolved relative to cwd.
   * * an absolute path to the configuration file.
   */
  configFile: string;
  /**
   * Support for Typescript Project References.
   *
   * * `'auto'`: use the `references` field from tsconfig of `config_file`.
   * * `string[]`: manually provided relative or absolute path.
   */
  references?: 'auto' | string[];
}
interface SourceMap {
  file?: string;
  mappings: string;
  names: Array<string>;
  sourceRoot?: string;
  sources: Array<string>;
  sourcesContent?: Array<string>;
  version: number;
  x_google_ignoreList?: Array<number>;
}
interface CompilerAssumptions {
  ignoreFunctionLength?: boolean;
  noDocumentAll?: boolean;
  objectRestNoSymbols?: boolean;
  pureGetters?: boolean;
  /**
   * When using public class fields, assume that they don't shadow any getter in the current class,
   * in its subclasses or in its superclass. Thus, it's safe to assign them rather than using
   * `Object.defineProperty`.
   *
   * For example:
   *
   * Input:
   * ```js
   * class Test {
   *  field = 2;
   *
   *  static staticField = 3;
   * }
   * ```
   *
   * When `set_public_class_fields` is `true`, the output will be:
   * ```js
   * class Test {
   *  constructor() {
   *    this.field = 2;
   *  }
   * }
   * Test.staticField = 3;
   * ```
   *
   * Otherwise, the output will be:
   * ```js
   * import _defineProperty from "@oxc-project/runtime/helpers/defineProperty";
   * class Test {
   *   constructor() {
   *     _defineProperty(this, "field", 2);
   *   }
   * }
   * _defineProperty(Test, "staticField", 3);
   * ```
   *
   * NOTE: For TypeScript, if you wanted behavior is equivalent to `useDefineForClassFields: false`, you should
   * set both `set_public_class_fields` and [`crate::TypeScriptOptions::remove_class_fields_without_initializer`]
   * to `true`.
   */
  setPublicClassFields?: boolean;
}
interface DecoratorOptions {
  /**
   * Enables experimental support for decorators, which is a version of decorators that predates the TC39 standardization process.
   *
   * Decorators are a language feature which hasn’t yet been fully ratified into the JavaScript specification.
   * This means that the implementation version in TypeScript may differ from the implementation in JavaScript when it it decided by TC39.
   *
   * @see https://www.typescriptlang.org/tsconfig/#experimentalDecorators
   * @default false
   */
  legacy?: boolean;
  /**
   * Enables emitting decorator metadata.
   *
   * This option the same as [emitDecoratorMetadata](https://www.typescriptlang.org/tsconfig/#emitDecoratorMetadata)
   * in TypeScript, and it only works when `legacy` is true.
   *
   * @see https://www.typescriptlang.org/tsconfig/#emitDecoratorMetadata
   * @default false
   */
  emitDecoratorMetadata?: boolean;
}
type HelperMode =
/**
* Runtime mode (default): Helper functions are imported from a runtime package.
*
* Example:
*
* ```js
* import helperName from "@oxc-project/runtime/helpers/helperName";
* helperName(...arguments);
* ```
*/
'Runtime' |
/**
 * External mode: Helper functions are accessed from a global `babelHelpers` object.
 *
 * Example:
 *
 * ```js
 * babelHelpers.helperName(...arguments);
 * ```
 */
'External';
interface Helpers {
  mode?: HelperMode;
}
/** TypeScript Isolated Declarations for Standalone DTS Emit */
declare function isolatedDeclaration(filename: string, sourceText: string, options?: IsolatedDeclarationsOptions | undefined | null): IsolatedDeclarationsResult;
interface IsolatedDeclarationsOptions {
  /**
   * Do not emit declarations for code that has an @internal annotation in its JSDoc comment.
   * This is an internal compiler option; use at your own risk, because the compiler does not check that the result is valid.
   *
   * Default: `false`
   *
   * See <https://www.typescriptlang.org/tsconfig/#stripInternal>
   */
  stripInternal?: boolean;
  sourcemap?: boolean;
}
interface IsolatedDeclarationsResult {
  code: string;
  map?: SourceMap;
  errors: Array<OxcError>;
}
/**
 * Configure how TSX and JSX are transformed.
 *
 * @see {@link https://babeljs.io/docs/babel-plugin-transform-react-jsx#options}
 */
interface JsxOptions {
  /**
   * Decides which runtime to use.
   *
   * - 'automatic' - auto-import the correct JSX factories
   * - 'classic' - no auto-import
   *
   * @default 'automatic'
   */
  runtime?: 'classic' | 'automatic';
  /**
   * Emit development-specific information, such as `__source` and `__self`.
   *
   * @default false
   *
   * @see {@link https://babeljs.io/docs/babel-plugin-transform-react-jsx-development}
   */
  development?: boolean;
  /**
   * Toggles whether or not to throw an error if an XML namespaced tag name
   * is used.
   *
   * Though the JSX spec allows this, it is disabled by default since React's
   * JSX does not currently have support for it.
   *
   * @default true
   */
  throwIfNamespace?: boolean;
  /**
   * Enables `@babel/plugin-transform-react-pure-annotations`.
   *
   * It will mark JSX elements and top-level React method calls as pure for tree shaking.
   *
   * @see {@link https://babeljs.io/docs/en/babel-plugin-transform-react-pure-annotations}
   *
   * @default true
   */
  pure?: boolean;
  /**
   * Replaces the import source when importing functions.
   *
   * @default 'react'
   */
  importSource?: string;
  /**
   * Replace the function used when compiling JSX expressions. It should be a
   * qualified name (e.g. `React.createElement`) or an identifier (e.g.
   * `createElement`).
   *
   * Only used for `classic` {@link runtime}.
   *
   * @default 'React.createElement'
   */
  pragma?: string;
  /**
   * Replace the component used when compiling JSX fragments. It should be a
   * valid JSX tag name.
   *
   * Only used for `classic` {@link runtime}.
   *
   * @default 'React.Fragment'
   */
  pragmaFrag?: string;
  /**
   * When spreading props, use `Object.assign` directly instead of an extend helper.
   *
   * Only used for `classic` {@link runtime}.
   *
   * @default false
   */
  useBuiltIns?: boolean;
  /**
   * When spreading props, use inline object with spread elements directly
   * instead of an extend helper or Object.assign.
   *
   * Only used for `classic` {@link runtime}.
   *
   * @default false
   */
  useSpread?: boolean;
  /**
   * Enable React Fast Refresh .
   *
   * Conforms to the implementation in {@link https://github.com/facebook/react/tree/v18.3.1/packages/react-refresh}
   *
   * @default false
   */
  refresh?: boolean | ReactRefreshOptions;
}
/**
 * Transform JavaScript code to a Vite Node runnable module.
 *
 * @param filename The name of the file being transformed.
 * @param sourceText the source code itself
 * @param options The options for the transformation. See {@link
 * ModuleRunnerTransformOptions} for more information.
 *
 * @returns an object containing the transformed code, source maps, and any
 * errors that occurred during parsing or transformation.
 *
 * @deprecated Only works for Vite.
 */
declare function moduleRunnerTransform(filename: string, sourceText: string, options?: ModuleRunnerTransformOptions | undefined | null): ModuleRunnerTransformResult;
interface ModuleRunnerTransformOptions {
  /**
   * Enable source map generation.
   *
   * When `true`, the `sourceMap` field of transform result objects will be populated.
   *
   * @default false
   *
   * @see {@link SourceMap}
   */
  sourcemap?: boolean;
}
interface ModuleRunnerTransformResult {
  /**
   * The transformed code.
   *
   * If parsing failed, this will be an empty string.
   */
  code: string;
  /**
   * The source map for the transformed code.
   *
   * This will be set if {@link TransformOptions#sourcemap} is `true`.
   */
  map?: SourceMap;
  deps: Array<string>;
  dynamicDeps: Array<string>;
  /**
   * Parse and transformation errors.
   *
   * Oxc's parser recovers from common syntax errors, meaning that
   * transformed code may still be available even if there are errors in this
   * list.
   */
  errors: Array<OxcError>;
}
interface PluginsOptions {
  styledComponents?: StyledComponentsOptions;
}
interface ReactRefreshOptions {
  /**
   * Specify the identifier of the refresh registration variable.
   *
   * @default `$RefreshReg$`.
   */
  refreshReg?: string;
  /**
   * Specify the identifier of the refresh signature variable.
   *
   * @default `$RefreshSig$`.
   */
  refreshSig?: string;
  emitFullSignatures?: boolean;
}
/**
 * Configure how styled-components are transformed.
 *
 * @see {@link https://styled-components.com/docs/tooling#babel-plugin}
 */
interface StyledComponentsOptions {
  /**
   * Enhances the attached CSS class name on each component with richer output to help
   * identify your components in the DOM without React DevTools.
   *
   * @default true
   */
  displayName?: boolean;
  /**
   * Controls whether the `displayName` of a component will be prefixed with the filename
   * to make the component name as unique as possible.
   *
   * @default true
   */
  fileName?: boolean;
  /**
   * Adds a unique identifier to every styled component to avoid checksum mismatches
   * due to different class generation on the client and server during server-side rendering.
   *
   * @default true
   */
  ssr?: boolean;
  /**
   * Transpiles styled-components tagged template literals to a smaller representation
   * than what Babel normally creates, helping to reduce bundle size.
   *
   * @default true
   */
  transpileTemplateLiterals?: boolean;
  /**
   * Minifies CSS content by removing all whitespace and comments from your CSS,
   * keeping valuable bytes out of your bundles.
   *
   * @default true
   */
  minify?: boolean;
  /**
   * Enables transformation of JSX `css` prop when using styled-components.
   *
   * **Note: This feature is not yet implemented in oxc.**
   *
   * @default true
   */
  cssProp?: boolean;
  /**
   * Enables "pure annotation" to aid dead code elimination by bundlers.
   *
   * @default false
   */
  pure?: boolean;
  /**
   * Adds a namespace prefix to component identifiers to ensure class names are unique.
   *
   * Example: With `namespace: "my-app"`, generates `componentId: "my-app__sc-3rfj0a-1"`
   */
  namespace?: string;
  /**
   * List of file names that are considered meaningless for component naming purposes.
   *
   * When the `fileName` option is enabled and a component is in a file with a name
   * from this list, the directory name will be used instead of the file name for
   * the component's display name.
   *
   * @default `["index"]`
   */
  meaninglessFileNames?: Array<string>;
  /**
   * Import paths to be considered as styled-components imports at the top level.
   *
   * **Note: This feature is not yet implemented in oxc.**
   */
  topLevelImportPaths?: Array<string>;
}
/**
 * Transpile a JavaScript or TypeScript into a target ECMAScript version.
 *
 * @param filename The name of the file being transformed. If this is a
 * relative path, consider setting the {@link TransformOptions#cwd} option..
 * @param sourceText the source code itself
 * @param options The options for the transformation. See {@link
 * TransformOptions} for more information.
 *
 * @returns an object containing the transformed code, source maps, and any
 * errors that occurred during parsing or transformation.
 */
declare function transform(filename: string, sourceText: string, options?: TransformOptions | undefined | null): TransformResult;
/**
 * Options for transforming a JavaScript or TypeScript file.
 *
 * @see {@link transform}
 */
interface TransformOptions {
  /** Treat the source text as `js`, `jsx`, `ts`, `tsx`, or `dts`. */
  lang?: 'js' | 'jsx' | 'ts' | 'tsx' | 'dts';
  /** Treat the source text as `script` or `module` code. */
  sourceType?: 'script' | 'module' | 'unambiguous' | undefined;
  /**
   * The current working directory. Used to resolve relative paths in other
   * options.
   */
  cwd?: string;
  /**
   * Enable source map generation.
   *
   * When `true`, the `sourceMap` field of transform result objects will be populated.
   *
   * @default false
   *
   * @see {@link SourceMap}
   */
  sourcemap?: boolean;
  /** Set assumptions in order to produce smaller output. */
  assumptions?: CompilerAssumptions;
  /** Configure how TypeScript is transformed. */
  typescript?: TypeScriptOptions;
  /** Configure how TSX and JSX are transformed. */
  jsx?: 'preserve' | JsxOptions;
  /**
   * Sets the target environment for the generated JavaScript.
   *
   * The lowest target is `es2015`.
   *
   * Example:
   *
   * * `'es2015'`
   * * `['es2020', 'chrome58', 'edge16', 'firefox57', 'node12', 'safari11']`
   *
   * @default `esnext` (No transformation)
   *
   * @see [esbuild#target](https://esbuild.github.io/api/#target)
   */
  target?: string | Array<string>;
  /** Behaviour for runtime helpers. */
  helpers?: Helpers;
  /** Define Plugin */
  define?: Record<string, string>;
  /** Inject Plugin */
  inject?: Record<string, string | [string, string]>;
  /** Decorator plugin */
  decorator?: DecoratorOptions;
  /** Third-party plugins to use. */
  plugins?: PluginsOptions;
}
interface TransformResult {
  /**
   * The transformed code.
   *
   * If parsing failed, this will be an empty string.
   */
  code: string;
  /**
   * The source map for the transformed code.
   *
   * This will be set if {@link TransformOptions#sourcemap} is `true`.
   */
  map?: SourceMap;
  /**
   * The `.d.ts` declaration file for the transformed code. Declarations are
   * only generated if `declaration` is set to `true` and a TypeScript file
   * is provided.
   *
   * If parsing failed and `declaration` is set, this will be an empty string.
   *
   * @see {@link TypeScriptOptions#declaration}
   * @see [declaration tsconfig option](https://www.typescriptlang.org/tsconfig/#declaration)
   */
  declaration?: string;
  /**
   * Declaration source map. Only generated if both
   * {@link TypeScriptOptions#declaration declaration} and
   * {@link TransformOptions#sourcemap sourcemap} are set to `true`.
   */
  declarationMap?: SourceMap;
  /**
   * Helpers used.
   *
   * @internal
   *
   * Example:
   *
   * ```text
   * { "_objectSpread": "@oxc-project/runtime/helpers/objectSpread2" }
   * ```
   */
  helpersUsed: Record<string, string>;
  /**
   * Parse and transformation errors.
   *
   * Oxc's parser recovers from common syntax errors, meaning that
   * transformed code may still be available even if there are errors in this
   * list.
   */
  errors: Array<OxcError>;
}
interface TypeScriptOptions {
  jsxPragma?: string;
  jsxPragmaFrag?: string;
  onlyRemoveTypeImports?: boolean;
  allowNamespaces?: boolean;
  /**
   * When enabled, type-only class fields are only removed if they are prefixed with the declare modifier:
   *
   * @deprecated
   *
   * Allowing `declare` fields is built-in support in Oxc without any option. If you want to remove class fields
   * without initializer, you can use `remove_class_fields_without_initializer: true` instead.
   */
  allowDeclareFields?: boolean;
  /**
   * When enabled, class fields without initializers are removed.
   *
   * For example:
   * ```ts
   * class Foo {
   *    x: number;
   *    y: number = 0;
   * }
   * ```
   * // transform into
   * ```js
   * class Foo {
   *    x: number;
   * }
   * ```
   *
   * The option is used to align with the behavior of TypeScript's `useDefineForClassFields: false` option.
   * When you want to enable this, you also need to set [`crate::CompilerAssumptions::set_public_class_fields`]
   * to `true`. The `set_public_class_fields: true` + `remove_class_fields_without_initializer: true` is
   * equivalent to `useDefineForClassFields: false` in TypeScript.
   *
   * When `set_public_class_fields` is true and class-properties plugin is enabled, the above example transforms into:
   *
   * ```js
   * class Foo {
   *   constructor() {
   *     this.y = 0;
   *   }
   * }
   * ```
   *
   * Defaults to `false`.
   */
  removeClassFieldsWithoutInitializer?: boolean;
  /**
   * Also generate a `.d.ts` declaration file for TypeScript files.
   *
   * The source file must be compliant with all
   * [`isolatedDeclarations`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations)
   * requirements.
   *
   * @default false
   */
  declaration?: IsolatedDeclarationsOptions;
  /**
   * Rewrite or remove TypeScript import/export declaration extensions.
   *
   * - When set to `rewrite`, it will change `.ts`, `.mts`, `.cts` extensions to `.js`, `.mjs`, `.cjs` respectively.
   * - When set to `remove`, it will remove `.ts`/`.mts`/`.cts`/`.tsx` extension entirely.
   * - When set to `true`, it's equivalent to `rewrite`.
   * - When set to `false` or omitted, no changes will be made to the extensions.
   *
   * @default false
   */
  rewriteImportExtensions?: 'rewrite' | 'remove' | boolean;
}
declare class BindingBundleEndEventData {
  output: string;
  duration: number;
  get result(): BindingWatcherBundler;
}
declare class BindingBundleErrorEventData {
  get result(): BindingWatcherBundler;
  get error(): Array<BindingError>;
}
declare class BindingMagicString {
  constructor(source: string);
  replace(from: string, to: string): void;
  replaceAll(from: string, to: string): void;
  prepend(content: string): void;
  append(content: string): void;
  prependLeft(index: number, content: string): void;
  prependRight(index: number, content: string): void;
  appendLeft(index: number, content: string): void;
  appendRight(index: number, content: string): void;
  overwrite(start: number, end: number, content: string): void;
  toString(): string;
  hasChanged(): boolean;
  length(): number;
  isEmpty(): boolean;
  remove(start: number, end: number): void;
  update(start: number, end: number, content: string): void;
  relocate(start: number, end: number, to: number): void;
  indent(indentor?: string | undefined | null): void;
}
declare class BindingRenderedChunk {
  get name(): string;
  get isEntry(): boolean;
  get isDynamicEntry(): boolean;
  get facadeModuleId(): string | null;
  get moduleIds(): Array<string>;
  get exports(): Array<string>;
  get fileName(): string;
  get modules(): BindingModules;
  get imports(): Array<string>;
  get dynamicImports(): Array<string>;
}
declare class BindingRenderedModule {
  get code(): string | null;
  get renderedExports(): Array<string>;
}
declare class BindingUrlResolver {
  call(url: string, importer?: string): Promise<[string, string | undefined]>;
}
/**
 * Minimal wrapper around the core `Bundler` for watcher events.
 * This is returned from watcher event data to allow access to the bundler instance.
 */
declare class BindingWatcherBundler {
  close(): Promise<void>;
}
declare class BindingWatcherChangeData {
  path: string;
  kind: string;
}
declare class BindingWatcherEvent {
  eventKind(): string;
  watchChangeData(): BindingWatcherChangeData;
  bundleEndData(): BindingBundleEndEventData;
  bundleEventKind(): string;
  bundleErrorData(): BindingBundleErrorEventData;
}
interface BindingAssetPluginConfig {
  isLib: boolean;
  isSsr: boolean;
  isWorker: boolean;
  urlBase: string;
  publicDir: string;
  decodedBase: string;
  isSkipAssets: boolean;
  assetsInclude: Array<BindingStringOrRegex>;
  assetInlineLimit: number | ((file: string, content: Buffer) => boolean | undefined);
  renderBuiltUrl?: (filename: string, type: BindingRenderBuiltUrlConfig) => undefined | string | BindingRenderBuiltUrlRet;
}
interface BindingBuildImportAnalysisPluginConfig {
  preloadCode: string;
  insertPreload: boolean;
  optimizeModulePreloadRelativePaths: boolean;
  renderBuiltUrl: boolean;
  isRelativeBase: boolean;
  v2?: BindingBuildImportAnalysisPluginV2Config;
}
interface BindingBuildImportAnalysisPluginV2Config {
  isSsr: boolean;
  urlBase: string;
  decodedBase: string;
  modulePreload: false | BindingModulePreloadOptions;
  renderBuiltUrl?: (filename: string, type: BindingRenderBuiltUrlConfig) => undefined | string | BindingRenderBuiltUrlRet;
}
type BindingBuiltinPluginName = 'builtin:alias' | 'builtin:asset' | 'builtin:asset-import-meta-url' | 'builtin:build-import-analysis' | 'builtin:dynamic-import-vars' | 'builtin:esm-external-require' | 'builtin:html-inline-proxy' | 'builtin:import-glob' | 'builtin:isolated-declaration' | 'builtin:json' | 'builtin:load-fallback' | 'builtin:manifest' | 'builtin:module-preload-polyfill' | 'builtin:react-refresh-wrapper' | 'builtin:reporter' | 'builtin:replace' | 'builtin:transform' | 'builtin:vite-css' | 'builtin:vite-css-post' | 'builtin:vite-html' | 'builtin:vite-resolve' | 'builtin:wasm-fallback' | 'builtin:wasm-helper' | 'builtin:web-worker-post';
interface BindingClientHmrUpdate {
  clientId: string;
  update: BindingHmrUpdate;
}
interface BindingDynamicImportVarsPluginConfig {
  include?: Array<BindingStringOrRegex>;
  exclude?: Array<BindingStringOrRegex>;
  resolver?: (id: string, importer: string) => MaybePromise<string | undefined>;
}
type BindingError = {
  type: 'JsError';
  field0: Error;
} | {
  type: 'NativeError';
  field0: NativeError;
};
interface BindingEsmExternalRequirePluginConfig {
  external: Array<BindingStringOrRegex>;
  skipDuplicateCheck?: boolean;
}
interface BindingHmrBoundaryOutput {
  boundary: string;
  acceptedVia: string;
}
type BindingHmrUpdate = {
  type: 'Patch';
  code: string;
  filename: string;
  sourcemap?: string;
  sourcemapFilename?: string;
  hmrBoundaries: Array<BindingHmrBoundaryOutput>;
} | {
  type: 'FullReload';
  reason?: string;
} | {
  type: 'Noop';
};
interface BindingHookResolveIdExtraArgs {
  custom?: number;
  isEntry: boolean;
  /**
   * - `import-statement`: `import { foo } from './lib.js';`
   * - `dynamic-import`: `import('./lib.js')`
   * - `require-call`: `require('./lib.js')`
   * - `import-rule`: `@import 'bg-color.css'`
   * - `url-token`: `url('./icon.png')`
   * - `new-url`: `new URL('./worker.js', import.meta.url)`
   * - `hot-accept`: `import.meta.hot.accept('./lib.js', () => {})`
   */
  kind: 'import-statement' | 'dynamic-import' | 'require-call' | 'import-rule' | 'url-token' | 'new-url' | 'hot-accept';
}
interface BindingImportGlobPluginConfig {
  root?: string;
  restoreQueryExtension?: boolean;
}
interface BindingIsolatedDeclarationPluginConfig {
  stripInternal?: boolean;
}
interface BindingJsonPluginConfig {
  minify?: boolean;
  namedExports?: boolean;
  stringify?: BindingJsonPluginStringify;
}
type BindingJsonPluginStringify = boolean | string;
interface BindingJsonSourcemap {
  file?: string;
  mappings?: string;
  sourceRoot?: string;
  sources?: Array<string | undefined | null>;
  sourcesContent?: Array<string | undefined | null>;
  names?: Array<string>;
  debugId?: string;
  x_google_ignoreList?: Array<number>;
}
interface BindingManifestPluginConfig {
  root: string;
  outPath: string;
  isLegacy?: () => boolean;
  cssEntries: () => Record<string, string>;
}
interface BindingModulePreloadOptions {
  polyfill: boolean;
  resolveDependencies?: (filename: string, deps: string[], context: {
    hostId: string;
    hostType: 'html' | 'js';
  }) => string[];
}
interface BindingModulePreloadPolyfillPluginConfig {
  isServer?: boolean;
}
interface BindingModules {
  values: Array<BindingRenderedModule>;
  keys: Array<string>;
}
interface BindingReactRefreshWrapperPluginConfig {
  cwd: string;
  include?: Array<BindingStringOrRegex>;
  exclude?: Array<BindingStringOrRegex>;
  jsxImportSource: string;
  reactRefreshHost: string;
}
declare enum BindingRebuildStrategy {
  Always = 0,
  Auto = 1,
  Never = 2,
}
interface BindingRenderBuiltUrlConfig {
  ssr: boolean;
  type: 'asset' | 'public';
  hostId: string;
  hostType: 'js' | 'css' | 'html';
}
interface BindingRenderBuiltUrlRet {
  relative?: boolean;
  runtime?: string;
}
interface BindingReplacePluginConfig {
  values: Record<string, string>;
  delimiters?: [string, string];
  preventAssignment?: boolean;
  objectGuards?: boolean;
  sourcemap?: boolean;
}
interface BindingReporterPluginConfig {
  isTty: boolean;
  isLib: boolean;
  assetsDir: string;
  chunkLimit: number;
  shouldLogInfo: boolean;
  warnLargeChunks: boolean;
  reportCompressedSize: boolean;
}
interface BindingSourcemap {
  inner: string | BindingJsonSourcemap;
}
interface BindingTransformHookExtraArgs {
  moduleType: string;
}
interface BindingTransformPluginConfig {
  include?: Array<BindingStringOrRegex>;
  exclude?: Array<BindingStringOrRegex>;
  jsxRefreshInclude?: Array<BindingStringOrRegex>;
  jsxRefreshExclude?: Array<BindingStringOrRegex>;
  isServerConsumer?: boolean;
  jsxInject?: string;
  transformOptions?: TransformOptions;
}
interface BindingViteCssPluginConfig {
  isLib: boolean;
  publicDir: string;
  compileCSS: (url: string, importer: string, resolver: BindingUrlResolver) => Promise<{
    code: string;
    map?: BindingSourcemap;
    modules?: Record<string, string>;
    deps?: Set<string>;
  }>;
  resolveUrl: (url: string, importer?: string) => MaybePromise<string | undefined>;
  assetInlineLimit: number | ((file: string, content: Buffer) => boolean | undefined);
}
interface BindingViteCssPostPluginConfig {
  isLib: boolean;
  isSsr: boolean;
  isWorker: boolean;
  isClient: boolean;
  cssCodeSplit: boolean;
  sourcemap: boolean;
  assetsDir: string;
  urlBase: string;
  decodedBase: string;
  libCssFilename?: string;
  isLegacy?: () => boolean;
  cssMinify?: (css: string) => Promise<string>;
  renderBuiltUrl?: (filename: string, type: BindingRenderBuiltUrlConfig) => undefined | string | BindingRenderBuiltUrlRet;
}
interface BindingViteHtmlPluginConfig {
  isLib: boolean;
  isSsr: boolean;
  urlBase: string;
  publicDir: string;
  decodedBase: string;
  cssCodeSplit: boolean;
  modulePreload: false | BindingModulePreloadOptions;
  assetInlineLimit: number | ((file: string, content: Buffer) => boolean | undefined);
  renderBuiltUrl?: (filename: string, type: BindingRenderBuiltUrlConfig) => undefined | string | BindingRenderBuiltUrlRet;
}
interface BindingViteResolvePluginConfig {
  resolveOptions: BindingViteResolvePluginResolveOptions;
  environmentConsumer: string;
  environmentName: string;
  builtins: Array<BindingStringOrRegex>;
  external: true | string[];
  noExternal: true | Array<string | RegExp>;
  dedupe: Array<string>;
  legacyInconsistentCjsInterop?: boolean;
  finalizeBareSpecifier?: (resolvedId: string, rawId: string, importer: string | null | undefined) => VoidNullable<string>;
  finalizeOtherSpecifiers?: (resolvedId: string, rawId: string) => VoidNullable<string>;
  resolveSubpathImports: (id: string, importer: string, isRequire: boolean, scan: boolean) => VoidNullable<string>;
  onWarn?: (message: string) => void;
  onDebug?: (message: string) => void;
}
interface BindingViteResolvePluginResolveOptions {
  isBuild: boolean;
  isProduction: boolean;
  asSrc: boolean;
  preferRelative: boolean;
  isRequire?: boolean;
  root: string;
  scan: boolean;
  mainFields: Array<string>;
  conditions: Array<string>;
  externalConditions: Array<string>;
  extensions: Array<string>;
  tryIndex: boolean;
  tryPrefix?: string;
  preserveSymlinks: boolean;
  tsconfigPaths: boolean;
}
interface BindingWasmHelperPluginConfig {
  decodedBase: string;
}
interface ExternalMemoryStatus {
  freed: boolean;
  reason?: string;
}
/** Error emitted from native side, it only contains kind and message, no stack trace. */
interface NativeError {
  kind: string;
  message: string;
}
interface PreRenderedChunk {
  name: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  facadeModuleId?: string;
  moduleIds: Array<string>;
  exports: Array<string>;
}
//#endregion
export { IsolatedDeclarationsOptions as A, ResolverFactory as B, BindingViteCssPostPluginConfig as C, BindingWatcherBundler as D, BindingWasmHelperPluginConfig as E, NapiResolveOptions as F, moduleRunnerTransform as G, TransformResult as H, ParseResult as I, transform as J, parseAsync as K, ParserOptions as L, JsxOptions as M, MinifyOptions as N, BindingWatcherEvent as O, MinifyResult as P, PreRenderedChunk as R, BindingViteCssPluginConfig as S, BindingViteResolvePluginConfig as T, isolatedDeclaration as U, TransformOptions as V, minify as W, BindingReplacePluginConfig as _, BindingDynamicImportVarsPluginConfig as a, BindingTransformPluginConfig as b, BindingImportGlobPluginConfig as c, BindingMagicString as d, BindingManifestPluginConfig as f, BindingRenderedChunk as g, BindingRebuildStrategy as h, BindingClientHmrUpdate as i, IsolatedDeclarationsResult as j, ExternalMemoryStatus as k, BindingIsolatedDeclarationPluginConfig as l, BindingReactRefreshWrapperPluginConfig as m, BindingBuildImportAnalysisPluginConfig as n, BindingEsmExternalRequirePluginConfig as o, BindingModulePreloadPolyfillPluginConfig as p, parseSync as q, BindingBuiltinPluginName as r, BindingHookResolveIdExtraArgs as s, BindingAssetPluginConfig as t, BindingJsonPluginConfig as u, BindingReporterPluginConfig as v, BindingViteHtmlPluginConfig as w, BindingUrlResolver as x, BindingTransformHookExtraArgs as y, ResolveResult as z };