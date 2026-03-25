export interface RawCompilerOptions {
    /**
     * No longer supported. In early versions, manually set the text encoding for reading files.
     */
    charset?: string;
    /**
     * Enable constraints that allow a TypeScript project to be used with project references.
     */
    composite?: boolean;
    /**
     * Generate .d.ts files from TypeScript and JavaScript files in your project.
     */
    declaration?: boolean;
    /**
     * Specify the output directory for generated declaration files.
     */
    declarationDir?: string | null;
    /**
     * Output compiler performance information after building.
     */
    diagnostics?: boolean;
    /**
     * Reduce the number of projects loaded automatically by TypeScript.
     */
    disableReferencedProjectLoad?: boolean;
    /**
     * Enforces using indexed accessors for keys declared using an indexed type
     */
    noPropertyAccessFromIndexSignature?: boolean;
    /**
     * Emit a UTF-8 Byte Order Mark (BOM) in the beginning of output files.
     */
    emitBOM?: boolean;
    /**
     * Only output d.ts files and not JavaScript files.
     */
    emitDeclarationOnly?: boolean;
    /**
     * Save .tsbuildinfo files to allow for incremental compilation of projects.
     */
    incremental?: boolean;
    /**
     * Specify the folder for .tsbuildinfo incremental compilation files.
     */
    tsBuildInfoFile?: string;
    /**
     * Include sourcemap files inside the emitted JavaScript.
     */
    inlineSourceMap?: boolean;
    /**
     * Include source code in the sourcemaps inside the emitted JavaScript.
     */
    inlineSources?: boolean;
    /**
     * Specify what JSX code is generated.
     */
    jsx?: 'preserve' | 'react' | 'react-jsx' | 'react-jsxdev' | 'react-native';
    /**
     * Specify the object invoked for `createElement`. This only applies when targeting `react` JSX emit.
     */
    reactNamespace?: string;
    /**
     * Specify the JSX factory function used when targeting React JSX emit, e.g. 'React.createElement' or 'h'
     */
    jsxFactory?: string;
    /**
     * Specify the JSX Fragment reference used for fragments when targeting React JSX emit e.g. 'React.Fragment' or 'Fragment'.
     */
    jsxFragmentFactory?: string;
    /**
     * Specify module specifier used to import the JSX factory functions when using `jsx: react-jsx*`.`
     */
    jsxImportSource?: string;
    /**
     * Print all of the files read during the compilation.
     */
    listFiles?: boolean;
    /**
     * Specify the location where debugger should locate map files instead of generated locations.
     */
    mapRoot?: string;
    /**
     * Specify what module code is generated.
     */
    module?: ('CommonJS' | 'AMD' | 'System' | 'UMD' | 'ES6' | 'ES2015' | 'ES2020' | 'ESNext' | 'None') | string;
    /**
     * Specify how TypeScript looks up a file from a given module specifier.
     */
    moduleResolution?: ('Classic' | 'Node') | string;
    /**
     * Set the newline character for emitting files.
     */
    newLine?: ('crlf' | 'lf') | string;
    /**
     * Disable emitting file from a compilation.
     */
    noEmit?: boolean;
    /**
     * Disable generating custom helper functions like `__extends` in compiled output.
     */
    noEmitHelpers?: boolean;
    /**
     * Disable emitting files if any type checking errors are reported.
     */
    noEmitOnError?: boolean;
    /**
     * Enable error reporting for expressions and declarations with an implied `any` type..
     */
    noImplicitAny?: boolean;
    /**
     * Enable error reporting when `this` is given the type `any`.
     */
    noImplicitThis?: boolean;
    /**
     * Enable error reporting when a local variables aren't read.
     */
    noUnusedLocals?: boolean;
    /**
     * Raise an error when a function parameter isn't read
     */
    noUnusedParameters?: boolean;
    /**
     * Disable including any library files, including the default lib.d.ts.
     */
    noLib?: boolean;
    /**
     * Disallow `import`s, `require`s or `<reference>`s from expanding the number of files TypeScript should add to a project.
     */
    noResolve?: boolean;
    /**
     * Disable strict checking of generic signatures in function types.
     */
    noStrictGenericChecks?: boolean;
    /**
     * Skip type checking .d.ts files that are included with TypeScript.
     */
    skipDefaultLibCheck?: boolean;
    /**
     * Skip type checking all .d.ts files.
     */
    skipLibCheck?: boolean;
    /**
     * Specify a file that bundles all outputs into one JavaScript file. If `declaration` is true, also designates a file that bundles all .d.ts output.
     */
    outFile?: string;
    /**
     * Specify an output folder for all emitted files.
     */
    outDir?: string;
    /**
     * Disable erasing `const enum` declarations in generated code.
     */
    preserveConstEnums?: boolean;
    /**
     * Disable resolving symlinks to their realpath. This correlates to the same flag in node.
     */
    preserveSymlinks?: boolean;
    /**
     * Disable wiping the console in watch mode
     */
    preserveWatchOutput?: boolean;
    /**
     * Enable color and formatting in output to make compiler errors easier to read
     */
    pretty?: boolean;
    /**
     * Disable emitting comments.
     */
    removeComments?: boolean;
    /**
     * Specify the root folder within your source files.
     */
    rootDir?: string;
    /**
     * Ensure that each file can be safely transpiled without relying on other imports.
     */
    isolatedModules?: boolean;
    /**
     * Create source map files for emitted JavaScript files.
     */
    sourceMap?: boolean;
    /**
     * Specify the root path for debuggers to find the reference source code.
     */
    sourceRoot?: string;
    /**
     * Disable reporting of excess property errors during the creation of object literals.
     */
    suppressExcessPropertyErrors?: boolean;
    /**
     * Suppress `noImplicitAny` errors when indexing objects that lack index signatures.
     */
    suppressImplicitAnyIndexErrors?: boolean;
    /**
     * Set the JavaScript language version for emitted JavaScript and include compatible library declarations.
     */
    target?: ('ES3' | 'ES5' | 'ES6' | 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ESNext') | string;
    /**
     * Watch input files.
     */
    watch?: boolean;
    /**
     * Specify what approach the watcher should use if the system runs out of native file watchers.
     */
    fallbackPolling?: 'fixedPollingInterval' | 'priorityPollingInterval' | 'dynamicPriorityPolling';
    /**
     * Specify how directories are watched on systems that lack recursive file-watching functionality.
     */
    watchDirectory?: 'useFsEvents' | 'fixedPollingInterval' | 'dynamicPriorityPolling';
    /**
     * Specify how the TypeScript watch mode works.
     */
    watchFile?: 'fixedPollingInterval' | 'priorityPollingInterval' | 'dynamicPriorityPolling' | 'useFsEvents' | 'useFsEventsOnParentDirectory';
    /**
     * Enable experimental support for TC39 stage 2 draft decorators.
     */
    experimentalDecorators?: boolean;
    /**
     * Emit design-type metadata for decorated declarations in source files.
     */
    emitDecoratorMetadata?: boolean;
    /**
     * Disable error reporting for unused labels.
     */
    allowUnusedLabels?: boolean;
    /**
     * Enable error reporting for codepaths that do not explicitly return in a function.
     */
    noImplicitReturns?: boolean;
    /**
     * Add `undefined` to a type when accessed using an index.
     */
    noUncheckedIndexedAccess?: boolean;
    /**
     * Enable error reporting for fallthrough cases in switch statements.
     */
    noFallthroughCasesInSwitch?: boolean;
    /**
     * Disable error reporting for unreachable code.
     */
    allowUnreachableCode?: boolean;
    /**
     * Ensure that casing is correct in imports.
     */
    forceConsistentCasingInFileNames?: boolean;
    /**
     * Emit a v8 CPU profile of the compiler run for debugging.
     */
    generateCpuProfile?: string;
    /**
     * Specify the base directory to resolve non-relative module names.
     */
    baseUrl?: string;
    /**
     * Specify a set of entries that re-map imports to additional lookup locations.
     */
    paths?: {
        [k: string]: string[];
    };
    /**
     * Specify a list of language service plugins to include.
     */
    plugins?: Array<{
        /**
         * Plugin name.
         */
        name?: string;
        [k: string]: unknown;
    }>;
    /**
     * Allow multiple folders to be treated as one when resolving modules.
     */
    rootDirs?: string[];
    /**
     * Specify multiple folders that act like `./node_modules/@types`.
     */
    typeRoots?: string[];
    /**
     * Specify type package names to be included without being referenced in a source file.
     */
    types?: string[];
    /**
     * Log paths used during the `moduleResolution` process.
     */
    traceResolution?: boolean;
    /**
     * Allow JavaScript files to be a part of your program. Use the `checkJS` option to get errors from these files.
     */
    allowJs?: boolean;
    /**
     * Disable truncating types in error messages.
     */
    noErrorTruncation?: boolean;
    /**
     * Allow 'import x from y' when a module doesn't have a default export.
     */
    allowSyntheticDefaultImports?: boolean;
    /**
     * Disable adding 'use strict' directives in emitted JavaScript files.
     */
    noImplicitUseStrict?: boolean;
    /**
     * Print the names of emitted files after a compilation.
     */
    listEmittedFiles?: boolean;
    /**
     * Remove the 20mb cap on total source code size for JavaScript files in the TypeScript language server.
     */
    disableSizeLimit?: boolean;
    /**
     * Specify a set of bundled library declaration files that describe the target runtime environment.
     */
    lib?: Array<('ES5' | 'ES6' | 'ES2015' | 'ES2015.Collection' | 'ES2015.Core' | 'ES2015.Generator' | 'ES2015.Iterable' | 'ES2015.Promise' | 'ES2015.Proxy' | 'ES2015.Reflect' | 'ES2015.Symbol.WellKnown' | 'ES2015.Symbol' | 'ES2016' | 'ES2016.Array.Include' | 'ES2017' | 'ES2017.Intl' | 'ES2017.Object' | 'ES2017.SharedMemory' | 'ES2017.String' | 'ES2017.TypedArrays' | 'ES2018' | 'ES2018.AsyncGenerator' | 'ES2018.AsyncIterable' | 'ES2018.Intl' | 'ES2018.Promise' | 'ES2018.Regexp' | 'ES2019' | 'ES2019.Array' | 'ES2019.Object' | 'ES2019.String' | 'ES2019.Symbol' | 'ES2020' | 'ES2020.BigInt' | 'ES2020.Promise' | 'ES2020.String' | 'ES2020.Symbol.WellKnown' | 'ESNext' | 'ESNext.Array' | 'ESNext.AsyncIterable' | 'ESNext.BigInt' | 'ESNext.Intl' | 'ESNext.Promise' | 'ESNext.String' | 'ESNext.Symbol' | 'DOM' | 'DOM.Iterable' | 'ScriptHost' | 'WebWorker' | 'WebWorker.ImportScripts') | string>;
    /**
     * When type checking, take into account `null` and `undefined`.
     */
    strictNullChecks?: boolean;
    /**
     * Specify the maximum folder depth used for checking JavaScript files from `node_modules`. Only applicable with `allowJs`.
     */
    maxNodeModuleJsDepth?: number;
    /**
     * Allow importing helper functions from tslib once per project, instead of including them per-file.
     */
    importHelpers?: boolean;
    /**
     * Specify emit/checking behavior for imports that are only used for types.
     */
    importsNotUsedAsValues?: 'remove' | 'preserve' | 'error';
    /**
     * Ensure 'use strict' is always emitted.
     */
    alwaysStrict?: boolean;
    /**
     * Enable all strict type checking options.
     */
    strict?: boolean;
    /**
     * Check that the arguments for `bind`, `call`, and `apply` methods match the original function.
     */
    strictBindCallApply?: boolean;
    /**
     * Emit more compliant, but verbose and less performant JavaScript for iteration.
     */
    downlevelIteration?: boolean;
    /**
     * Enable error reporting in type-checked JavaScript files.
     */
    checkJs?: boolean;
    /**
     * When assigning functions, check to ensure parameters and the return values are subtype-compatible.
     */
    strictFunctionTypes?: boolean;
    /**
     * Check for class properties that are declared but not set in the constructor.
     */
    strictPropertyInitialization?: boolean;
    /**
     * Emit additional JavaScript to ease support for importing CommonJS modules. This enables `allowSyntheticDefaultImports` for type compatibility.
     */
    esModuleInterop?: boolean;
    /**
     * Allow accessing UMD globals from modules.
     */
    allowUmdGlobalAccess?: boolean;
    /**
     * Make keyof only return strings instead of string, numbers or symbols. Legacy option.
     */
    keyofStringsOnly?: boolean;
    /**
     * Emit ECMAScript-standard-compliant class fields.
     */
    useDefineForClassFields?: boolean;
    /**
     * Create sourcemaps for d.ts files.
     */
    declarationMap?: boolean;
    /**
     * Enable importing .json files
     */
    resolveJsonModule?: boolean;
    /**
     * Have recompiles in projects that use `incremental` and `watch` mode assume that changes within a file will only affect files directly depending on it.
     */
    assumeChangesOnlyAffectDirectDependencies?: boolean;
    /**
     * Output more detailed compiler performance information after building.
     */
    extendedDiagnostics?: boolean;
    /**
     * Print names of files that are part of the compilation and then stop processing.
     */
    listFilesOnly?: boolean;
    /**
     * Disable preferring source files instead of declaration files when referencing composite projects
     */
    disableSourceOfProjectReferenceRedirect?: boolean;
    /**
     * Opt a project out of multi-project reference checking when editing.
     */
    disableSolutionSearching?: boolean;
    [k: string]: unknown;
}
