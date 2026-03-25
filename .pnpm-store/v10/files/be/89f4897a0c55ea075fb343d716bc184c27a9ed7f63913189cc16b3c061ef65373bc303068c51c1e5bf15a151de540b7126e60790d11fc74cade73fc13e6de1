interface ResolveOptions {
    /**
     * A URL, path or array of URLs/paths to resolve against.
     */
    url?: string | URL | (string | URL)[];
    /**
     * File extensions to consider when resolving modules.
     */
    extensions?: string[];
    /**
     * Conditions to consider when resolving package exports.
     */
    conditions?: string[];
}
/**
 * Synchronously resolves a module path based on the options provided.
 *
 * @param {string} id - The identifier or path of the module to resolve.
 * @param {ResolveOptions} [options] - Options to resolve the module. See {@link ResolveOptions}.
 * @returns {string} The resolved URL as a string.
 */
declare function resolveSync(id: string, options?: ResolveOptions): string;
/**
 * Asynchronously resolves a module path based on the given options.
 *
 * @param {string} id - The identifier or path of the module to resolve.
 * @param {ResolveOptions} [options] - Options for resolving the module. See {@link ResolveOptions}.
 * @returns {Promise<string>} A promise to resolve the URL as a string.
 */
declare function resolve(id: string, options?: ResolveOptions): Promise<string>;
/**
 * Synchronously resolves a module path to a local file path based on the given options.
 *
 * @param {string} id - The identifier or path of the module to resolve.
 * @param {ResolveOptions} [options] - Options to resolve the module. See {@link ResolveOptions}.
 * @returns {string} The resolved file path.
 */
declare function resolvePathSync(id: string, options?: ResolveOptions): string;
/**
 * Asynchronously resolves a module path to a local file path based on the options provided.
 *
 * @param {string} id - The identifier or path of the module to resolve.
 * @param {ResolveOptions} [options] - Options for resolving the module. See {@link ResolveOptions}.
 * @returns {Promise<string>} A promise to resolve to the file path.
 */
declare function resolvePath(id: string, options?: ResolveOptions): Promise<string>;
/**
 * Creates a resolver function with default options that can be used to resolve module identifiers.
 *
 * @param {ResolveOptions} [defaults] - Default options to use for all resolutions. See {@link ResolveOptions}.
 * @returns {Function} A resolver function that takes an identifier and an optional URL, and resolves the identifier using the default options and the given URL.
 */
declare function createResolve(defaults?: ResolveOptions): (id: string, url?: ResolveOptions["url"]) => Promise<string>;
/**
 * Parses a node module path to extract the directory, name, and subpath.
 *
 * @param {string} path - The path to parse.
 * @returns {Object} An object containing the directory, module name, and subpath of the node module.
 */
declare function parseNodeModulePath(path: string): {
    dir?: undefined;
    name?: undefined;
    subpath?: undefined;
} | {
    dir: string;
    name: string;
    subpath: string | undefined;
};
/**
 * Attempts to reverse engineer a subpath export within a node module.
 *
 * @param {string} path - The path within the node module.
 * @returns {Promise<string | undefined>} A promise that resolves to the detected subpath or undefined if not found.
 */
declare function lookupNodeModuleSubpath(path: string): Promise<string | undefined>;

/**
 * Represents a general structure for ECMAScript module imports.
 */
interface ESMImport {
    /**
     * Specifies the type of import: "static" for static imports and "dynamic" for dynamic imports.
     */
    type: "static" | "dynamic";
    /**
     * The full import declaration code snippet as a string.
     */
    code: string;
    /**
     * The starting position (index) of the import declaration in the source code.
     */
    start: number;
    /**
     * The end position (index) of the import declaration in the source code.
     */
    end: number;
}
/**
 * Represents a static import declaration in an ECMAScript module.
 * Extends {@link ESMImport}.
 */
interface StaticImport extends ESMImport {
    /**
     * Indicates the type of import, specifically a static import.
     */
    type: "static";
    /**
     * Contains the entire import statement as a string, excluding the module specifier.
     */
    imports: string;
    /**
     * The module specifier from which imports are being brought in.
     */
    specifier: string;
}
/**
 * Represents a parsed static import declaration with detailed components of the import.
 * Extends {@link StaticImport}.
 */
