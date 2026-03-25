import { ts } from "./typescript";

export interface CompilerOptionsFromTsConfigOptions {
    encoding?: string;
    fileSystem?: FileSystemHost;
}

export interface CompilerOptionsFromTsConfigResult {
    options: ts.CompilerOptions;
    errors: ts.Diagnostic[];
}

/**
 * Gets the compiler options from a specified tsconfig.json
 * @param filePath - File path to the tsconfig.json.
 * @param options - Options.
 */
export declare function getCompilerOptionsFromTsConfig(filePath: string, options?: CompilerOptionsFromTsConfigOptions): CompilerOptionsFromTsConfigResult;

export declare class TsConfigResolver {
    #private;
    constructor(fileSystem: TransactionalFileSystem, tsConfigFilePath: StandardizedFilePath, encoding: string);
    getCompilerOptions(): ts.CompilerOptions;
    getErrors(): ts.Diagnostic[];
    getPaths(compilerOptions?: ts.CompilerOptions): {
        filePaths: StandardizedFilePath[];
        directoryPaths: StandardizedFilePath[];
    };
    private _parseJsonConfigFileContent;
}

/**
 * Helper around a Map.
 * @remarks The use of this class is historical as it served as an abstraction around an ES5 based map and ES6, if available. Eventually
 * this class should be removed in favour of helper functions around a Map.
 */
export declare class KeyValueCache<T, U> {
    #private;
    getSize(): number;
    getValues(): MapIterator<U>;
    getValuesAsArray(): U[];
    getKeys(): MapIterator<T>;
    getEntries(): MapIterator<[T, U]>;
    getOrCreate<TCreate extends U = U>(key: T, createFunc: () => TCreate): TCreate;
    has(key: T): boolean;
    get(key: T): U | undefined;
    set(key: T, value: U): void;
    replaceKey(key: T, newKey: T): void;
    removeByKey(key: T): void;
    clear(): void;
}

/**
 * An array where the values are sorted by a key of one of the values.
 */
export declare class SortedKeyValueArray<TKey, TValue> {
    #private;
    constructor(getKey: (value: TValue) => TKey, comparer: Comparer<TKey>);
    set(value: TValue): void;
    removeByValue(value: TValue): void;
    removeByKey(key: TKey): void;
    getArrayCopy(): TValue[];
    hasItems(): boolean;
    entries(): Generator<TValue, void, unknown>;
}

/**
 * A wrapper around WeakMap.
 * @remarks The use of this class is historical as it served as an abstraction around an ES5 based weak map and ES6, if available. Eventually
 * this class should be removed in favour of helper functions around a WeakMap.
 */
export declare class WeakCache<T extends object, U> {
    #private;
    getOrCreate<TCreate extends U = U>(key: T, createFunc: () => TCreate): TCreate;
    has(key: T): boolean;
    get(key: T): U | undefined;
    set(key: T, value: U): void;
    removeByKey(key: T): void;
}

/**
 * Compares two values specifying the sort order.
 */
export interface Comparer<T> {
    /**
     * Checks the two items returning -1 if `a` preceeds, 0 if equal, and 1 if `a` follows.
     * @param a - Item to use.
     * @param b - Item to compare with.
     */
    compareTo(a: T, b: T): number;
}

/**
 * Converts a comparer to a stored comparer.
 */
export declare class ComparerToStoredComparer<T> implements StoredComparer<T> {
    #private;
    /**
     * Constructor.
     * @param comparer - Comparer to use.
     * @param storedValue - Stored value to use as the value to always compare the input of `compareTo` to.
     */
    constructor(comparer: Comparer<T>, storedValue: T);
    /** @inheritdoc */
    compareTo(value: T): number;
}

/**
 * Compares two strings by en-us-u-kf-upper locale.
 */
export declare class LocaleStringComparer implements Comparer<string> {
    /** Static instance for reuse. */
    static readonly instance: LocaleStringComparer;
    /** @inheritdoc */
    compareTo(a: string, b: string): 0 | 1 | -1;
}

/**
 * Compares two values based on one of their properties.
 */
export declare class PropertyComparer<TValue, TProperty> implements Comparer<TValue> {
    #private;
    /**
     * Constructor.
     * @param getProperty - Gets the property from the value to use for comparisons.
     * @param comparer - Comparer to compare the properties with.
     */
    constructor(getProperty: (value: TValue) => TProperty, comparer: Comparer<TProperty>);
    /** @inheritdoc */
    compareTo(a: TValue, b: TValue): number;
}

/**
 * A stored comparer that compares a property to a stored value.
 */
export declare class PropertyStoredComparer<TValue, TProperty> implements StoredComparer<TValue> {
    #private;
    /**
     * Constructor.
     * @param getProperty - Gets the property from the value.
     * @param comparer - Comparer to compare the property with.
     */
    constructor(getProperty: (value: TValue) => TProperty, comparer: StoredComparer<TProperty>);
    /** @inheritdoc */
    compareTo(value: TValue): number;
}

/**
 * Compares a value against a stored value.
 */
export interface StoredComparer<T> {
    /**
     * Checks the value against a stored value returning -1 if the stored value preceeds, 0 if the value is equal, and 1 if follows.
     * @param value - Value to compare.
     */
    compareTo(value: T): number;
}

/**
 * Creates a language service host and compiler host.
 * @param options - Options for creating the hosts.
 */
export declare function createHosts(options: CreateHostsOptions): {
    languageServiceHost: ts.LanguageServiceHost;
    compilerHost: ts.CompilerHost;
};

