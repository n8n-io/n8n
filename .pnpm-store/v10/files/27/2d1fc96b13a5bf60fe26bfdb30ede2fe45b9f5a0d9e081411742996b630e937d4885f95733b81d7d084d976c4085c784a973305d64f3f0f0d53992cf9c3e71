/**
 * @deprecated This interface will be replaced with {@link TsConfigJson.CompilerOptions} in the next major release.
 */
export interface RawCompilerOptions {
    /**
     * Enable importing files with any extension, provided a declaration file is present.
     */
    allowArbitraryExtensions?: boolean | null;
    /**
     * Allow imports to include TypeScript file extensions. Requires '--moduleResolution bundler' and either '--noEmit' or '--emitDeclarationOnly' to be set.
     */
    allowImportingTsExtensions?: boolean | null;
    /**
     * No longer supported. In early versions, manually set the text encoding for reading files.
     */
    charset?: string | null;
    /**
     * Enable constraints that allow a TypeScript project to be used with project references.
     */
    composite?: boolean | null;
    /**
     * Conditions to set in addition to the resolver-specific defaults when resolving imports.
     */
    customConditions?: Array<string | null> | null;
    /**
     * Generate .d.ts files from TypeScript and JavaScript files in your project.
     */
    declaration?: boolean | null;
    /**
     * Specify the output directory for generated declaration files.
     */
    declarationDir?: string | null;
    /**
     * Output compiler performance information after building.
     */
    diagnostics?: boolean | null;
    /**
     * Reduce the number of projects loaded automatically by TypeScript.
     */
    disableReferencedProjectLoad?: boolean | null;
    /**
     * Enforces using indexed accessors for keys declared using an indexed type
     */
    noPropertyAccessFromIndexSignature?: boolean | null;
    /**
     * Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files.
     */
    emitBOM?: boolean | null;
    /**
     * Only output d.ts files and not JavaScript files.
     */
    emitDeclarationOnly?: boolean | null;
    /**
     * Differentiate between undefined and not present when type checking
     */
    exactOptionalPropertyTypes?: boolean | null;
    /**
     * Enable incremental compilation. Requires TypeScript version 3.4 or later.
     */
    incremental?: boolean | null;
    /**
     * Specify the folder for .tsbuildinfo incremental compilation files.
     */
    tsBuildInfoFile?: string | null;
    /**
     * Include sourcemap files inside the emitted JavaScript.
     */
    inlineSourceMap?: boolean | null;
    /**
     * Include source code in the sourcemaps inside the emitted JavaScript.
     */
    inlineSources?: boolean | null;
    /**
     * Specify what JSX code is generated.
     */
    jsx?: 'preserve' | 'react' | 'react-jsx' | 'react-jsxdev' | 'react-native';
    /**
     * Specify the object invoked for `createElement`. This only applies when targeting `react` JSX emit.
     */
    reactNamespace?: string | null;
    /**
     * Specify the JSX factory function used when targeting React JSX emit, e.g. 'React.createElement' or 'h'
     */
    jsxFactory?: string | null;
    /**
     * Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g. 'React.Fragment' or 'Fragment'.
     */
    jsxFragmentFactory?: string | null;
    /**
     * Specify module specifier used to import the JSX factory functions when using `jsx: react-jsx`.
     */
    jsxImportSource?: string | null;
    /**
     * Print all of the files read during the compilation.
     */
    listFiles?: boolean | null;
    /**
     * Specify the location where debugger should locate map files instead of generated locations.
     */
    mapRoot?: string | null;
    /**
     * Specify what module code is generated.
     */
    module?: ('CommonJS' | 'AMD' | 'System' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext' | 'None' | 'ES2022' | 'Node16' | 'NodeNext' | 'Preserve') & (((('CommonJS' | 'AMD' | 'System' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext' | 'None' | 'ES2022' | 'Node16' | 'NodeNext' | 'Preserve') | {
        [k: string]: unknown;
    }) & string) | ((('CommonJS' | 'AMD' | 'System' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext' | 'None' | 'ES2022' | 'Node16' | 'NodeNext' | 'Preserve') | {
        [k: string]: unknown;
    }) & null));
    /**
     * Specify how TypeScript looks up a file from a given module specifier.
     */
    moduleResolution?: ('Classic' | 'Node' | 'Node10' | 'Node16' | 'NodeNext' | 'Bundler') & (((('Classic' | 'Node' | 'Node10' | 'Node16' | 'NodeNext' | 'Bundler') | {
        [k: string]: unknown;
    }) & string) | ((('Classic' | 'Node' | 'Node10' | 'Node16' | 'NodeNext' | 'Bundler') | {
        [k: string]: unknown;
    }) & null));
    /**
     * Set the newline character for emitting files.
     */
    newLine?: ('crlf' | 'lf') & (((('crlf' | 'lf') | {
        [k: string]: unknown;
    }) & string) | ((('crlf' | 'lf') | {
        [k: string]: unknown;
    }) & null));
    /**
     * Disable emitting file from a compilation.
     */
    noEmit?: boolean | null;
    /**
     * Disable generating custom helper functions like `__extends` in compiled output.
     */
    noEmitHelpers?: boolean | null;
    /**
     * Disable emitting files if any type checking errors are reported.
     */
    noEmitOnError?: boolean | null;
    /**
     * Enable error reporting for expressions and declarations with an implied `any` type..
     */
    noImplicitAny?: boolean | null;
    /**
     * Enable error reporting when `this` is given the type `any`.
     */
    noImplicitThis?: boolean | null;
    /**
     * Enable error reporting when a local variables aren't read.
     */
    noUnusedLocals?: boolean | null;
    /**
     * Raise an error when a function parameter isn't read
     */
    noUnusedParameters?: boolean | null;
    /**
     * Disable including any library files, including the default lib.d.ts.
     */
    noLib?: boolean | null;
    /**
     * Disallow `import`s, `require`s or `<reference>`s from expanding the number of files TypeScript should add to a project.
     */
    noResolve?: boolean | null;
    /**
     * Disable strict checking of generic signatures in function types.
     */
    noStrictGenericChecks?: boolean | null;
    /**
     * Skip type checking .d.ts files that are included with TypeScript.
     */
    skipDefaultLibCheck?: boolean | null;
    /**
     * Skip type checking all .d.ts files.
     */
    skipLibCheck?: boolean | null;
    /**
     * Specify a file that bundles all outputs into one JavaScript file. If `declaration` is true, also designates a file that bundles all .d.ts output.
     */
    outFile?: string | null;
    /**
     * Specify an output folder for all emitted files.
     */
    outDir?: string | null;
    /**
     * Disable erasing `const enum` declarations in generated code.
     */
    preserveConstEnums?: boolean | null;
    /**
     * Disable resolving symlinks to their realpath. This correlates to the same flag in node.
     */
    preserveSymlinks?: boolean | null;
    /**
     * Preserve unused imported values in the JavaScript output that would otherwise be removed
     */
    preserveValueImports?: boolean | null;
    /**
     * Disable wiping the console in watch mode
     */
    preserveWatchOutput?: boolean | null;
    /**
     * Enable color and formatting in output to make compiler errors easier to read
     */
    pretty?: boolean | null;
    /**
     * Disable emitting comments.
     */
    removeComments?: boolean | null;
    /**
     * Specify the root folder within your source files.
     */
    rootDir?: string | null;
    /**
     * Ensure that each file can be safely transpiled without relying on other imports.
     */
    isolatedModules?: boolean | null;
    /**
     * Create source map files for emitted JavaScript files.
     */
    sourceMap?: boolean | null;
    /**
     * Specify the root path for debuggers to find the reference source code.
     */
    sourceRoot?: string | null;
    /**
     * Disable reporting of excess property errors during the creation of object literals.
     */
    suppressExcessPropertyErrors?: boolean | null;
    /**
     * Suppress `noImplicitAny` errors when indexing objects that lack index signatures.
     */
    suppressImplicitAnyIndexErrors?: boolean | null;
    /**
     * Set the JavaScript language version for emitted JavaScript and include compatible library declarations.
     */
    target?: ('ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ESNext') & (((('ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ESNext') | {
        [k: string]: unknown;
    }) & string) | ((('ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022' | 'ES2023' | 'ESNext') | {
        [k: string]: unknown;
    }) & null));
    /**
     * Default catch clause variables as `unknown` instead of `any`.
     */
    useUnknownInCatchVariables?: boolean | null;
    /**
     * Watch input files.
     */
    watch?: boolean | null;
    /**
     * Specify the polling strategy to use when the system runs out of or doesn't support native file watchers. Requires TypeScript version 3.8 or later.
     */
    fallbackPolling?: 'fixedPollingInterval' | 'priorityPollingInterval' | 'dynamicPriorityPolling' | 'fixedInterval' | 'priorityInterval' | 'dynamicPriority' | 'fixedChunkSize';
    /**
     * Specify the strategy for watching directories under systems that lack recursive file-watching functionality. Requires TypeScript version 3.8 or later.
     */
    watchDirectory?: 'useFsEvents' | 'fixedPollingInterval' | 'dynamicPriorityPolling' | 'fixedChunkSizePolling';
    /**
     * Specify the strategy for watching individual files. Requires TypeScript version 3.8 or later.
     */
    watchFile?: 'fixedPollingInterval' | 'priorityPollingInterval' | 'dynamicPriorityPolling' | 'useFsEvents' | 'useFsEventsOnParentDirectory' | 'fixedChunkSizePolling';
    /**
     * Enable experimental support for TC39 stage 2 draft decorators.
     */
    experimentalDecorators?: boolean | null;
    /**
     * Emit design-type metadata for decorated declarations in source files.
     */
    emitDecoratorMetadata?: boolean | null;
    /**
     * Disable error reporting for unused labels.
     */
    allowUnusedLabels?: boolean | null;
    /**
     * Enable error reporting for codepaths that do not explicitly return in a function.
     */
    noImplicitReturns?: boolean | null;
    /**
     * Add `undefined` to a type when accessed using an index.
     */
    noUncheckedIndexedAccess?: boolean | null;
    /**
     * Enable error reporting for fallthrough cases in switch statements.
     */
    noFallthroughCasesInSwitch?: boolean | null;
    /**
     * Ensure overriding members in derived classes are marked with an override modifier.
     */
    noImplicitOverride?: boolean | null;
    /**
     * Disable error reporting for unreachable code.
     */
    allowUnreachableCode?: boolean | null;
    /**
     * Ensure that casing is correct in imports.
     */
    forceConsistentCasingInFileNames?: boolean | null;
    /**
     * Emit a v8 CPU profile of the compiler run for debugging.
     */
    generateCpuProfile?: string | null;
    /**
     * Specify the base directory to resolve non-relative module names.
     */
    baseUrl?: string | null;
    /**
     * Specify a set of entries that re-map imports to additional lookup locations.
     */
    paths?: {
        [k: string]: Array<string | null> | null;
    } | null;
    /**
     * Specify a list of language service plugins to include.
     */
    plugins?: Array<{
        /**
         * Plugin name.
         */
        name?: string | null;
        [k: string]: unknown;
    } | null> | null;
    /**
     * Allow multiple folders to be treated as one when resolving modules.
     */
    rootDirs?: Array<string | null> | null;
    /**
     * Specify multiple folders that act like `./node_modules/@types`.
     */
    typeRoots?: Array<string | null> | null;
    /**
     * Specify type package names to be included without being referenced in a source file.
     */
    types?: Array<string | null> | null;
    /**
     * Enable tracing of the name resolution process. Requires TypeScript version 2.0 or later.
     */
    traceResolution?: boolean | null;
    /**
     * Allow JavaScript files to be a part of your program. Use the `checkJS` option to get errors from these files.
     */
    allowJs?: boolean | null;
    /**
     * Disable truncating types in error messages.
     */
    noErrorTruncation?: boolean | null;
    /**
     * Allow 'import x from y' when a module doesn't have a default export.
     */
    allowSyntheticDefaultImports?: boolean | null;
    /**
     * Disable adding 'use strict' directives in emitted JavaScript files.
     */
    noImplicitUseStrict?: boolean | null;
    /**
     * Print the names of emitted files after a compilation.
     */
    listEmittedFiles?: boolean | null;
    /**
     * Remove the 20mb cap on total source code size for JavaScript files in the TypeScript language server.
     */
    disableSizeLimit?: boolean | null;
    /**
     * Specify a set of bundled library declaration files that describe the target runtime environment.
     */
    lib?: Array<(('ES5' | 'ES6' | 'ES2015' | 'ES2015.Collection' | 'ES2015.Core' | 'ES2015.Generator' | 'ES2015.Iterable' | 'ES2015.Promise' | 'ES2015.Proxy' | 'ES2015.Reflect' | 'ES2015.Symbol.WellKnown' | 'ES2015.Symbol' | 'ES2016' | 'ES2016.Array.Include' | 'ES2017' | 'ES2017.Intl' | 'ES2017.Object' | 'ES2017.SharedMemory' | 'ES2017.String' | 'ES2017.TypedArrays' | 'ES2018' | 'ES2018.AsyncGenerator' | 'ES2018.AsyncIterable' | 'ES2018.Intl' | 'ES2018.Promise' | 'ES2018.Regexp' | 'ES2019' | 'ES2019.Array' | 'ES2019.Intl' | 'ES2019.Object' | 'ES2019.String' | 'ES2019.Symbol' | 'ES2020' | 'ES2020.BigInt' | 'ES2020.Promise' | 'ES2020.String' | 'ES2020.Symbol.WellKnown' | 'ESNext' | 'ESNext.Array' | 'ESNext.AsyncIterable' | 'ESNext.BigInt' | 'ESNext.Intl' | 'ESNext.Promise' | 'ESNext.String' | 'ESNext.Symbol' | 'DOM' | 'DOM.AsyncIterable' | 'DOM.Iterable' | 'ScriptHost' | 'WebWorker' | 'WebWorker.AsyncIterable' | 'WebWorker.ImportScripts' | 'Webworker.Iterable' | 'ES7' | 'ES2021' | 'ES2020.SharedMemory' | 'ES2020.Intl' | 'ES2020.Date' | 'ES2020.Number' | 'ES2021.Promise' | 'ES2021.String' | 'ES2021.WeakRef' | 'ESNext.WeakRef' | 'ES2021.Intl' | 'ES2022' | 'ES2022.Array' | 'ES2022.Error' | 'ES2022.Intl' | 'ES2022.Object' | 'ES2022.String' | 'ES2022.SharedMemory' | 'ES2022.RegExp' | 'ES2023' | 'ES2023.Array' | 'Decorators' | 'Decorators.Legacy' | 'ES2017.Date' | 'ES2023.Collection' | 'ESNext.Decorators' | 'ESNext.Disposable') | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    }) & (((('ES5' | 'ES6' | 'ES2015' | 'ES2015.Collection' | 'ES2015.Core' | 'ES2015.Generator' | 'ES2015.Iterable' | 'ES2015.Promise' | 'ES2015.Proxy' | 'ES2015.Reflect' | 'ES2015.Symbol.WellKnown' | 'ES2015.Symbol' | 'ES2016' | 'ES2016.Array.Include' | 'ES2017' | 'ES2017.Intl' | 'ES2017.Object' | 'ES2017.SharedMemory' | 'ES2017.String' | 'ES2017.TypedArrays' | 'ES2018' | 'ES2018.AsyncGenerator' | 'ES2018.AsyncIterable' | 'ES2018.Intl' | 'ES2018.Promise' | 'ES2018.Regexp' | 'ES2019' | 'ES2019.Array' | 'ES2019.Intl' | 'ES2019.Object' | 'ES2019.String' | 'ES2019.Symbol' | 'ES2020' | 'ES2020.BigInt' | 'ES2020.Promise' | 'ES2020.String' | 'ES2020.Symbol.WellKnown' | 'ESNext' | 'ESNext.Array' | 'ESNext.AsyncIterable' | 'ESNext.BigInt' | 'ESNext.Intl' | 'ESNext.Promise' | 'ESNext.String' | 'ESNext.Symbol' | 'DOM' | 'DOM.AsyncIterable' | 'DOM.Iterable' | 'ScriptHost' | 'WebWorker' | 'WebWorker.AsyncIterable' | 'WebWorker.ImportScripts' | 'Webworker.Iterable' | 'ES7' | 'ES2021' | 'ES2020.SharedMemory' | 'ES2020.Intl' | 'ES2020.Date' | 'ES2020.Number' | 'ES2021.Promise' | 'ES2021.String' | 'ES2021.WeakRef' | 'ESNext.WeakRef' | 'ES2021.Intl' | 'ES2022' | 'ES2022.Array' | 'ES2022.Error' | 'ES2022.Intl' | 'ES2022.Object' | 'ES2022.String' | 'ES2022.SharedMemory' | 'ES2022.RegExp' | 'ES2023' | 'ES2023.Array' | 'Decorators' | 'Decorators.Legacy' | 'ES2017.Date' | 'ES2023.Collection' | 'ESNext.Decorators' | 'ESNext.Disposable') | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    }) & string) | ((('ES5' | 'ES6' | 'ES2015' | 'ES2015.Collection' | 'ES2015.Core' | 'ES2015.Generator' | 'ES2015.Iterable' | 'ES2015.Promise' | 'ES2015.Proxy' | 'ES2015.Reflect' | 'ES2015.Symbol.WellKnown' | 'ES2015.Symbol' | 'ES2016' | 'ES2016.Array.Include' | 'ES2017' | 'ES2017.Intl' | 'ES2017.Object' | 'ES2017.SharedMemory' | 'ES2017.String' | 'ES2017.TypedArrays' | 'ES2018' | 'ES2018.AsyncGenerator' | 'ES2018.AsyncIterable' | 'ES2018.Intl' | 'ES2018.Promise' | 'ES2018.Regexp' | 'ES2019' | 'ES2019.Array' | 'ES2019.Intl' | 'ES2019.Object' | 'ES2019.String' | 'ES2019.Symbol' | 'ES2020' | 'ES2020.BigInt' | 'ES2020.Promise' | 'ES2020.String' | 'ES2020.Symbol.WellKnown' | 'ESNext' | 'ESNext.Array' | 'ESNext.AsyncIterable' | 'ESNext.BigInt' | 'ESNext.Intl' | 'ESNext.Promise' | 'ESNext.String' | 'ESNext.Symbol' | 'DOM' | 'DOM.AsyncIterable' | 'DOM.Iterable' | 'ScriptHost' | 'WebWorker' | 'WebWorker.AsyncIterable' | 'WebWorker.ImportScripts' | 'Webworker.Iterable' | 'ES7' | 'ES2021' | 'ES2020.SharedMemory' | 'ES2020.Intl' | 'ES2020.Date' | 'ES2020.Number' | 'ES2021.Promise' | 'ES2021.String' | 'ES2021.WeakRef' | 'ESNext.WeakRef' | 'ES2021.Intl' | 'ES2022' | 'ES2022.Array' | 'ES2022.Error' | 'ES2022.Intl' | 'ES2022.Object' | 'ES2022.String' | 'ES2022.SharedMemory' | 'ES2022.RegExp' | 'ES2023' | 'ES2023.Array' | 'Decorators' | 'Decorators.Legacy' | 'ES2017.Date' | 'ES2023.Collection' | 'ESNext.Decorators' | 'ESNext.Disposable') | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    } | {
        [k: string]: unknown;
    }) & null))> | null;
    /**
     * Specify how TypeScript determine a file as module.
     */
    moduleDetection?: 'auto' | 'legacy' | 'force';
    /**
     * When type checking, take into account `null` and `undefined`.
     */
    strictNullChecks?: boolean | null;
    /**
     * Specify the maximum folder depth used for checking JavaScript files from `node_modules`. Only applicable with `allowJs`.
     */
    maxNodeModuleJsDepth?: number | null;
    /**
     * Allow importing helper functions from tslib once per project, instead of including them per-file.
     */
    importHelpers?: boolean | null;
    /**
     * Specify emit/checking behavior for imports that are only used for types.
     */
    importsNotUsedAsValues?: 'remove' | 'preserve' | 'error';
    /**
     * Ensure 'use strict' is always emitted.
     */
    alwaysStrict?: boolean | null;
    /**
     * Enable all strict type checking options.
     */
    strict?: boolean | null;
    /**
     * Check that the arguments for `bind`, `call`, and `apply` methods match the original function.
     */
    strictBindCallApply?: boolean | null;
    /**
     * Emit more compliant, but verbose and less performant JavaScript for iteration.
     */
    downlevelIteration?: boolean | null;
    /**
     * Enable error reporting in type-checked JavaScript files.
     */
    checkJs?: boolean | null;
    /**
     * When assigning functions, check to ensure parameters and the return values are subtype-compatible.
     */
    strictFunctionTypes?: boolean | null;
    /**
     * Check for class properties that are declared but not set in the constructor.
     */
    strictPropertyInitialization?: boolean | null;
    /**
     * Emit additional JavaScript to ease support for importing CommonJS modules. This enables `allowSyntheticDefaultImports` for type compatibility.
     */
    esModuleInterop?: boolean | null;
    /**
     * Allow accessing UMD globals from modules.
     */
    allowUmdGlobalAccess?: boolean | null;
    /**
     * Make keyof only return strings instead of string, numbers or symbols. Legacy option.
     */
    keyofStringsOnly?: boolean | null;
    /**
     * Emit ECMAScript-standard-compliant class fields.
     */
    useDefineForClassFields?: boolean | null;
    /**
     * Create sourcemaps for d.ts files.
     */
    declarationMap?: boolean | null;
    /**
     * Enable importing .json files
     */
    resolveJsonModule?: boolean | null;
    /**
     * Use the package.json 'exports' field when resolving package imports.
     */
    resolvePackageJsonExports?: boolean | null;
    /**
     * Use the package.json 'imports' field when resolving imports.
     */
    resolvePackageJsonImports?: boolean | null;
    /**
     * Have recompiles in '--incremental' and '--watch' assume that changes within a file will only affect files directly depending on it. Requires TypeScript version 3.8 or later.
     */
    assumeChangesOnlyAffectDirectDependencies?: boolean | null;
    /**
     * Output more detailed compiler performance information after building.
     */
    extendedDiagnostics?: boolean | null;
    /**
     * Print names of files that are part of the compilation and then stop processing.
     */
    listFilesOnly?: boolean | null;
    /**
     * Disable preferring source files instead of declaration files when referencing composite projects
     */
    disableSourceOfProjectReferenceRedirect?: boolean | null;
    /**
     * Opt a project out of multi-project reference checking when editing.
     */
    disableSolutionSearching?: boolean | null;
    /**
     * Do not transform or elide any imports or exports not marked as type-only, ensuring they are written in the output file's format based on the 'module' setting.
     */
    verbatimModuleSyntax?: boolean | null;
    [k: string]: unknown;
}