interface ParsedStaticImport extends StaticImport {
    /**
     * The default import name, if any.
     * @optional
     */
    defaultImport?: string;
    /**
     * The namespace import name, if any, using the `* as` syntax.
     * @optional
     */
    namespacedImport?: string;
    /**
     * An object representing named imports, with their local aliases if specified.
     * Each property key is the original name and its value is the alias.
     * @optional
     */
    namedImports?: {
        [name: string]: string;
    };
}
/**
 * Represents a dynamic import declaration that is loaded at runtime.
 * Extends {@link ESMImport}.
 */
interface DynamicImport extends ESMImport {
    /**
     * Indicates that this is a dynamic import.
     */
    type: "dynamic";
    /**
     * The expression or path to be dynamically imported, typically a module path or URL.
     */
    expression: string;
}
/**
 * Represents a type-specific import, primarily used for importing types in TypeScript.
 * Extends {@link ESMImport} but omits the 'type' to redefine it specifically for type imports.
 */
interface TypeImport extends Omit<ESMImport, "type"> {
    /**
     * Specifies that this is a type import.
     */
    type: "type";
    /**
     * Contains the entire type import statement as a string, excluding the module specifier.
     */
    imports: string;
    /**
     * The module specifier from which to import types.
     */
    specifier: string;
}
/**
 * Represents a general structure for ECMAScript module exports.
 */
interface ESMExport {
    /**
     * Optional explicit type for complex scenarios, often used internally.
     * @optional
     */
    _type?: "declaration" | "named" | "default" | "star";
    /**
     * The type of export (declaration, named, default or star).
     */
    type: "declaration" | "named" | "default" | "star";
    /**
     * The specific type of declaration being exported, if applicable.
     * @optional
     */
    declarationType?: "let" | "var" | "const" | "enum" | "const enum" | "class" | "function" | "async function";
    /**
     * The full code snippet of the export statement.
     */
    code: string;
    /**
     * The starting position (index) of the export declaration in the source code.
     */
    start: number;
    /**
     * The end position (index) of the export declaration in the source code.
     */
    end: number;
    /**
     * The name of the variable, function or class being exported, if given explicitly.
     * @optional
     */
    name?: string;
    /**
     * The name used for default exports when a specific identifier isn't given.
     * @optional
     */
    defaultName?: string;
    /**
     * An array of names to export, applicable to named and destructured exports.
     */
    names: string[];
    /**
     * The module specifier, if any, from which exports are being re-exported.
     * @optional
     */
    specifier?: string;
}
/**
 * Represents a declaration export within an ECMAScript module.
 * Extends {@link ESMExport}.
 */
interface DeclarationExport extends ESMExport {
    /**
     * Indicates that this export is a declaration export.
     */
    type: "declaration";
    /**
     * The declaration string, such as 'let', 'const', 'class', etc., describing what is being exported.
     */
    declaration: string;
    /**
     * The name of the declaration to be exported.
     */
    name: string;
}
/**
 * Represents a named export within an ECMAScript module.
 * Extends {@link ESMExport}.
 */
interface NamedExport extends ESMExport {
    /**
     * Specifies that this export is a named export.
     */
    type: "named";
    /**
     * The export string, containing all exported identifiers.
     */
    exports: string;
    /**
     * An array of names to export.
     */
    names: string[];
    /**
     * The module specifier, if any, from which exports are being re-exported.
     * @optional
     */
    specifier?: string;
}
/**
 * Represents a standard export within an ECMAScript module.
 * Extends {@link ESMExport}.
 */
interface DefaultExport extends ESMExport {
    /**
     * Specifies that this export is a standard export.
     */
    type: "default";
}
/**
 * Regular expression to match static import statements in JavaScript/TypeScript code.
 * @example `import { foo, bar as baz } from 'module'`
 */
declare const ESM_STATIC_IMPORT_RE: RegExp;
/**
 * Regular expression to match dynamic import statements in JavaScript/TypeScript code.
 * @example `import('module')`
 */
declare const DYNAMIC_IMPORT_RE: RegExp;
/**
 * Regular expression to match various types of export declarations including variables, functions, and classes.
 * @example `export const num = 1, str = 'hello'; export class Example {}`
 */