/**
 * Options for creating the hosts.
 */
export interface CreateHostsOptions {
    /** The transactional file system to use. */
    transactionalFileSystem: TransactionalFileSystem;
    /** Container of source files to use. */
    sourceFileContainer: TsSourceFileContainer;
    /** Compiler options container to use. */
    compilerOptions: CompilerOptionsContainer;
    /** Newline kind to use. */
    getNewLine: () => "\r\n" | "\n";
    /** The resolution host used for resolving modules and type reference directives. */
    resolutionHost: ResolutionHost;
    /** Provides the current project version to be used to tell if source files have
     * changed. Provide this for a performance improvement. */
    getProjectVersion?: () => string;
    isKnownTypesPackageName?: ts.LanguageServiceHost["isKnownTypesPackageName"];
    /**
     * Set this to true to not load the typescript lib files.
     * @default false
     */
    skipLoadingLibFiles?: boolean;
    /**
     * Specify this to use a custom folder to load the lib files from.
     * @remarks skipLoadingLibFiles cannot be explicitly false if this is set.
     */
    libFolderPath?: string;
}

/**
 * Creates a module resolution host based on the provided options.
 * @param options - Options for creating the module resolution host.
 */
export declare function createModuleResolutionHost(options: CreateModuleResolutionHostOptions): ts.ModuleResolutionHost;

/**
 * Options for creating a module resolution host.
 */
export interface CreateModuleResolutionHostOptions {
    /** The transactional file system to use. */
    transactionalFileSystem: TransactionalFileSystem;
    /** The source file container to use. */
    sourceFileContainer: TsSourceFileContainer;
    /** Gets the encoding to use. */
    getEncoding(): string;
}

/**
 * An implementation of a ts.DocumentRegistry that uses a transactional file system.
 */
export declare class DocumentRegistry implements ts.DocumentRegistry {
    #private;
    /**
     * Constructor.
     * @param transactionalFileSystem - The transaction file system to use.
     */
    constructor(transactionalFileSystem: TransactionalFileSystem);
    /**
     * Creates or updates a source file in the document registry.
     * @param fileName - File name to create or update.
     * @param compilationSettings - Compiler options to use.
     * @param scriptSnapshot - Script snapshot (text) of the file.
     * @param scriptKind - Script kind of the file.
     */
    createOrUpdateSourceFile(fileName: StandardizedFilePath, compilationSettings: ts.CompilerOptions, scriptSnapshot: ts.IScriptSnapshot, scriptKind: ts.ScriptKind | undefined): ts.SourceFile;
    /**
     * Removes the source file from the document registry.
     * @param fileName - File name to remove.
     */
    removeSourceFile(fileName: StandardizedFilePath): void;
    /** @inheritdoc */
    acquireDocument(fileName: string, compilationSettings: ts.CompilerOptions, scriptSnapshot: ts.IScriptSnapshot, version: string, scriptKind: ts.ScriptKind | undefined): ts.SourceFile;
    /** @inheritdoc */
    acquireDocumentWithKey(fileName: string, path: ts.Path, compilationSettings: ts.CompilerOptions, key: ts.DocumentRegistryBucketKey, scriptSnapshot: ts.IScriptSnapshot, version: string, scriptKind: ts.ScriptKind | undefined): ts.SourceFile;
    /** @inheritdoc */
    updateDocument(fileName: string, compilationSettings: ts.CompilerOptions, scriptSnapshot: ts.IScriptSnapshot, version: string, scriptKind: ts.ScriptKind | undefined): ts.SourceFile;
    /** @inheritdoc */
    updateDocumentWithKey(fileName: string, path: ts.Path, compilationSettings: ts.CompilerOptions, key: ts.DocumentRegistryBucketKey, scriptSnapshot: ts.IScriptSnapshot, version: string, scriptKind: ts.ScriptKind | undefined): ts.SourceFile;
    /** @inheritdoc */
    getKeyForCompilationSettings(settings: ts.CompilerOptions): ts.DocumentRegistryBucketKey;
    /** @inheritdoc */
    releaseDocument(fileName: string, compilationSettings: ts.CompilerOptions): void;
    /** @inheritdoc */
    releaseDocumentWithKey(path: ts.Path, key: ts.DocumentRegistryBucketKey): void;
    /** @inheritdoc */
    reportStats(): string;
    /** @inheritdoc */
    getSourceFileVersion(sourceFile: ts.SourceFile): string;
}

/** Host for implementing custom module and/or type reference directive resolution. */
export interface ResolutionHost {
    resolveModuleNames?: ts.LanguageServiceHost["resolveModuleNames"];
    getResolvedModuleWithFailedLookupLocationsFromCache?: ts.LanguageServiceHost["getResolvedModuleWithFailedLookupLocationsFromCache"];
    resolveTypeReferenceDirectives?: ts.LanguageServiceHost["resolveTypeReferenceDirectives"];
}

/**
 * Factory used to create a resolution host.
 * @remarks The compiler options are retrieved via a function in order to get the project's current compiler options.
 */
export type ResolutionHostFactory = (moduleResolutionHost: ts.ModuleResolutionHost, getCompilerOptions: () => ts.CompilerOptions) => ResolutionHost;

/** Collection of reusable resolution hosts. */
export declare const ResolutionHosts: {
    deno: ResolutionHostFactory;
};

/**
 * A container of source files.
 */
export interface TsSourceFileContainer {
    /**
     * Gets if a source file exists at the specified file path.
     * @param filePath - File path to check.
     */
    containsSourceFileAtPath(filePath: StandardizedFilePath): boolean;
    /**
     * Gets the source file paths of all the source files in the container.
     */
    getSourceFilePaths(): Iterable<StandardizedFilePath>;
    /**
     * Gets a source file from a file path, but only if it exists in the container's cache.
     * @param filePath - File path to get the source file from.
     */
    getSourceFileFromCacheFromFilePath(filePath: StandardizedFilePath): ts.SourceFile | undefined;
    /**
     * Asynchronously adds or gets a source file from a file path.
     * @param filePath - File path to get.
     * @param opts - Options for adding or getting the file.
     */
    addOrGetSourceFileFromFilePath(filePath: StandardizedFilePath, opts: {
        markInProject: boolean;
        scriptKind: ts.ScriptKind | undefined;
    }): Promise<ts.SourceFile | undefined>;
    /**
     * Synchronously adds or gets a source file from a file path.
     * @param filePath - File path to get.
     * @param opts - Options for adding or getting the file.
     */
    addOrGetSourceFileFromFilePathSync(filePath: StandardizedFilePath, opts: {
        markInProject: boolean;
        scriptKind: ts.ScriptKind | undefined;
    }): ts.SourceFile | undefined;
    /**
     * Gets the source file version of the specified source file.
     * @param sourceFile - Source file to inspect.
     */
    getSourceFileVersion(sourceFile: ts.SourceFile): string;
    /**
     * Gets if the container contains the specified directory.
     * @param dirPath - Path of the directory to check.
     */
    containsDirectoryAtPath(dirPath: StandardizedFilePath): boolean;
    /**
     * Gets the child directories of the specified directory.
     * @param dirPath - Path of the directory to check.
     */
    getChildDirectoriesOfDirectory(dirPath: StandardizedFilePath): StandardizedFilePath[];
}

/** Decorator for memoizing the result of a method or get accessor. */
export declare function Memoize(target: any, context: any): (this: any, ...args: any[]) => any;

/** Collection of helper functions that can be used to throw errors. */
export declare namespace errors {
    /**
     * Minimal attributes to show a error message with the node source.
     */
    interface Node {
        getSourceFile(): {
            getFilePath(): StandardizedFilePath;
            getFullText(): string;
        };
        getStart(): number;
    }
    /** Base error class. */
    abstract class BaseError extends Error {
        protected constructor();
    }
    /** Thrown when there is a problem with a provided argument. */
    class ArgumentError extends BaseError {
        constructor(argName: string, message: string, node?: Node);
    }
    /** Thrown when an argument is null or whitespace. */
    class ArgumentNullOrWhitespaceError extends ArgumentError {
        constructor(argName: string, node?: Node);
    }
    /** Thrown when an argument is out of range. */
    class ArgumentOutOfRangeError extends ArgumentError {
        constructor(argName: string, value: number, range: [number, number], node?: Node);
    }
    /** Thrown when an argument does not match an expected type. */
    class ArgumentTypeError extends ArgumentError {
        constructor(argName: string, expectedType: string, actualType: string, node?: Node);
    }
    /** Thrown when a file or directory path was not found. */
    class PathNotFoundError extends BaseError {
        readonly path: StandardizedFilePath;
        constructor(path: StandardizedFilePath, prefix?: string);
        readonly code: "ENOENT";
    }
    /** Thrown when a directory was not found. */
    class DirectoryNotFoundError extends PathNotFoundError {
        constructor(dirPath: StandardizedFilePath);
    }
    /** Thrown when a file was not found. */
    class FileNotFoundError extends PathNotFoundError {
        constructor(filePath: StandardizedFilePath);
    }
    /** Thrown when an action was taken that is not allowed. */
    class InvalidOperationError extends BaseError {
        constructor(message: string, node?: Node);
    }
    /** Thrown when a certain behaviour or feature has not been implemented. */
    class NotImplementedError extends BaseError {
        constructor(message?: string, node?: Node);
    }
    /** Thrown when an operation is not supported. */
    class NotSupportedError extends BaseError {
        constructor(message: string);
    }
    /**
     * Thows if not a type.
     * @param value - Value to check the type of.
     * @param expectedType - Expected type.
     * @param argName - Argument name.
     */
    function throwIfNotType(value: any, expectedType: string, argName: string): void;
    /**
     * Throws if the value is not a string.
     * @param value - Value to check.
     * @param argName - Arg name.
     */
    function throwIfNotString(value: string, argName: string): void;
    /**
     * Throws if the value is not a string or is whitespace.
     * @param value - Value to check.
     * @param argName - Arg name.
     */
    function throwIfWhitespaceOrNotString(value: string, argName: string): void;
    /**
     * Throws an ArgumentOutOfRangeError if an argument's value is out of an inclusive range.
     * @param value - Value.
     * @param range - Range.
     * @param argName - Argument name.
     */
    function throwIfOutOfRange(value: number, range: [number, number], argName: string): void;
    /**
     * Throws an ArgumentOutOfRangeError if an argument's range value is out of an inclusive range.
     *
     * Also throws when the start of the range is greater than the end.
     * @param actualRange - Range to check.
     * @param range - Range to check against.
     * @param argName - Argument name.
     */
    function throwIfRangeOutOfRange(actualRange: [number, number], range: [number, number], argName: string): void;
    /**
     * Gets an error saying that a feature is not implemented for a certain syntax kind.
     * @param kind - Syntax kind that isn't implemented.
     */
    function throwNotImplementedForSyntaxKindError(kind: ts.SyntaxKind, node?: Node): never;
    /**
     * Throws an Argument
     * @param value
     * @param argName
     */
    function throwIfNegative(value: number, argName: string): void;
    /**
     * Throws when the value is null or undefined.
     * @param value - Value to check.
     * @param errorMessage - Error message to throw when not defined.
     */
    function throwIfNullOrUndefined<T>(value: T | undefined, errorMessage: string | (() => string), node?: Node): T;
    /**
     * Throw if the value should have been the never type.
     * @param value - Value to check.
     */
    function throwNotImplementedForNeverValueError(value: never, sourceNode?: Node): never;
    /**
     * Throws an error if the actual value does not equal the expected value.
     * @param actual - Actual value.
     * @param expected - Expected value.
     * @param description - Message to show in the error. Should be a full sentence that doesn't include the actual and expected values.
     */
    function throwIfNotEqual<T>(actual: T, expected: T, description: string): void;
    /**
     * Throws if true.
     * @param value - Value to check.
     * @param errorMessage - Error message to throw when true.
     */
    function throwIfTrue(value: boolean | undefined, errorMessage: string): void;
}