declare const EXPORT_DECAL_RE: RegExp;
/**
 * Regular expression to match export declarations specifically for types, interfaces, and type aliases in TypeScript.
 * @example `export type Result = { success: boolean; }; export interface User { name: string; age: number; };`
 */
declare const EXPORT_DECAL_TYPE_RE: RegExp;
/**
 * Finds all static import statements within the given code string.
 * @param {string} code - The source code to search for static imports.
 * @returns {StaticImport[]} An array of {@link StaticImport} objects representing each static import found.
 */
declare function findStaticImports(code: string): StaticImport[];
/**
 * Searches for dynamic import statements in the given source code.
 * @param {string} code - The source to search for dynamic imports in.
 * @returns {DynamicImport[]} An array of {@link DynamicImport} objects representing each dynamic import found.
 */
declare function findDynamicImports(code: string): DynamicImport[];
/**
 * Identifies and returns all type import statements in the given source code.
 * This function is specifically targeted at type imports used in TypeScript.
 * @param {string} code - The source code to search for type imports.
 * @returns {TypeImport[]} An array of {@link TypeImport} objects representing each type import found.
 */
declare function findTypeImports(code: string): TypeImport[];
/**
 * Parses a static import or type import to extract detailed import elements such as default, namespace and named imports.
 * @param {StaticImport | TypeImport} matched - The matched import statement to parse. See {@link StaticImport} and {@link TypeImport}.
 * @returns {ParsedStaticImport} A structured object representing the parsed static import. See {@link ParsedStaticImport}.
 */
declare function parseStaticImport(matched: StaticImport | TypeImport): ParsedStaticImport;
/**
 * Parses a static import or type import to extract detailed import elements such as default, namespace and named imports.
 * @param {StaticImport | TypeImport} matched - The matched import statement to parse. See {@link StaticImport} and {@link TypeImport}.
 * @returns {ParsedStaticImport} A structured object representing the parsed static import. See {@link ParsedStaticImport}.
 */
declare function parseTypeImport(matched: TypeImport | StaticImport): ParsedStaticImport;
/**
 * Identifies all export statements in the supplied source code and categorises them into different types such as declarations, named, default and star exports.
 * This function processes the code to capture different forms of export statements and normalise their representation for further processing.
 *
 * @param {string} code - The source code containing the export statements to be analysed.
 * @returns {ESMExport[]} An array of {@link ESMExport} objects representing each export found, properly categorised and structured.
 */
declare function findExports(code: string): ESMExport[];
/**
 * Searches specifically for type-related exports in TypeScript code, such as exported interfaces, types, and declarations prefixed with 'declare'.
 * This function uses specialised regular expressions to identify type exports and normalises them for consistency.
 *
 * @param {string} code - The TypeScript source code to search for type exports.
 * @returns {ESMExport[]} An array of {@link ESMExport} objects representing each type export found.
 */
declare function findTypeExports(code: string): ESMExport[];
/**
 * Extracts and returns a list of all export names from the given source.
 * This function uses {@link findExports} to retrieve all types of exports and consolidates their names into a single array.
 *
 * @param {string} code - The source code to search for export names.
 * @returns {string[]} An array containing the names of all exports found in the code.
 */
declare function findExportNames(code: string): string[];
/**
 * Asynchronously resolves and returns all export names from a module specified by its module identifier.
 * This function recursively resolves all explicitly named and asterisked (* as) exports to fully enumerate the exported identifiers.
 *
 * @param {string} id - The module identifier to resolve.
 * @param {ResolveOptions} [options] - Optional settings for resolving the module path, such as the base URL.
 * @returns {Promise<string[]>} A promise that resolves to an array of export names from the module.
 */
declare function resolveModuleExportNames(id: string, options?: ResolveOptions): Promise<string[]>;

/**
 * Represents the context of a CommonJS environment, providing node-like module resolution capabilities within a module.
 */
interface CommonjsContext {
    /**
     * The absolute path to the current module file.
     */
    __filename: string;
    /**
     * The directory name of the current module.
     */
    __dirname: string;
    /**
     * A function to require modules as in CommonJS.
     */
    require: NodeRequire;
}
/**
 * Creates a CommonJS context for a given module URL, enabling `require`, `__filename` and `__dirname` support similar to Node.js.
 * This function dynamically generates a `require` function that is context-aware and bound to the location of the given module URL.
 *
 * @param {string} url - The URL of the module file to create a context for.
 * @returns {CommonjsContext} A context object containing `__filename`, `__dirname` and a custom `require` function. See {@link CommonjsContext}.
 */