/**
 * Represents a file system that can be interacted with.
 */
export interface FileSystemHost {
    /** Gets if this file system is case sensitive. */
    isCaseSensitive(): boolean;
    /** Asynchronously deletes the specified file or directory. */
    delete(path: string): Promise<void>;
    /** Synchronously deletes the specified file or directory */
    deleteSync(path: string): void;
    /**
     * Reads all the child directories and files.
     * @remarks Implementers should have this return the full file path.
     */
    readDirSync(dirPath: string): RuntimeDirEntry[];
    /** Asynchronously reads a file at the specified path. */
    readFile(filePath: string, encoding?: string): Promise<string>;
    /** Synchronously reads a file at the specified path. */
    readFileSync(filePath: string, encoding?: string): string;
    /** Asynchronously writes a file to the file system. */
    writeFile(filePath: string, fileText: string): Promise<void>;
    /** Synchronously writes a file to the file system. */
    writeFileSync(filePath: string, fileText: string): void;
    /** Asynchronously creates a directory at the specified path. */
    mkdir(dirPath: string): Promise<void>;
    /** Synchronously creates a directory at the specified path. */
    mkdirSync(dirPath: string): void;
    /** Asynchronously moves a file or directory. */
    move(srcPath: string, destPath: string): Promise<void>;
    /** Synchronously moves a file or directory. */
    moveSync(srcPath: string, destPath: string): void;
    /** Asynchronously copies a file or directory. */
    copy(srcPath: string, destPath: string): Promise<void>;
    /** Synchronously copies a file or directory. */
    copySync(srcPath: string, destPath: string): void;
    /** Asynchronously checks if a file exists.
     * @remarks Implementers should throw an `errors.FileNotFoundError` when it does not exist.
     */
    fileExists(filePath: string): Promise<boolean>;
    /** Synchronously checks if a file exists.
     * @remarks Implementers should throw an `errors.FileNotFoundError` when it does not exist.
     */
    fileExistsSync(filePath: string): boolean;
    /** Asynchronously checks if a directory exists. */
    directoryExists(dirPath: string): Promise<boolean>;
    /** Synchronously checks if a directory exists. */
    directoryExistsSync(dirPath: string): boolean;
    /** See https://nodejs.org/api/fs.html#fs_fs_realpathsync_path_options */
    realpathSync(path: string): string;
    /** Gets the current directory of the environment. */
    getCurrentDirectory(): string;
    /** Uses pattern matching to find files or directories. */
    glob(patterns: ReadonlyArray<string>): Promise<string[]>;
    /** Synchronously uses pattern matching to find files or directories. */
    globSync(patterns: ReadonlyArray<string>): string[];
}

/** Utilities for working with files. */
export declare class FileUtils {
    #private;
    static readonly ENOENT = "ENOENT";
    private constructor();
    /**
     * Gets if the error is a file not found or directory not found error.
     * @param err - Error to check.
     */
    static isNotExistsError(err: any): boolean;
    /**
     * Joins the paths.
     * @param paths - Paths to join.
     */
    static pathJoin<T extends string>(basePath: T, ...paths: string[]): T;
    /**
     * Gets if the path is absolute.
     * @param fileOrDirPath - File or directory path.
     */
    static pathIsAbsolute(fileOrDirPath: string): boolean;
    /**
     * Gets the standardized absolute path.
     * @param fileSystem - File system.
     * @param fileOrDirPath - Path to standardize.
     * @param relativeBase - Base path to be relative from.
     */
    static getStandardizedAbsolutePath(fileSystem: FileSystemHost, fileOrDirPath: string, relativeBase?: string): StandardizedFilePath;
    /**
     * Gets the directory path.
     * @param fileOrDirPath - Path to get the directory name from.
     */
    static getDirPath<T extends string>(fileOrDirPath: T): T;
    /**
     * Gets the last portion of the path.
     * @param fileOrDirPath - Path to get the base name from.
     */
    static getBaseName(fileOrDirPath: StandardizedFilePath): string;
    /**
     * Gets the extension of the file name.
     * @param fileOrDirPath - Path to get the extension from.
     */
    static getExtension(fileOrDirPath: StandardizedFilePath): string;
    /**
     * Changes all back slashes to forward slashes.
     * @param fileOrDirPath - Path.
     */
    static standardizeSlashes<T extends string>(fileOrDirPath: T): T;
    /**
     * Checks if a path ends with a specified search path.
     * @param fileOrDirPath - Path.
     * @param endsWithPath - Ends with path.
     */
    static pathEndsWith(fileOrDirPath: string | undefined, endsWithPath: string | undefined): boolean;
    /**
     * Checks if a path starts with a specified search path.
     * @param fileOrDirPath - Path.
     * @param startsWithPath - Starts with path.
     */
    static pathStartsWith(fileOrDirPath: string | undefined, startsWithPath: string | undefined): boolean;
    /**
     * Gets the parent most paths out of the list of paths.
     * @param paths - File or directory paths.
     */
    static getParentMostPaths(paths: StandardizedFilePath[]): StandardizedFilePath[];
    /**
     * Reads a file or returns false if the file doesn't exist.
     * @param fileSystem - File System.
     * @param filePath - Path to file.
     * @param encoding - File encoding.
     */
    static readFileOrNotExists(fileSystem: FileSystemHost, filePath: StandardizedFilePath, encoding: string): Promise<string | false>;
    /**
     * Reads a file synchronously or returns false if the file doesn't exist.
     * @param fileSystem - File System.
     * @param filePath - Path to file.
     * @param encoding - File encoding.
     */
    static readFileOrNotExistsSync(fileSystem: FileSystemHost, filePath: StandardizedFilePath, encoding: string): string | false;
    /**
     * Gets the text with a byte order mark.
     * @param text - Text.
     */
    static getTextWithByteOrderMark(text: string): string;
    /**
     * Gets the relative path from one absolute path to another.
     * @param absoluteDirPathFrom - Absolute directory path from.
     * @param absolutePathTo - Absolute path to.
     */
    static getRelativePathTo(absoluteDirPathFrom: StandardizedFilePath, absolutePathTo: StandardizedFilePath): StandardizedFilePath;
    /**
     * Gets if the path is for the root directory.
     * @param path - Path.
     */
    static isRootDirPath(dirOrFilePath: string): boolean;
    /**
     * Gets the descendant directories of the specified directory.
     * @param dirPath - Directory path.
     */
    static getDescendantDirectories(fileSystemWrapper: TransactionalFileSystem, dirPath: StandardizedFilePath): IterableIterator<StandardizedFilePath>;
    /**
     * Gets the glob as absolute.
     * @param glob - Glob.
     * @param cwd - Current working directory.
     */
    static toAbsoluteGlob(glob: string, cwd: string): string;
    /**
     * Gets if the glob is a negated glob.
     * @param glob - Glob.
     */
    static isNegatedGlob(glob: string): boolean;
}

/** An implementation of a file system that exists in memory only. */
export declare class InMemoryFileSystemHost implements FileSystemHost {
    #private;
    /**
     * Constructor.
     */
    constructor();
    /** @inheritdoc */
    isCaseSensitive(): boolean;
    /** @inheritdoc */
    delete(path: string): Promise<void>;
    /** @inheritdoc */
    deleteSync(path: string): void;
    /** @inheritdoc */
    readDirSync(dirPath: string): RuntimeDirEntry[];
    /** @inheritdoc */
    readFile(filePath: string, encoding?: string): Promise<string>;
    /** @inheritdoc */
    readFileSync(filePath: string, encoding?: string): string;
    /** @inheritdoc */
    writeFile(filePath: string, fileText: string): Promise<void>;
    /** @inheritdoc */
    writeFileSync(filePath: string, fileText: string): void;
    /** @inheritdoc */
    mkdir(dirPath: string): Promise<void>;
    /** @inheritdoc */
    mkdirSync(dirPath: string): void;
    /** @inheritdoc */
    move(srcPath: string, destPath: string): Promise<void>;
    /** @inheritdoc */
    moveSync(srcPath: string, destPath: string): void;
    /** @inheritdoc */
    copy(srcPath: string, destPath: string): Promise<void>;
    /** @inheritdoc */
    copySync(srcPath: string, destPath: string): void;
    /** @inheritdoc */
    fileExists(filePath: string): Promise<boolean>;
    /** @inheritdoc */
    fileExistsSync(filePath: string): boolean;
    /** @inheritdoc */
    directoryExists(dirPath: string): Promise<boolean>;
    /** @inheritdoc */
    directoryExistsSync(dirPath: string): boolean;
    /** @inheritdoc */
    realpathSync(path: string): string;
    /** @inheritdoc */
    getCurrentDirectory(): string;
    /** @inheritdoc */
    glob(patterns: ReadonlyArray<string>): Promise<string[]>;
    /** @inheritdoc */
    globSync(patterns: ReadonlyArray<string>): string[];
}

/** Checks the specified file paths to see if the match any of the specified patterns. */
export declare function matchGlobs(paths: ReadonlyArray<string>, patterns: string | ReadonlyArray<string>, cwd: string): string[];