declare function createCommonJS(url: string): CommonjsContext;
declare function interopDefault(sourceModule: any, opts?: {
    preferNamespace?: boolean;
}): any;

/**
 * Options for evaluating or transforming modules, extending resolution options with optional URL specifications.
 */
interface EvaluateOptions extends ResolveOptions {
    /**
     * The URL of the module, which can be specified to override the URL resolved from the module identifier.
     * @optional
     */
    url?: string;
}
/**
 * Loads a module by resolving its identifier to a URL, fetching the module's code and evaluating it.
 *
 * @param {string} id - The identifier of the module to load.
 * @param {EvaluateOptions} options - Optional parameters to resolve and load the module. See {@link EvaluateOptions}.
 * @returns {Promise<any>} A promise to resolve to the evaluated module.
 * });
 */
declare function loadModule(id: string, options?: EvaluateOptions): Promise<any>;
/**
 * Evaluates JavaScript code as a module using a dynamic import from a data URL.
 *
 * @param {string} code - The code of the module to evaluate.
 * @param {EvaluateOptions} options - Includes the original URL of the module for better error mapping. See {@link EvaluateOptions}.
 * @returns {Promise<any>} A promise that resolves to the evaluated module or throws an error if the evaluation fails.
 */
declare function evalModule(code: string, options?: EvaluateOptions): Promise<any>;
/**
 * Transform module code to handle specific scenarios, such as converting JSON to a module or rewriting import.meta.url.
 *
 * @param {string} code - The code of the module to transform.
 * @param {EvaluateOptions} options - Options to control how the code is transformed. See {@link EvaluateOptions}.
 * @returns {Promise<string>} A promise that resolves to the transformed code.
 */
declare function transformModule(code: string, options?: EvaluateOptions): Promise<string>;
/**
 * Resolves all import URLs found within the provided code to their absolute URLs, based on the given options.
 *
 * @param {string} code - The code containing the import directives to resolve.
 * @param {EvaluateOptions} [options] - Options to use for resolving imports. See {@link EvaluateOptions}.
 * @returns {Promise<string>} A promise that resolves to the code, replacing import URLs with resolved URLs.
 */
declare function resolveImports(code: string, options?: EvaluateOptions): Promise<string>;

/**
 * Options for detecting syntax within a code string.
 */
type DetectSyntaxOptions = {
    /**
     * Indicates whether comments should be stripped from the code before syntax checking.
     * @default false
     */
    stripComments?: boolean;
};
/**
 * Determines if a given code string contains ECMAScript module syntax.
 *
 * @param {string} code - The source code to analyse.
 * @param {DetectSyntaxOptions} opts - See {@link DetectSyntaxOptions}.
 * @returns {boolean} `true` if the code contains ESM syntax, otherwise `false`.
 */
declare function hasESMSyntax(code: string, opts?: DetectSyntaxOptions): boolean;
/**
 * Determines if a given string of code contains CommonJS syntax.
 *
 * @param {string} code - The source code to analyse.
 * @param {DetectSyntaxOptions} opts - See {@link DetectSyntaxOptions}.
 * @returns {boolean} `true` if the code contains CommonJS syntax, `false` otherwise.
 */
declare function hasCJSSyntax(code: string, opts?: DetectSyntaxOptions): boolean;
/**
 * Analyses the supplied code to determine if it contains ECMAScript module syntax, CommonJS syntax, or both.
 *
 * @param {string} code - The source code to analyse.
 * @param {DetectSyntaxOptions} opts - See {@link DetectSyntaxOptions}.
 * @returns {object} An object indicating the presence of ESM syntax (`hasESM`), CJS syntax (`hasCJS`) and whether both syntaxes are present (`isMixed`).
 */