/** An implementation of a file host that interacts with the actual file system. */
export declare class RealFileSystemHost implements FileSystemHost {
    #private;
    /** @inheritdoc */
    delete(path: string): Promise<void>;
    /** @inheritdoc */
    deleteSync(path: string): void;
    /** @inheritdoc */
    readDirSync(dirPath: string): RuntimeDirEntry[];
    /** @inheritdoc */
    readFile(filePath: string, encoding?: string): Promise<string>;
    /** @inheritdoc */
    readFileSync(filePath: string, encoding?: string): string;
    /** @inheritdoc */
    writeFile(filePath: string, fileText: string): Promise<void>;
    /** @inheritdoc */
    writeFileSync(filePath: string, fileText: string): void;
    /** @inheritdoc */
    mkdir(dirPath: string): Promise<void>;
    /** @inheritdoc */
    mkdirSync(dirPath: string): void;
    /** @inheritdoc */
    move(srcPath: string, destPath: string): Promise<void>;
    /** @inheritdoc */
    moveSync(srcPath: string, destPath: string): void;
    /** @inheritdoc */
    copy(srcPath: string, destPath: string): Promise<void>;
    /** @inheritdoc */
    copySync(srcPath: string, destPath: string): void;
    /** @inheritdoc */
    fileExists(filePath: string): Promise<boolean>;
    /** @inheritdoc */
    fileExistsSync(filePath: string): boolean;
    /** @inheritdoc */
    directoryExists(dirPath: string): Promise<boolean>;
    /** @inheritdoc */
    directoryExistsSync(dirPath: string): boolean;
    /** @inheritdoc */
    realpathSync(path: string): string;
    /** @inheritdoc */
    getCurrentDirectory(): string;
    /** @inheritdoc */
    glob(patterns: ReadonlyArray<string>): Promise<string[]>;
    /** @inheritdoc */
    globSync(patterns: ReadonlyArray<string>): string[];
    /** @inheritdoc */
    isCaseSensitive(): boolean;
}

/** Nominal type to denote a file path that has been standardized. */
export type StandardizedFilePath = string & {
    _standardizedFilePathBrand: undefined;
};

export interface DirEntry {
    path: StandardizedFilePath;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
}

export interface TransactionalFileSystemOptions {
    fileSystem: FileSystemHost;
    skipLoadingLibFiles: boolean | undefined;
    libFolderPath: string | undefined;
}

/**
 * FileSystemHost wrapper that allows transactionally queuing operations to the file system.
 */
export declare class TransactionalFileSystem {
    #private;
    /**
     * Constructor.
     * @param fileSystem - File system host to commit the operations to.
     */
    constructor(options: TransactionalFileSystemOptions);
    queueFileDelete(filePath: StandardizedFilePath): void;
    removeFileDelete(filePath: StandardizedFilePath): void;
    queueMkdir(dirPath: StandardizedFilePath): void;
    queueDirectoryDelete(dirPath: StandardizedFilePath): void;
    queueMoveDirectory(srcPath: StandardizedFilePath, destPath: StandardizedFilePath): void;
    queueCopyDirectory(srcPath: StandardizedFilePath, destPath: StandardizedFilePath): void;
    flush(): Promise<void>;
    flushSync(): void;
    saveForDirectory(dirPath: StandardizedFilePath): Promise<void>;
    saveForDirectorySync(dirPath: StandardizedFilePath): void;
    moveFileImmediately(oldFilePath: StandardizedFilePath, newFilePath: StandardizedFilePath, fileText: string): Promise<void>;
    moveFileImmediatelySync(oldFilePath: StandardizedFilePath, newFilePath: StandardizedFilePath, fileText: string): void;
    deleteFileImmediately(filePath: StandardizedFilePath): Promise<void>;
    deleteFileImmediatelySync(filePath: StandardizedFilePath): void;
    copyDirectoryImmediately(srcDirPath: StandardizedFilePath, destDirPath: StandardizedFilePath): Promise<void>;
    copyDirectoryImmediatelySync(srcDirPath: StandardizedFilePath, destDirPath: StandardizedFilePath): void;
    moveDirectoryImmediately(srcDirPath: StandardizedFilePath, destDirPath: StandardizedFilePath): Promise<void>;
    moveDirectoryImmediatelySync(srcDirPath: StandardizedFilePath, destDirPath: StandardizedFilePath): void;
    deleteDirectoryImmediately(dirPath: StandardizedFilePath): Promise<void>;
    /** Recreates a directory on the underlying file system asynchronously. */
    clearDirectoryImmediately(dirPath: StandardizedFilePath): Promise<void>;
    /** Recreates a directory on the underlying file system synchronously. */
    clearDirectoryImmediatelySync(dirPath: StandardizedFilePath): void;
    deleteDirectoryImmediatelySync(dirPath: StandardizedFilePath): void;
    fileExists(filePath: StandardizedFilePath): boolean | Promise<boolean>;
    fileExistsSync(filePath: StandardizedFilePath): boolean;
    directoryExistsSync(dirPath: StandardizedFilePath): boolean;
    readFileIfExistsSync(filePath: StandardizedFilePath, encoding: string | undefined): string | undefined;
    readFileSync(filePath: StandardizedFilePath, encoding: string | undefined): string;
    readFileIfExists(filePath: StandardizedFilePath, encoding: string | undefined): Promise<string | undefined>;
    readFile(filePath: StandardizedFilePath, encoding: string | undefined): Promise<string>;
    readDirSync(dirPath: StandardizedFilePath): DirEntry[];
    glob(patterns: ReadonlyArray<string>): Promise<StandardizedFilePath[]>;
    globSync(patterns: ReadonlyArray<string>): Generator<StandardizedFilePath, void, unknown>;
    getFileSystem(): FileSystemHost;
    getCurrentDirectory(): StandardizedFilePath;
    getDirectories(dirPath: StandardizedFilePath): StandardizedFilePath[];
    realpathSync(path: StandardizedFilePath): StandardizedFilePath;
    getStandardizedAbsolutePath(fileOrDirPath: string, relativeBase?: string): StandardizedFilePath;
    readFileOrNotExists(filePath: StandardizedFilePath, encoding: string): false | Promise<string | false>;
    readFileOrNotExistsSync(filePath: StandardizedFilePath, encoding: string): string | false;
    writeFile(filePath: StandardizedFilePath, fileText: string): Promise<void>;
    writeFileSync(filePath: StandardizedFilePath, fileText: string): void;
}

/** Gets the TypeScript lib files (.d.ts files). */
export declare function getLibFiles(): {
    fileName: string;
    text: string;
}[];

export declare function getLibFolderPath(options: {
    libFolderPath?: string;
    skipLoadingLibFiles?: boolean;
}): string;

/** The folder to use to "store" the in memory lib files. */
export declare const libFolderInMemoryPath: StandardizedFilePath;

/**
 * Gets the enum name for the specified syntax kind.
 * @param kind - Syntax kind.
 */
export declare function getSyntaxKindName(kind: ts.SyntaxKind): string;

/**
 * Holds the compiler options.
 */
export declare class CompilerOptionsContainer extends SettingsContainer<ts.CompilerOptions> {
    constructor(defaultSettings?: ts.CompilerOptions);
    /**
     * Sets one or all of the compiler options.
     *
     * WARNING: Setting the compiler options will cause a complete reparse of all the source files.
     * @param settings - Compiler options to set.
     */
    set(settings: Partial<ts.CompilerOptions>): void;
    /**
     * Gets the encoding from the compiler options or returns utf-8.
     */
    getEncoding(): string;
}

export declare abstract class SettingsContainer<T extends object> {
    #private;
    protected _settings: T;
    /**
     * Constructor.
     * @param defaultSettings - The settings to use by default.
     */
    constructor(defaultSettings: T);
    /**
     * Resets the settings to the default.
     */
    reset(): void;
    /**
     * Gets a copy of the settings as an object.
     */
    get(): T;
    /**
     * Sets one or all of the settings.
     * @param settings - Settings to set.
     */
    set(settings: Partial<T>): void;
    /**
     * Subscribe to modifications in the settings container.
     * @param action - Action to execute when the settings change.
     */
    onModified(action: () => void): void;
}

export declare const runtime: Runtime;

export interface Runtime {
    fs: RuntimeFileSystem;
    path: RuntimePath;
    getEnvVar(name: string): string | undefined;
    getEndOfLine(): string;
    getPathMatchesPattern(path: string, pattern: string): boolean;
}

export interface RuntimeDirEntry {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
}

export interface RuntimeFileInfo {
    isFile(): boolean;
    isDirectory(): boolean;
}

export interface RuntimeFileSystem {
    /** Gets if this file system is case sensitive. */
    isCaseSensitive(): boolean;
    /** Asynchronously deletes the specified file or directory. */
    delete(path: string): Promise<void>;
    /** Synchronously deletes the specified file or directory */
    deleteSync(path: string): void;
    /** Reads all the child directories and files. */
    readDirSync(dirPath: string): RuntimeDirEntry[];
    /** Asynchronously reads a file at the specified path. */
    readFile(filePath: string, encoding?: string): Promise<string>;
    /** Synchronously reads a file at the specified path. */
    readFileSync(filePath: string, encoding?: string): string;
    /** Asynchronously writes a file to the file system. */
    writeFile(filePath: string, fileText: string): Promise<void>;
    /** Synchronously writes a file to the file system. */
    writeFileSync(filePath: string, fileText: string): void;
    /** Asynchronously creates a directory at the specified path. */
    mkdir(dirPath: string): Promise<void>;
    /** Synchronously creates a directory at the specified path. */
    mkdirSync(dirPath: string): void;
    /** Asynchronously moves a file or directory. */
    move(srcPath: string, destPath: string): Promise<void>;
    /** Synchronously moves a file or directory. */
    moveSync(srcPath: string, destPath: string): void;
    /** Asynchronously copies a file or directory. */
    copy(srcPath: string, destPath: string): Promise<void>;
    /** Synchronously copies a file or directory. */
    copySync(srcPath: string, destPath: string): void;
    /** Asynchronously gets the path's stat information. */
    stat(path: string): Promise<RuntimeFileInfo | undefined>;
    /** Synchronously gets the path's stat information. */
    statSync(path: string): RuntimeFileInfo | undefined;
    /** See https://nodejs.org/api/fs.html#fs_fs_realpathsync_path_options */
    realpathSync(path: string): string;
    /** Gets the current directory of the environment. */
    getCurrentDirectory(): string;
    /** Uses pattern matching to find files or directories. */
    glob(patterns: ReadonlyArray<string>): Promise<string[]>;
    /** Synchronously uses pattern matching to find files or directories. */
    globSync(patterns: ReadonlyArray<string>): string[];
}

export interface RuntimePath {
    /** Joins the paths. */
    join(...paths: string[]): string;
    /** Normalizes the provided path. */
    normalize(path: string): string;
    /** Returns the relative path from `from` to `to`. */
    relative(from: string, to: string): string;
}

export declare function matchFiles(this: any, path: string, extensions: ReadonlyArray<string>, excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>, useCaseSensitiveFileNames: boolean, currentDirectory: string, depth: number | undefined, getEntries: (path: string) => FileSystemEntries, realpath: (path: string) => string, directoryExists: (path: string) => boolean): string[];

export declare function getFileMatcherPatterns(this: any, path: string, excludes: ReadonlyArray<string>, includes: ReadonlyArray<string>, useCaseSensitiveFileNames: boolean, currentDirectory: string): FileMatcherPatterns;