declare function detectSyntax(code: string, opts?: DetectSyntaxOptions): {
    hasESM: boolean;
    hasCJS: boolean;
    isMixed: boolean;
};
interface ValidNodeImportOptions extends ResolveOptions {
    /**
     * The contents of the import, which may be analyzed to see if it contains
     * CJS or ESM syntax as a last step in checking whether it is a valid import.
     */
    code?: string;
    /**
     * Protocols that are allowed as valid node imports.
     *
     * @default ['node', 'file', 'data']
     *
     */
    allowedProtocols?: Array<string>;
    /**
     * Whether to strip comments from the code before checking for ESM syntax.
     *
     * @default false
     */
    stripComments?: boolean;
}
/**
 * Validates whether a given identifier represents a valid node import, based on its protocol, file extension, and optionally its contents.
 *
 * @param {string} id - The identifier or URL of the import to validate.
 * @param {ValidNodeImportOptions} _options - Options for resolving and validating the import. See {@link ValidNodeImportOptions}.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the import is valid, otherwise `false`.
 */
declare function isValidNodeImport(id: string, _options?: ValidNodeImportOptions): Promise<boolean>;

/**
 * Converts a file URL to a local file system path with normalized slashes.
 *
 * @param {string | URL} id - The file URL or local path to convert.
 * @returns {string} A normalized file system path.
 */
declare function fileURLToPath(id: string | URL): string;
/**
 * Converts a local file system path to a file URL.
 *
 * @param {string | URL} id - The file system path to convert.
 * @returns {string} The resulting file URL as a string.
 */
declare function pathToFileURL(id: string | URL): string;
/**
 * Sanitises a component of a URI by replacing invalid characters.
 *
 * @param {string} name - The URI component to sanitise.
 * @param {string} [replacement="_"] - The string to replace invalid characters with.
 * @returns {string} The sanitised URI component.
 */
declare function sanitizeURIComponent(name?: string, replacement?: string): string;
/**
 * Cleans a file path string by sanitising each component of the path.
 *
 * @param {string} filePath - The file path to sanitise.
 * @returns {string} The sanitised file path.
 */
declare function sanitizeFilePath(filePath?: string): string;
/**
 * Normalises a module identifier to ensure it has a protocol if missing, handling built-in modules and file paths.
 *
 * @param {string} id - The identifier to normalise.
 * @returns {string} The normalised identifier with the appropriate protocol.
 */
declare function normalizeid(id: string): string;
/**
 * Loads the contents of a file from a URL into a string.
 *
 * @param {string} url - The URL of the file to load.
 * @returns {Promise<string>} A promise that resolves to the content of the file.
 */
declare function loadURL(url: string): Promise<string>;
/**
 * Converts a string of code into a data URL that can be used for dynamic imports.
 *
 * @param {string} code - The string of code to convert.
 * @returns {string} The data URL containing the encoded code.
 */
declare function toDataURL(code: string): string;
/**
 * Checks if a module identifier matches a Node.js built-in module.
 *
 * @param {string} id - The identifier to check.
 * @returns {boolean} `true` if the identifier is a built-in module, otherwise `false`.
 */
declare function isNodeBuiltin(id?: string): boolean;
/**
 * Extracts the protocol portion of a given identifier string.
 *
 * @param {string} id - The identifier from which to extract the log.
 * @returns {string | undefined} The protocol part of the identifier, or undefined if no protocol is present.
 */
declare function getProtocol(id: string): string | undefined;

export { DYNAMIC_IMPORT_RE, ESM_STATIC_IMPORT_RE, EXPORT_DECAL_RE, EXPORT_DECAL_TYPE_RE, createCommonJS, createResolve, detectSyntax, evalModule, fileURLToPath, findDynamicImports, findExportNames, findExports, findStaticImports, findTypeExports, findTypeImports, getProtocol, hasCJSSyntax, hasESMSyntax, interopDefault, isNodeBuiltin, isValidNodeImport, loadModule, loadURL, lookupNodeModuleSubpath, normalizeid, parseNodeModulePath, parseStaticImport, parseTypeImport, pathToFileURL, resolve, resolveImports, resolveModuleExportNames, resolvePath, resolvePathSync, resolveSync, sanitizeFilePath, sanitizeURIComponent, toDataURL, transformModule };
export type { CommonjsContext, DeclarationExport, DefaultExport, DetectSyntaxOptions, DynamicImport, ESMExport, ESMImport, EvaluateOptions, NamedExport, ParsedStaticImport, ResolveOptions, StaticImport, TypeImport, ValidNodeImportOptions };