export declare function getEmitModuleResolutionKind(this: any, compilerOptions: ts.CompilerOptions): any;

export interface FileMatcherPatterns {
    /** One pattern for each "include" spec. */
    includeFilePatterns: ReadonlyArray<string>;
    /** One pattern matching one of any of the "include" specs. */
    includeFilePattern: string;
    includeDirectoryPattern: string;
    excludePattern: string;
    basePaths: ReadonlyArray<string>;
}

export interface FileSystemEntries {
    readonly files: ReadonlyArray<string>;
    readonly directories: ReadonlyArray<string>;
}

export declare class ArrayUtils {
    private constructor();
    static isReadonlyArray<T>(a: unknown): a is ReadonlyArray<T>;
    static isNullOrEmpty<T>(a: ReadonlyArray<T> | undefined): a is undefined;
    static getUniqueItems<T>(a: ReadonlyArray<T>): T[];
    static removeFirst<T>(a: T[], item: T): boolean;
    static removeAll<T>(a: T[], isMatch: (item: T) => boolean): T[];
    static toIterator<T>(items: ReadonlyArray<T>): Generator<T, void, unknown>;
    static sortByProperty<T>(items: T[], getProp: (item: T) => string | number): T[];
    static groupBy<T>(items: ReadonlyArray<T>, getGroup: (item: T) => string | number): T[][];
    static binaryInsertWithOverwrite<T>(items: T[], newItem: T, comparer: Comparer<T>): void;
    static binarySearch<T>(items: ReadonlyArray<T>, storedComparer: StoredComparer<T>): number;
    static containsSubArray<T>(items: ReadonlyArray<T>, subArray: ReadonlyArray<T>): boolean;
}

/**
 * Deep clones an object not maintaining references.
 * @remarks If this has a circular reference it will go forever so be careful.
 */
export declare function deepClone<T extends object>(objToClone: T): T;

/**
 * Event container subscription type
 */
export type EventContainerSubscription<EventArgType> = (arg: EventArgType) => void;

/**
 * Event container for event subscriptions.
 */
export declare class EventContainer<EventArgType = undefined> {
    #private;
    /**
     * Subscribe to an event being fired.
     * @param subscription - Subscription.
     */
    subscribe(subscription: EventContainerSubscription<EventArgType>): void;
    /**
     * Unsubscribe to an event being fired.
     * @param subscription - Subscription.
     */
    unsubscribe(subscription: EventContainerSubscription<EventArgType>): void;
    /**
     * Fire an event.
     */
    fire(arg: EventArgType): void;
}

export declare class IterableUtils {
    static find<T>(items: IterableIterator<T>, condition: (item: T) => boolean): T | undefined;
}

export declare function nameof<TObject>(obj: TObject, key: keyof TObject): string;

export declare function nameof<TObject>(key: keyof TObject): string;

export declare class ObjectUtils {
    private constructor();
    static clone<T>(obj: T): T;
}

export declare class StringUtils {
    private constructor();
    static isWhitespaceCharCode(charCode: number | undefined): boolean;
    static isSpaces(text: string): boolean;
    static hasBom(text: string): boolean;
    static stripBom(text: string): string;
    static stripQuotes(text: string): string;
    static isQuoted(text: string): boolean;
    static isNullOrWhitespace(str: string | undefined): str is undefined;
    static isNullOrEmpty(str: string | undefined): str is undefined;
    static isWhitespace(text: string | undefined): boolean;
    static startsWithNewLine(str: string | undefined): boolean;
    static endsWithNewLine(str: string | undefined): boolean;
    static insertAtLastNonWhitespace(str: string, insertText: string): string;
    static getLineNumberAtPos(str: string, pos: number): number;
    static getLengthFromLineStartAtPos(str: string, pos: number): number;
    static getLineStartFromPos(str: string, pos: number): number;
    static getLineEndFromPos(str: string, pos: number): number;
    static escapeForWithinString(str: string, quoteKind: "\"" | "'"): string;
    /**
     * Escapes all the occurrences of the char in the string.
     */
    static escapeChar(str: string, char: string): string;
    static removeIndentation(str: string, opts: {
        isInStringAtPos: (pos: number) => boolean;
        indentSizeInSpaces: number;
    }): string;
    static indent(str: string, times: number, options: {
        indentText: string;
        indentSizeInSpaces: number;
        isInStringAtPos: (pos: number) => boolean;
    }): string;
}

export import CompilerOptions = ts.CompilerOptions;
export import DiagnosticCategory = ts.DiagnosticCategory;
export import EditorSettings = ts.EditorSettings;
export import EmitHint = ts.EmitHint;
export import ImportPhaseModifierSyntaxKind = ts.ImportPhaseModifierSyntaxKind;
export import LanguageVariant = ts.LanguageVariant;
export import ModuleKind = ts.ModuleKind;
export import ModuleResolutionKind = ts.ModuleResolutionKind;
export import NewLineKind = ts.NewLineKind;
export import NodeFlags = ts.NodeFlags;
export import ObjectFlags = ts.ObjectFlags;
export import ScriptKind = ts.ScriptKind;
export import ScriptTarget = ts.ScriptTarget;
export import SymbolFlags = ts.SymbolFlags;
export import SyntaxKind = ts.SyntaxKind;
export import TypeFlags = ts.TypeFlags;
export import TypeFormatFlags = ts.TypeFormatFlags;
export { ts };
