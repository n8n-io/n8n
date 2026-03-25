import { errors, ts } from "@ts-morph/common";

/** Holds the compiler options. */
export declare class CompilerOptionsContainer extends SettingsContainer<ts.CompilerOptions> {
  constructor(defaultSettings?: ts.CompilerOptions);
  /**
   * Sets one or all of the compiler options.
   *
   * WARNING: Setting the compiler options will cause a complete reparse of all the source files.
   * @param settings - Compiler options to set.
   */
  set(settings: Partial<ts.CompilerOptions>): void;
  /** Gets the encoding from the compiler options or returns utf-8. */
  getEncoding(): string;
}

/** Represents a file system that can be interacted with. */
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
  /**
   * Asynchronously checks if a file exists.
   * @remarks Implementers should throw an `errors.FileNotFoundError` when it does not exist.
   */
  fileExists(filePath: string): Promise<boolean>;
  /**
   * Synchronously checks if a file exists.
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

/** An implementation of a file system that exists in memory only. */
export declare class InMemoryFileSystemHost implements FileSystemHost {
  #private;
  /** Constructor. */
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

export interface RuntimeDirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
}

export declare abstract class SettingsContainer<T extends object> {
  #private;
  protected _settings: T;
  /**
   * Constructor.
   * @param defaultSettings - The settings to use by default.
   */
  constructor(defaultSettings: T);
  /** Resets the settings to the default. */
  reset(): void;
  /** Gets a copy of the settings as an object. */
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

/** Nominal type to denote a file path that has been standardized. */
export type StandardizedFilePath = string & {
      _standardizedFilePathBrand: undefined;
  };
declare const ArgumentError: typeof errors.ArgumentError;
declare const ArgumentNullOrWhitespaceError: typeof errors.ArgumentNullOrWhitespaceError;
declare const ArgumentOutOfRangeError: typeof errors.ArgumentOutOfRangeError;
declare const ArgumentTypeError: typeof errors.ArgumentTypeError;
declare const BaseError: typeof errors.BaseError;
declare const DirectoryNotFoundError: typeof errors.DirectoryNotFoundError;
declare const FileNotFoundError: typeof errors.FileNotFoundError;
declare const InvalidOperationError: typeof errors.InvalidOperationError;
declare const NotImplementedError: typeof errors.NotImplementedError;
declare const NotSupportedError: typeof errors.NotSupportedError;
declare const PathNotFoundError: typeof errors.PathNotFoundError;

export declare class Directory {
  #private;
  private constructor();
  /**
   * Checks if this directory is an ancestor of the provided directory.
   * @param possibleDescendant - Directory or source file that's a possible descendant.
   */
  isAncestorOf(possibleDescendant: Directory | SourceFile): boolean;
  /**
   * Checks if this directory is a descendant of the provided directory.
   * @param possibleAncestor - Directory or source file that's a possible ancestor.
   */
  isDescendantOf(possibleAncestor: Directory): boolean;
  /** Gets the path to the directory. */
  getPath(): StandardizedFilePath;
  /** Gets the directory path's base name. */
  getBaseName(): string;
  /** Gets the parent directory or throws if it doesn't exist or was never added to the project. */
  getParentOrThrow(message?: string | (() => string)): Directory;
  /** Gets the parent directory if it exists and was added to the project. */
  getParent(): Directory | undefined;
  /**
   * Gets a child directory with the specified path or throws if not found.
   * @param path - Relative path from this directory or absolute path.
   */
  getDirectoryOrThrow(path: string): Directory;
  /**
   * Gets a child directory by the specified condition or throws if not found.
   * @param condition - Condition to check the directory with.
   */
  getDirectoryOrThrow(condition: (directory: Directory) => boolean): Directory;
  /**
   * Gets a directory with the specified path or undefined if not found.
   * @param path - Relative path from this directory or absolute path.
   */
  getDirectory(path: string): Directory | undefined;
  /**
   * Gets a child directory by the specified condition or undefined if not found.
   * @param condition - Condition to check the directory with.
   */
  getDirectory(condition: (directory: Directory) => boolean): Directory | undefined;
  /**
   * Gets a child source file with the specified path or throws if not found.
   * @param path - Relative or absolute path to the file.
   */
  getSourceFileOrThrow(path: string): SourceFile;
  /**
   * Gets a child source file by the specified condition or throws if not found.
   * @param condition - Condition to check the source file with.
   */
  getSourceFileOrThrow(condition: (sourceFile: SourceFile) => boolean): SourceFile;
  /**
   * Gets a child source file with the specified path or undefined if not found.
   * @param path - Relative or absolute path to the file.
   */
  getSourceFile(path: string): SourceFile | undefined;
  /**
   * Gets a child source file by the specified condition or undefined if not found.
   * @param condition - Condition to check the source file with.
   */
  getSourceFile(condition: (sourceFile: SourceFile) => boolean): SourceFile | undefined;
  /** Gets the child directories. */
  getDirectories(): Directory[];
  /** Gets the source files within this directory. */
  getSourceFiles(): SourceFile[];
  /**
   * Gets all the source files added to the project relative to the directory that match a pattern.
   * @param globPattern - Glob pattern for filtering out the source files.
   */
  getSourceFiles(globPattern: string): SourceFile[];
  /**
   * Gets all the source files added to the project relative to the directory that match the provided patterns.
   * @param globPatterns - Glob patterns for filtering out the source files.
   */
  getSourceFiles(globPatterns: ReadonlyArray<string>): SourceFile[];
  /** Gets the source files in the current directory and all the descendant directories. */
  getDescendantSourceFiles(): SourceFile[];
  /** Gets the descendant directories. */
  getDescendantDirectories(): Directory[];
  /**
   * Add source files based on file globs.
   * @param fileGlobs - File glob or globs to add files based on.
   * @returns The matched source files.
   */
  addSourceFilesAtPaths(fileGlobs: string | ReadonlyArray<string>): SourceFile[];
  /**
   * Adds an existing directory from the relative path or directory name, or returns undefined if it doesn't exist.
   *
   * Will return the directory if it was already added.
   * @param relativeOrAbsoluteDirPath - Directory name or path to the directory that should be added.
   * @param options - Options.
   */
  addDirectoryAtPathIfExists(relativeOrAbsoluteDirPath: string, options?: DirectoryAddOptions): Directory | undefined;
  /**
   * Adds an existing directory from the relative path or directory name, or throws if it doesn't exist.
   *
   * Will return the directory if it was already added.
   * @param relativeOrAbsoluteDirPath - Directory name or path to the directory that should be added.
   * @throws DirectoryNotFoundError if the directory does not exist.
   */
  addDirectoryAtPath(relativeOrAbsoluteDirPath: string, options?: DirectoryAddOptions): Directory;
  /**
   * Creates a directory if it doesn't exist.
   * @param relativeOrAbsoluteDirPath - Relative or absolute path to the directory that should be created.
   */
  createDirectory(relativeOrAbsoluteDirPath: string): Directory;
  /**
   * Creates a source file, relative to this directory.
   *
   * Note: The file will not be created and saved to the file system until .save() is called on the source file.
   * @param relativeFilePath - Relative file path of the source file to create.
   * @param sourceFileText - Text, structure, or writer function to create the source file text with.
   * @param options - Options.
   * @throws - InvalidOperationError if a source file already exists at the provided file name.
   */
  createSourceFile(relativeFilePath: string, sourceFileText?: string | OptionalKind<SourceFileStructure> | WriterFunction, options?: SourceFileCreateOptions): SourceFile;
  /**
   * Adds an existing source file, relative to this directory, or returns undefined.
   *
   * Will return the source file if it was already added.
   * @param relativeFilePath - Relative file path to add.
   */
  addSourceFileAtPathIfExists(relativeFilePath: string): SourceFile | undefined;
  /**
   * Adds an existing source file, relative to this directory, or throws if it doesn't exist.
   *
   * Will return the source file if it was already added.
   * @param relativeFilePath - Relative file path to add.
   * @throws FileNotFoundError when the file doesn't exist.
   */
  addSourceFileAtPath(relativeFilePath: string): SourceFile;
  /**
   * Emits the files in the directory.
   * @param options - Options for emitting.
   */
  emit(options?: {
        emitOnlyDtsFiles?: boolean;
        outDir?: string;
        declarationDir?: string;
    }): Promise<DirectoryEmitResult>;
  /**
   * Emits the files in the directory synchronously.
   *
   * Remarks: This might be very slow compared to the asynchronous version if there are a lot of files.
   * @param options - Options for emitting.
   */
  emitSync(options?: {
        emitOnlyDtsFiles?: boolean;
        outDir?: string;
        declarationDir?: string;
    }): DirectoryEmitResult;
  /**
   * Copies the directory to a subdirectory of the specified directory.
   * @param dirPathOrDirectory Directory path or directory object to copy the directory to.
   * @param options Options for copying.
   * @returns The new copied directory.
   */
  copyToDirectory(dirPathOrDirectory: string | Directory, options?: DirectoryCopyOptions): Directory;
  /**
   * Copies the directory to a new directory.
   * @param relativeOrAbsolutePath - The relative or absolute path to the new directory.
   * @param options - Options.
   * @returns The directory the copy was made to.
   */
  copy(relativeOrAbsolutePath: string, options?: DirectoryCopyOptions): Directory;
  /**
   * Immediately copies the directory to the specified path asynchronously.
   * @param relativeOrAbsolutePath - Directory path as an absolute or relative path.
   * @param options - Options for moving the directory.
   * @remarks If includeTrackedFiles is true, then it will execute the pending operations in the current directory.
   */
  copyImmediately(relativeOrAbsolutePath: string, options?: DirectoryCopyOptions): Promise<Directory>;
  /**
   * Immediately copies the directory to the specified path synchronously.
   * @param relativeOrAbsolutePath - Directory path as an absolute or relative path.
   * @param options - Options for moving the directory.
   * @remarks If includeTrackedFiles is true, then it will execute the pending operations in the current directory.
   */
  copyImmediatelySync(relativeOrAbsolutePath: string, options?: DirectoryCopyOptions): Directory;
  /**
   * Moves the directory to a subdirectory of the specified directory.
   * @param dirPathOrDirectory Directory path or directory object to move the directory to.
   * @param options Options for moving.
   */
  moveToDirectory(dirPathOrDirectory: string | Directory, options?: DirectoryMoveOptions): this;
  /**
   * Moves the directory to a new path.
   * @param relativeOrAbsolutePath - Directory path as an absolute or relative path.
   * @param options - Options for moving the directory.
   */
  move(relativeOrAbsolutePath: string, options?: DirectoryMoveOptions): this;
  /**
   * Immediately moves the directory to a new path asynchronously.
   * @param relativeOrAbsolutePath - Directory path as an absolute or relative path.
   * @param options - Options for moving the directory.
   */
  moveImmediately(relativeOrAbsolutePath: string, options?: DirectoryMoveOptions): Promise<this>;
  /**
   * Immediately moves the directory to a new path synchronously.
   * @param relativeOrAbsolutePath - Directory path as an absolute or relative path.
   * @param options - Options for moving the directory.
   */
  moveImmediatelySync(relativeOrAbsolutePath: string, options?: DirectoryMoveOptions): this;
  /**
   * Recreates the directory.
   * @remarks This will delete all the descendant source files and directories in memory and queue a delete & mkdir to the file system.
   */
  clear(): void;
  /**
   * Asynchronously recreates the directory.
   * @remarks This will delete all the descendant source files and directories in memory and push a delete & mkdir to the file system.
   */
  clearImmediately(): Promise<void>;
  /**
   * Synchronously recreates the directory.
   * @remarks This will delete all the descendant source files and directories in memory and push a delete & mkdir to the file system.
   */
  clearImmediatelySync(): void;
  /**
   * Queues a deletion of the directory to the file system.
   *
   * The directory will be deleted when calling ast.save(). If you wish to delete the file immediately, then use deleteImmediately().
   */
  delete(): void;
  /** Asyncronously deletes the directory and all its descendants from the file system. */
  deleteImmediately(): Promise<void>;
  /** Synchronously deletes the directory and all its descendants from the file system. */
  deleteImmediatelySync(): void;
  /**
   * Forgets the directory and all its descendants from the Project.
   *
   * Note: Does not delete the directory from the file system.
   */
  forget(): void;
  /** Asynchronously saves the directory and all the unsaved source files to the disk. */
  save(): Promise<void>;
  /** Synchronously saves the directory and all the unsaved source files to the disk. */
  saveSync(): void;
  /**
   * Gets the relative path to the specified path.
   * @param fileOrDirPath - The file or directory path.
   */
  getRelativePathTo(fileOrDirPath: string): string;
  /**
   * Gets the relative path to another source file.
   * @param sourceFile - Source file.
   */
  getRelativePathTo(sourceFile: SourceFile): string;
  /**
   * Gets the relative path to another directory.
   * @param directory - Directory.
   */
  getRelativePathTo(directory: Directory): string;
  /**
   * Gets the relative path to the specified file path as a module specifier.
   * @param filePath - File path.
   * @remarks To get to a directory, provide `path/to/directory/index.ts`.
   */
  getRelativePathAsModuleSpecifierTo(filePath: string): string;
  /**
   * Gets the relative path to the specified source file as a module specifier.
   * @param sourceFile - Source file.
   */
  getRelativePathAsModuleSpecifierTo(sourceFile: SourceFile): string;
  /**
   * Gets the relative path to the specified directory as a module specifier.
   * @param directory - Directory.
   */
  getRelativePathAsModuleSpecifierTo(directory: Directory): string;
  /** Gets the project. */
  getProject(): Project;
  /** Gets if the directory was forgotten. */
  wasForgotten(): boolean;
}

export interface DirectoryAddOptions {
  /**
   * Whether to also recursively add all the directory's descendant directories.
   * @remarks Defaults to false.
   */
  recursive?: boolean;
}

export interface DirectoryCopyOptions extends SourceFileCopyOptions {
  /**
   * Includes all the files in the directory and sub-directory when copying.
   * @remarks - Defaults to true.
   */
  includeUntrackedFiles?: boolean;
}

export declare class DirectoryEmitResult {
  #private;
  private constructor();
  /** Gets a collections of skipped file paths. */
  getSkippedFilePaths(): StandardizedFilePath[];
  /** Gets the output file paths. */
  getOutputFilePaths(): StandardizedFilePath[];
}

export interface DirectoryMoveOptions extends SourceFileMoveOptions {
}

/** Occurs when there is a problem doing a manipulation. */
export declare class ManipulationError extends errors.InvalidOperationError {
  readonly filePath: string;
  readonly oldText: string;
  readonly newText: string;
  constructor(filePath: string, oldText: string, newText: string, errorMessage: string);
}

/** Project that holds source files. */
export declare class Project {
  #private;
  /**
   * Initializes a new instance.
   * @param options - Optional options.
   */
  constructor(options?: ProjectOptions);
  /** Gets the manipulation settings. */
  get manipulationSettings(): ManipulationSettingsContainer;
  /** Gets the compiler options for modification. */
  get compilerOptions(): CompilerOptionsContainer;
  /**
   * Adds the source files the project's source files depend on to the project.
   * @returns The added source files.
   * @remarks * This should be done after source files are added to the project, preferably once to
   * avoid doing more work than necessary.
   * * This is done by default when creating a Project and providing a tsconfig.json and
   * not specifying to not add the source files.
   */
  resolveSourceFileDependencies(): SourceFile[];
  /**
   * Adds an existing directory from the path or returns undefined if it doesn't exist.
   *
   * Will return the directory if it was already added.
   * @param dirPath - Path to add the directory at.
   * @param options - Options.
   */
  addDirectoryAtPathIfExists(dirPath: string, options?: DirectoryAddOptions): Directory | undefined;
  /**
   * Adds an existing directory from the path or throws if it doesn't exist.
   *
   * Will return the directory if it was already added.
   * @param dirPath - Path to add the directory at.
   * @param options - Options.
   * @throws DirectoryNotFoundError when the directory does not exist.
   */
  addDirectoryAtPath(dirPath: string, options?: DirectoryAddOptions): Directory;
  /**
   * Creates a directory at the specified path.
   * @param dirPath - Path to create the directory at.
   */
  createDirectory(dirPath: string): Directory;
  /**
   * Gets a directory by the specified path or throws if it doesn't exist.
   * @param dirPath - Path to create the directory at.
   */
  getDirectoryOrThrow(dirPath: string, message?: string | (() => string)): Directory;
  /**
   * Gets a directory by the specified path or returns undefined if it doesn't exist.
   * @param dirPath - Directory path.
   */
  getDirectory(dirPath: string): Directory | undefined;
  /** Gets all the directories. */
  getDirectories(): Directory[];
  /** Gets the directories without a parent. */
  getRootDirectories(): Directory[];
  /**
   * Adds source files based on file globs.
   * @param fileGlobs - File glob or globs to add files based on.
   * @returns The matched source files.
   */
  addSourceFilesAtPaths(fileGlobs: string | ReadonlyArray<string>): SourceFile[];
  /**
   * Adds a source file from a file path if it exists or returns undefined.
   *
   * Will return the source file if it was already added.
   * @param filePath - File path to get the file from.
   */
  addSourceFileAtPathIfExists(filePath: string): SourceFile | undefined;
  /**
   * Adds an existing source file from a file path or throws if it doesn't exist.
   *
   * Will return the source file if it was already added.
   * @param filePath - File path to get the file from.
   * @throws FileNotFoundError when the file is not found.
   */
  addSourceFileAtPath(filePath: string): SourceFile;
  /**
   * Adds all the source files from the specified tsconfig.json.
   *
   * Note that this is done by default when specifying a tsconfig file in the constructor and not explicitly setting the
   * `skipAddingFilesFromTsConfig` option to `true`.
   * @param tsConfigFilePath - File path to the tsconfig.json file.
   */
  addSourceFilesFromTsConfig(tsConfigFilePath: string): SourceFile[];
  /**
   * Creates a source file at the specified file path with the specified text.
   *
   * Note: The file will not be created and saved to the file system until .save() is called on the source file.
   * @param filePath - File path of the source file.
   * @param sourceFileText - Text, structure, or writer function for the source file text.
   * @param options - Options.
   * @throws - InvalidOperationError if a source file already exists at the provided file path.
   */
  createSourceFile(filePath: string, sourceFileText?: string | OptionalKind<SourceFileStructure> | WriterFunction, options?: SourceFileCreateOptions): SourceFile;
  /**
   * Removes a source file from the project.
   * @param sourceFile - Source file to remove.
   * @returns True if removed.
   */
  removeSourceFile(sourceFile: SourceFile): boolean;
  /**
   * Gets a source file by a file name or file path. Throws an error if it doesn't exist.
   * @param fileNameOrPath - File name or path that the path could end with or equal.
   */
  getSourceFileOrThrow(fileNameOrPath: string): SourceFile;
  /**
   * Gets a source file by a search function. Throws an error if it doesn't exist.
   * @param searchFunction - Search function.
   */
  getSourceFileOrThrow(searchFunction: (file: SourceFile) => boolean): SourceFile;
  /**
   * Gets a source file by a file name or file path. Returns undefined if none exists.
   * @param fileNameOrPath - File name or path that the path could end with or equal.
   */
  getSourceFile(fileNameOrPath: string): SourceFile | undefined;
  /**
   * Gets a source file by a search function. Returns undefined if none exists.
   * @param searchFunction - Search function.
   */
  getSourceFile(searchFunction: (file: SourceFile) => boolean): SourceFile | undefined;
  /** Gets all the source files added to the project. */
  getSourceFiles(): SourceFile[];
  /**
   * Gets all the source files added to the project that match a pattern.
   * @param globPattern - Glob pattern for filtering out the source files.
   */
  getSourceFiles(globPattern: string): SourceFile[];
  /**
   * Gets all the source files added to the project that match the passed in patterns.
   * @param globPatterns - Glob patterns for filtering out the source files.
   */
  getSourceFiles(globPatterns: ReadonlyArray<string>): SourceFile[];
  /**
   * Gets the specified ambient module symbol or returns undefined if not found.
   * @param moduleName - The ambient module name with or without quotes.
   */
  getAmbientModule(moduleName: string): Symbol | undefined;
  /**
   * Gets the specified ambient module symbol or throws if not found.
   * @param moduleName - The ambient module name with or without quotes.
   */
  getAmbientModuleOrThrow(moduleName: string, message?: string | (() => string)): Symbol;
  /**
   * Gets the ambient module symbols (ex. modules in the
   * @types folder or node_modules).
   */
  getAmbientModules(): Symbol[];
  /** Saves all the unsaved source files to the file system and deletes all deleted files. */
  save(): Promise<void>;
  /**
   * Synchronously saves all the unsaved source files to the file system and deletes all deleted files.
   *
   * Remarks: This might be very slow compared to the asynchronous version if there are a lot of files.
   */
  saveSync(): void;
  /**
   * Enables logging to the console.
   * @param enabled - Enabled.
   */
  enableLogging(enabled?: boolean): void;
  /** Gets the pre-emit diagnostics. */
  getPreEmitDiagnostics(): Diagnostic[];
  /** Gets the language service. */
  getLanguageService(): LanguageService;
  /** Gets the program. */
  getProgram(): Program;
  /** Gets the type checker. */
  getTypeChecker(): TypeChecker;
  /** Gets the file system. */
  getFileSystem(): FileSystemHost;
  /**
   * Asynchronously emits all the source files to the file system as JavaScript files.
   * @param emitOptions - Optional emit options.
   */
  emit(emitOptions?: EmitOptions): Promise<EmitResult>;
  /**
   * Synchronously emits all the source files to the file system as JavaScript files.
   * @param emitOptions - Optional emit options.
   */
  emitSync(emitOptions?: EmitOptions): EmitResult;
  /**
   * Emits all the source files to memory.
   * @param emitOptions - Optional emit options.
   */
  emitToMemory(emitOptions?: EmitOptions): MemoryEmitResult;
  /** Gets the compiler options. */
  getCompilerOptions(): CompilerOptions;
  /** Gets the diagnostics found when parsing the tsconfig.json file provided in the project's constructor. */
  getConfigFileParsingDiagnostics(): Diagnostic[];
  /**
   * Creates a writer with the current manipulation settings.
   * @remarks Generally it's best to use a provided writer, but this may be useful in some scenarios.
   */
  createWriter(): CodeBlockWriter;
  /**
   * Forgets the nodes created in the scope of the passed in block.
   *
   * This is an advanced method that can be used to easily "forget" all the nodes created within the scope of the block.
   * @param block - Block of code to run. Use the `remember` callback or return a node to remember it.
   */
  forgetNodesCreatedInBlock<T = void>(block: (remember: (...node: Node[]) => void) => T): T;
  /**
   * Forgets the nodes created in the scope of the passed in block asynchronously.
   *
   * This is an advanced method that can be used to easily "forget" all the nodes created within the scope of the block.
   * @param block - Block of code to run. Use the `remember` callback or return a node to remember it.
   */
  forgetNodesCreatedInBlock<T = void>(block: (remember: (...node: Node[]) => void) => Promise<T>): Promise<T>;
  /**
   * Formats an array of diagnostics with their color and context into a string.
   * @param diagnostics - Diagnostics to get a string of.
   * @param options - Collection of options. For example, the new line character to use (defaults to the OS' new line character).
   */
  formatDiagnosticsWithColorAndContext(diagnostics: ReadonlyArray<Diagnostic>, opts?: {
        newLineChar?: "\n" | "\r\n";
    }): string;
  /** Gets a ts.ModuleResolutionHost for the project. */
  getModuleResolutionHost(): ts.ModuleResolutionHost;
}

/** Options for creating a project. */
export interface ProjectOptions {
  /** Compiler options */
  compilerOptions?: CompilerOptions;
  /** File path to the tsconfig.json file. */
  tsConfigFilePath?: string;
  /** Can be overriden by `tsConfigFilePath` or `compilerOptions`. */
  defaultCompilerOptions?: CompilerOptions;
  /**
   * Whether to skip adding the source files from the specified tsconfig.json.
   * @default false
   */
  skipAddingFilesFromTsConfig?: boolean;
  /**
   * Skip resolving file dependencies when providing a ts config file path and adding the files from tsconfig.
   * @default false
   */
  skipFileDependencyResolution?: boolean;
  /**
   * Skip loading the lib files. Unlike the compiler API, ts-morph does not load these
   * from the node_modules folder, but instead loads them from some other JS code
   * and uses a fake path for their existence. If you want to use a custom lib files
   * folder path, then provide one using the libFolderPath options.
   * @default false
   */
  skipLoadingLibFiles?: boolean;
  /** The folder to use for loading lib files. */
  libFolderPath?: string;
  /** Manipulation settings */
  manipulationSettings?: Partial<ManipulationSettings>;
  /**
   * Whether to use an in-memory file system.
   * @default false
   */
  useInMemoryFileSystem?: boolean;
  /**
   * Optional file system host. Useful for mocking access to the file system.
   * @remarks Consider using `useInMemoryFileSystem` instead.
   */
  fileSystem?: FileSystemHost;
  /** Creates a resolution host for specifying custom module and/or type reference directive resolution. */
  resolutionHost?: ResolutionHostFactory;
}

/** Options for creating a source file. */
export interface SourceFileCreateOptions {
  /**
   * Whether a source file should be overwritten if it exists. Defaults to false.
   * @remarks When false, the method will throw when a file exists.
   */
  overwrite?: boolean;
  /** Specifies the script kind of the source file. */
  scriptKind?: ScriptKind;
}

export type Constructor<T> = new (...args: any[]) => T;
export type InstanceOf<T> = T extends new (...args: any[]) => infer U ? U : never;
export type WriterFunction = (writer: CodeBlockWriter) => void;
/**
 * Creates a wrapped node from a compiler node.
 * @param node - Node to create a wrapped node from.
 * @param info - Info for creating the wrapped node.
 */
export declare function createWrappedNode<T extends ts.Node = ts.Node>(node: T, opts?: CreateWrappedNodeOptions): CompilerNodeToWrappedType<T>;

export interface CreateWrappedNodeOptions {
  /** Compiler options. */
  compilerOptions?: CompilerOptions;
  /** Optional source file of the node. Will make it not bother going up the tree to find the source file. */
  sourceFile?: ts.SourceFile;
  /** Type checker. */
  typeChecker?: ts.TypeChecker;
}

/**
 * Prints the provided node using the compiler's printer.
 * @param node - Compiler node.
 * @param options - Options.
 * @remarks If the node was not constructed with the compiler API factory methods and the node
 * does not have parents set, then use the other overload that accepts a source file.
 */
export declare function printNode(node: ts.Node, options?: PrintNodeOptions): string;
/**
 * Prints the provided node using the compiler's printer.
 * @param node - Compiler node.
 * @param sourceFile - Compiler source file.
 * @param options - Options.
 */
export declare function printNode(node: ts.Node, sourceFile: ts.SourceFile, options?: PrintNodeOptions): string;

/** Options for printing a node. */
export interface PrintNodeOptions {
  /** Whether to remove comments or not. */
  removeComments?: boolean;
  /**
   * New line kind.
   *
   * Defaults to line feed.
   */
  newLineKind?: NewLineKind;
  /**
   * From the compiler api: "A value indicating the purpose of a node. This is primarily used to
   * distinguish between an `Identifier` used in an expression position, versus an
   * `Identifier` used as an `IdentifierName` as part of a declaration. For most nodes you
   * should just pass `Unspecified`."
   *
   * Defaults to `Unspecified`.
   */
  emitHint?: EmitHint;
  /**
   * The script kind.
   *
   * @remarks This is only useful when passing in a compiler node that was constructed
   * with the compiler API factory methods.
   *
   * Defaults to TSX.
   */
  scriptKind?: ScriptKind;
}

export type SourceFileReferencingNodes = ImportDeclaration | ExportDeclaration | ImportEqualsDeclaration | CallExpression;

export interface CompilerOptionsFromTsConfigOptions {
  encoding?: string;
  fileSystem?: FileSystemHost;
}

export interface CompilerOptionsFromTsConfigResult {
  options: CompilerOptions;
  errors: Diagnostic[];
}

/**
 * Gets the compiler options from a specified tsconfig.json
 * @param filePath - File path to the tsconfig.json.
 * @param options - Options.
 */
export declare function getCompilerOptionsFromTsConfig(filePath: string, options?: CompilerOptionsFromTsConfigOptions): CompilerOptionsFromTsConfigResult;

/** Functions for writing code. */
export declare class Writers {
  private constructor();
  /**
   * Gets a writer function for writing the provided object as an object literal expression.
   * @param obj - Object to write.
   */
  static object(obj: {
        [key: string]: WriterFunctionOrValue | undefined;
    }): WriterFunction;
  /** Gets a writer function for writing an object type. */
  static objectType(structure: TypeElementMemberedNodeStructure): WriterFunction;
  /** Gets a writer function for writing a union type (ex. `FirstType | SecondType`). */
  static unionType(firstType: WriterFunctionOrValue, secondType: WriterFunctionOrValue, ...additionalTypes: WriterFunctionOrValue[]): (writer: CodeBlockWriter) => void;
  /** Gets a writer function for writing an intersection type (ex. `FirstType & SecondType`). */
  static intersectionType(firstType: WriterFunctionOrValue, secondType: WriterFunctionOrValue, ...additionalTypes: WriterFunctionOrValue[]): (writer: CodeBlockWriter) => void;
  /** Gets a writer function for writing a type assertion (ex. `type as assertionType`). */
  static assertion(type: WriterFunctionOrValue, assertionType: WriterFunctionOrValue): (writer: CodeBlockWriter) => void;
  /**
   * Gets a writer function for writing a return statement returning the provided value (ex. `return value;`).
   * @param value - Value to be returned.
   */
  static returnStatement(value: WriterFunctionOrValue): WriterFunction;
}

export type WriterFunctionOrValue = string | number | WriterFunction;
export type AssertionKey = Identifier | StringLiteral;
export type PropertyName = Identifier | StringLiteral | NumericLiteral | ComputedPropertyName | PrivateIdentifier | NoSubstitutionTemplateLiteral | BigIntLiteral;
export type ModuleName = Identifier | StringLiteral;
export type AccessorDeclaration = GetAccessorDeclaration | SetAccessorDeclaration;
export type ArrayBindingElement = BindingElement | OmittedExpression;
export type BindingName = Identifier | BindingPattern;
export type BindingPattern = ObjectBindingPattern | ArrayBindingPattern;
export type BooleanLiteral = TrueLiteral | FalseLiteral;
export type CallLikeExpression = CallExpression | NewExpression | TaggedTemplateExpression | Decorator | JsxCallLike | InstanceofExpression;
export type EntityNameExpression = Identifier | PropertyAccessExpression;
export type DeclarationName = PropertyName | JsxAttributeName | StringLiteralLike | ElementAccessExpression | BindingPattern | EntityNameExpression;
export type EntityName = Identifier | QualifiedName;
export type JsxChild = JsxText | JsxExpression | JsxElement | JsxSelfClosingElement | JsxFragment;
export type JsxAttributeName = Identifier | JsxNamespacedName;
export type JsxAttributeLike = JsxAttribute | JsxSpreadAttribute;
export type JsxCallLike = JsxOpeningLikeElement | JsxOpeningFragment;
export type JsxOpeningLikeElement = JsxSelfClosingElement | JsxOpeningElement;
export type JsxTagNameExpression = Identifier | ThisExpression | JsxTagNamePropertyAccess | JsxNamespacedName;

export interface JsxTagNamePropertyAccess extends PropertyAccessExpression {
  getExpression(): Identifier | ThisExpression | JsxTagNamePropertyAccess;
}

export type ObjectLiteralElementLike = PropertyAssignment | ShorthandPropertyAssignment | SpreadAssignment | MethodDeclaration | AccessorDeclaration;
export type CaseOrDefaultClause = CaseClause | DefaultClause;
export type ModuleReference = EntityName | ExternalModuleReference;
export type StringLiteralLike = StringLiteral | NoSubstitutionTemplateLiteral;
export type TypeElementTypes = PropertySignature | MethodSignature | ConstructSignatureDeclaration | CallSignatureDeclaration | IndexSignatureDeclaration | GetAccessorDeclaration | SetAccessorDeclaration;
export type TemplateLiteral = TemplateExpression | NoSubstitutionTemplateLiteral;
/**
 * Local target declarations.
 * @remarks This may be missing some types. Please open an issue if this returns a type not listed here.
 */
export type LocalTargetDeclarations = SourceFile | ClassDeclaration | InterfaceDeclaration | EnumDeclaration | FunctionDeclaration | VariableDeclaration | TypeAliasDeclaration | ModuleDeclaration | ExportAssignment;
/**
 * Declarations that can be exported from a module.
 * @remarks This may be missing some types. Please open an issue if this returns a type not listed here.
 */
export type ExportedDeclarations = ClassDeclaration | InterfaceDeclaration | EnumDeclaration | FunctionDeclaration | VariableDeclaration | TypeAliasDeclaration | ModuleDeclaration | Expression | SourceFile;
export declare function AmbientableNode<T extends Constructor<AmbientableNodeExtensionType>>(Base: T): Constructor<AmbientableNode> & T;

export interface AmbientableNode {
  /** If the node has the declare keyword. */
  hasDeclareKeyword(): boolean;
  /** Gets the declare keyword or undefined if none exists. */
  getDeclareKeyword(): Node | undefined;
  /** Gets the declare keyword or throws if it doesn't exist. */
  getDeclareKeywordOrThrow(message?: string | (() => string)): Node;
  /** Gets if the node is ambient. */
  isAmbient(): boolean;
  /**
   * Sets if this node has a declare keyword.
   * @param value - To add the declare keyword or not.
   */
  setHasDeclareKeyword(value?: boolean): this;
}

type AmbientableNodeExtensionType = Node & ModifierableNode;
export declare function ArgumentedNode<T extends Constructor<ArgumentedNodeExtensionType>>(Base: T): Constructor<ArgumentedNode> & T;

export interface ArgumentedNode {
  /** Gets all the arguments of the node. */
  getArguments(): Node[];
  /**
   * Adds an argument.
   * @param argumentText - Argument text to add.
   */
  addArgument(argumentText: string | WriterFunction): Node;
  /**
   * Adds arguments.
   * @param argumentTexts - Argument texts to add.
   */
  addArguments(argumentTexts: ReadonlyArray<string | WriterFunction> | WriterFunction): Node[];
  /**
   * Inserts an argument.
   * @param index - Child index to insert at.
   * @param argumentText - Argument text to insert.
   */
  insertArgument(index: number, argumentText: string | WriterFunction): Node;
  /**
   * Inserts arguments.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument texts to insert.
   */
  insertArguments(index: number, argumentTexts: ReadonlyArray<string | WriterFunction> | WriterFunction): Node[];
  /**
   * Removes an argument.
   * @param arg - Argument to remove.
   */
  removeArgument(arg: Node): this;
  /**
   * Removes an argument.
   * @param index - Index to remove.
   */
  removeArgument(index: number): this;
}

type ArgumentedNodeExtensionType = Node<ts.Node & {
      arguments?: ts.NodeArray<ts.Node>;
  }>;
export declare function AsyncableNode<T extends Constructor<AsyncableNodeExtensionType>>(Base: T): Constructor<AsyncableNode> & T;

export interface AsyncableNode {
  /** If it's async. */
  isAsync(): boolean;
  /** Gets the async keyword or undefined if none exists. */
  getAsyncKeyword(): Node<ts.AsyncKeyword> | undefined;
  /** Gets the async keyword or throws if none exists. */
  getAsyncKeywordOrThrow(message?: string | (() => string)): Node<ts.AsyncKeyword>;
  /**
   * Sets if the node is async.
   * @param value - If it should be async or not.
   */
  setIsAsync(value: boolean): this;
}

type AsyncableNodeExtensionType = Node & ModifierableNode;
export declare function AwaitableNode<T extends Constructor<AwaitableNodeExtensionType>>(Base: T): Constructor<AwaitableNode> & T;

export interface AwaitableNode {
  /** If it's an awaited node. */
  isAwaited(): boolean;
  /** Gets the await token or undefined if none exists. */
  getAwaitKeyword(): Node<ts.AwaitKeyword> | undefined;
  /** Gets the await token or throws if none exists. */
  getAwaitKeywordOrThrow(message?: string | (() => string)): Node<ts.AwaitKeyword>;
  /**
   * Sets if the node is awaited.
   * @param value - If it should be awaited or not.
   */
  setIsAwaited(value: boolean): this;
}

type AwaitableNodeExtensionType = Node<ts.Node & {
      awaitModifier?: ts.AwaitKeyword;
  }>;
export declare function BodiedNode<T extends Constructor<BodiedNodeExtensionType>>(Base: T): Constructor<BodiedNode> & T;

export interface BodiedNode {
  /** Gets the body. */
  getBody(): Node;
  /**
   * Sets the body text.
   * @param textOrWriterFunction - Text or writer function to set as the body.
   */
  setBodyText(textOrWriterFunction: string | WriterFunction): this;
  /** Gets the body text without leading whitespace, leading indentation, or trailing whitespace. */
  getBodyText(): string;
}

type BodiedNodeExtensionType = Node<ts.Node & {
      body: ts.Node;
  }>;
export declare function BodyableNode<T extends Constructor<BodyableNodeExtensionType>>(Base: T): Constructor<BodyableNode> & T;

export interface BodyableNode {
  /** Gets the body or throws an error if it doesn't exist. */
  getBodyOrThrow(message?: string | (() => string)): Node;
  /** Gets the body if it exists. */
  getBody(): Node | undefined;
  /** Gets the body text without leading whitespace, leading indentation, or trailing whitespace. Returns undefined if there is no body. */
  getBodyText(): string | undefined;
  /** Gets if the node has a body. */
  hasBody(): boolean;
  /**
   * Sets the body text. A body is required to do this operation.
   * @param textOrWriterFunction - Text or writer function to set as the body.
   */
  setBodyText(textOrWriterFunction: string | WriterFunction): this;
  /** Adds a body if it doesn't exists. */
  addBody(): this;
  /** Removes the body if it exists. */
  removeBody(): this;
}

type BodyableNodeExtensionType = Node<ts.Node & {
      body?: ts.Node;
  }>;
export declare function ChildOrderableNode<T extends Constructor<ChildOrderableNodeExtensionType>>(Base: T): Constructor<ChildOrderableNode> & T;

export interface ChildOrderableNode {
  /** Sets the child order of the node within the parent. */
  setOrder(order: number): this;
}

type ChildOrderableNodeExtensionType = Node;
export declare function DecoratableNode<T extends Constructor<DecoratableNodeExtensionType>>(Base: T): Constructor<DecoratableNode> & T;

export interface DecoratableNode {
  /**
   * Gets a decorator or undefined if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getDecorator(name: string): Decorator | undefined;
  /**
   * Gets a decorator or undefined if it doesn't exist.
   * @param findFunction - Function to use to find the parameter.
   */
  getDecorator(findFunction: (declaration: Decorator) => boolean): Decorator | undefined;
  /**
   * Gets a decorator or throws if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getDecoratorOrThrow(name: string): Decorator;
  /**
   * Gets a decorator or throws if it doesn't exist.
   * @param findFunction - Function to use to find the parameter.
   */
  getDecoratorOrThrow(findFunction: (declaration: Decorator) => boolean): Decorator;
  /** Gets all the decorators of the node. */
  getDecorators(): Decorator[];
  /**
   * Adds a decorator.
   * @param structure - Structure of the decorator.
   */
  addDecorator(structure: OptionalKind<DecoratorStructure>): Decorator;
  /**
   * Adds decorators.
   * @param structures - Structures of the decorators.
   */
  addDecorators(structures: ReadonlyArray<OptionalKind<DecoratorStructure>>): Decorator[];
  /**
   * Inserts a decorator.
   * @param index - Child index to insert at. Specify a negative index to insert from the reverse.
   * @param structure - Structure of the decorator.
   */
  insertDecorator(index: number, structure: OptionalKind<DecoratorStructure>): Decorator;
  /**
   * Insert decorators.
   * @param index - Child index to insert at.
   * @param structures - Structures to insert.
   */
  insertDecorators(index: number, structures: ReadonlyArray<OptionalKind<DecoratorStructure>>): Decorator[];
}

type DecoratableNodeExtensionType = Node<ts.Node> & ModifierableNode;
export declare function DotDotDotTokenableNode<T extends Constructor<DotDotDotTokenableNodeExtensionType>>(Base: T): Constructor<DotDotDotTokenableNode> & T;

export interface DotDotDotTokenableNode {
  /** Gets the dot dot dot token (...) if it exists or returns undefined */
  getDotDotDotToken(): Node<ts.DotDotDotToken> | undefined;
  /** Gets the dot dot dot token (...) if it exists or throws if not. */
  getDotDotDotTokenOrThrow(message?: string | (() => string)): Node<ts.DotDotDotToken>;
}

type DotDotDotTokenableNodeExtensionType = Node<ts.Node & {
      dotDotDotToken?: ts.DotDotDotToken;
  }>;
export declare function ExclamationTokenableNode<T extends Constructor<ExclamationTokenableNodeExtensionType>>(Base: T): Constructor<ExclamationTokenableNode> & T;

export interface ExclamationTokenableNode {
  /** If it has a exclamation token. */
  hasExclamationToken(): boolean;
  /** Gets the exclamation token node or returns undefined if it doesn't exist. */
  getExclamationTokenNode(): Node<ts.ExclamationToken> | undefined;
  /** Gets the exclamation token node or throws. */
  getExclamationTokenNodeOrThrow(message?: string | (() => string)): Node<ts.ExclamationToken>;
  /**
   * Sets if this node has a exclamation token.
   * @param value - If it should have a exclamation token or not.
   */
  setHasExclamationToken(value: boolean): this;
}

type ExclamationTokenableNodeExtensionType = Node<ts.Node & {
      exclamationToken?: ts.ExclamationToken;
  }>;
export declare function ExportableNode<T extends Constructor<ExportableNodeExtensionType>>(Base: T): Constructor<ExportableNode> & T;

export interface ExportableNode extends ExportGetableNode {
  /**
   * Sets if this node is a default export of a file.
   * @param value - If it should be a default export or not.
   */
  setIsDefaultExport(value: boolean): this;
  /**
   * Sets if the node is exported.
   *
   * Note: Will remove the default keyword if set.
   * @param value - If it should be exported or not.
   */
  setIsExported(value: boolean): this;
}

type ExportableNodeExtensionType = Node & ModifierableNode;
export declare function ExportGetableNode<T extends Constructor<ExportGetableNodeExtensionType>>(Base: T): Constructor<ExportGetableNode> & T;

export interface ExportGetableNode {
  /** If the node has the export keyword. */
  hasExportKeyword(): boolean;
  /** Gets the export keyword or undefined if none exists. */
  getExportKeyword(): Node | undefined;
  /** Gets the export keyword or throws if none exists. */
  getExportKeywordOrThrow(message?: string | (() => string)): Node;
  /** If the node has the default keyword. */
  hasDefaultKeyword(): boolean;
  /** Gets the default keyword or undefined if none exists. */
  getDefaultKeyword(): Node | undefined;
  /** Gets the default keyword or throws if none exists. */
  getDefaultKeywordOrThrow(message?: string | (() => string)): Node;
  /** Gets if the node is exported from a namespace, is a default export, or is a named export. */
  isExported(): boolean;
  /** Gets if this node is a default export of a file. */
  isDefaultExport(): boolean;
  /** Gets if this node is a named export of a file. */
  isNamedExport(): boolean;
}

type ExportGetableNodeExtensionType = Node;
export declare function ExtendsClauseableNode<T extends Constructor<ExtendsClauseableNodeExtensionType>>(Base: T): Constructor<ExtendsClauseableNode> & T;

export interface ExtendsClauseableNode {
  /** Gets the extends clauses. */
  getExtends(): ExpressionWithTypeArguments[];
  /**
   * Adds multiple extends clauses.
   * @param texts - Texts to add for the extends clause.
   */
  addExtends(texts: ReadonlyArray<string | WriterFunction> | WriterFunction): ExpressionWithTypeArguments[];
  /**
   * Adds an extends clause.
   * @param text - Text to add for the extends clause.
   */
  addExtends(text: string): ExpressionWithTypeArguments;
  /**
   * Inserts multiple extends clauses.
   * @param texts - Texts to insert for the extends clause.
   */
  insertExtends(index: number, texts: ReadonlyArray<string | WriterFunction> | WriterFunction): ExpressionWithTypeArguments[];
  /**
   * Inserts an extends clause.
   * @param text - Text to insert for the extends clause.
   */
  insertExtends(index: number, text: string): ExpressionWithTypeArguments;
  /**
   * Removes the extends at the specified index.
   * @param index - Index to remove.
   */
  removeExtends(index: number): this;
  /**
   * Removes the specified extends.
   * @param extendsNode - Node of the extend to remove.
   */
  removeExtends(extendsNode: ExpressionWithTypeArguments): this;
}

type ExtendsClauseableNodeExtensionType = Node & HeritageClauseableNode;
export declare function GeneratorableNode<T extends Constructor<GeneratorableNodeExtensionType>>(Base: T): Constructor<GeneratorableNode> & T;

export interface GeneratorableNode {
  /** If it's a generator function. */
  isGenerator(): boolean;
  /** Gets the asterisk token or undefined if none exists. */
  getAsteriskToken(): Node<ts.AsteriskToken> | undefined;
  /** Gets the asterisk token or throws if none exists. */
  getAsteriskTokenOrThrow(message?: string | (() => string)): Node<ts.AsteriskToken>;
  /**
   * Sets if the node is a generator.
   * @param value - If it should be a generator or not.
   */
  setIsGenerator(value: boolean): this;
}

type GeneratorableNodeExtensionType = Node<ts.Node & {
      asteriskToken?: ts.AsteriskToken;
  }>;
export declare function HeritageClauseableNode<T extends Constructor<HeritageClauseableNodeExtensionType>>(Base: T): Constructor<HeritageClauseableNode> & T;

export interface HeritageClauseableNode {
  /** Gets the heritage clauses of the node. */
  getHeritageClauses(): HeritageClause[];
  /**
   * Gets the heritage clause by kind.
   * @kind - Kind of heritage clause.
   */
  getHeritageClauseByKind(kind: SyntaxKind.ExtendsKeyword | SyntaxKind.ImplementsKeyword): HeritageClause | undefined;
  /**
   * Gets the heritage clause by kind or throws if it doesn't exist.
   * @kind - Kind of heritage clause.
   */
  getHeritageClauseByKindOrThrow(kind: SyntaxKind.ExtendsKeyword | SyntaxKind.ImplementsKeyword): HeritageClause;
}

type HeritageClauseableNodeExtensionType = Node<ts.Node & {
      heritageClauses?: ts.NodeArray<ts.HeritageClause>;
  }>;
export declare function ImplementsClauseableNode<T extends Constructor<ImplementsClauseableNodeExtensionType>>(Base: T): Constructor<ImplementsClauseableNode> & T;

export interface ImplementsClauseableNode {
  /** Gets the implements clauses. */
  getImplements(): ExpressionWithTypeArguments[];
  /**
   * Adds an implements clause.
   * @param text - Text to add for the implements clause.
   */
  addImplements(text: string): ExpressionWithTypeArguments;
  /**
   * Adds multiple implements clauses.
   * @param text - Texts to add for the implements clause.
   */
  addImplements(text: ReadonlyArray<string | WriterFunction> | WriterFunction): ExpressionWithTypeArguments[];
  /**
   * Inserts an implements clause.
   * @param text - Text to insert for the implements clause.
   */
  insertImplements(index: number, texts: ReadonlyArray<string | WriterFunction> | WriterFunction): ExpressionWithTypeArguments[];
  /**
   * Inserts multiple implements clauses.
   * @param text - Texts to insert for the implements clause.
   */
  insertImplements(index: number, text: string): ExpressionWithTypeArguments;
  /**
   * Removes the implements at the specified index.
   * @param index - Index to remove.
   */
  removeImplements(index: number): this;
  /**
   * Removes the specified implements.
   * @param implementsNode - Node of the implements to remove.
   */
  removeImplements(implementsNode: ExpressionWithTypeArguments): this;
}

type ImplementsClauseableNodeExtensionType = Node & HeritageClauseableNode;
export declare function InitializerExpressionableNode<T extends Constructor<InitializerExpressionableNodeExtensionType>>(Base: T): Constructor<InitializerExpressionableNode> & T;

export interface InitializerExpressionableNode extends InitializerExpressionGetableNode {
  /** Removes the initializer. */
  removeInitializer(): this;
  /**
   * Sets the initializer.
   * @param text - Text or writer function to set for the initializer.
   */
  setInitializer(textOrWriterFunction: string | WriterFunction): this;
}

type InitializerExpressionableNodeExtensionType = Node<ts.Node & {
      initializer?: ts.Expression;
  }>;
export declare function InitializerExpressionGetableNode<T extends Constructor<InitializerExpressionGetableNodeExtensionType>>(Base: T): Constructor<InitializerExpressionGetableNode> & T;

export interface InitializerExpressionGetableNode {
  /** Gets if node has an initializer. */
  hasInitializer(): boolean;
  /** Gets the initializer. */
  getInitializer(): Expression | undefined;
  /** Gets the initializer if it's a certain kind or throws. */
  getInitializerIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind];
  /** Gets the initializer if it's a certain kind. */
  getInitializerIfKind<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind] | undefined;
  /** Gets the initializer or throw. */
  getInitializerOrThrow(message?: string | (() => string)): Expression;
}

type InitializerExpressionGetableNodeExtensionType = Node<ts.Node & {
      initializer?: ts.Expression;
  }>;
export declare function JSDocableNode<T extends Constructor<JSDocableNodeExtensionType>>(Base: T): Constructor<JSDocableNode> & T;

export interface JSDocableNode {
  /** Gets the JS doc nodes. */
  getJsDocs(): JSDoc[];
  /**
   * Adds a JS doc.
   * @param structure - Structure to add.
   */
  addJsDoc(structure: OptionalKind<JSDocStructure> | string | WriterFunction): JSDoc;
  /**
   * Adds JS docs.
   * @param structures - Structures to add.
   */
  addJsDocs(structures: ReadonlyArray<OptionalKind<JSDocStructure> | string | WriterFunction>): JSDoc[];
  /**
   * Inserts a JS doc.
   * @param index - Child index to insert at.
   * @param structure - Structure to insert.
   */
  insertJsDoc(index: number, structure: OptionalKind<JSDocStructure> | string | WriterFunction): JSDoc;
  /**
   * Inserts JS docs.
   * @param index - Child index to insert at.
   * @param structures - Structures to insert.
   */
  insertJsDocs(index: number, structures: ReadonlyArray<OptionalKind<JSDocStructure> | string | WriterFunction>): JSDoc[];
}

type JSDocableNodeExtensionType = Node<ts.Node & {
      jsDoc?: ts.NodeArray<ts.JSDoc>;
  }>;
export declare function LiteralLikeNode<T extends Constructor<LiteralLikeNodeExtensionType>>(Base: T): Constructor<LiteralLikeNode> & T;

export interface LiteralLikeNode {
  /** Get text of the literal. */
  getLiteralText(): string;
  /** Gets if the literal is terminated. */
  isTerminated(): boolean;
  /** Gets if the literal has an extended unicode escape. */
  hasExtendedUnicodeEscape(): boolean;
}

type LiteralLikeNodeExtensionType = Node<ts.LiteralLikeNode>;
export declare function ModifierableNode<T extends Constructor<ModifierableNodeExtensionType>>(Base: T): Constructor<ModifierableNode> & T;

export interface ModifierableNode {
  /** Gets the node's modifiers. */
  getModifiers(): Node<ts.Modifier>[];
  /**
   * Gets the first modifier of the specified syntax kind or throws if none found.
   * @param kind - Syntax kind.
   */
  getFirstModifierByKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind];
  /**
   * Gets the first modifier of the specified syntax kind or undefined if none found.
   * @param kind - Syntax kind.
   */
  getFirstModifierByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets if it has the specified modifier.
   * @param kind - Syntax kind to check for.
   */
  hasModifier(kind: SyntaxKind): boolean;
  /**
   * Gets if it has the specified modifier.
   * @param text - Text to check for.
   */
  hasModifier(text: ModifierTexts): boolean;
  /**
   * Toggles a modifier.
   * @param text - Text to toggle the modifier for.
   * @param value - Optional toggling value.
   */
  toggleModifier(text: ModifierTexts, value?: boolean): this;
}

type ModifierableNodeExtensionType = Node;
export type ModifierTexts = "export" | "default" | "declare" | "abstract" | "public" | "protected" | "private" | "readonly" | "static" | "async" | "const" | "override" | "in" | "out" | "accessor";
export declare function ModuledNode<T extends Constructor<ModuledNodeExtensionType>>(Base: T): Constructor<ModuledNode> & T;

export interface ModuledNode {
  /**
   * Adds an import.
   * @param structure - Structure that represents the import.
   */
  addImportDeclaration(structure: OptionalKind<ImportDeclarationStructure>): ImportDeclaration;
  /**
   * Adds imports.
   * @param structures - Structures that represent the imports.
   */
  addImportDeclarations(structures: ReadonlyArray<OptionalKind<ImportDeclarationStructure>>): ImportDeclaration[];
  /**
   * Insert an import.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the import.
   */
  insertImportDeclaration(index: number, structure: OptionalKind<ImportDeclarationStructure>): ImportDeclaration;
  /**
   * Inserts imports.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the imports to insert.
   */
  insertImportDeclarations(index: number, structures: ReadonlyArray<OptionalKind<ImportDeclarationStructure>>): ImportDeclaration[];
  /**
   * Gets the first import declaration that matches a condition, or undefined if it doesn't exist.
   * @param condition - Condition to get the import declaration by.
   */
  getImportDeclaration(condition: (importDeclaration: ImportDeclaration) => boolean): ImportDeclaration | undefined;
  /**
   * Gets the first import declaration that matches a module specifier, or undefined if it doesn't exist.
   * @param module - Module specifier to get the import declaration by.
   */
  getImportDeclaration(moduleSpecifier: string): ImportDeclaration | undefined;
  /**
   * Gets the first import declaration that matches a condition, or throws if it doesn't exist.
   * @param condition - Condition to get the import declaration by.
   */
  getImportDeclarationOrThrow(condition: (importDeclaration: ImportDeclaration) => boolean): ImportDeclaration;
  /**
   * Gets the first import declaration that matches a module specifier, or throws if it doesn't exist.
   * @param module - Module specifier to get the import declaration by.
   */
  getImportDeclarationOrThrow(moduleSpecifier: string): ImportDeclaration;
  /** Get the module's import declarations. */
  getImportDeclarations(): ImportDeclaration[];
  /**
   * Add export declarations.
   * @param structure - Structure that represents the export.
   */
  addExportDeclaration(structure: OptionalKind<ExportDeclarationStructure>): ExportDeclaration;
  /**
   * Add export declarations.
   * @param structures - Structures that represent the exports.
   */
  addExportDeclarations(structures: ReadonlyArray<OptionalKind<ExportDeclarationStructure>>): ExportDeclaration[];
  /**
   * Insert an export declaration.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the export.
   */
  insertExportDeclaration(index: number, structure: OptionalKind<ExportDeclarationStructure>): ExportDeclaration;
  /**
   * Insert export declarations.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the exports to insert.
   */
  insertExportDeclarations(index: number, structures: ReadonlyArray<OptionalKind<ExportDeclarationStructure>>): ExportDeclaration[];
  getExportDeclaration(condition: (exportDeclaration: ExportDeclaration) => boolean, message?: string | (() => string)): ExportDeclaration | undefined;
  /**
   * Gets the first export declaration that matches a module specifier, or undefined if it doesn't exist.
   * @param module - Module specifier to get the export declaration by.
   */
  getExportDeclaration(moduleSpecifier: string): ExportDeclaration | undefined;
  /**
   * Gets the first export declaration that matches a condition, or throws if it doesn't exist.
   * @param condition - Condition to get the export declaration by.
   */
  getExportDeclarationOrThrow(condition: (exportDeclaration: ExportDeclaration) => boolean, message?: string | (() => string)): ExportDeclaration;
  /**
   * Gets the first export declaration that matches a module specifier, or throws if it doesn't exist.
   * @param module - Module specifier to get the export declaration by.
   */
  getExportDeclarationOrThrow(moduleSpecifier: string, message?: string | (() => string)): ExportDeclaration;
  /** Get the export declarations. */
  getExportDeclarations(): ExportDeclaration[];
  /**
   * Add export assignments.
   * @param structure - Structure that represents the export.
   */
  addExportAssignment(structure: OptionalKind<ExportAssignmentStructure>): ExportAssignment;
  /**
   * Add export assignments.
   * @param structures - Structures that represent the exports.
   */
  addExportAssignments(structures: ReadonlyArray<OptionalKind<ExportAssignmentStructure>>): ExportAssignment[];
  /**
   * Insert an export assignment.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the export.
   */
  insertExportAssignment(index: number, structure: OptionalKind<ExportAssignmentStructure>): ExportAssignment;
  /**
   * Insert export assignments into a file.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the exports to insert.
   */
  insertExportAssignments(index: number, structures: ReadonlyArray<OptionalKind<ExportAssignmentStructure>>): ExportAssignment[];
  /**
   * Gets the first export assignment that matches a condition, or undefined if it doesn't exist.
   * @param condition - Condition to get the export assignment by.
   */
  getExportAssignment(condition: (exportAssignment: ExportAssignment) => boolean): ExportAssignment | undefined;
  /**
   * Gets the first export assignment that matches a condition, or throws if it doesn't exist.
   * @param condition - Condition to get the export assignment by.
   */
  getExportAssignmentOrThrow(condition: (exportAssignment: ExportAssignment) => boolean, message?: string | (() => string)): ExportAssignment;
  /** Get the file's export assignments. */
  getExportAssignments(): ExportAssignment[];
  /** Gets the default export symbol. */
  getDefaultExportSymbol(): Symbol | undefined;
  /** Gets the default export symbol or throws if it doesn't exist. */
  getDefaultExportSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets the export symbols. */
  getExportSymbols(): Symbol[];
  /**
   * Gets all the declarations that are exported from the module.
   *
   * The key is the name it's exported on and the value is the array of declarations for that name.
   *
   * This will include declarations that are transitively exported from other modules. If you mean to get the export
   * declarations then use `.getExportDeclarations()`.
   */
  getExportedDeclarations(): ReadonlyMap<string, ExportedDeclarations[]>;
  /** Removes any "export default". */
  removeDefaultExport(defaultExportSymbol?: Symbol | undefined): this;
}

type ModuledNodeExtensionType = Node<ts.SourceFile | ts.ModuleDeclaration> & StatementedNode;
export declare function BindingNamedNode<T extends Constructor<BindingNamedNodeExtensionType>>(Base: T): Constructor<BindingNamedNode> & T;

export interface BindingNamedNode extends BindingNamedNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type BindingNamedNodeExtensionType = NamedNodeBaseExtensionType<ts.BindingName>;
export type BindingNamedNodeSpecific = NamedNodeSpecificBase<BindingName>;
export declare function ImportAttributeNamedNode<T extends Constructor<ImportAttributeNamedNodeExtensionType>>(Base: T): Constructor<ImportAttributeNamedNode> & T;

export interface ImportAttributeNamedNode extends ImportAttributeNamedNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type ImportAttributeNamedNodeExtensionType = NamedNodeBaseExtensionType<ts.ImportAttributeName>;
export type ImportAttributeNamedNodeSpecific = NamedNodeSpecificBase<AssertionKey>;
export declare function ModuleNamedNode<T extends Constructor<ModuleNamedNodeExtensionType>>(Base: T): Constructor<ModuleNamedNode> & T;

export interface ModuleNamedNode extends ModuleNamedNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type ModuleNamedNodeExtensionType = NamedNodeBaseExtensionType<ts.ModuleName>;
export type ModuleNamedNodeSpecific = NamedNodeSpecificBase<ModuleName>;
export declare function NameableNode<T extends Constructor<NameableNodeExtensionType>>(Base: T): Constructor<NameableNode> & T;

export interface NameableNode extends NameableNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type NameableNodeExtensionType = Node<ts.Node & {
      name?: ts.Identifier;
  }>;

export interface NameableNodeSpecific {
  /** Gets the name node if it exists. */
  getNameNode(): Identifier | undefined;
  /** Gets the name node if it exists, or throws. */
  getNameNodeOrThrow(message?: string | (() => string)): Identifier;
  /** Gets the name if it exists. */
  getName(): string | undefined;
  /** Gets the name if it exists, or throws. */
  getNameOrThrow(message?: string | (() => string)): string;
  /** Removes the name from the node. */
  removeName(): this;
}

export declare function NamedNode<T extends Constructor<NamedNodeExtensionType>>(Base: T): Constructor<NamedNode> & T;

export interface NamedNode extends NamedNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type NamedNodeExtensionType = NamedNodeBaseExtensionType<ts.Identifier>;
export type NamedNodeSpecific = NamedNodeSpecificBase<Identifier>;
export declare function NamedNodeBase<TCompilerNode extends ts.Node, U extends Constructor<NamedNodeBaseExtensionType<TCompilerNode>>>(Base: U): Constructor<NamedNodeSpecificBase<CompilerNodeToWrappedType<TCompilerNode>>> & U;

export interface NamedNodeSpecificBase<TNode extends Node> {
  /** Gets the name node. */
  getNameNode(): TNode;
  /** Gets the name as a string. */
  getName(): string;
}

type NamedNodeBaseExtensionType<TCompilerNode extends ts.Node> = Node<ts.Node & {
      name: TCompilerNode;
  }>;
export declare function PropertyNamedNode<T extends Constructor<PropertyNamedNodeExtensionType>>(Base: T): Constructor<PropertyNamedNode> & T;

export interface PropertyNamedNode extends PropertyNamedNodeSpecific, ReferenceFindableNode, RenameableNode {
}

type PropertyNamedNodeExtensionType = NamedNodeBaseExtensionType<ts.PropertyName>;
export type PropertyNamedNodeSpecific = NamedNodeSpecificBase<PropertyName>;
export declare function ReferenceFindableNode<T extends Constructor<ReferenceFindableNodeExtensionType>>(Base: T): Constructor<ReferenceFindableNode> & T;

export interface ReferenceFindableNode {
  /** Finds the references of the definition of the node. */
  findReferences(): ReferencedSymbol[];
  /** Finds the nodes that reference the definition of the node. */
  findReferencesAsNodes(): Node[];
}

type ReferenceFindableNodeExtensionType = Node<ts.Node & {
      name?: ts.PropertyName | ts.BindingName | ts.DeclarationName | ts.StringLiteral;
  }>;
export declare function RenameableNode<T extends Constructor<RenameableNodeExtensionType>>(Base: T): Constructor<RenameableNode> & T;

export interface RenameableNode {
  /**
   * Renames the name of the node.
   * @param newName - New name.
   * @param options - Options for renaming.
   */
  rename(newName: string, options?: RenameOptions): this;
}

type RenameableNodeExtensionType = Node<ts.Node>;
export declare function OverrideableNode<T extends Constructor<OverrideableNodeExtensionType>>(Base: T): Constructor<OverrideableNode> & T;

export interface OverrideableNode {
  /** If it has an override keyword. */
  hasOverrideKeyword(): boolean;
  /** Gets the override keyword or undefined if none exists. */
  getOverrideKeyword(): Node<ts.OverrideKeyword> | undefined;
  /** Gets the override keyword or throws if none exists. */
  getOverrideKeywordOrThrow(message?: string | (() => string)): Node<ts.Modifier>;
  /**
   * Sets if the node has an override keyword.
   * @param value - If it should have an override keyword or not.
   */
  setHasOverrideKeyword(value: boolean): this;
}

type OverrideableNodeExtensionType = Node & ModifierableNode;
export declare function ParameteredNode<T extends Constructor<ParameteredNodeExtensionType>>(Base: T): Constructor<ParameteredNode> & T;

export interface ParameteredNode {
  /**
   * Gets a parameter or undefined if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getParameter(name: string): ParameterDeclaration | undefined;
  /**
   * Gets a parameter or undefined if it doesn't exist.
   * @param findFunction - Function to use to find the parameter.
   */
  getParameter(findFunction: (declaration: ParameterDeclaration) => boolean): ParameterDeclaration | undefined;
  /**
   * Gets a parameter or throws if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getParameterOrThrow(name: string): ParameterDeclaration;
  /**
   * Gets a parameter or throws if it doesn't exist.
   * @param findFunction - Function to use to find the parameter.
   */
  getParameterOrThrow(findFunction: (declaration: ParameterDeclaration) => boolean): ParameterDeclaration;
  /** Gets all the parameters of the node. */
  getParameters(): ParameterDeclaration[];
  /**
   * Adds a parameter.
   * @param structure - Structure of the parameter.
   */
  addParameter(structure: OptionalKind<ParameterDeclarationStructure>): ParameterDeclaration;
  /**
   * Adds parameters.
   * @param structures - Structures of the parameters.
   */
  addParameters(structures: ReadonlyArray<OptionalKind<ParameterDeclarationStructure>>): ParameterDeclaration[];
  /**
   * Inserts parameters.
   * @param index - Child index to insert at.
   * @param structures - Parameters to insert.
   */
  insertParameters(index: number, structures: ReadonlyArray<OptionalKind<ParameterDeclarationStructure>>): ParameterDeclaration[];
  /**
   * Inserts a parameter.
   * @param index - Child index to insert at.
   * @param structures - Parameter to insert.
   */
  insertParameter(index: number, structure: OptionalKind<ParameterDeclarationStructure>): ParameterDeclaration;
}

type ParameteredNodeExtensionType = Node<ts.Node & {
      parameters: ts.NodeArray<ts.ParameterDeclaration>;
  }>;
export declare function QuestionDotTokenableNode<T extends Constructor<QuestionDotTokenableNodeExtensionType>>(Base: T): Constructor<QuestionDotTokenableNode> & T;

export interface QuestionDotTokenableNode {
  /** If it has a question dot token. */
  hasQuestionDotToken(): boolean;
  /** Gets the question dot token node or returns undefined if it doesn't exist. */
  getQuestionDotTokenNode(): Node<ts.QuestionDotToken> | undefined;
  /** Gets the question dot token node or throws. */
  getQuestionDotTokenNodeOrThrow(message?: string | (() => string)): Node<ts.QuestionDotToken>;
  /**
   * Sets if this node has a question dot token.
   * @param value - If it should have a question dot token or not.
   */
  setHasQuestionDotToken(value: boolean): this;
}

type QuestionDotTokenableNodeExtensionType = Node<ts.Node & {
      questionDotToken?: ts.QuestionDotToken;
  }>;
export declare function QuestionTokenableNode<T extends Constructor<QuestionTokenableNodeExtensionType>>(Base: T): Constructor<QuestionTokenableNode> & T;

export interface QuestionTokenableNode {
  /** If it has a question token. */
  hasQuestionToken(): boolean;
  /** Gets the question token node or returns undefined if it doesn't exist. */
  getQuestionTokenNode(): Node<ts.QuestionToken> | undefined;
  /** Gets the question token node or throws. */
  getQuestionTokenNodeOrThrow(message?: string | (() => string)): Node<ts.QuestionToken>;
  /**
   * Sets if this node has a question token.
   * @param value - If it should have a question token or not.
   */
  setHasQuestionToken(value: boolean): this;
}

type QuestionTokenableNodeExtensionType = Node<ts.Node & {
      questionToken?: ts.QuestionToken;
  }>;
export declare function ReadonlyableNode<T extends Constructor<ReadonlyableNodeExtensionType>>(Base: T): Constructor<ReadonlyableNode> & T;

export interface ReadonlyableNode {
  /** Gets if it's readonly. */
  isReadonly(): boolean;
  /** Gets the readonly keyword, or undefined if none exists. */
  getReadonlyKeyword(): Node | undefined;
  /** Gets the readonly keyword, or throws if none exists. */
  getReadonlyKeywordOrThrow(message?: string | (() => string)): Node;
  /**
   * Sets if this node is readonly.
   * @param value - If readonly or not.
   */
  setIsReadonly(value: boolean): this;
}

type ReadonlyableNodeExtensionType = Node & ModifierableNode;
export declare function ReturnTypedNode<T extends Constructor<ReturnTypedNodeExtensionType>>(Base: T): Constructor<ReturnTypedNode> & T;

export interface ReturnTypedNode {
  /** Gets the return type. */
  getReturnType(): Type;
  /** Gets the return type node or undefined if none exists. */
  getReturnTypeNode(): TypeNode | undefined;
  /** Gets the return type node or throws if none exists. */
  getReturnTypeNodeOrThrow(message?: string | (() => string)): TypeNode;
  /**
   * Sets the return type of the node.
   * @param textOrWriterFunction - Text or writer function to set the return type with.
   */
  setReturnType(textOrWriterFunction: string | WriterFunction): this;
  /** Removes the return type. */
  removeReturnType(): this;
  /** Gets the signature of the node from the type checker. */
  getSignature(): Signature;
}

type ReturnTypedNodeExtensionType = Node<ts.SignatureDeclaration>;
export declare function ScopeableNode<T extends Constructor<ScopeableNodeExtensionType>>(Base: T): Constructor<ScopeableNode> & T;

export interface ScopeableNode {
  /**
   * Gets the scope.
   */
  getScope(): Scope | undefined;
  /**
   * Sets the scope.
   * @param scope - Scope to set to.
   */
  setScope(scope: Scope | undefined): this;
  /** Gets if the node has a scope keyword. */
  hasScopeKeyword(): boolean;
}

type ScopeableNodeExtensionType = Node & ModifierableNode;
export declare function ScopedNode<T extends Constructor<ScopedNodeExtensionType>>(Base: T): Constructor<ScopedNode> & T;

export interface ScopedNode {
  /** Gets the scope. */
  getScope(): Scope;
  /**
   * Sets the scope.
   * @param scope - Scope to set to.
   */
  setScope(scope: Scope | undefined): this;
  /** Gets if the node has a scope keyword. */
  hasScopeKeyword(): boolean;
}

type ScopedNodeExtensionType = Node & ModifierableNode;
export declare function SignaturedDeclaration<T extends Constructor<SignaturedDeclarationExtensionType>>(Base: T): Constructor<SignaturedDeclaration> & T;

export interface SignaturedDeclaration extends ParameteredNode, ReturnTypedNode {
}

type SignaturedDeclarationExtensionType = Node<ts.SignatureDeclaration>;
export declare function StaticableNode<T extends Constructor<StaticableNodeExtensionType>>(Base: T): Constructor<StaticableNode> & T;

export interface StaticableNode {
  /** Gets if it's static. */
  isStatic(): boolean;
  /** Gets the static keyword, or undefined if none exists. */
  getStaticKeyword(): Node | undefined;
  /** Gets the static keyword, or throws if none exists. */
  getStaticKeywordOrThrow(message?: string | (() => string)): Node;
  /**
   * Sets if the node is static.
   * @param value - If it should be static or not.
   */
  setIsStatic(value: boolean): this;
}

type StaticableNodeExtensionType = Node & ModifierableNode;
export declare function TextInsertableNode<T extends Constructor<TextInsertableNodeExtensionType>>(Base: T): Constructor<TextInsertableNode> & T;

export interface TextInsertableNode {
  /**
   * Inserts text within the body of the node.
   *
   * WARNING: This will forget any previously navigated descendant nodes.
   * @param pos - Position to insert at.
   * @param textOrWriterFunction - Text to insert.
   */
  insertText(pos: number, textOrWriterFunction: string | WriterFunction): this;
  /**
   * Replaces text within the body of the node.
   *
   * WARNING: This will forget any previously navigated descendant nodes.
   * @param range - Start and end position of the text to replace.
   * @param textOrWriterFunction - Text to replace the range with.
   */
  replaceText(range: [number, number], textOrWriterFunction: string | WriterFunction): this;
  /** Removes all the text within the node */
  removeText(): this;
  /**
   * Removes text within the body of the node.
   *
   * WARNING: This will forget any previously navigated descendant nodes.
   * @param pos - Start position to remove.
   * @param end - End position to remove.
   */
  removeText(pos: number, end: number): this;
}

type TextInsertableNodeExtensionType = Node;
export declare function TypeArgumentedNode<T extends Constructor<TypeArgumentedNodeExtensionType>>(Base: T): Constructor<TypeArgumentedNode> & T;

export interface TypeArgumentedNode {
  /** Gets all the type arguments of the node. */
  getTypeArguments(): TypeNode[];
  /**
   * Adds a type argument.
   * @param argumentText - Argument text to add.
   */
  addTypeArgument(argumentText: string): TypeNode;
  /**
   * Adds type arguments.
   * @param argumentTexts - Argument texts to add.
   */
  addTypeArguments(argumentTexts: ReadonlyArray<string>): TypeNode[];
  /**
   * Inserts a type argument.
   * @param index - Child index to insert at.
   * @param argumentText - Argument text to insert.
   */
  insertTypeArgument(index: number, argumentText: string): TypeNode;
  /**
   * Inserts type arguments.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument texts to insert.
   */
  insertTypeArguments(index: number, argumentTexts: ReadonlyArray<string>): TypeNode[];
  /**
   * Removes a type argument.
   * @param typeArg - Type argument to remove.
   */
  removeTypeArgument(typeArg: Node): this;
  /**
   * Removes a type argument.
   * @param index - Index to remove.
   */
  removeTypeArgument(index: number): this;
}

type TypeArgumentedNodeExtensionType = Node<ts.Node & {
      typeArguments?: ts.NodeArray<ts.TypeNode>;
  }>;
export declare function TypedNode<T extends Constructor<TypedNodeExtensionType>>(Base: T): Constructor<TypedNode> & T;

export interface TypedNode {
  /** Gets the type node or undefined if none exists. */
  getTypeNode(): TypeNode | undefined;
  /** Gets the type node or throws if none exists. */
  getTypeNodeOrThrow(message?: string | (() => string)): TypeNode;
  /**
   * Sets the type.
   * @param textOrWriterFunction - Text or writer function to set the type with.
   */
  setType(textOrWriterFunction: string | WriterFunction): this;
  /** Removes the type. */
  removeType(): this;
}

type TypedNodeExtensionType = Node<ts.Node & {
      type?: ts.TypeNode;
  }>;
export declare function TypeElementMemberedNode<T extends Constructor<TypeElementMemberedNodeExtensionType>>(Base: T): Constructor<TypeElementMemberedNode> & T;

export interface TypeElementMemberedNode {
  /**
   * Adds a member.
   * @param member - Member to add.
   */
  addMember(member: string | WriterFunction | TypeElementMemberStructures): TypeElementTypes | CommentTypeElement;
  /**
   * Adds members.
   * @param members - Collection of members to add.
   */
  addMembers(members: string | WriterFunction | ReadonlyArray<string | WriterFunction | TypeElementMemberStructures>): (TypeElementTypes | CommentTypeElement)[];
  /**
   * Inserts a member.
   * @param index - Child index to insert at.
   * @param member - Member to insert.
   */
  insertMember(index: number, member: string | WriterFunction | TypeElementMemberStructures): TypeElementTypes | CommentTypeElement;
  /**
   * Inserts members.
   * @param index - Child index to insert at.
   * @param members - Collection of members to insert.
   */
  insertMembers(index: number, members: string | WriterFunction | ReadonlyArray<string | WriterFunction | TypeElementMemberStructures>): (TypeElementTypes | CommentTypeElement)[];
  /**
   * Add construct signature.
   * @param structure - Structure representing the construct signature.
   */
  addConstructSignature(structure: OptionalKind<ConstructSignatureDeclarationStructure>): ConstructSignatureDeclaration;
  /**
   * Add construct signatures.
   * @param structures - Structures representing the construct signatures.
   */
  addConstructSignatures(structures: ReadonlyArray<OptionalKind<ConstructSignatureDeclarationStructure>>): ConstructSignatureDeclaration[];
  /**
   * Insert construct signature.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the construct signature.
   */
  insertConstructSignature(index: number, structure: OptionalKind<ConstructSignatureDeclarationStructure>): ConstructSignatureDeclaration;
  /**
   * Insert construct signatures.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the construct signatures.
   */
  insertConstructSignatures(index: number, structures: ReadonlyArray<OptionalKind<ConstructSignatureDeclarationStructure>>): ConstructSignatureDeclaration[];
  /**
   * Gets the first construct signature by a find function.
   * @param findFunction - Function to find the construct signature by.
   */
  getConstructSignature(findFunction: (member: ConstructSignatureDeclaration) => boolean): ConstructSignatureDeclaration | undefined;
  /**
   * Gets the first construct signature by a find function or throws if not found.
   * @param findFunction - Function to find the construct signature by.
   */
  getConstructSignatureOrThrow(findFunction: (member: ConstructSignatureDeclaration) => boolean): ConstructSignatureDeclaration;
  /** Gets the interface construct signatures. */
  getConstructSignatures(): ConstructSignatureDeclaration[];
  /**
   * Add call signature.
   * @param structure - Structure representing the call signature.
   */
  addCallSignature(structure: OptionalKind<CallSignatureDeclarationStructure>): CallSignatureDeclaration;
  /**
   * Add call signatures.
   * @param structures - Structures representing the call signatures.
   */
  addCallSignatures(structures: ReadonlyArray<OptionalKind<CallSignatureDeclarationStructure>>): CallSignatureDeclaration[];
  /**
   * Insert call signature.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the call signature.
   */
  insertCallSignature(index: number, structure: OptionalKind<CallSignatureDeclarationStructure>): CallSignatureDeclaration;
  /**
   * Insert call signatures.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the call signatures.
   */
  insertCallSignatures(index: number, structures: ReadonlyArray<OptionalKind<CallSignatureDeclarationStructure>>): CallSignatureDeclaration[];
  /**
   * Gets the first call signature by a find function.
   * @param findFunction - Function to find the call signature by.
   */
  getCallSignature(findFunction: (member: CallSignatureDeclaration) => boolean): CallSignatureDeclaration | undefined;
  /**
   * Gets the first call signature by a find function or throws if not found.
   * @param findFunction - Function to find the call signature by.
   */
  getCallSignatureOrThrow(findFunction: (member: CallSignatureDeclaration) => boolean): CallSignatureDeclaration;
  /** Gets the interface call signatures. */
  getCallSignatures(): CallSignatureDeclaration[];
  /**
   * Add index signature.
   * @param structure - Structure representing the index signature.
   */
  addIndexSignature(structure: OptionalKind<IndexSignatureDeclarationStructure>): IndexSignatureDeclaration;
  /**
   * Add index signatures.
   * @param structures - Structures representing the index signatures.
   */
  addIndexSignatures(structures: ReadonlyArray<OptionalKind<IndexSignatureDeclarationStructure>>): IndexSignatureDeclaration[];
  /**
   * Insert index signature.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the index signature.
   */
  insertIndexSignature(index: number, structure: OptionalKind<IndexSignatureDeclarationStructure>): IndexSignatureDeclaration;
  /**
   * Insert index signatures.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the index signatures.
   */
  insertIndexSignatures(index: number, structures: ReadonlyArray<OptionalKind<IndexSignatureDeclarationStructure>>): IndexSignatureDeclaration[];
  /**
   * Gets the first index signature by a find function.
   * @param findFunction - Function to find the index signature by.
   */
  getIndexSignature(findFunction: (member: IndexSignatureDeclaration) => boolean): IndexSignatureDeclaration | undefined;
  /**
   * Gets the first index signature by a find function or throws if not found.
   * @param findFunction - Function to find the index signature by.
   */
  getIndexSignatureOrThrow(findFunction: (member: IndexSignatureDeclaration) => boolean): IndexSignatureDeclaration;
  /** Gets the interface index signatures. */
  getIndexSignatures(): IndexSignatureDeclaration[];
  /**
   * Add method.
   * @param structure - Structure representing the method.
   */
  addMethod(structure: OptionalKind<MethodSignatureStructure>): MethodSignature;
  /**
   * Add methods.
   * @param structures - Structures representing the methods.
   */
  addMethods(structures: ReadonlyArray<OptionalKind<MethodSignatureStructure>>): MethodSignature[];
  /**
   * Insert method.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the method.
   */
  insertMethod(index: number, structure: OptionalKind<MethodSignatureStructure>): MethodSignature;
  /**
   * Insert methods.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the methods.
   */
  insertMethods(index: number, structures: ReadonlyArray<OptionalKind<MethodSignatureStructure>>): MethodSignature[];
  /**
   * Gets the first method by name.
   * @param name - Name.
   */
  getMethod(name: string): MethodSignature | undefined;
  /**
   * Gets the first method by a find function.
   * @param findFunction - Function to find the method by.
   */
  getMethod(findFunction: (member: MethodSignature) => boolean): MethodSignature | undefined;
  /**
   * Gets the first method by name or throws if not found.
   * @param name - Name.
   */
  getMethodOrThrow(name: string): MethodSignature;
  /**
   * Gets the first method by a find function or throws if not found.
   * @param findFunction - Function to find the method by.
   */
  getMethodOrThrow(findFunction: (member: MethodSignature) => boolean): MethodSignature;
  /** Gets the interface method signatures. */
  getMethods(): MethodSignature[];
  /**
   * Add property.
   * @param structure - Structure representing the property.
   */
  addProperty(structure: OptionalKind<PropertySignatureStructure>): PropertySignature;
  /**
   * Add properties.
   * @param structures - Structures representing the properties.
   */
  addProperties(structures: ReadonlyArray<OptionalKind<PropertySignatureStructure>>): PropertySignature[];
  /**
   * Insert property.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the property.
   */
  insertProperty(index: number, structure: OptionalKind<PropertySignatureStructure>): PropertySignature;
  /**
   * Insert properties.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the properties.
   */
  insertProperties(index: number, structures: ReadonlyArray<OptionalKind<PropertySignatureStructure>>): PropertySignature[];
  /**
   * Gets the first property by name.
   * @param name - Name.
   */
  getProperty(name: string): PropertySignature | undefined;
  /**
   * Gets the first property by a find function.
   * @param findFunction - Function to find the property by.
   */
  getProperty(findFunction: (member: PropertySignature) => boolean): PropertySignature | undefined;
  /**
   * Gets the first property by name or throws if not found.
   * @param name - Name.
   */
  getPropertyOrThrow(name: string): PropertySignature;
  /**
   * Gets the first property by a find function or throws if not found.
   * @param findFunction - Function to find the property by.
   */
  getPropertyOrThrow(findFunction: (member: PropertySignature) => boolean): PropertySignature;
  /** Gets the interface property signatures. */
  getProperties(): PropertySignature[];
  /**
   * Add get accessor.
   * @param structure - Structure representing the get accessor.
   */
  addGetAccessor(structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Add get accessors.
   * @param structures - Structures representing the get accessors.
   */
  addGetAccessors(structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Insert get accessor.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the get accessor.
   */
  insertGetAccessor(index: number, structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Insert get accessors.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the get accessors.
   */
  insertGetAccessors(index: number, structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Gets the first get accessor by name.
   * @param name - Name.
   */
  getGetAccessor(name: string): GetAccessorDeclaration | undefined;
  /**
   * Gets the first get accessor by a find function.
   * @param findFunction - Function to find the get accessor by.
   */
  getGetAccessor(findFunction: (member: GetAccessorDeclaration) => boolean): GetAccessorDeclaration | undefined;
  /**
   * Gets the first get accessor by name or throws if not found.
   * @param name - Name.
   */
  getGetAccessorOrThrow(name: string): GetAccessorDeclaration;
  /**
   * Gets the first get accessor by a find function or throws if not found.
   * @param findFunction - Function to find the get accessor by.
   */
  getGetAccessorOrThrow(findFunction: (member: GetAccessorDeclaration) => boolean): GetAccessorDeclaration;
  /** Gets the interface get accessor declarations. */
  getGetAccessors(): GetAccessorDeclaration[];
  /**
   * Add set accessor.
   * @param structure - Structure representing the set accessor.
   */
  addSetAccessor(structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Add set accessors.
   * @param structures - Structures representing the set accessors.
   */
  addSetAccessors(structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /**
   * Insert set accessor.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the set accessor.
   */
  insertSetAccessor(index: number, structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Insert set accessors.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the set accessors.
   */
  insertSetAccessors(index: number, structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /**
   * Gets the first set accessor by name.
   * @param name - Name.
   */
  getSetAccessor(name: string): SetAccessorDeclaration | undefined;
  /**
   * Gets the first set accessor by a find function.
   * @param findFunction - Function to find the set accessor by.
   */
  getSetAccessor(findFunction: (member: SetAccessorDeclaration) => boolean): SetAccessorDeclaration | undefined;
  /**
   * Gets the first set accessor by name or throws if not found.
   * @param name - Name.
   */
  getSetAccessorOrThrow(name: string): SetAccessorDeclaration;
  /**
   * Gets the first set accessor by a find function or throws if not found.
   * @param findFunction - Function to find the set accessor by.
   */
  getSetAccessorOrThrow(findFunction: (member: SetAccessorDeclaration) => boolean): SetAccessorDeclaration;
  /** Gets the interface set accessor declarations. */
  getSetAccessors(): SetAccessorDeclaration[];
  /** Gets all the members. */
  getMembers(): TypeElementTypes[];
  /** Gets all the members with comment type elements. */
  getMembersWithComments(): (TypeElementTypes | CommentTypeElement)[];
}

type TypeElementMemberedNodeExtensionType = Node<ts.Node & {
      members: ts.NodeArray<ts.TypeElement>;
  }>;
export declare function TypeParameteredNode<T extends Constructor<TypeParameteredNodeExtensionType>>(Base: T): Constructor<TypeParameteredNode> & T;

export interface TypeParameteredNode {
  /**
   * Gets a type parameter or undefined if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getTypeParameter(name: string): TypeParameterDeclaration | undefined;
  /**
   * Gets a type parameter or undefined if it doesn't exist.
   * @param findFunction - Function to use to find the type parameter.
   */
  getTypeParameter(findFunction: (declaration: TypeParameterDeclaration) => boolean): TypeParameterDeclaration | undefined;
  /**
   * Gets a type parameter or throws if it doesn't exist.
   * @param name - Name of the parameter.
   */
  getTypeParameterOrThrow(name: string): TypeParameterDeclaration;
  /**
   * Gets a type parameter or throws if it doesn't exist.
   * @param findFunction - Function to use to find the type parameter.
   */
  getTypeParameterOrThrow(findFunction: (declaration: TypeParameterDeclaration) => boolean): TypeParameterDeclaration;
  /** Gets the type parameters. */
  getTypeParameters(): TypeParameterDeclaration[];
  /**
   * Adds a type parameter.
   * @param structure - Structure of the type parameter.
   */
  addTypeParameter(structure: OptionalKind<TypeParameterDeclarationStructure> | string): TypeParameterDeclaration;
  /**
   * Adds type parameters.
   * @param structures - Structures of the type parameters.
   */
  addTypeParameters(structures: ReadonlyArray<OptionalKind<TypeParameterDeclarationStructure> | string>): TypeParameterDeclaration[];
  /**
   * Inserts a type parameter.
   * @param index - Child index to insert at. Specify a negative index to insert from the reverse.
   * @param structure - Structure of the type parameter.
   */
  insertTypeParameter(index: number, structure: OptionalKind<TypeParameterDeclarationStructure> | string): TypeParameterDeclaration;
  /**
   * Inserts type parameters.
   * @param index - Child index to insert at. Specify a negative index to insert from the reverse.
   * @param structures - Structures of the type parameters.
   */
  insertTypeParameters(index: number, structures: ReadonlyArray<OptionalKind<TypeParameterDeclarationStructure> | string>): TypeParameterDeclaration[];
}

type TypeParameteredNodeExtensionType = Node<ts.Node & {
      typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>;
  }>;
export declare function UnwrappableNode<T extends Constructor<UnwrappableNodeExtensionType>>(Base: T): Constructor<UnwrappableNode> & T;

export interface UnwrappableNode {
  /** Replaces the node's text with its body's statements. */
  unwrap(): void;
}

type UnwrappableNodeExtensionType = Node;

export declare class ArrayBindingPattern extends Node<ts.ArrayBindingPattern> {
  /** Gets the array binding pattern's elements. */
  getElements(): (BindingElement | OmittedExpression)[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ArrayBindingPattern>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ArrayBindingPattern>>;
}

declare const BindingElementBase: Constructor<DotDotDotTokenableNode> & Constructor<InitializerExpressionableNode> & Constructor<BindingNamedNode> & typeof Node;

export declare class BindingElement extends BindingElementBase<ts.BindingElement> {
  /**
   * Gets binding element's property name node or throws if not found.
   *
   * For example in `const { a: b } = { a: 5 }`, `a` would be the property name.
   */
  getPropertyNameNodeOrThrow(message?: string | (() => string)): PropertyName;
  /**
   * Gets binding element's property name node or returns undefined if not found.
   *
   * For example in `const { a: b } = { a: 5 }`, `a` would be the property name.
   */
  getPropertyNameNode(): PropertyName | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.BindingElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.BindingElement>>;
}

export declare class ObjectBindingPattern extends Node<ts.ObjectBindingPattern> {
  /** Gets the object binding pattern's elements. */
  getElements(): BindingElement[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ObjectBindingPattern>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ObjectBindingPattern>>;
}

export declare function AbstractableNode<T extends Constructor<AbstractableNodeExtensionType>>(Base: T): Constructor<AbstractableNode> & T;

export interface AbstractableNode {
  /** Gets if the node is abstract. */
  isAbstract(): boolean;
  /** Gets the abstract keyword or undefined if it doesn't exist. */
  getAbstractKeyword(): Node | undefined;
  /** Gets the abstract keyword or throws if it doesn't exist. */
  getAbstractKeywordOrThrow(message?: string | (() => string)): Node;
  /**
   * Sets if the node is abstract.
   * @param isAbstract - If it should be abstract or not.
   */
  setIsAbstract(isAbstract: boolean): this;
}

type AbstractableNodeExtensionType = Node & ModifierableNode;
export declare function ClassLikeDeclarationBase<T extends Constructor<ClassLikeDeclarationBaseExtensionType>>(Base: T): Constructor<ClassLikeDeclarationBase> & T;

export interface ClassLikeDeclarationBase extends NameableNode, TextInsertableNode, ImplementsClauseableNode, HeritageClauseableNode, AbstractableNode, JSDocableNode, TypeParameteredNode, DecoratableNode, ModifierableNode, ClassLikeDeclarationBaseSpecific {
}

declare function ClassLikeDeclarationBaseSpecific<T extends Constructor<ClassLikeDeclarationBaseSpecificExtensionType>>(Base: T): Constructor<ClassLikeDeclarationBaseSpecific> & T;

interface ClassLikeDeclarationBaseSpecific {
  /**
   * Sets the extends expression.
   * @param text - Text to set as the extends expression.
   */
  setExtends(text: string | WriterFunction): this;
  /** Removes the extends expression, if it exists. */
  removeExtends(): this;
  /** Gets the extends expression or throws if it doesn't exist. */
  getExtendsOrThrow(message?: string | (() => string)): ExpressionWithTypeArguments;
  /** Gets the extends expression or returns undefined if it doesn't exist. */
  getExtends(): ExpressionWithTypeArguments | undefined;
  /**
   * Inserts a class member.
   * @param member - Class member to insert.
   */
  addMember(member: string | WriterFunction | ClassMemberStructures): ClassMemberTypes | CommentClassElement;
  /**
   * Inserts class members.
   * @param members - Collection of class members to insert.
   */
  addMembers(members: string | WriterFunction | ReadonlyArray<string | WriterFunction | ClassMemberStructures>): (ClassMemberTypes | CommentClassElement)[];
  /**
   * Inserts a class member.
   * @param index - Child index to insert at.
   * @param member - Class member to insert.
   */
  insertMember(index: number, member: string | WriterFunction | ClassMemberStructures): ClassMemberTypes | CommentClassElement;
  /**
   * Inserts class members.
   * @param index - Child index to insert at.
   * @param members - Collection of class members to insert.
   */
  insertMembers(index: number, members: string | WriterFunction | ReadonlyArray<string | WriterFunction | ClassMemberStructures>): (ClassMemberTypes | CommentClassElement)[];
  /**
   * Adds a constructor.
   * @param structure - Structure of the constructor.
   */
  addConstructor(structure?: OptionalKind<ConstructorDeclarationStructure>): ConstructorDeclaration;
  /**
   * Adds constructors.
   * @param structures - Structures of the constructor.
   */
  addConstructors(structures: ReadonlyArray<OptionalKind<ConstructorDeclarationStructure>>): ConstructorDeclaration[];
  /**
   * Inserts a constructor.
   * @param index - Child index to insert at.
   * @param structure - Structure of the constructor.
   */
  insertConstructor(index: number, structure?: OptionalKind<ConstructorDeclarationStructure>): ConstructorDeclaration;
  /**
   * Inserts constructors.
   * @param index - Child index to insert at.
   * @param structures - Structures of the constructor.
   */
  insertConstructors(index: number, structures: ReadonlyArray<OptionalKind<ConstructorDeclarationStructure>>): ConstructorDeclaration[];
  /** Gets the constructor declarations. */
  getConstructors(): ConstructorDeclaration[];
  /**
   * Adds a static block.
   * @param structure - Structure of the static block.
   */
  addStaticBlock(structure?: OptionalKind<ClassStaticBlockDeclarationStructure>): ClassStaticBlockDeclaration;
  /**
   * Adds static block.
   * @param structures - Structures of the static block.
   */
  addStaticBlocks(structures: ReadonlyArray<OptionalKind<ClassStaticBlockDeclarationStructure>>): ClassStaticBlockDeclaration[];
  /**
   * Inserts a static block.
   * @param index - Child index to insert at.
   * @param structure - Structure of the static block.
   */
  insertStaticBlock(index: number, structure?: OptionalKind<ClassStaticBlockDeclarationStructure>): ClassStaticBlockDeclaration;
  /**
   * Inserts static blocks.
   * @param index - Child index to insert at.
   * @param structures - Structures of the static blocks.
   */
  insertStaticBlocks(index: number, structures: ReadonlyArray<OptionalKind<ClassStaticBlockDeclarationStructure>>): ClassStaticBlockDeclaration[];
  /** Gets the static blocks. */
  getStaticBlocks(): ClassStaticBlockDeclaration[];
  /**
   * Add get accessor.
   * @param structure - Structure representing the get accessor.
   */
  addGetAccessor(structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Add properties.
   * @param structures - Structures representing the properties.
   */
  addGetAccessors(structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Insert get accessor.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the get accessor.
   */
  insertGetAccessor(index: number, structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Insert properties.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the properties.
   */
  insertGetAccessors(index: number, structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Add set accessor.
   * @param structure - Structure representing the set accessor.
   */
  addSetAccessor(structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Add properties.
   * @param structures - Structures representing the properties.
   */
  addSetAccessors(structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /**
   * Insert set accessor.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the set accessor.
   */
  insertSetAccessor(index: number, structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Insert properties.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the properties.
   */
  insertSetAccessors(index: number, structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /**
   * Add property.
   * @param structure - Structure representing the property.
   */
  addProperty(structure: OptionalKind<PropertyDeclarationStructure>): PropertyDeclaration;
  /**
   * Add properties.
   * @param structures - Structures representing the properties.
   */
  addProperties(structures: ReadonlyArray<OptionalKind<PropertyDeclarationStructure>>): PropertyDeclaration[];
  /**
   * Insert property.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the property.
   */
  insertProperty(index: number, structure: OptionalKind<PropertyDeclarationStructure>): PropertyDeclaration;
  /**
   * Insert properties.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the properties.
   */
  insertProperties(index: number, structures: ReadonlyArray<OptionalKind<PropertyDeclarationStructure>>): PropertyDeclaration[];
  /**
   * Add method.
   * @param structure - Structure representing the method.
   */
  addMethod(structure: OptionalKind<MethodDeclarationStructure>): MethodDeclaration;
  /**
   * Add methods.
   * @param structures - Structures representing the methods.
   */
  addMethods(structures: ReadonlyArray<OptionalKind<MethodDeclarationStructure>>): MethodDeclaration[];
  /**
   * Insert method.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the method.
   */
  insertMethod(index: number, structure: OptionalKind<MethodDeclarationStructure>): MethodDeclaration;
  /**
   * Insert methods.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the methods.
   */
  insertMethods(index: number, structures: ReadonlyArray<OptionalKind<MethodDeclarationStructure>>): MethodDeclaration[];
  /**
   * Gets the first instance property by name.
   * @param name - Name.
   */
  getInstanceProperty(name: string): ClassInstancePropertyTypes | undefined;
  /**
   * Gets the first instance property by a find function.
   * @param findFunction - Function to find an instance property by.
   */
  getInstanceProperty(findFunction: (prop: ClassInstancePropertyTypes) => boolean): ClassInstancePropertyTypes | undefined;
  /**
   * Gets the first instance property by name or throws if not found.
   * @param name - Name.
   */
  getInstancePropertyOrThrow(name: string): ClassInstancePropertyTypes;
  /**
   * Gets the first instance property by a find function or throws if not found.
   * @param findFunction - Function to find an instance property by.
   */
  getInstancePropertyOrThrow(findFunction: (prop: ClassInstancePropertyTypes) => boolean): ClassInstancePropertyTypes;
  /** Gets the class instance property declarations. */
  getInstanceProperties(): ClassInstancePropertyTypes[];
  /**
   * Gets the first static property by name.
   * @param name - Name.
   */
  getStaticProperty(name: string): ClassStaticPropertyTypes | undefined;
  /**
   * Gets the first static property by a find function.
   * @param findFunction - Function to find a static property by.
   */
  getStaticProperty(findFunction: (prop: ClassStaticPropertyTypes) => boolean): ClassStaticPropertyTypes | undefined;
  /**
   * Gets the first static property by name or throws if not found.
   * @param name - Name.
   */
  getStaticPropertyOrThrow(name: string): ClassStaticPropertyTypes;
  /**
   * Gets the first static property by a find function. or throws if not found.
   * @param findFunction - Function to find a static property by.
   */
  getStaticPropertyOrThrow(findFunction: (prop: ClassStaticPropertyTypes) => boolean): ClassStaticPropertyTypes;
  /** Gets the class instance property declarations. */
  getStaticProperties(): ClassStaticPropertyTypes[];
  /**
   * Gets the first property declaration by name.
   * @param name - Name.
   */
  getProperty(name: string): PropertyDeclaration | undefined;
  /**
   * Gets the first property declaration by a find function.
   * @param findFunction - Function to find a property declaration by.
   */
  getProperty(findFunction: (property: PropertyDeclaration) => boolean): PropertyDeclaration | undefined;
  /**
   * Gets the first property declaration by name or throws if it doesn't exist.
   * @param name - Name.
   */
  getPropertyOrThrow(name: string): PropertyDeclaration;
  /**
   * Gets the first property declaration by a find function or throws if it doesn't exist.
   * @param findFunction - Function to find a property declaration by.
   */
  getPropertyOrThrow(findFunction: (property: PropertyDeclaration) => boolean): PropertyDeclaration;
  /** Gets the class property declarations regardless of whether it's an instance of static property. */
  getProperties(): PropertyDeclaration[];
  /**
   * Gets the first get accessor declaration by name.
   * @param name - Name.
   */
  getGetAccessor(name: string): GetAccessorDeclaration | undefined;
  /**
   * Gets the first get accessor declaration by a find function.
   * @param findFunction - Function to find a get accessor declaration by.
   */
  getGetAccessor(findFunction: (getAccessor: GetAccessorDeclaration) => boolean): GetAccessorDeclaration | undefined;
  /**
   * Gets the first get accessor declaration by name or throws if it doesn't exist.
   * @param name - Name.
   */
  getGetAccessorOrThrow(name: string): GetAccessorDeclaration;
  /**
   * Gets the first get accessor declaration by a find function or throws if it doesn't exist.
   * @param findFunction - Function to find a get accessor declaration by.
   */
  getGetAccessorOrThrow(findFunction: (getAccessor: GetAccessorDeclaration) => boolean): GetAccessorDeclaration;
  /** Gets the class get accessor declarations regardless of whether it's an instance of static getAccessor. */
  getGetAccessors(): GetAccessorDeclaration[];
  /**
   * Sets the first set accessor declaration by name.
   * @param name - Name.
   */
  getSetAccessor(name: string): SetAccessorDeclaration | undefined;
  /**
   * Sets the first set accessor declaration by a find function.
   * @param findFunction - Function to find a set accessor declaration by.
   */
  getSetAccessor(findFunction: (setAccessor: SetAccessorDeclaration) => boolean): SetAccessorDeclaration | undefined;
  /**
   * Sets the first set accessor declaration by name or throws if it doesn't exist.
   * @param name - Name.
   */
  getSetAccessorOrThrow(name: string): SetAccessorDeclaration;
  /**
   * Sets the first set accessor declaration by a find function or throws if it doesn't exist.
   * @param findFunction - Function to find a set accessor declaration by.
   */
  getSetAccessorOrThrow(findFunction: (setAccessor: SetAccessorDeclaration) => boolean): SetAccessorDeclaration;
  /** Sets the class set accessor declarations regardless of whether it's an instance of static setAccessor. */
  getSetAccessors(): SetAccessorDeclaration[];
  /**
   * Gets the first method declaration by name.
   * @param name - Name.
   */
  getMethod(name: string): MethodDeclaration | undefined;
  /**
   * Gets the first method declaration by a find function.
   * @param findFunction - Function to find a method declaration by.
   */
  getMethod(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration | undefined;
  /**
   * Gets the first method declaration by name or throws if it doesn't exist.
   * @param name - Name.
   */
  getMethodOrThrow(name: string): MethodDeclaration;
  /**
   * Gets the first method declaration by a find function or throws if it doesn't exist.
   * @param findFunction - Function to find a method declaration by.
   */
  getMethodOrThrow(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration;
  /** Gets the class method declarations regardless of whether it's an instance of static method. */
  getMethods(): MethodDeclaration[];
  /**
   * Gets the first instance method by name.
   * @param name - Name.
   */
  getInstanceMethod(name: string): MethodDeclaration | undefined;
  /**
   * Gets the first instance method by a find function.
   * @param findFunction - Function to find an instance method by.
   */
  getInstanceMethod(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration | undefined;
  /**
   * Gets the first instance method by name or throws if not found.
   * @param name - Name.
   */
  getInstanceMethodOrThrow(name: string): MethodDeclaration;
  /**
   * Gets the first instance method by a find function. or throws if not found.
   * @param findFunction - Function to find an instance method by.
   */
  getInstanceMethodOrThrow(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration;
  /** Gets the class instance method declarations. */
  getInstanceMethods(): MethodDeclaration[];
  /**
   * Gets the first static method by name.
   * @param name - Name.
   */
  getStaticMethod(name: string): MethodDeclaration | undefined;
  /**
   * Gets the first static method by a find function.
   * @param findFunction - Function to find a static method by.
   */
  getStaticMethod(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration | undefined;
  /**
   * Gets the first static method by name or throws if not found.
   * @param name - Name.
   */
  getStaticMethodOrThrow(name: string): MethodDeclaration;
  /**
   * Gets the first static method by a find function. or throws if not found.
   * @param findFunction - Function to find a static method by.
   */
  getStaticMethodOrThrow(findFunction: (method: MethodDeclaration) => boolean): MethodDeclaration;
  /** Gets the class instance method declarations. */
  getStaticMethods(): MethodDeclaration[];
  /**
   * Gets the first instance member by name.
   * @param name - Name.
   */
  getInstanceMember(name: string): ClassInstanceMemberTypes | undefined;
  /**
   * Gets the first instance member by a find function.
   * @param findFunction - Function to find the instance member by.
   */
  getInstanceMember(findFunction: (member: ClassInstanceMemberTypes) => boolean): ClassInstanceMemberTypes | undefined;
  /**
   * Gets the first instance member by name or throws if not found.
   * @param name - Name.
   */
  getInstanceMemberOrThrow(name: string): ClassInstanceMemberTypes;
  /**
   * Gets the first instance member by a find function. or throws if not found.
   * @param findFunction - Function to find the instance member by.
   */
  getInstanceMemberOrThrow(findFunction: (member: ClassInstanceMemberTypes) => boolean): ClassInstanceMemberTypes;
  /** Gets the instance members. */
  getInstanceMembers(): ClassInstanceMemberTypes[];
  /**
   * Gets the first static member by name.
   * @param name - Name.
   */
  getStaticMember(name: string): ClassStaticMemberTypes | undefined;
  /**
   * Gets the first static member by a find function.
   * @param findFunction - Function to find an static method by.
   */
  getStaticMember(findFunction: (member: ClassStaticMemberTypes) => boolean): ClassStaticMemberTypes | undefined;
  /**
   * Gets the first static member by name or throws if not found.
   * @param name - Name.
   */
  getStaticMemberOrThrow(name: string): ClassStaticMemberTypes;
  /**
   * Gets the first static member by a find function. or throws if not found.
   * @param findFunction - Function to find an static method by.
   */
  getStaticMemberOrThrow(findFunction: (member: ClassStaticMemberTypes) => boolean): ClassStaticMemberTypes;
  /** Gets the static members. */
  getStaticMembers(): ClassStaticMemberTypes[];
  /** Gets the class' members regardless of whether it's an instance of static member. */
  getMembers(): ClassMemberTypes[];
  /** Gets the class' members with comment class elements. */
  getMembersWithComments(): (ClassMemberTypes | CommentClassElement)[];
  /**
   * Gets the first member by name.
   * @param name - Name.
   */
  getMember(name: string): ClassMemberTypes | undefined;
  /**
   * Gets the first member by a find function.
   * @param findFunction - Function to find an method by.
   */
  getMember(findFunction: (member: ClassMemberTypes) => boolean): ClassMemberTypes | undefined;
  /**
   * Gets the first member by name or throws if not found.
   * @param name - Name.
   */
  getMemberOrThrow(name: string): ClassMemberTypes;
  /**
   * Gets the first member by a find function. or throws if not found.
   * @param findFunction - Function to find an method by.
   */
  getMemberOrThrow(findFunction: (member: ClassMemberTypes) => boolean): ClassMemberTypes;
  /**
   * Gets the base types.
   *
   * This is useful to use if the base could possibly be a mixin.
   */
  getBaseTypes(): Type[];
  /**
   * Gets the base class or throws.
   *
   * Note: Use getBaseTypes if you need to get the mixins.
   */
  getBaseClassOrThrow(message?: string | (() => string)): ClassDeclaration;
  /**
   * Gets the base class.
   *
   * Note: Use getBaseTypes if you need to get the mixins.
   */
  getBaseClass(): ClassDeclaration | undefined;
  /** Gets all the derived classes. */
  getDerivedClasses(): ClassDeclaration[];
}

export type ClassPropertyTypes = PropertyDeclaration | GetAccessorDeclaration | SetAccessorDeclaration;
export type ClassInstancePropertyTypes = ClassPropertyTypes | ParameterDeclaration;
export type ClassInstanceMemberTypes = MethodDeclaration | ClassInstancePropertyTypes;
export type ClassStaticPropertyTypes = PropertyDeclaration | GetAccessorDeclaration | SetAccessorDeclaration;
export type ClassStaticMemberTypes = MethodDeclaration | ClassStaticBlockDeclaration | ClassStaticPropertyTypes;
export type ClassMemberTypes = MethodDeclaration | PropertyDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | ConstructorDeclaration | ClassStaticBlockDeclaration;
type ClassLikeDeclarationBaseExtensionType = Node<ts.ClassLikeDeclarationBase>;
type ClassLikeDeclarationBaseSpecificExtensionType = Node<ts.ClassLikeDeclarationBase> & HeritageClauseableNode & ModifierableNode & NameableNode;
declare const ClassDeclarationBase: Constructor<ModuleChildableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<ClassLikeDeclarationBase> & typeof Statement;

export declare class ClassDeclaration extends ClassDeclarationBase<ts.ClassDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ClassDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ClassDeclarationStructure;
  /**
   * Extracts an interface declaration structure from the class.
   * @param name - Name of the interface. Falls back to the same name as the class and then the filepath's base name.
   */
  extractInterface(name?: string): InterfaceDeclarationStructure;
  /**
   * Extracts an interface declaration structure from the static part of the class.
   * @param name - Name of the interface.
   */
  extractStaticInterface(name: string): InterfaceDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ClassDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ClassDeclaration>>;
}

export declare class ClassElement<T extends ts.ClassElement = ts.ClassElement> extends Node<T> {
  /** Removes the class member. */
  remove(): void;
}

declare const ClassExpressionBase: Constructor<ClassLikeDeclarationBase> & typeof PrimaryExpression;

export declare class ClassExpression extends ClassExpressionBase<ts.ClassExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ClassExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ClassExpression>>;
}

declare const ClassStaticBlockDeclarationBase: Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<StatementedNode> & Constructor<JSDocableNode> & Constructor<BodiedNode> & typeof ClassElement;

export declare class ClassStaticBlockDeclaration extends ClassStaticBlockDeclarationBase<ts.ClassStaticBlockDeclaration> {
  /**
   * Method that exists for the sake of making code compile that looks for the name of static members.
   * This always returns "static".
   */
  getName(): "static";
  /**
   * Method that exists for the sake of making code compile that looks for this method on class members.
   * This always returns true.
   */
  isStatic(): true;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ClassStaticBlockDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ClassStaticBlockDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ClassStaticBlockDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ClassStaticBlockDeclaration>>;
}

export declare class CommentClassElement extends ClassElement<CompilerCommentClassElement> {
}

declare const ConstructorDeclarationBase: Constructor<ReferenceFindableNode> & Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<OverloadableNode> & Constructor<ScopedNode> & Constructor<FunctionLikeDeclaration> & Constructor<BodyableNode> & typeof ClassElement;
declare const ConstructorDeclarationOverloadBase: Constructor<TypeParameteredNode> & Constructor<JSDocableNode> & Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<ScopedNode> & Constructor<ModifierableNode> & Constructor<SignaturedDeclaration> & typeof ClassElement;

export declare class ConstructorDeclaration extends ConstructorDeclarationBase<ts.ConstructorDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ConstructorDeclarationStructure>): this;
  /**
   * Add a constructor overload.
   * @param structure - Structure to add.
   */
  addOverload(structure: OptionalKind<ConstructorDeclarationOverloadStructure>): ConstructorDeclaration;
  /**
   * Add constructor overloads.
   * @param structures - Structures to add.
   */
  addOverloads(structures: ReadonlyArray<OptionalKind<ConstructorDeclarationOverloadStructure>>): ConstructorDeclaration[];
  /**
   * Inserts a constructor overload.
   * @param index - Child index to insert at.
   * @param structure - Structures to insert.
   */
  insertOverload(index: number, structure: OptionalKind<ConstructorDeclarationOverloadStructure>): ConstructorDeclaration;
  /**
   * Inserts constructor overloads.
   * @param index - Child index to insert at.
   * @param structures - Structures to insert.
   */
  insertOverloads(index: number, structures: ReadonlyArray<OptionalKind<ConstructorDeclarationOverloadStructure>>): ConstructorDeclaration[];
  /** Gets the structure equivalent to this node. */
  getStructure(): ConstructorDeclarationStructure | ConstructorDeclarationOverloadStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ConstructorDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ConstructorDeclaration>>;
}

declare const GetAccessorDeclarationBase: Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<DecoratableNode> & Constructor<AbstractableNode> & Constructor<ScopedNode> & Constructor<StaticableNode> & Constructor<FunctionLikeDeclaration> & Constructor<BodyableNode> & Constructor<PropertyNamedNode> & typeof ClassElement;

export declare class GetAccessorDeclaration extends GetAccessorDeclarationBase<ts.GetAccessorDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<GetAccessorDeclarationStructure>): this;
  /** Gets the corresponding set accessor if one exists. */
  getSetAccessor(): SetAccessorDeclaration | undefined;
  /** Gets the corresponding set accessor or throws if not exists. */
  getSetAccessorOrThrow(message?: string | (() => string)): SetAccessorDeclaration;
  /** Gets the structure equivalent to this node. */
  getStructure(): GetAccessorDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.GetAccessorDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.GetAccessorDeclaration>>;
}

declare const MethodDeclarationBase: Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<OverrideableNode> & Constructor<OverloadableNode> & Constructor<BodyableNode> & Constructor<DecoratableNode> & Constructor<AbstractableNode> & Constructor<ScopedNode> & Constructor<QuestionTokenableNode> & Constructor<StaticableNode> & Constructor<AsyncableNode> & Constructor<GeneratorableNode> & Constructor<FunctionLikeDeclaration> & Constructor<PropertyNamedNode> & typeof ClassElement;
declare const MethodDeclarationOverloadBase: Constructor<JSDocableNode> & Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<OverrideableNode> & Constructor<ScopedNode> & Constructor<TypeParameteredNode> & Constructor<AbstractableNode> & Constructor<QuestionTokenableNode> & Constructor<StaticableNode> & Constructor<AsyncableNode> & Constructor<ModifierableNode> & Constructor<GeneratorableNode> & Constructor<SignaturedDeclaration> & typeof ClassElement;

export declare class MethodDeclaration extends MethodDeclarationBase<ts.MethodDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<MethodDeclarationStructure>): this;
  /**
   * Add a method overload.
   * @param structure - Structure to add.
   */
  addOverload(structure: OptionalKind<MethodDeclarationOverloadStructure>): MethodDeclaration;
  /**
   * Add method overloads.
   * @param structures - Structures to add.
   */
  addOverloads(structures: ReadonlyArray<OptionalKind<MethodDeclarationOverloadStructure>>): MethodDeclaration[];
  /**
   * Inserts a method overload.
   * @param index - Child index to insert at.
   * @param structure - Structures to insert.
   */
  insertOverload(index: number, structure: OptionalKind<MethodDeclarationOverloadStructure>): MethodDeclaration;
  /**
   * Inserts method overloads.
   * @param index - Child index to insert at.
   * @param structures - Structures to insert.
   */
  insertOverloads(index: number, structures: ReadonlyArray<OptionalKind<MethodDeclarationOverloadStructure>>): MethodDeclaration[];
  /** Gets the structure equivalent to this node. */
  getStructure(): MethodDeclarationStructure | MethodDeclarationOverloadStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.MethodDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.MethodDeclaration>>;
}

declare const PropertyDeclarationBase: Constructor<ChildOrderableNode> & Constructor<OverrideableNode> & Constructor<AmbientableNode> & Constructor<DecoratableNode> & Constructor<AbstractableNode> & Constructor<ScopedNode> & Constructor<StaticableNode> & Constructor<JSDocableNode> & Constructor<ReadonlyableNode> & Constructor<ExclamationTokenableNode> & Constructor<QuestionTokenableNode> & Constructor<InitializerExpressionableNode> & Constructor<TypedNode> & Constructor<PropertyNamedNode> & Constructor<ModifierableNode> & typeof ClassElement;

export declare class PropertyDeclaration extends PropertyDeclarationBase<ts.PropertyDeclaration> {
  /** Gets if this property declaration has an accessor keyword. */
  hasAccessorKeyword(): boolean;
  /** Sets if this property declaration should have an accessor keyword. */
  setHasAccessorKeyword(value: boolean): this;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<PropertyDeclarationStructure>): this;
  /** Removes the property. */
  remove(): void;
  /** Gets the structure equivalent to this node. */
  getStructure(): PropertyDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PropertyDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PropertyDeclaration>>;
}

declare const SetAccessorDeclarationBase: Constructor<ChildOrderableNode> & Constructor<TextInsertableNode> & Constructor<DecoratableNode> & Constructor<AbstractableNode> & Constructor<ScopedNode> & Constructor<StaticableNode> & Constructor<FunctionLikeDeclaration> & Constructor<BodyableNode> & Constructor<PropertyNamedNode> & typeof ClassElement;

export declare class SetAccessorDeclaration extends SetAccessorDeclarationBase<ts.SetAccessorDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<SetAccessorDeclarationStructure>): this;
  /** Gets the corresponding get accessor if one exists. */
  getGetAccessor(): GetAccessorDeclaration | undefined;
  /** Gets the corresponding get accessor or throws if not exists. */
  getGetAccessorOrThrow(message?: string | (() => string)): GetAccessorDeclaration;
  /** Gets the structure equivalent to this node. */
  getStructure(): SetAccessorDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SetAccessorDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SetAccessorDeclaration>>;
}

export declare class CommentRange extends TextRange<ts.CommentRange> {
  private constructor();
  /** Gets the comment syntax kind. */
  getKind(): ts.CommentKind;
}

export declare abstract class CompilerCommentNode implements ts.Node {
  #private;
  pos: number;
  end: number;
  kind: SyntaxKind.SingleLineCommentTrivia | SyntaxKind.MultiLineCommentTrivia;
  flags: ts.NodeFlags;
  modifiers?: ts.NodeArray<ts.Modifier> | undefined;
  parent: ts.Node;
  protected constructor();
  getSourceFile(): ts.SourceFile;
  getChildCount(sourceFile?: ts.SourceFile | undefined): number;
  getChildAt(index: number, sourceFile?: ts.SourceFile | undefined): ts.Node;
  getChildren(sourceFile?: ts.SourceFile | undefined): ts.Node[];
  getStart(sourceFile?: ts.SourceFile | undefined, includeJsDocComment?: boolean | undefined): number;
  getFullStart(): number;
  getEnd(): number;
  getWidth(sourceFile?: ts.SourceFileLike | undefined): number;
  getFullWidth(): number;
  getLeadingTriviaWidth(sourceFile?: ts.SourceFile | undefined): number;
  getFullText(sourceFile?: ts.SourceFile | undefined): string;
  getText(sourceFile?: ts.SourceFile | undefined): string;
  getFirstToken(sourceFile?: ts.SourceFile | undefined): ts.Node | undefined;
  getLastToken(sourceFile?: ts.SourceFile | undefined): ts.Node | undefined;
  forEachChild<T>(cbNode: (node: ts.Node) => T | undefined, cbNodeArray?: ((nodes: ts.NodeArray<ts.Node>) => T | undefined) | undefined): T | undefined;
}

export declare class CompilerCommentStatement extends CompilerCommentNode implements ts.Statement {
  _jsdocContainerBrand: any;
  _statementBrand: any;
}

export declare class CompilerCommentClassElement extends CompilerCommentNode implements ts.ClassElement {
  _classElementBrand: any;
  _declarationBrand: any;
}

export declare class CompilerCommentTypeElement extends CompilerCommentNode implements ts.TypeElement {
  _typeElementBrand: any;
  _declarationBrand: any;
}

export declare class CompilerCommentObjectLiteralElement extends CompilerCommentNode implements ts.ObjectLiteralElement {
  _declarationBrand: any;
  _objectLiteralBrand: any;
  declarationBrand: any;
}

export declare class CompilerCommentEnumMember extends CompilerCommentNode implements ts.Node {
}

export type NodePropertyToWrappedType<NodeType extends ts.Node, KeyName extends keyof NodeType, NonNullableNodeType = NonNullable<NodeType[KeyName]>> = NodeType[KeyName] extends ts.NodeArray<infer ArrayNodeTypeForNullable> | undefined ? CompilerNodeToWrappedType<ArrayNodeTypeForNullable>[] | undefined : NodeType[KeyName] extends ts.NodeArray<infer ArrayNodeType> ? CompilerNodeToWrappedType<ArrayNodeType>[] : NodeType[KeyName] extends ts.Node ? CompilerNodeToWrappedType<NodeType[KeyName]> : NonNullableNodeType extends ts.Node ? CompilerNodeToWrappedType<NonNullableNodeType> | undefined : NodeType[KeyName];
export type NodeParentType<NodeType extends ts.Node> = NodeType extends ts.SourceFile ? undefined : ts.Node extends NodeType ? CompilerNodeToWrappedType<NodeType["parent"]> | undefined : CompilerNodeToWrappedType<NodeType["parent"]>;

export declare class Node<NodeType extends ts.Node = ts.Node> {
  #private;
  /** Gets if the node is an AnyKeyword. */
  static readonly isAnyKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is an ArrayBindingPattern. */
  static readonly isArrayBindingPattern: (node: Node | undefined) => node is ArrayBindingPattern;
  /** Gets if the node is an ArrayLiteralExpression. */
  static readonly isArrayLiteralExpression: (node: Node | undefined) => node is ArrayLiteralExpression;
  /** Gets if the node is an ArrowFunction. */
  static readonly isArrowFunction: (node: Node | undefined) => node is ArrowFunction;
  /** Gets if the node is an AsExpression. */
  static readonly isAsExpression: (node: Node | undefined) => node is AsExpression;
  /** Gets if the node is an AwaitExpression. */
  static readonly isAwaitExpression: (node: Node | undefined) => node is AwaitExpression;
  /** Gets if the node is a BigIntLiteral. */
  static readonly isBigIntLiteral: (node: Node | undefined) => node is BigIntLiteral;
  /** Gets if the node is a BinaryExpression. */
  static readonly isBinaryExpression: (node: Node | undefined) => node is BinaryExpression;
  /** Gets if the node is a BindingElement. */
  static readonly isBindingElement: (node: Node | undefined) => node is BindingElement;
  /** Gets if the node is a Block. */
  static readonly isBlock: (node: Node | undefined) => node is Block;
  /** Gets if the node is a BooleanKeyword. */
  static readonly isBooleanKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a BreakStatement. */
  static readonly isBreakStatement: (node: Node | undefined) => node is BreakStatement;
  /** Gets if the node is a CallExpression. */
  static readonly isCallExpression: (node: Node | undefined) => node is CallExpression;
  /** Gets if the node is a CaseBlock. */
  static readonly isCaseBlock: (node: Node | undefined) => node is CaseBlock;
  /** Gets if the node is a CaseClause. */
  static readonly isCaseClause: (node: Node | undefined) => node is CaseClause;
  /** Gets if the node is a CatchClause. */
  static readonly isCatchClause: (node: Node | undefined) => node is CatchClause;
  /** Gets if the node is a ClassDeclaration. */
  static readonly isClassDeclaration: (node: Node | undefined) => node is ClassDeclaration;
  /** Gets if the node is a ClassExpression. */
  static readonly isClassExpression: (node: Node | undefined) => node is ClassExpression;
  /** Gets if the node is a ClassStaticBlockDeclaration. */
  static readonly isClassStaticBlockDeclaration: (node: Node | undefined) => node is ClassStaticBlockDeclaration;
  /** Gets if the node is a CommaListExpression. */
  static readonly isCommaListExpression: (node: Node | undefined) => node is CommaListExpression;
  /** Gets if the node is a ComputedPropertyName. */
  static readonly isComputedPropertyName: (node: Node | undefined) => node is ComputedPropertyName;
  /** Gets if the node is a ConditionalExpression. */
  static readonly isConditionalExpression: (node: Node | undefined) => node is ConditionalExpression;
  /** Gets if the node is a ContinueStatement. */
  static readonly isContinueStatement: (node: Node | undefined) => node is ContinueStatement;
  /** Gets if the node is a DebuggerStatement. */
  static readonly isDebuggerStatement: (node: Node | undefined) => node is DebuggerStatement;
  /** Gets if the node is a Decorator. */
  static readonly isDecorator: (node: Node | undefined) => node is Decorator;
  /** Gets if the node is a DefaultClause. */
  static readonly isDefaultClause: (node: Node | undefined) => node is DefaultClause;
  /** Gets if the node is a DeleteExpression. */
  static readonly isDeleteExpression: (node: Node | undefined) => node is DeleteExpression;
  /** Gets if the node is a DoStatement. */
  static readonly isDoStatement: (node: Node | undefined) => node is DoStatement;
  /** Gets if the node is an ElementAccessExpression. */
  static readonly isElementAccessExpression: (node: Node | undefined) => node is ElementAccessExpression;
  /** Gets if the node is an EmptyStatement. */
  static readonly isEmptyStatement: (node: Node | undefined) => node is EmptyStatement;
  /** Gets if the node is an EnumDeclaration. */
  static readonly isEnumDeclaration: (node: Node | undefined) => node is EnumDeclaration;
  /** Gets if the node is an EnumMember. */
  static readonly isEnumMember: (node: Node | undefined) => node is EnumMember;
  /** Gets if the node is an ExportAssignment. */
  static readonly isExportAssignment: (node: Node | undefined) => node is ExportAssignment;
  /** Gets if the node is an ExportDeclaration. */
  static readonly isExportDeclaration: (node: Node | undefined) => node is ExportDeclaration;
  /** Gets if the node is an ExportSpecifier. */
  static readonly isExportSpecifier: (node: Node | undefined) => node is ExportSpecifier;
  /** Gets if the node is an ExpressionStatement. */
  static readonly isExpressionStatement: (node: Node | undefined) => node is ExpressionStatement;
  /** Gets if the node is an ExpressionWithTypeArguments. */
  static readonly isExpressionWithTypeArguments: (node: Node | undefined) => node is ExpressionWithTypeArguments;
  /** Gets if the node is an ExternalModuleReference. */
  static readonly isExternalModuleReference: (node: Node | undefined) => node is ExternalModuleReference;
  /** Gets if the node is a ForInStatement. */
  static readonly isForInStatement: (node: Node | undefined) => node is ForInStatement;
  /** Gets if the node is a ForOfStatement. */
  static readonly isForOfStatement: (node: Node | undefined) => node is ForOfStatement;
  /** Gets if the node is a ForStatement. */
  static readonly isForStatement: (node: Node | undefined) => node is ForStatement;
  /** Gets if the node is a FunctionDeclaration. */
  static readonly isFunctionDeclaration: (node: Node | undefined) => node is FunctionDeclaration;
  /** Gets if the node is a FunctionExpression. */
  static readonly isFunctionExpression: (node: Node | undefined) => node is FunctionExpression;
  /** Gets if the node is a HeritageClause. */
  static readonly isHeritageClause: (node: Node | undefined) => node is HeritageClause;
  /** Gets if the node is a Identifier. */
  static readonly isIdentifier: (node: Node | undefined) => node is Identifier;
  /** Gets if the node is a IfStatement. */
  static readonly isIfStatement: (node: Node | undefined) => node is IfStatement;
  /** Gets if the node is a ImportAttribute. */
  static readonly isImportAttribute: (node: Node | undefined) => node is ImportAttribute;
  /** Gets if the node is a ImportAttributes. */
  static readonly isImportAttributes: (node: Node | undefined) => node is ImportAttributes;
  /** Gets if the node is a ImportClause. */
  static readonly isImportClause: (node: Node | undefined) => node is ImportClause;
  /** Gets if the node is a ImportDeclaration. */
  static readonly isImportDeclaration: (node: Node | undefined) => node is ImportDeclaration;
  /** Gets if the node is a ImportEqualsDeclaration. */
  static readonly isImportEqualsDeclaration: (node: Node | undefined) => node is ImportEqualsDeclaration;
  /** Gets if the node is a ImportSpecifier. */
  static readonly isImportSpecifier: (node: Node | undefined) => node is ImportSpecifier;
  /** Gets if the node is a InferKeyword. */
  static readonly isInferKeyword: (node: Node | undefined) => node is Node<ts.Token<SyntaxKind.InferKeyword>>;
  /** Gets if the node is a InterfaceDeclaration. */
  static readonly isInterfaceDeclaration: (node: Node | undefined) => node is InterfaceDeclaration;
  /** Gets if the node is a JSDoc. */
  static readonly isJSDoc: (node: Node | undefined) => node is JSDoc;
  /** Gets if the node is a JSDocAllType. */
  static readonly isJSDocAllType: (node: Node | undefined) => node is JSDocAllType;
  /** Gets if the node is a JSDocAugmentsTag. */
  static readonly isJSDocAugmentsTag: (node: Node | undefined) => node is JSDocAugmentsTag;
  /** Gets if the node is a JSDocAuthorTag. */
  static readonly isJSDocAuthorTag: (node: Node | undefined) => node is JSDocAuthorTag;
  /** Gets if the node is a JSDocCallbackTag. */
  static readonly isJSDocCallbackTag: (node: Node | undefined) => node is JSDocCallbackTag;
  /** Gets if the node is a JSDocClassTag. */
  static readonly isJSDocClassTag: (node: Node | undefined) => node is JSDocClassTag;
  /** Gets if the node is a JSDocDeprecatedTag. */
  static readonly isJSDocDeprecatedTag: (node: Node | undefined) => node is JSDocDeprecatedTag;
  /** Gets if the node is a JSDocEnumTag. */
  static readonly isJSDocEnumTag: (node: Node | undefined) => node is JSDocEnumTag;
  /** Gets if the node is a JSDocFunctionType. */
  static readonly isJSDocFunctionType: (node: Node | undefined) => node is JSDocFunctionType;
  /** Gets if the node is a JSDocImplementsTag. */
  static readonly isJSDocImplementsTag: (node: Node | undefined) => node is JSDocImplementsTag;
  /** Gets if the node is a JSDocLink. */
  static readonly isJSDocLink: (node: Node | undefined) => node is JSDocLink;
  /** Gets if the node is a JSDocLinkCode. */
  static readonly isJSDocLinkCode: (node: Node | undefined) => node is JSDocLinkCode;
  /** Gets if the node is a JSDocLinkPlain. */
  static readonly isJSDocLinkPlain: (node: Node | undefined) => node is JSDocLinkPlain;
  /** Gets if the node is a JSDocMemberName. */
  static readonly isJSDocMemberName: (node: Node | undefined) => node is JSDocMemberName;
  /** Gets if the node is a JSDocNamepathType. */
  static readonly isJSDocNamepathType: (node: Node | undefined) => node is JSDocNamepathType;
  /** Gets if the node is a JSDocNameReference. */
  static readonly isJSDocNameReference: (node: Node | undefined) => node is JSDocNameReference;
  /** Gets if the node is a JSDocNonNullableType. */
  static readonly isJSDocNonNullableType: (node: Node | undefined) => node is JSDocNonNullableType;
  /** Gets if the node is a JSDocNullableType. */
  static readonly isJSDocNullableType: (node: Node | undefined) => node is JSDocNullableType;
  /** Gets if the node is a JSDocOptionalType. */
  static readonly isJSDocOptionalType: (node: Node | undefined) => node is JSDocOptionalType;
  /** Gets if the node is a JSDocOverloadTag. */
  static readonly isJSDocOverloadTag: (node: Node | undefined) => node is JSDocOverloadTag;
  /** Gets if the node is a JSDocOverrideTag. */
  static readonly isJSDocOverrideTag: (node: Node | undefined) => node is JSDocOverrideTag;
  /** Gets if the node is a JSDocParameterTag. */
  static readonly isJSDocParameterTag: (node: Node | undefined) => node is JSDocParameterTag;
  /** Gets if the node is a JSDocPrivateTag. */
  static readonly isJSDocPrivateTag: (node: Node | undefined) => node is JSDocPrivateTag;
  /** Gets if the node is a JSDocPropertyTag. */
  static readonly isJSDocPropertyTag: (node: Node | undefined) => node is JSDocPropertyTag;
  /** Gets if the node is a JSDocProtectedTag. */
  static readonly isJSDocProtectedTag: (node: Node | undefined) => node is JSDocProtectedTag;
  /** Gets if the node is a JSDocPublicTag. */
  static readonly isJSDocPublicTag: (node: Node | undefined) => node is JSDocPublicTag;
  /** Gets if the node is a JSDocReadonlyTag. */
  static readonly isJSDocReadonlyTag: (node: Node | undefined) => node is JSDocReadonlyTag;
  /** Gets if the node is a JSDocReturnTag. */
  static readonly isJSDocReturnTag: (node: Node | undefined) => node is JSDocReturnTag;
  /** Gets if the node is a JSDocSatisfiesTag. */
  static readonly isJSDocSatisfiesTag: (node: Node | undefined) => node is JSDocSatisfiesTag;
  /** Gets if the node is a JSDocSeeTag. */
  static readonly isJSDocSeeTag: (node: Node | undefined) => node is JSDocSeeTag;
  /** Gets if the node is a JSDocSignature. */
  static readonly isJSDocSignature: (node: Node | undefined) => node is JSDocSignature;
  /** Gets if the node is a JSDocTemplateTag. */
  static readonly isJSDocTemplateTag: (node: Node | undefined) => node is JSDocTemplateTag;
  /** Gets if the node is a JSDocText. */
  static readonly isJSDocText: (node: Node | undefined) => node is JSDocText;
  /** Gets if the node is a JSDocThisTag. */
  static readonly isJSDocThisTag: (node: Node | undefined) => node is JSDocThisTag;
  /** Gets if the node is a JSDocThrowsTag. */
  static readonly isJSDocThrowsTag: (node: Node | undefined) => node is JSDocThrowsTag;
  /** Gets if the node is a JSDocTypedefTag. */
  static readonly isJSDocTypedefTag: (node: Node | undefined) => node is JSDocTypedefTag;
  /** Gets if the node is a JSDocTypeExpression. */
  static readonly isJSDocTypeExpression: (node: Node | undefined) => node is JSDocTypeExpression;
  /** Gets if the node is a JSDocTypeLiteral. */
  static readonly isJSDocTypeLiteral: (node: Node | undefined) => node is JSDocTypeLiteral;
  /** Gets if the node is a JSDocTypeTag. */
  static readonly isJSDocTypeTag: (node: Node | undefined) => node is JSDocTypeTag;
  /** Gets if the node is a JSDocUnknownType. */
  static readonly isJSDocUnknownType: (node: Node | undefined) => node is JSDocUnknownType;
  /** Gets if the node is a JSDocVariadicType. */
  static readonly isJSDocVariadicType: (node: Node | undefined) => node is JSDocVariadicType;
  /** Gets if the node is a JsxAttribute. */
  static readonly isJsxAttribute: (node: Node | undefined) => node is JsxAttribute;
  /** Gets if the node is a JsxClosingElement. */
  static readonly isJsxClosingElement: (node: Node | undefined) => node is JsxClosingElement;
  /** Gets if the node is a JsxClosingFragment. */
  static readonly isJsxClosingFragment: (node: Node | undefined) => node is JsxClosingFragment;
  /** Gets if the node is a JsxElement. */
  static readonly isJsxElement: (node: Node | undefined) => node is JsxElement;
  /** Gets if the node is a JsxExpression. */
  static readonly isJsxExpression: (node: Node | undefined) => node is JsxExpression;
  /** Gets if the node is a JsxFragment. */
  static readonly isJsxFragment: (node: Node | undefined) => node is JsxFragment;
  /** Gets if the node is a JsxNamespacedName. */
  static readonly isJsxNamespacedName: (node: Node | undefined) => node is JsxNamespacedName;
  /** Gets if the node is a JsxOpeningElement. */
  static readonly isJsxOpeningElement: (node: Node | undefined) => node is JsxOpeningElement;
  /** Gets if the node is a JsxOpeningFragment. */
  static readonly isJsxOpeningFragment: (node: Node | undefined) => node is JsxOpeningFragment;
  /** Gets if the node is a JsxSelfClosingElement. */
  static readonly isJsxSelfClosingElement: (node: Node | undefined) => node is JsxSelfClosingElement;
  /** Gets if the node is a JsxSpreadAttribute. */
  static readonly isJsxSpreadAttribute: (node: Node | undefined) => node is JsxSpreadAttribute;
  /** Gets if the node is a JsxText. */
  static readonly isJsxText: (node: Node | undefined) => node is JsxText;
  /** Gets if the node is a LabeledStatement. */
  static readonly isLabeledStatement: (node: Node | undefined) => node is LabeledStatement;
  /** Gets if the node is a MetaProperty. */
  static readonly isMetaProperty: (node: Node | undefined) => node is MetaProperty;
  /** Gets if the node is a MethodDeclaration. */
  static readonly isMethodDeclaration: (node: Node | undefined) => node is MethodDeclaration;
  /** Gets if the node is a MethodSignature. */
  static readonly isMethodSignature: (node: Node | undefined) => node is MethodSignature;
  /** Gets if the node is a ModuleBlock. */
  static readonly isModuleBlock: (node: Node | undefined) => node is ModuleBlock;
  /** Gets if the node is a ModuleDeclaration. */
  static readonly isModuleDeclaration: (node: Node | undefined) => node is ModuleDeclaration;
  /** Gets if the node is a NamedExports. */
  static readonly isNamedExports: (node: Node | undefined) => node is NamedExports;
  /** Gets if the node is a NamedImports. */
  static readonly isNamedImports: (node: Node | undefined) => node is NamedImports;
  /** Gets if the node is a NamedTupleMember. */
  static readonly isNamedTupleMember: (node: Node | undefined) => node is NamedTupleMember;
  /** Gets if the node is a NamespaceExport. */
  static readonly isNamespaceExport: (node: Node | undefined) => node is NamespaceExport;
  /** Gets if the node is a NamespaceImport. */
  static readonly isNamespaceImport: (node: Node | undefined) => node is NamespaceImport;
  /** Gets if the node is a NeverKeyword. */
  static readonly isNeverKeyword: (node: Node | undefined) => node is Node<ts.Token<SyntaxKind.NeverKeyword>>;
  /** Gets if the node is a NewExpression. */
  static readonly isNewExpression: (node: Node | undefined) => node is NewExpression;
  /** Gets if the node is a NonNullExpression. */
  static readonly isNonNullExpression: (node: Node | undefined) => node is NonNullExpression;
  /** Gets if the node is a NoSubstitutionTemplateLiteral. */
  static readonly isNoSubstitutionTemplateLiteral: (node: Node | undefined) => node is NoSubstitutionTemplateLiteral;
  /** Gets if the node is a NotEmittedStatement. */
  static readonly isNotEmittedStatement: (node: Node | undefined) => node is NotEmittedStatement;
  /** Gets if the node is a NumberKeyword. */
  static readonly isNumberKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a NumericLiteral. */
  static readonly isNumericLiteral: (node: Node | undefined) => node is NumericLiteral;
  /** Gets if the node is a ObjectBindingPattern. */
  static readonly isObjectBindingPattern: (node: Node | undefined) => node is ObjectBindingPattern;
  /** Gets if the node is a ObjectKeyword. */
  static readonly isObjectKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a ObjectLiteralExpression. */
  static readonly isObjectLiteralExpression: (node: Node | undefined) => node is ObjectLiteralExpression;
  /** Gets if the node is a OmittedExpression. */
  static readonly isOmittedExpression: (node: Node | undefined) => node is OmittedExpression;
  /** Gets if the node is a ParenthesizedExpression. */
  static readonly isParenthesizedExpression: (node: Node | undefined) => node is ParenthesizedExpression;
  /** Gets if the node is a PartiallyEmittedExpression. */
  static readonly isPartiallyEmittedExpression: (node: Node | undefined) => node is PartiallyEmittedExpression;
  /** Gets if the node is a PostfixUnaryExpression. */
  static readonly isPostfixUnaryExpression: (node: Node | undefined) => node is PostfixUnaryExpression;
  /** Gets if the node is a PrefixUnaryExpression. */
  static readonly isPrefixUnaryExpression: (node: Node | undefined) => node is PrefixUnaryExpression;
  /** Gets if the node is a PrivateIdentifier. */
  static readonly isPrivateIdentifier: (node: Node | undefined) => node is PrivateIdentifier;
  /** Gets if the node is a PropertyAccessExpression. */
  static readonly isPropertyAccessExpression: (node: Node | undefined) => node is PropertyAccessExpression;
  /** Gets if the node is a PropertyAssignment. */
  static readonly isPropertyAssignment: (node: Node | undefined) => node is PropertyAssignment;
  /** Gets if the node is a PropertyDeclaration. */
  static readonly isPropertyDeclaration: (node: Node | undefined) => node is PropertyDeclaration;
  /** Gets if the node is a PropertySignature. */
  static readonly isPropertySignature: (node: Node | undefined) => node is PropertySignature;
  /** Gets if the node is a QualifiedName. */
  static readonly isQualifiedName: (node: Node | undefined) => node is QualifiedName;
  /** Gets if the node is a RegularExpressionLiteral. */
  static readonly isRegularExpressionLiteral: (node: Node | undefined) => node is RegularExpressionLiteral;
  /** Gets if the node is a ReturnStatement. */
  static readonly isReturnStatement: (node: Node | undefined) => node is ReturnStatement;
  /** Gets if the node is a SatisfiesExpression. */
  static readonly isSatisfiesExpression: (node: Node | undefined) => node is SatisfiesExpression;
  /** Gets if the node is a SemicolonToken. */
  static readonly isSemicolonToken: (node: Node | undefined) => node is Node<ts.Token<SyntaxKind.SemicolonToken>>;
  /** Gets if the node is a ShorthandPropertyAssignment. */
  static readonly isShorthandPropertyAssignment: (node: Node | undefined) => node is ShorthandPropertyAssignment;
  /** Gets if the node is a SourceFile. */
  static readonly isSourceFile: (node: Node | undefined) => node is SourceFile;
  /** Gets if the node is a SpreadAssignment. */
  static readonly isSpreadAssignment: (node: Node | undefined) => node is SpreadAssignment;
  /** Gets if the node is a SpreadElement. */
  static readonly isSpreadElement: (node: Node | undefined) => node is SpreadElement;
  /** Gets if the node is a StringKeyword. */
  static readonly isStringKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a StringLiteral. */
  static readonly isStringLiteral: (node: Node | undefined) => node is StringLiteral;
  /** Gets if the node is a SwitchStatement. */
  static readonly isSwitchStatement: (node: Node | undefined) => node is SwitchStatement;
  /** Gets if the node is a SymbolKeyword. */
  static readonly isSymbolKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a SyntaxList. */
  static readonly isSyntaxList: (node: Node | undefined) => node is SyntaxList;
  /** Gets if the node is a TaggedTemplateExpression. */
  static readonly isTaggedTemplateExpression: (node: Node | undefined) => node is TaggedTemplateExpression;
  /** Gets if the node is a TemplateExpression. */
  static readonly isTemplateExpression: (node: Node | undefined) => node is TemplateExpression;
  /** Gets if the node is a TemplateHead. */
  static readonly isTemplateHead: (node: Node | undefined) => node is TemplateHead;
  /** Gets if the node is a TemplateMiddle. */
  static readonly isTemplateMiddle: (node: Node | undefined) => node is TemplateMiddle;
  /** Gets if the node is a TemplateSpan. */
  static readonly isTemplateSpan: (node: Node | undefined) => node is TemplateSpan;
  /** Gets if the node is a TemplateTail. */
  static readonly isTemplateTail: (node: Node | undefined) => node is TemplateTail;
  /** Gets if the node is a ThrowStatement. */
  static readonly isThrowStatement: (node: Node | undefined) => node is ThrowStatement;
  /** Gets if the node is a TryStatement. */
  static readonly isTryStatement: (node: Node | undefined) => node is TryStatement;
  /** Gets if the node is a TypeAliasDeclaration. */
  static readonly isTypeAliasDeclaration: (node: Node | undefined) => node is TypeAliasDeclaration;
  /** Gets if the node is a TypeOfExpression. */
  static readonly isTypeOfExpression: (node: Node | undefined) => node is TypeOfExpression;
  /** Gets if the node is a UndefinedKeyword. */
  static readonly isUndefinedKeyword: (node: Node | undefined) => node is Expression;
  /** Gets if the node is a VariableDeclaration. */
  static readonly isVariableDeclaration: (node: Node | undefined) => node is VariableDeclaration;
  /** Gets if the node is a VariableDeclarationList. */
  static readonly isVariableDeclarationList: (node: Node | undefined) => node is VariableDeclarationList;
  /** Gets if the node is a VariableStatement. */
  static readonly isVariableStatement: (node: Node | undefined) => node is VariableStatement;
  /** Gets if the node is a VoidExpression. */
  static readonly isVoidExpression: (node: Node | undefined) => node is VoidExpression;
  /** Gets if the node is a WhileStatement. */
  static readonly isWhileStatement: (node: Node | undefined) => node is WhileStatement;
  /** Gets if the node is a WithStatement. */
  static readonly isWithStatement: (node: Node | undefined) => node is WithStatement;
  /** Gets if the node is a YieldExpression. */
  static readonly isYieldExpression: (node: Node | undefined) => node is YieldExpression;
  protected constructor();
  /** Gets the underlying compiler node. */
  get compilerNode(): NodeType;
  /**
   * Releases the node and all its descendants from the underlying node cache and ast.
   *
   * This is useful if you want to improve the performance of manipulation by not tracking this node anymore.
   */
  forget(): void;
  /** Forgets the descendants of this node. */
  forgetDescendants(): void;
  /**
   * Gets if the compiler node was forgotten.
   *
   * This will be true when the compiler node was forgotten or removed.
   */
  wasForgotten(): boolean;
  /** Gets the syntax kind. */
  getKind(): SyntaxKind;
  /** Gets the syntax kind name. */
  getKindName(): string;
  /** Gets the node's flags. */
  getFlags(): ts.NodeFlags;
  /**
   * Prints the node using the compiler's printer.
   * @param options - Options.
   */
  print(options?: PrintNodeOptions): string;
  /** Gets the symbol or throws an error if it doesn't exist. */
  getSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets the compiler symbol or undefined if it doesn't exist. */
  getSymbol(): Symbol | undefined;
  /**
   * Gets the symbols in the scope of the node.
   *
   * Note: This will always return the local symbols. If you want the export symbol from a local symbol, then
   * use the `#getExportSymbol()` method on the symbol.
   * @param meaning - Meaning of symbol to filter by.
   */
  getSymbolsInScope(meaning: SymbolFlags): Symbol[];
  /**
   * Gets the specified local symbol by name or throws if it doesn't exist.
   *
   * WARNING: The symbol table of locals is not exposed publicly by the compiler. Use this at your own risk knowing it may break.
   * @param name - Name of the local symbol.
   */
  getLocalOrThrow(name: string, message?: string | (() => string)): Symbol;
  /**
   * Gets the specified local symbol by name or returns undefined if it doesn't exist.
   *
   * WARNING: The symbol table of locals is not exposed publicly by the compiler. Use this at your own risk knowing it may break.
   * @param name - Name of the local symbol.
   */
  getLocal(name: string): Symbol | undefined;
  /**
   * Gets the symbols within the current scope.
   *
   * WARNING: The symbol table of locals is not exposed publicly by the compiler. Use this at your own risk knowing it may break.
   */
  getLocals(): Symbol[];
  /** Gets the type of the node. */
  getType(): Type;
  /**
   * If the node contains the provided range (inclusive).
   * @param pos - Start position.
   * @param end - End position.
   */
  containsRange(pos: number, end: number): boolean;
  /**
   * Gets if the specified position is within a string.
   * @param pos - Position.
   */
  isInStringAtPos(pos: number): boolean;
  /**
   * Gets the node as the specified kind if it is equal to that kind, otherwise throws.
   * @param kind - Syntax kind.
   */
  asKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Returns if the node is the specified kind.
   *
   * This is a type guard.
   * @param kind - Syntax kind.
   */
  isKind<TKind extends SyntaxKind>(kind: TKind): this is KindToNodeMappings[TKind];
  /**
   * Gets the node as the specified kind if it is equal to that kind, otherwise returns undefined.
   * @param kind - Syntax kind.
   */
  asKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the first child by a condition or throws.
   * @param condition - Condition.
   */
  getFirstChildOrThrow<T extends Node>(condition?: (node: Node) => node is T, message?: string | (() => string)): T;
  /**
   * Gets the first child by a condition or throws.
   * @param condition - Condition.
   */
  getFirstChildOrThrow(condition?: (node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Gets the first child by a condition.
   * @param condition - Condition.
   */
  getFirstChild<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the first child by a condition.
   * @param condition - Condition.
   */
  getFirstChild(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the last child by a condition or throws.
   * @param condition - Condition.
   */
  getLastChildOrThrow<T extends Node>(condition?: (node: Node) => node is T, message?: string | (() => string)): T;
  /**
   * Gets the last child by a condition or throws.
   * @param condition - Condition.
   */
  getLastChildOrThrow(condition?: (node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Gets the last child by a condition.
   * @param condition - Condition.
   */
  getLastChild<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the last child by a condition.
   * @param condition - Condition.
   */
  getLastChild(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the first descendant by a condition or throws.
   * @param condition - Condition.
   */
  getFirstDescendantOrThrow<T extends Node>(condition?: (node: Node) => node is T, message?: string | (() => string)): T;
  /**
   * Gets the first descendant by a condition or throws.
   * @param condition - Condition.
   */
  getFirstDescendantOrThrow(condition?: (node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Gets the first descendant by a condition.
   * @param condition - Condition.
   */
  getFirstDescendant<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the first descendant by a condition.
   * @param condition - Condition.
   */
  getFirstDescendant(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the previous sibling or throws.
   * @param condition - Optional condition for getting the previous sibling.
   */
  getPreviousSiblingOrThrow<T extends Node>(condition?: (node: Node) => node is T, message?: string | (() => string)): T;
  /**
   * Gets the previous sibling or throws.
   * @param condition - Optional condition for getting the previous sibling.
   */
  getPreviousSiblingOrThrow(condition?: (node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Gets the previous sibling.
   * @param condition - Optional condition for getting the previous sibling.
   */
  getPreviousSibling<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the previous sibling.
   * @param condition - Optional condition for getting the previous sibling.
   */
  getPreviousSibling(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the next sibling or throws.
   * @param condition - Optional condition for getting the next sibling.
   */
  getNextSiblingOrThrow<T extends Node>(condition?: (node: Node) => node is T, message?: string | (() => string)): T;
  /**
   * Gets the next sibling or throws.
   * @param condition - Optional condition for getting the next sibling.
   */
  getNextSiblingOrThrow(condition?: (node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Gets the next sibling.
   * @param condition - Optional condition for getting the next sibling.
   */
  getNextSibling<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the next sibling.
   * @param condition - Optional condition for getting the next sibling.
   */
  getNextSibling(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the previous siblings.
   *
   * Note: Closest sibling is the zero index.
   */
  getPreviousSiblings(): Node[];
  /**
   * Gets the next siblings.
   *
   * Note: Closest sibling is the zero index.
   */
  getNextSiblings(): Node[];
  /** Gets all the children of the node. */
  getChildren(): Node[];
  /**
   * Gets the child at the specified index.
   * @param index - Index of the child.
   */
  getChildAtIndex(index: number): Node;
  /** Gets the child syntax list or throws if it doesn't exist. */
  getChildSyntaxListOrThrow(message?: string | (() => string)): SyntaxList;
  /** Gets the child syntax list if it exists. */
  getChildSyntaxList(): SyntaxList | undefined;
  /**
   * Invokes the `cbNode` callback for each child and the `cbNodeArray` for every array of nodes stored in properties of the node.
   * If `cbNodeArray` is not defined, then it will pass every element of the array to `cbNode`.
   * @returns The first truthy value returned by a callback.
   * @param cbNode - Callback invoked for each child.
   * @param cbNodeArray - Callback invoked for each array of nodes.
   */
  forEachChild<T>(cbNode: (node: Node) => T | undefined, cbNodeArray?: (nodes: Node[]) => T | undefined): T | undefined;
  /**
   * Invokes the `cbNode` callback for each descendant and the `cbNodeArray` for every array of nodes stored in properties of the node and descendant nodes.
   * If `cbNodeArray` is not defined, then it will pass every element of the array to `cbNode`.
   *
   * @returns The first truthy value returned by a callback.
   * @remarks There exists a `traversal` object on the second parameter that allows various control of iteration.
   * @param cbNode - Callback invoked for each descendant.
   * @param cbNodeArray - Callback invoked for each array of nodes.
   */
  forEachDescendant<T>(cbNode: (node: Node, traversal: ForEachDescendantTraversalControl) => T | undefined, cbNodeArray?: (nodes: Node[], traversal: ForEachDescendantTraversalControl) => T | undefined): T | undefined;
  /** Gets the child nodes passed to the delegate of `node.forEachChild(child => {})` as an array. */
  forEachChildAsArray(): Node<ts.Node>[];
  /** Gets the descendant nodes passed to the delegate of `node.forEachDescendant(descendant => {})` as an array. */
  forEachDescendantAsArray(): Node<ts.Node>[];
  /** Gets the node's descendants. */
  getDescendants(): Node[];
  /** Gets the node's descendant statements and any arrow function statement-like expressions (ex. returns the expression `5` in `() => 5`). */
  getDescendantStatements(): (Statement | Expression)[];
  /** Gets the number of children the node has. */
  getChildCount(): number;
  /**
   * Gets the child at the provided text position, or undefined if not found.
   * @param pos - Text position to search for.
   */
  getChildAtPos(pos: number): Node | undefined;
  /**
   * Gets the most specific descendant at the provided text position, or undefined if not found.
   * @param pos - Text position to search for.
   */
  getDescendantAtPos(pos: number): Node | undefined;
  /**
   * Gets the most specific descendant at the provided start text position with the specified width, or undefined if not found.
   * @param start - Start text position to search for.
   * @param width - Text length of the node to search for.
   */
  getDescendantAtStartWithWidth(start: number, width: number): Node | undefined;
  /** Gets the source file text position where the node starts that includes the leading trivia (comments and whitespace). */
  getPos(): number;
  /**
   * Gets the source file text position where the node ends.
   *
   * @remarks This does not include the following trivia (comments and whitespace).
   */
  getEnd(): number;
  /**
   * Gets the source file text position where the node starts that does not include the leading trivia (comments and whitespace).
   * @param includeJsDocComments - Whether to include the JS doc comments.
   */
  getStart(includeJsDocComments?: boolean): number;
  /** Gets the source file text position of the end of the last significant token or the start of the source file. */
  getFullStart(): number;
  /** Gets the first source file text position that is not whitespace taking into account comment nodes and a previous node's trailing trivia. */
  getNonWhitespaceStart(): number;
  /**
   * Gets the text length of the node without trivia.
   * @param includeJsDocComments - Whether to include the JS doc comments in the width or not.
   */
  getWidth(includeJsDocComments?: boolean): number;
  /** Gets the text length of the node with trivia. */
  getFullWidth(): number;
  /** Gets the node's leading trivia's text length. */
  getLeadingTriviaWidth(): number;
  /** Gets the text length from the end of the current node to the next significant token or new line. */
  getTrailingTriviaWidth(): number;
  /** Gets the text position of the next significant token or new line. */
  getTrailingTriviaEnd(): number;
  /**
   * Gets the text without leading trivia (comments and whitespace).
   * @param includeJsDocComments - Whether to include the js doc comments when getting the text.
   */
  getText(includeJsDocComments?: boolean): string;
  /**
   * Gets the text without leading trivia (comments and whitespace).
   * @param options - Options for getting the text.
   */
  getText(options: {
        trimLeadingIndentation?: boolean;
        includeJsDocComments?: boolean;
    }): string;
  /** Gets the full text with leading trivia (comments and whitespace). */
  getFullText(): string;
  /** Gets the combined modifier flags. */
  getCombinedModifierFlags(): ts.ModifierFlags;
  /** Gets the source file. */
  getSourceFile(): SourceFile;
  /** Gets the project. */
  getProject(): Project;
  /**
   * Gets a compiler node property wrapped in a Node.
   * @param propertyName - Property name.
   */
  getNodeProperty<KeyType extends keyof LocalNodeType, LocalNodeType extends ts.Node = NodeType>(propertyName: KeyType): NodePropertyToWrappedType<LocalNodeType, KeyType>;
  /** Goes up the tree getting all the parents in ascending order. */
  getAncestors(): Node[];
  /** Get the node's parent. */
  getParent(): Node<ts.Node> | undefined;
  /** Gets the parent or throws an error if it doesn't exist. */
  getParentOrThrow(message?: string | (() => string)): Node<ts.Node>;
  /**
   * Goes up the parents (ancestors) of the node while a condition is true.
   * Throws if the initial parent doesn't match the condition.
   * @param condition - Condition that tests the parent to see if the expression is true.
   */
  getParentWhileOrThrow<T extends Node>(condition: (parent: Node, node: Node) => parent is T, message?: string | (() => string)): T;
  /**
   * Goes up the parents (ancestors) of the node while a condition is true.
   * Throws if the initial parent doesn't match the condition.
   * @param condition - Condition that tests the parent to see if the expression is true.
   */
  getParentWhileOrThrow(condition: (parent: Node, node: Node) => boolean, message?: string | (() => string)): Node;
  /**
   * Goes up the parents (ancestors) of the node while a condition is true.
   * Returns undefined if the initial parent doesn't match the condition.
   * @param condition - Condition that tests the parent to see if the expression is true.
   */
  getParentWhile<T extends Node>(condition: (parent: Node, child: Node) => parent is T): T | undefined;
  /**
   * Goes up the parents (ancestors) of the node while a condition is true.
   * Returns undefined if the initial parent doesn't match the condition.
   * @param condition - Condition that tests the parent to see if the expression is true.
   */
  getParentWhile(condition: (parent: Node, child: Node) => boolean): Node | undefined;
  /**
   * Goes up the parents (ancestors) of the node while the parent is the specified syntax kind.
   * Throws if the initial parent is not the specified syntax kind.
   * @param kind - Syntax kind to check for.
   */
  getParentWhileKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Goes up the parents (ancestors) of the node while the parent is the specified syntax kind.
   * Returns undefined if the initial parent is not the specified syntax kind.
   * @param kind - Syntax kind to check for.
   */
  getParentWhileKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /** Gets the last token of this node. Usually this is a close brace. */
  getLastToken(): Node;
  /** Gets if this node is in a syntax list. */
  isInSyntaxList(): boolean;
  /** Gets the parent if it's a syntax list or throws an error otherwise. */
  getParentSyntaxListOrThrow(message?: string | (() => string)): SyntaxList;
  /** Gets the parent if it's a syntax list. */
  getParentSyntaxList(): SyntaxList | undefined;
  /** Gets the child index of this node relative to the parent. */
  getChildIndex(): number;
  /** Gets the indentation level of the current node. */
  getIndentationLevel(): number;
  /** Gets the child indentation level of the current node. */
  getChildIndentationLevel(): number;
  /**
   * Gets the indentation text.
   * @param offset - Optional number of levels of indentation to add or remove.
   */
  getIndentationText(offset?: number): string;
  /**
   * Gets the next indentation level text.
   * @param offset - Optional number of levels of indentation to add or remove.
   */
  getChildIndentationText(offset?: number): string;
  /**
   * Gets the position of the start of the line that this node starts on.
   * @param includeJsDocComments - Whether to include the JS doc comments or not.
   */
  getStartLinePos(includeJsDocComments?: boolean): number;
  /**
   * Gets the line number at the start of the node.
   * @param includeJsDocComments - Whether to include the JS doc comments or not.
   */
  getStartLineNumber(includeJsDocComments?: boolean): number;
  /** Gets the line number of the end of the node. */
  getEndLineNumber(): number;
  /** Gets if this is the first node on the current line. */
  isFirstNodeOnLine(): boolean;
  /**
   * Replaces the text of the current node with new text.
   *
   * This will forget the current node and return a new node that can be asserted or type guarded to the correct type.
   * @param textOrWriterFunction - Text or writer function to replace with.
   * @returns The new node.
   * @remarks This will replace the text from the `Node#getStart(true)` position (start position with js docs) to `Node#getEnd()`.
   * Use `Node#getText(true)` to get all the text that will be replaced.
   */
  replaceWithText(textOrWriterFunction: string | WriterFunction): Node;
  /**
   * Prepends the specified whitespace to current node.
   * @param textOrWriterFunction - Text or writer function.
   */
  prependWhitespace(textOrWriterFunction: string | WriterFunction): void;
  /**
   * Appends the specified whitespace to current node.
   * @param textOrWriterFunction - Text or writer function.
   */
  appendWhitespace(textOrWriterFunction: string | WriterFunction): void;
  /**
   * Formats the node's text using the internal TypeScript formatting API.
   * @param settings - Format code settings.
   */
  formatText(settings?: FormatCodeSettings): void;
  /**
   * Transforms the node using the compiler api nodes and functions and returns
   * the node that was transformed (experimental).
   *
   * WARNING: This will forget descendants of transformed nodes and potentially this node.
   * @example Increments all the numeric literals in a source file.
   * ```ts
   * sourceFile.transform(traversal => {
   *   const node = traversal.visitChildren(); // recommend always visiting the children first (post order)
   *   if (ts.isNumericLiteral(node))
   *     return ts.createNumericLiteral((parseInt(node.text, 10) + 1).toString());
   *   return node;
   * });
   * ```
   * @example Updates the class declaration node without visiting the children.
   * ```ts
   * const classDec = sourceFile.getClassOrThrow("MyClass");
   * classDec.transform(traversal => {
   *   const node = traversal.currentNode;
   *   return ts.updateClassDeclaration(node, undefined, undefined, ts.createIdentifier("MyUpdatedClass"), undefined, undefined, []);
   * });
   * ```
   */
  transform(visitNode: (traversal: TransformTraversalControl) => ts.Node): Node;
  /** Gets the leading comment ranges of the current node. */
  getLeadingCommentRanges(): CommentRange[];
  /** Gets the trailing comment ranges of the current node. */
  getTrailingCommentRanges(): CommentRange[];
  /**
   * Gets the children based on a kind.
   * @param kind - Syntax kind.
   */
  getChildrenOfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind][];
  /**
   * Gets the first child by syntax kind or throws an error if not found.
   * @param kind - Syntax kind.
   */
  getFirstChildByKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the first child by syntax kind.
   * @param kind - Syntax kind.
   */
  getFirstChildByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the first child if it matches the specified syntax kind or throws an error if not found.
   * @param kind - Syntax kind.
   */
  getFirstChildIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the first child if it matches the specified syntax kind.
   * @param kind - Syntax kind.
   */
  getFirstChildIfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the last child by syntax kind or throws an error if not found.
   * @param kind - Syntax kind.
   */
  getLastChildByKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the last child by syntax kind.
   * @param kind - Syntax kind.
   */
  getLastChildByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the last child if it matches the specified syntax kind or throws an error if not found.
   * @param kind - Syntax kind.
   */
  getLastChildIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the last child if it matches the specified syntax kind.
   * @param kind - Syntax kind.
   */
  getLastChildIfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the child at the specified index if it's the specified kind or throws an exception.
   * @param index - Child index to get.
   * @param kind - Expected kind.
   */
  getChildAtIndexIfKindOrThrow<TKind extends SyntaxKind>(index: number, kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the child at the specified index if it's the specified kind or returns undefined.
   * @param index - Child index to get.
   * @param kind - Expected kind.
   */
  getChildAtIndexIfKind<TKind extends SyntaxKind>(index: number, kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the previous sibiling if it matches the specified kind, or throws.
   * @param kind - Kind to check.
   */
  getPreviousSiblingIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the next sibiling if it matches the specified kind, or throws.
   * @param kind - Kind to check.
   */
  getNextSiblingIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the previous sibling if it matches the specified kind.
   * @param kind - Kind to check.
   */
  getPreviousSiblingIfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the next sibling if it matches the specified kind.
   * @param kind - Kind to check.
   */
  getNextSiblingIfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /** Gets the parent if it matches a certain condition or throws. */
  getParentIfOrThrow<T extends Node>(condition: (parent: Node | undefined, node: Node) => parent is T, message?: string | (() => string)): T;
  /** Gets the parent if it matches a certain condition or throws. */
  getParentIfOrThrow(condition: (parent: Node | undefined, node: Node) => boolean, message?: string | (() => string)): Node;
  /** Gets the parent if it matches a certain condition. */
  getParentIf<T extends Node>(condition: (parent: Node | undefined, node: Node) => parent is T): T | undefined;
  /** Gets the parent if it matches a certain condition. */
  getParentIf(condition: (parent: Node | undefined, node: Node) => boolean): Node | undefined;
  /** Gets the parent if it's a certain syntax kind or throws. */
  getParentIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /** Gets the parent if it's a certain syntax kind. */
  getParentIfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the first ancestor by syntax kind or throws if not found.
   * @param kind - Syntax kind.
   */
  getFirstAncestorByKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Get the first ancestor by syntax kind.
   * @param kind - Syntax kind.
   */
  getFirstAncestorByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets the first ancestor that matches the provided condition or throws if not found.
   * @param condition - Condition to match.
   */
  getFirstAncestorOrThrow<T extends Node>(condition?: (node: Node) => node is T): T;
  /**
   * Gets the first ancestor that matches the provided condition or throws if not found.
   * @param condition - Condition to match.
   */
  getFirstAncestorOrThrow(condition?: (node: Node) => boolean): Node;
  /**
   * Gets the first ancestor that matches the provided condition or returns undefined if not found.
   * @param condition - Condition to match.
   */
  getFirstAncestor<T extends Node>(condition?: (node: Node) => node is T): T | undefined;
  /**
   * Gets the first ancestor that matches the provided condition or returns undefined if not found.
   * @param condition - Condition to match.
   */
  getFirstAncestor(condition?: (node: Node) => boolean): Node | undefined;
  /**
   * Gets the descendants that match a specified syntax kind.
   * @param kind - Kind to check.
   */
  getDescendantsOfKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind][];
  /**
   * Gets the first descendant by syntax kind or throws.
   * @param kind - Syntax kind.
   */
  getFirstDescendantByKindOrThrow<TKind extends SyntaxKind>(kind: TKind, message?: string | (() => string)): KindToNodeMappings[TKind];
  /**
   * Gets the first descendant by syntax kind.
   * @param kind - Syntax kind.
   */
  getFirstDescendantByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappings[TKind] | undefined;
  /**
   * Gets if the node has an expression.
   * @param node - Node to check.
   */
  static hasExpression<T extends Node>(node: T): node is T & {
        getExpression(): Expression;
    };
  /**
   * Gets if the node has a name.
   * @param node - Node to check.
   */
  static hasName<T extends Node>(node: T): node is T & {
        getName(): string;
        getNameNode(): Node;
    };
  /**
   * Gets if the node has a body.
   * @param node - Node to check.
   */
  static hasBody<T extends Node>(node: T): node is T & {
        getBody(): Node;
    };
  /**
   * Gets if the node has a structure.
   * @param node - Node to check.
   */
  static hasStructure<T extends Node>(node: T): node is T & {
        getStructure(): Structures;
    };
  /** Creates a type guard for syntax kinds. */
  static is<TKind extends keyof KindToNodeMappings>(kind: TKind): (node: Node | undefined) => node is KindToNodeMappings[TKind];
  /** Gets if the provided value is a Node. */
  static isNode(value: unknown): value is Node;
  /** Gets if the provided node is a comment node. */
  static isCommentNode(node: Node | undefined): node is CommentStatement | CommentClassElement | CommentTypeElement | CommentObjectLiteralElement | CommentEnumMember;
  /** Gets if the provided node is a CommentStatement. */
  static isCommentStatement(node: Node | undefined): node is CommentStatement;
  /** Gets if the provided node is a CommentClassElement. */
  static isCommentClassElement(node: Node | undefined): node is CommentClassElement;
  /** Gets if the provided value is a CommentTypeElement. */
  static isCommentTypeElement(node: Node | undefined): node is CommentTypeElement;
  /** Gets if the provided node is a CommentObjectLiteralElement. */
  static isCommentObjectLiteralElement(node: Node | undefined): node is CommentObjectLiteralElement;
  /** Gets if the provided node is a CommentEnumMember. */
  static isCommentEnumMember(node: Node | undefined): node is CommentEnumMember;
  /** Gets if the node is an AbstractableNode. */
  static isAbstractable<T extends Node>(node: T | undefined): node is AbstractableNode & AbstractableNodeExtensionType & T;
  /** Gets if the node is an AmbientableNode. */
  static isAmbientable<T extends Node>(node: T | undefined): node is AmbientableNode & AmbientableNodeExtensionType & T;
  /** Gets if the node is an ArgumentedNode. */
  static isArgumented<T extends Node>(node: T | undefined): node is ArgumentedNode & ArgumentedNodeExtensionType & T;
  /** Gets if the node is an ArrayTypeNode. */
  static isArrayTypeNode(node: Node | undefined): node is ArrayTypeNode;
  /** Gets if the node is an AsyncableNode. */
  static isAsyncable<T extends Node>(node: T | undefined): node is AsyncableNode & AsyncableNodeExtensionType & T;
  /** Gets if the node is an AwaitableNode. */
  static isAwaitable<T extends Node>(node: T | undefined): node is AwaitableNode & AwaitableNodeExtensionType & T;
  /** Gets if the node is a BindingNamedNode. */
  static isBindingNamed<T extends Node>(node: T | undefined): node is BindingNamedNode & BindingNamedNodeExtensionType & T;
  /** Gets if the node is a BodiedNode. */
  static isBodied<T extends Node>(node: T | undefined): node is BodiedNode & BodiedNodeExtensionType & T;
  /** Gets if the node is a BodyableNode. */
  static isBodyable<T extends Node>(node: T | undefined): node is BodyableNode & BodyableNodeExtensionType & T;
  /** Gets if the node is a CallSignatureDeclaration. */
  static isCallSignatureDeclaration(node: Node | undefined): node is CallSignatureDeclaration;
  /** Gets if the node is a ChildOrderableNode. */
  static isChildOrderable<T extends Node>(node: T | undefined): node is ChildOrderableNode & ChildOrderableNodeExtensionType & T;
  /** Gets if the node is a ClassLikeDeclarationBase. */
  static isClassLikeDeclarationBase<T extends Node>(node: T | undefined): node is ClassLikeDeclarationBase & ClassLikeDeclarationBaseExtensionType & T;
  /** Gets if the node is a ConditionalTypeNode. */
  static isConditionalTypeNode(node: Node | undefined): node is ConditionalTypeNode;
  /** Gets if the node is a ConstructorDeclaration. */
  static isConstructorDeclaration(node: Node | undefined): node is ConstructorDeclaration;
  /** Gets if the node is a ConstructorTypeNode. */
  static isConstructorTypeNode(node: Node | undefined): node is ConstructorTypeNode;
  /** Gets if the node is a ConstructSignatureDeclaration. */
  static isConstructSignatureDeclaration(node: Node | undefined): node is ConstructSignatureDeclaration;
  /** Gets if the node is a DecoratableNode. */
  static isDecoratable<T extends Node>(node: T | undefined): node is DecoratableNode & DecoratableNodeExtensionType & T;
  /** Gets if the node is a DotDotDotTokenableNode. */
  static isDotDotDotTokenable<T extends Node>(node: T | undefined): node is DotDotDotTokenableNode & DotDotDotTokenableNodeExtensionType & T;
  /** Gets if the node is an ExclamationTokenableNode. */
  static isExclamationTokenable<T extends Node>(node: T | undefined): node is ExclamationTokenableNode & ExclamationTokenableNodeExtensionType & T;
  /** Gets if the node is an ExportableNode. */
  static isExportable<T extends Node>(node: T | undefined): node is ExportableNode & ExportableNodeExtensionType & T;
  /** Gets if the node is an ExportGetableNode. */
  static isExportGetable<T extends Node>(node: T | undefined): node is ExportGetableNode & ExportGetableNodeExtensionType & T;
  /** Gets if the node is an Expression. */
  static isExpression(node: Node | undefined): node is Expression;
  /** Gets if the node is an ExpressionableNode. */
  static isExpressionable<T extends Node>(node: T | undefined): node is ExpressionableNode & ExpressionableNodeExtensionType & T;
  /** Gets if the node is an ExpressionedNode. */
  static isExpressioned<T extends Node>(node: T | undefined): node is ExpressionedNode & ExpressionedNodeExtensionType & T;
  /** Gets if the node is an ExtendsClauseableNode. */
  static isExtendsClauseable<T extends Node>(node: T | undefined): node is ExtendsClauseableNode & ExtendsClauseableNodeExtensionType & T;
  /** Gets if the node is a FalseLiteral. */
  static isFalseLiteral(node: Node | undefined): node is FalseLiteral;
  /** Gets if the node is a FunctionLikeDeclaration. */
  static isFunctionLikeDeclaration<T extends Node>(node: T | undefined): node is FunctionLikeDeclaration & FunctionLikeDeclarationExtensionType & T;
  /** Gets if the node is a FunctionTypeNode. */
  static isFunctionTypeNode(node: Node | undefined): node is FunctionTypeNode;
  /** Gets if the node is a GeneratorableNode. */
  static isGeneratorable<T extends Node>(node: T | undefined): node is GeneratorableNode & GeneratorableNodeExtensionType & T;
  /** Gets if the node is a GetAccessorDeclaration. */
  static isGetAccessorDeclaration(node: Node | undefined): node is GetAccessorDeclaration;
  /** Gets if the node is a HeritageClauseableNode. */
  static isHeritageClauseable<T extends Node>(node: T | undefined): node is HeritageClauseableNode & HeritageClauseableNodeExtensionType & T;
  /** Gets if the node is a ImplementsClauseableNode. */
  static isImplementsClauseable<T extends Node>(node: T | undefined): node is ImplementsClauseableNode & ImplementsClauseableNodeExtensionType & T;
  /** Gets if the node is a ImportAttributeNamedNode. */
  static isImportAttributeNamed<T extends Node>(node: T | undefined): node is ImportAttributeNamedNode & ImportAttributeNamedNodeExtensionType & T;
  /** Gets if the node is a ImportExpression. */
  static isImportExpression(node: Node | undefined): node is ImportExpression;
  /** Gets if the node is a ImportTypeNode. */
  static isImportTypeNode(node: Node | undefined): node is ImportTypeNode;
  /** Gets if the node is a IndexedAccessTypeNode. */
  static isIndexedAccessTypeNode(node: Node | undefined): node is IndexedAccessTypeNode;
  /** Gets if the node is a IndexSignatureDeclaration. */
  static isIndexSignatureDeclaration(node: Node | undefined): node is IndexSignatureDeclaration;
  /** Gets if the node is a InferTypeNode. */
  static isInferTypeNode(node: Node | undefined): node is InferTypeNode;
  /** Gets if the node is a InitializerExpressionableNode. */
  static isInitializerExpressionable<T extends Node>(node: T | undefined): node is InitializerExpressionableNode & InitializerExpressionableNodeExtensionType & T;
  /** Gets if the node is a InitializerExpressionGetableNode. */
  static isInitializerExpressionGetable<T extends Node>(node: T | undefined): node is InitializerExpressionGetableNode & InitializerExpressionGetableNodeExtensionType & T;
  /** Gets if the node is a IntersectionTypeNode. */
  static isIntersectionTypeNode(node: Node | undefined): node is IntersectionTypeNode;
  /** Gets if the node is a IterationStatement. */
  static isIterationStatement(node: Node | undefined): node is IterationStatement;
  /** Gets if the node is a JSDocableNode. */
  static isJSDocable<T extends Node>(node: T | undefined): node is JSDocableNode & JSDocableNodeExtensionType & T;
  /** Gets if the node is a JSDocImportTag. */
  static isJSDocImportTag(node: Node | undefined): node is JSDocImportTag;
  /** Gets if the node is a JSDocPropertyLikeTag. */
  static isJSDocPropertyLikeTag<T extends Node>(node: T | undefined): node is JSDocPropertyLikeTag & JSDocPropertyLikeTagExtensionType & T;
  /** Gets if the node is a JSDocTag. */
  static isJSDocTag(node: Node | undefined): node is JSDocTag;
  /** Gets if the node is a JSDocType. */
  static isJSDocType(node: Node | undefined): node is JSDocType;
  /** Gets if the node is a JSDocTypeExpressionableTag. */
  static isJSDocTypeExpressionableTag<T extends Node>(node: T | undefined): node is JSDocTypeExpressionableTag & JSDocTypeExpressionableTagExtensionType & T;
  /** Gets if the node is a JSDocTypeParameteredTag. */
  static isJSDocTypeParameteredTag<T extends Node>(node: T | undefined): node is JSDocTypeParameteredTag & JSDocTypeParameteredTagExtensionType & T;
  /** Gets if the node is a JSDocUnknownTag. */
  static isJSDocUnknownTag(node: Node | undefined): node is JSDocUnknownTag;
  /** Gets if the node is a JsxAttributedNode. */
  static isJsxAttributed<T extends Node>(node: T | undefined): node is JsxAttributedNode & JsxAttributedNodeExtensionType & T;
  /** Gets if the node is a JsxTagNamedNode. */
  static isJsxTagNamed<T extends Node>(node: T | undefined): node is JsxTagNamedNode & JsxTagNamedNodeExtensionType & T;
  /** Gets if the node is a LeftHandSideExpression. */
  static isLeftHandSideExpression(node: Node | undefined): node is LeftHandSideExpression;
  /** Gets if the node is a LeftHandSideExpressionedNode. */
  static isLeftHandSideExpressioned<T extends Node>(node: T | undefined): node is LeftHandSideExpressionedNode & LeftHandSideExpressionedNodeExtensionType & T;
  /** Gets if the node is a LiteralExpression. */
  static isLiteralExpression(node: Node | undefined): node is LiteralExpression;
  /** Gets if the node is a LiteralLikeNode. */
  static isLiteralLike<T extends Node>(node: T | undefined): node is LiteralLikeNode & LiteralLikeNodeExtensionType & T;
  /** Gets if the node is a LiteralTypeNode. */
  static isLiteralTypeNode(node: Node | undefined): node is LiteralTypeNode;
  /** Gets if the node is a MappedTypeNode. */
  static isMappedTypeNode(node: Node | undefined): node is MappedTypeNode;
  /** Gets if the node is a MemberExpression. */
  static isMemberExpression(node: Node | undefined): node is MemberExpression;
  /** Gets if the node is a ModifierableNode. */
  static isModifierable<T extends Node>(node: T | undefined): node is ModifierableNode & ModifierableNodeExtensionType & T;
  /** Gets if the node is a ModuleChildableNode. */
  static isModuleChildable<T extends Node>(node: T | undefined): node is ModuleChildableNode & ModuleChildableNodeExtensionType & T;
  /** Gets if the node is a ModuledNode. */
  static isModuled<T extends Node>(node: T | undefined): node is ModuledNode & ModuledNodeExtensionType & T;
  /** Gets if the node is a ModuleNamedNode. */
  static isModuleNamed<T extends Node>(node: T | undefined): node is ModuleNamedNode & ModuleNamedNodeExtensionType & T;
  /** Gets if the node is a NameableNode. */
  static isNameable<T extends Node>(node: T | undefined): node is NameableNode & NameableNodeExtensionType & T;
  /** Gets if the node is a NamedNode. */
  static isNamed<T extends Node>(node: T | undefined): node is NamedNode & NamedNodeExtensionType & T;
  /** Gets if the node is a NodeWithTypeArguments. */
  static isNodeWithTypeArguments(node: Node | undefined): node is NodeWithTypeArguments;
  /** Gets if the node is a NullLiteral. */
  static isNullLiteral(node: Node | undefined): node is NullLiteral;
  /** Gets if the node is a OptionalTypeNode. */
  static isOptionalTypeNode(node: Node | undefined): node is OptionalTypeNode;
  /** Gets if the node is a OverloadableNode. */
  static isOverloadable<T extends Node>(node: T | undefined): node is OverloadableNode & OverloadableNodeExtensionType & T;
  /** Gets if the node is a OverrideableNode. */
  static isOverrideable<T extends Node>(node: T | undefined): node is OverrideableNode & OverrideableNodeExtensionType & T;
  /** Gets if the node is a ParameterDeclaration. */
  static isParameterDeclaration(node: Node | undefined): node is ParameterDeclaration;
  /** Gets if the node is a ParameteredNode. */
  static isParametered<T extends Node>(node: T | undefined): node is ParameteredNode & ParameteredNodeExtensionType & T;
  /** Gets if the node is a ParenthesizedTypeNode. */
  static isParenthesizedTypeNode(node: Node | undefined): node is ParenthesizedTypeNode;
  /** Gets if the node is a PrimaryExpression. */
  static isPrimaryExpression(node: Node | undefined): node is PrimaryExpression;
  /** Gets if the node is a PropertyNamedNode. */
  static isPropertyNamed<T extends Node>(node: T | undefined): node is PropertyNamedNode & PropertyNamedNodeExtensionType & T;
  /** Gets if the node is a QuestionDotTokenableNode. */
  static isQuestionDotTokenable<T extends Node>(node: T | undefined): node is QuestionDotTokenableNode & QuestionDotTokenableNodeExtensionType & T;
  /** Gets if the node is a QuestionTokenableNode. */
  static isQuestionTokenable<T extends Node>(node: T | undefined): node is QuestionTokenableNode & QuestionTokenableNodeExtensionType & T;
  /** Gets if the node is a ReadonlyableNode. */
  static isReadonlyable<T extends Node>(node: T | undefined): node is ReadonlyableNode & ReadonlyableNodeExtensionType & T;
  /** Gets if the node is a ReferenceFindableNode. */
  static isReferenceFindable<T extends Node>(node: T | undefined): node is ReferenceFindableNode & ReferenceFindableNodeExtensionType & T;
  /** Gets if the node is a RenameableNode. */
  static isRenameable<T extends Node>(node: T | undefined): node is RenameableNode & RenameableNodeExtensionType & T;
  /** Gets if the node is a RestTypeNode. */
  static isRestTypeNode(node: Node | undefined): node is RestTypeNode;
  /** Gets if the node is a ReturnTypedNode. */
  static isReturnTyped<T extends Node>(node: T | undefined): node is ReturnTypedNode & ReturnTypedNodeExtensionType & T;
  /** Gets if the node is a ScopeableNode. */
  static isScopeable<T extends Node>(node: T | undefined): node is ScopeableNode & ScopeableNodeExtensionType & T;
  /** Gets if the node is a ScopedNode. */
  static isScoped<T extends Node>(node: T | undefined): node is ScopedNode & ScopedNodeExtensionType & T;
  /** Gets if the node is a SetAccessorDeclaration. */
  static isSetAccessorDeclaration(node: Node | undefined): node is SetAccessorDeclaration;
  /** Gets if the node is a SignaturedDeclaration. */
  static isSignaturedDeclaration<T extends Node>(node: T | undefined): node is SignaturedDeclaration & SignaturedDeclarationExtensionType & T;
  /** Gets if the node is a Statement. */
  static isStatement(node: Node | undefined): node is Statement;
  /** Gets if the node is a StatementedNode. */
  static isStatemented<T extends Node>(node: T | undefined): node is StatementedNode & StatementedNodeExtensionType & T;
  /** Gets if the node is a StaticableNode. */
  static isStaticable<T extends Node>(node: T | undefined): node is StaticableNode & StaticableNodeExtensionType & T;
  /** Gets if the node is a SuperExpression. */
  static isSuperExpression(node: Node | undefined): node is SuperExpression;
  /** Gets if the node is a TemplateLiteralTypeNode. */
  static isTemplateLiteralTypeNode(node: Node | undefined): node is TemplateLiteralTypeNode;
  /** Gets if the node is a TextInsertableNode. */
  static isTextInsertable<T extends Node>(node: T | undefined): node is TextInsertableNode & TextInsertableNodeExtensionType & T;
  /** Gets if the node is a ThisExpression. */
  static isThisExpression(node: Node | undefined): node is ThisExpression;
  /** Gets if the node is a ThisTypeNode. */
  static isThisTypeNode(node: Node | undefined): node is ThisTypeNode;
  /** Gets if the node is a TrueLiteral. */
  static isTrueLiteral(node: Node | undefined): node is TrueLiteral;
  /** Gets if the node is a TupleTypeNode. */
  static isTupleTypeNode(node: Node | undefined): node is TupleTypeNode;
  /** Gets if the node is a TypeArgumentedNode. */
  static isTypeArgumented<T extends Node>(node: T | undefined): node is TypeArgumentedNode & TypeArgumentedNodeExtensionType & T;
  /** Gets if the node is a TypeAssertion. */
  static isTypeAssertion(node: Node | undefined): node is TypeAssertion;
  /** Gets if the node is a TypedNode. */
  static isTyped<T extends Node>(node: T | undefined): node is TypedNode & TypedNodeExtensionType & T;
  /** Gets if the node is a TypeElement. */
  static isTypeElement(node: Node | undefined): node is TypeElement;
  /** Gets if the node is a TypeElementMemberedNode. */
  static isTypeElementMembered<T extends Node>(node: T | undefined): node is TypeElementMemberedNode & TypeElementMemberedNodeExtensionType & T;
  /** Gets if the node is a TypeLiteralNode. */
  static isTypeLiteral(node: Node | undefined): node is TypeLiteralNode;
  /** Gets if the node is a TypeNode. */
  static isTypeNode(node: Node | undefined): node is TypeNode;
  /** Gets if the node is a TypeOperatorTypeNode. */
  static isTypeOperatorTypeNode(node: Node | undefined): node is TypeOperatorTypeNode;
  /** Gets if the node is a TypeParameterDeclaration. */
  static isTypeParameterDeclaration(node: Node | undefined): node is TypeParameterDeclaration;
  /** Gets if the node is a TypeParameteredNode. */
  static isTypeParametered<T extends Node>(node: T | undefined): node is TypeParameteredNode & TypeParameteredNodeExtensionType & T;
  /** Gets if the node is a TypePredicateNode. */
  static isTypePredicate(node: Node | undefined): node is TypePredicateNode;
  /** Gets if the node is a TypeQueryNode. */
  static isTypeQuery(node: Node | undefined): node is TypeQueryNode;
  /** Gets if the node is a TypeReferenceNode. */
  static isTypeReference(node: Node | undefined): node is TypeReferenceNode;
  /** Gets if the node is a UnaryExpression. */
  static isUnaryExpression(node: Node | undefined): node is UnaryExpression;
  /** Gets if the node is a UnaryExpressionedNode. */
  static isUnaryExpressioned<T extends Node>(node: T | undefined): node is UnaryExpressionedNode & UnaryExpressionedNodeExtensionType & T;
  /** Gets if the node is a UnionTypeNode. */
  static isUnionTypeNode(node: Node | undefined): node is UnionTypeNode;
  /** Gets if the node is a UnwrappableNode. */
  static isUnwrappable<T extends Node>(node: T | undefined): node is UnwrappableNode & UnwrappableNodeExtensionType & T;
  /** Gets if the node is a UpdateExpression. */
  static isUpdateExpression(node: Node | undefined): node is UpdateExpression;
}

export declare enum Scope {
  Public = "public",
  Protected = "protected",
  Private = "private"
}

export declare class SyntaxList extends Node<ts.SyntaxList> {
  /**
   * Adds text at the end of the current children.
   * @param textOrWriterFunction - Text to add or function that provides a writer to write with.
   * @returns The children that were added.
   */
  addChildText(textOrWriterFunction: string | WriterFunction | ReadonlyArray<string | WriterFunction>): Node<ts.Node>[];
  /**
   * Inserts text at the specified child index.
   * @param index - Child index to insert at.
   * @param textOrWriterFunction - Text to insert or function that provides a writer to write with.
   * @returns The children that were inserted.
   */
  insertChildText(index: number, textOrWriterFunction: string | WriterFunction | ReadonlyArray<string | WriterFunction>): Node<ts.Node>[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SyntaxList>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SyntaxList>>;
}

export declare class TextRange<TRange extends ts.TextRange = ts.TextRange> {
  #private;
  protected constructor();
  /** Gets the underlying compiler object. */
  get compilerObject(): TRange;
  /** Gets the source file of the text range. */
  getSourceFile(): SourceFile;
  /** Gets the position. */
  getPos(): number;
  /** Gets the end. */
  getEnd(): number;
  /** Gets the width of the text range. */
  getWidth(): number;
  /** Gets the text of the text range. */
  getText(): string;
  /**
   * Gets if the text range was forgotten.
   *
   * This will be true after any manipulations have occured to the source file this text range was generated from.
   */
  wasForgotten(): boolean;
}

export interface ForEachDescendantTraversalControl {
  /** Stops traversal. */
  stop(): void;
  /** Skips traversal of the current node's descendants. */
  skip(): void;
  /** Skips traversal of the current node, siblings, and all their descendants. */
  up(): void;
}

export interface TransformTraversalControl {
  /** Factory to create nodes with. */
  factory: ts.NodeFactory;
  /**
   * The node currently being transformed.
   * @remarks Use the result of `.visitChildren()` instead before transforming if visiting the children.
   */
  currentNode: ts.Node;
  /** Visits the children of the current node and returns a new node for the current node. */
  visitChildren(): ts.Node;
}

export type CompilerNodeToWrappedType<T extends ts.Node> = T extends ts.ObjectDestructuringAssignment ? ObjectDestructuringAssignment : T extends ts.ArrayDestructuringAssignment ? ArrayDestructuringAssignment : T extends ts.SuperElementAccessExpression ? SuperElementAccessExpression : T extends ts.SuperPropertyAccessExpression ? SuperPropertyAccessExpression : T extends ts.AssignmentExpression<infer U> ? AssignmentExpression<ts.AssignmentExpression<U>> : T["kind"] extends keyof ImplementedKindToNodeMappings ? ImplementedKindToNodeMappings[T["kind"]] : T extends ts.SyntaxList ? SyntaxList : T extends ts.JSDocTypeExpression ? JSDocTypeExpression : T extends ts.JSDocType ? JSDocType : T extends ts.NodeWithTypeArguments ? NodeWithTypeArguments : T extends ts.TypeNode ? TypeNode : T extends ts.JSDocTag ? JSDocTag : T extends ts.LiteralExpression ? LiteralExpression : T extends ts.PrimaryExpression ? PrimaryExpression : T extends ts.MemberExpression ? MemberExpression : T extends ts.LeftHandSideExpression ? LeftHandSideExpression : T extends ts.UpdateExpression ? UpdateExpression : T extends ts.UnaryExpression ? UnaryExpression : T extends ts.Expression ? Expression : T extends ts.IterationStatement ? IterationStatement : T extends CompilerCommentStatement ? CommentStatement : T extends CompilerCommentClassElement ? CommentClassElement : T extends CompilerCommentTypeElement ? CommentTypeElement : T extends CompilerCommentObjectLiteralElement ? CommentObjectLiteralElement : T extends CompilerCommentEnumMember ? CommentEnumMember : T extends ts.TypeElement ? TypeElement : T extends ts.Statement ? Statement : T extends ts.ClassElement ? ClassElement : T extends ts.ObjectLiteralElement ? ObjectLiteralElement : Node<T>;
declare const DecoratorBase: Constructor<LeftHandSideExpressionedNode> & typeof Node;

export declare class Decorator extends DecoratorBase<ts.Decorator> {
  private _getInnerExpression;
  /** Gets the decorator name. */
  getName(): string;
  /** Gets the name node of the decorator. */
  getNameNode(): Identifier;
  /** Gets the full decorator name. */
  getFullName(): string;
  /** Gets if the decorator is a decorator factory. */
  isDecoratorFactory(): boolean;
  /**
   * Set if this decorator is a decorator factory.
   * @param isDecoratorFactory - If it should be a decorator factory or not.
   */
  setIsDecoratorFactory(isDecoratorFactory: boolean): this;
  /** Gets the call expression if a decorator factory, or throws. */
  getCallExpressionOrThrow(message?: string | (() => string)): CallExpression;
  /** Gets the call expression if a decorator factory. */
  getCallExpression(): CallExpression | undefined;
  /** Gets the decorator's arguments from its call expression. */
  getArguments(): Node[];
  /** Gets the decorator's type arguments from its call expression. */
  getTypeArguments(): TypeNode[];
  /**
   * Adds a type argument.
   * @param argumentTexts - Argument text.
   */
  addTypeArgument(argumentText: string): TypeNode<ts.TypeNode>;
  /**
   * Adds type arguments.
   * @param argumentTexts - Argument texts.
   */
  addTypeArguments(argumentTexts: ReadonlyArray<string>): TypeNode<ts.TypeNode>[];
  /**
   * Inserts a type argument.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument text.
   */
  insertTypeArgument(index: number, argumentText: string): TypeNode<ts.TypeNode>;
  /**
   * Inserts type arguments.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument texts.
   */
  insertTypeArguments(index: number, argumentTexts: ReadonlyArray<string>): TypeNode<ts.TypeNode>[];
  /**
   * Removes a type argument.
   * @param typeArg - Type argument to remove.
   */
  removeTypeArgument(typeArg: Node): this;
  /**
   * Removes a type argument.
   * @param index - Index to remove.
   */
  removeTypeArgument(index: number): this;
  /**
   * Adds an argument.
   * @param argumentTexts - Argument text.
   */
  addArgument(argumentText: string | WriterFunction): Node<ts.Node>;
  /**
   * Adds arguments.
   * @param argumentTexts - Argument texts.
   */
  addArguments(argumentTexts: ReadonlyArray<string | WriterFunction> | WriterFunction): Node<ts.Node>[];
  /**
   * Inserts an argument.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument text.
   */
  insertArgument(index: number, argumentText: string | WriterFunction): Node<ts.Node>;
  /**
   * Inserts arguments.
   * @param index - Child index to insert at.
   * @param argumentTexts - Argument texts.
   */
  insertArguments(index: number, argumentTexts: ReadonlyArray<string | WriterFunction> | WriterFunction): Node<ts.Node>[];
  /**
   * Removes an argument based on the node.
   * @param node - Argument's node to remove.
   */
  removeArgument(node: Node): this;
  /**
   * Removes an argument based on the specified index.
   * @param index - Index to remove.
   */
  removeArgument(index: number): this;
  /** Removes this decorator. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<DecoratorStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): DecoratorStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.Decorator>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.Decorator>>;
}

export declare function JSDocPropertyLikeTag<T extends Constructor<JSDocPropertyLikeTagExtensionType>>(Base: T): Constructor<JSDocPropertyLikeTag> & T;

export interface JSDocPropertyLikeTag {
  /** Gets the type expression node of the JS doc tag if it exists. */
  getTypeExpression(): JSDocTypeExpression | undefined;
  /** Gets the type expression node of the JS doc tag or throws if it doesn't exist. */
  getTypeExpressionOrThrow(message?: string | (() => string)): JSDocTypeExpression;
  /** Gets the name of the JS doc property like tag. */
  getName(): string;
  /** Gets the name node of the JS doc property like tag. */
  getNameNode(): EntityName;
  /** Checks if the JS doc property like tag is bracketed. */
  isBracketed(): boolean;
}

type JSDocPropertyLikeTagExtensionType = Node<ts.JSDocPropertyLikeTag> & JSDocTag;
export declare function JSDocTypeExpressionableTag<T extends Constructor<JSDocTypeExpressionableTagExtensionType>>(Base: T): Constructor<JSDocTypeExpressionableTag> & T;

export interface JSDocTypeExpressionableTag {
  /** Gets the type expression node of the JS doc tag if it exists. */
  getTypeExpression(): JSDocTypeExpression | undefined;
  /** Gets the type expression node of the JS doc tag or throws if it doesn't exist. */
  getTypeExpressionOrThrow(message?: string | (() => string)): JSDocTypeExpression;
}

type JSDocTypeExpressionableTagExtensionType = Node<ts.Node & {
      typeExpression: ts.JSDocTypeExpression | undefined;
  }> & JSDocTag;
export declare function JSDocTypeParameteredTag<T extends Constructor<JSDocTypeParameteredTagExtensionType>>(Base: T): Constructor<JSDocTypeParameteredTag> & T;

export interface JSDocTypeParameteredTag {
  /** Gets the type parameters. */
  getTypeParameters(): TypeParameterDeclaration[];
}

type JSDocTypeParameteredTagExtensionType = Node<ts.Node & {
      typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>;
  }> & JSDocTag;
declare const JSDocBase: typeof Node;

/** JS doc node. */
export declare class JSDoc extends JSDocBase<ts.JSDoc> {
  /** Gets if this JS doc spans multiple lines. */
  isMultiLine(): boolean;
  /** Gets the tags of the JSDoc. */
  getTags(): JSDocTag[];
  /** Gets the JSDoc's text without the surrounding slashes and stars. */
  getInnerText(): string;
  /** Gets the comment property. Use `#getCommentText()` to get the text of the JS doc comment if necessary. */
  getComment(): string | (JSDocText | JSDocLink | JSDocLinkCode | JSDocLinkPlain | undefined)[] | undefined;
  /** Gets the text of the JS doc comment. */
  getCommentText(): string | undefined;
  /**
   * Gets the description from the JS doc comment.
   * @remarks This will contain a leading newline if the jsdoc is multi-line.
   */
  getDescription(): string;
  /**
   * Sets the description.
   * @param textOrWriterFunction - Text or writer function to set.
   */
  setDescription(textOrWriterFunction: string | WriterFunction): this;
  /**
   * Adds a JS doc tag.
   * @param structure - Tag structure to add.
   */
  addTag(structure: OptionalKind<JSDocTagStructure>): JSDocTag<ts.JSDocTag>;
  /**
   * Adds JS doc tags.
   * @param structures - Tag structures to add.
   */
  addTags(structures: ReadonlyArray<OptionalKind<JSDocTagStructure>>): JSDocTag<ts.JSDocTag>[];
  /**
   * Inserts a JS doc tag at the specified index.
   * @param index - Index to insert at.
   * @param structure - Tag structure to insert.
   */
  insertTag(index: number, structure: OptionalKind<JSDocTagStructure>): JSDocTag<ts.JSDocTag>;
  /**
   * Inserts JS doc tags at the specified index.
   * @param index - Index to insert at.
   * @param structures - Tag structures to insert.
   */
  insertTags(index: number, structures: ReadonlyArray<OptionalKind<JSDocTagStructure>>): JSDocTag<ts.JSDocTag>[];
  /** Removes this JSDoc. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<JSDocStructure>): Node<ts.Node>;
  /** Gets the structure equivalent to this node. */
  getStructure(): JSDocStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDoc>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDoc>>;
}

/** JS doc all type. */
export declare class JSDocAllType extends JSDocType<ts.JSDocAllType> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocAllType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocAllType>>;
}

/** JS doc augments tag node. */
export declare class JSDocAugmentsTag extends JSDocTag<ts.JSDocAugmentsTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocAugmentsTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocAugmentsTag>>;
}

/** JS doc author tag node. */
export declare class JSDocAuthorTag extends JSDocTag<ts.JSDocAuthorTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocAuthorTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocAuthorTag>>;
}

/** JS doc callback tag node. */
export declare class JSDocCallbackTag extends JSDocTag<ts.JSDocCallbackTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocCallbackTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocCallbackTag>>;
}

/** JS doc class tag node. */
export declare class JSDocClassTag extends JSDocTag<ts.JSDocClassTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocClassTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocClassTag>>;
}

/** JS doc deprecated tag node. */
export declare class JSDocDeprecatedTag extends JSDocTag<ts.JSDocDeprecatedTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocDeprecatedTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocDeprecatedTag>>;
}

/** JS doc enum tag node. */
export declare class JSDocEnumTag extends JSDocTag<ts.JSDocEnumTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocEnumTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocEnumTag>>;
}

declare const JSDocFunctionTypeBase: Constructor<SignaturedDeclaration> & typeof JSDocType;

/** JS doc function type. */
export declare class JSDocFunctionType extends JSDocFunctionTypeBase<ts.JSDocFunctionType> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocFunctionType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocFunctionType>>;
}

/** JS doc implements tag node. */
export declare class JSDocImplementsTag extends JSDocTag<ts.JSDocImplementsTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocImplementsTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocImplementsTag>>;
}

/** JS doc import tag node. */
export declare class JSDocImportTag extends JSDocTag<ts.JSDocImportTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocImportTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocImportTag>>;
}

/** JS doc link node. */
export declare class JSDocLink extends Node<ts.JSDocLink> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocLink>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocLink>>;
}

/** JS doc link code node. */
export declare class JSDocLinkCode extends Node<ts.JSDocLinkCode> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocLinkCode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocLinkCode>>;
}

/** JS doc link plain node. */
export declare class JSDocLinkPlain extends Node<ts.JSDocLinkPlain> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocLinkPlain>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocLinkPlain>>;
}

/** JS doc member name node. */
export declare class JSDocMemberName extends Node<ts.JSDocMemberName> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocMemberName>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocMemberName>>;
}

/** JS doc namepath type. */
export declare class JSDocNamepathType extends JSDocType<ts.JSDocNamepathType> {
  /** Gets the type node of the JS doc namepath node. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocNamepathType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocNamepathType>>;
}

/** JS doc name reference. */
export declare class JSDocNameReference extends Node<ts.JSDocNameReference> {
  /** Gets the name of the JS doc name reference. */
  getName(): Identifier | QualifiedName | JSDocMemberName;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocNameReference>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocNameReference>>;
}

/** JS doc non-nullable type. */
export declare class JSDocNonNullableType extends JSDocType<ts.JSDocNonNullableType> {
  /** Gets the type node of the JS doc non-nullable type node. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  isPostfix(): boolean;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocNonNullableType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocNonNullableType>>;
}

/** JS doc nullable type. */
export declare class JSDocNullableType extends JSDocType<ts.JSDocNullableType> {
  /** Gets the type node of the JS doc nullable type node. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  isPostfix(): boolean;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocNullableType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocNullableType>>;
}

/** JS doc optional type. */
export declare class JSDocOptionalType extends JSDocType<ts.JSDocOptionalType> {
  /** Gets the type node of the JS doc optional type node. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocOptionalType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOptionalType>>;
}

declare const JSDocOverloadTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc overload tag. */
export declare class JSDocOverloadTag extends JSDocOverloadTagBase<ts.JSDocOverloadTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocOverloadTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOverloadTag>>;
}

/** JS doc override tag node. */
export declare class JSDocOverrideTag extends JSDocTag<ts.JSDocOverrideTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocOverrideTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocOverrideTag>>;
}

declare const JSDocParameterTagBase: Constructor<JSDocPropertyLikeTag> & typeof JSDocTag;

/** JS doc parameter tag node. */
export declare class JSDocParameterTag extends JSDocParameterTagBase<ts.JSDocParameterTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocParameterTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocParameterTag>>;
}

/** JS doc private tag node. */
export declare class JSDocPrivateTag extends JSDocTag<ts.JSDocPrivateTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocPrivateTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocPrivateTag>>;
}

declare const JSDocPropertyTagBase: Constructor<JSDocPropertyLikeTag> & typeof JSDocTag;

/** JS doc property tag node. */
export declare class JSDocPropertyTag extends JSDocPropertyTagBase<ts.JSDocPropertyTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocPropertyTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocPropertyTag>>;
}

/** JS doc protected tag node. */
export declare class JSDocProtectedTag extends JSDocTag<ts.JSDocProtectedTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocProtectedTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocProtectedTag>>;
}

/** JS doc public tag node. */
export declare class JSDocPublicTag extends JSDocTag<ts.JSDocPublicTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocPublicTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocPublicTag>>;
}

/** JS doc readonly tag node. */
export declare class JSDocReadonlyTag extends JSDocTag<ts.JSDocReadonlyTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocReadonlyTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocReadonlyTag>>;
}

declare const JSDocReturnTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc return tag node. */
export declare class JSDocReturnTag extends JSDocReturnTagBase<ts.JSDocReturnTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocReturnTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocReturnTag>>;
}

declare const JSDocSatisfiesTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc satifiest tag. */
export declare class JSDocSatisfiesTag extends JSDocSatisfiesTagBase<ts.JSDocSatisfiesTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocSatisfiesTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocSatisfiesTag>>;
}

declare const JSDocSeeTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc "see" tag node. */
export declare class JSDocSeeTag extends JSDocSeeTagBase<ts.JSDocSeeTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocSeeTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocSeeTag>>;
}

/** JS doc signature node. */
export declare class JSDocSignature extends JSDocType<ts.JSDocSignature> {
  /** Gets the type node of the JS doc signature. */
  getTypeNode(): JSDocReturnTag | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocSignature>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocSignature>>;
}

declare const JSDocTagBase: typeof Node;

/** JS doc tag node. */
export declare class JSDocTag<NodeType extends ts.JSDocTag = ts.JSDocTag> extends JSDocTagBase<NodeType> {
  /** Gets the tag's name as a string (ex. returns `"param"` for `&#64;param`). */
  getTagName(): string;
  /** Gets the tag name node (ex. Returns the `param` identifier for `&#64;param`). */
  getTagNameNode(): Identifier;
  /**
   * Sets the tag name.
   * @param tagName - The new name to use.
   * @returns The current node or new node if the node kind changed.
   * @remarks This will forget the current node if the JSDocTag kind changes. Use the return value if you're changing the kind.
   */
  setTagName(tagName: string): Node<ts.Node>;
  /** Gets the tag's comment property. Use `#getCommentText()` to get the text of the JS doc tag comment if necessary. */
  getComment(): string | (JSDocText | JSDocLink | JSDocLinkCode | JSDocLinkPlain | undefined)[] | undefined;
  /** Gets the text of the JS doc tag comment (ex. `"Some description."` for `&#64;param value Some description.`). */
  getCommentText(): string | undefined;
  /** Removes the JS doc comment. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   * @returns The node or the node that replaced the existing node (ex. when changing from a JSDocParameterTag to something else).
   */
  set(structure: Partial<JSDocTagStructure>): Node<ts.Node>;
  /** @inheritdoc */
  replaceWithText(textOrWriterFunction: string | WriterFunction): Node;
  /** Gets a structure that represents this JS doc tag node. */
  getStructure(): JSDocTagStructure;
}

/** JS doc tag info. */
export declare class JSDocTagInfo {
  #private;
  private constructor();
  /** Gets the compiler JS doc tag info. */
  get compilerObject(): ts.JSDocTagInfo;
  /** Gets the name. */
  getName(): string;
  /** Gets the text. */
  getText(): ts.SymbolDisplayPart[];
}

declare const JSDocTemplateTagBase: Constructor<JSDocTypeParameteredTag> & typeof JSDocTag;

/** JS doc template tag node. */
export declare class JSDocTemplateTag extends JSDocTemplateTagBase<ts.JSDocTemplateTag> {
  /** Gets the template tag's constraint if it exists or returns undefined. */
  getConstraint(): JSDocTypeExpression | undefined;
  /** Gets the template tag's constraint if it exists or throws otherwise. */
  getConstraintOrThrow(message?: string | (() => string)): JSDocTypeExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocTemplateTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocTemplateTag>>;
}

/** JS doc text node. */
export declare class JSDocText extends Node<ts.JSDocText> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocText>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocText>>;
}

declare const JSDocThisTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc "this" tag node. */
export declare class JSDocThisTag extends JSDocThisTagBase<ts.JSDocThisTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocThisTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocThisTag>>;
}

declare const JSDocThrowsTagBase: Constructor<JSDocTypeExpressionableTag> & typeof JSDocTag;

/** JS doc return tag node. */
export declare class JSDocThrowsTag extends JSDocThrowsTagBase<ts.JSDocThrowsTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocThrowsTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocThrowsTag>>;
}

/** JS doc type node. */
export declare class JSDocType<T extends ts.JSDocType = ts.JSDocType> extends TypeNode<T> {
}

/** JS doc type def tag node. */
export declare class JSDocTypedefTag extends JSDocTag<ts.JSDocTypedefTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocTypedefTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocTypedefTag>>;
}

/** JS doc type expression node. */
export declare class JSDocTypeExpression extends TypeNode<ts.JSDocTypeExpression> {
  /** Gets the type node of the JS doc type expression. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocTypeExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocTypeExpression>>;
}

/** JS doc type literal. */
export declare class JSDocTypeLiteral extends JSDocType<ts.JSDocTypeLiteral> {
  /** Gets if it's an array type. */
  isArrayType(): boolean;
  /** Gets the JS doc property tags if they exist. */
  getPropertyTags(): JSDocTag<ts.JSDocTag>[] | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocTypeLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocTypeLiteral>>;
}

/** JS doc type tag node. */
export declare class JSDocTypeTag extends JSDocTag<ts.JSDocTypeTag> {
  /** Gets the type expression node of the JS doc property type tag. */
  getTypeExpression(): JSDocTypeExpression | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocTypeTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocTypeTag>>;
}

/** JS doc unknown tag node. */
export declare class JSDocUnknownTag extends JSDocTag<ts.JSDocUnknownTag> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocUnknownTag>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocUnknownTag>>;
}

/** JS doc unknown type. */
export declare class JSDocUnknownType extends JSDocType<ts.JSDocUnknownType> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocUnknownType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocUnknownType>>;
}

/** JS doc variadic type. */
export declare class JSDocVariadicType extends JSDocType<ts.JSDocVariadicType> {
  /** Gets the type node of the JS doc variadic type node. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JSDocVariadicType>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JSDocVariadicType>>;
}

export declare class CommentEnumMember extends Node<CompilerCommentEnumMember> {
  /** Removes this enum member comment. */
  remove(): void;
}

declare const EnumDeclarationBase: Constructor<TextInsertableNode> & Constructor<ModuleChildableNode> & Constructor<JSDocableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & Constructor<NamedNode> & typeof Statement;

export declare class EnumDeclaration extends EnumDeclarationBase<ts.EnumDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<EnumDeclarationStructure>): this;
  /**
   * Adds a member to the enum.
   * @param structure - Structure of the enum.
   */
  addMember(structure: OptionalKind<EnumMemberStructure>): EnumMember;
  /**
   * Adds a member to the enum.
   * @param structure - Structure of the enum.
   */
  addMember(structure: OptionalKind<EnumMemberStructure> | WriterFunction | string): EnumMember | CommentEnumMember;
  /**
   * Adds members to the enum.
   * @param structures - Structures of the enums.
   */
  addMembers(structures: ReadonlyArray<OptionalKind<EnumMemberStructure>>): EnumMember[];
  /**
   * Adds members to the enum.
   * @param structures - Structures of the enums.
   */
  addMembers(structures: ReadonlyArray<OptionalKind<EnumMemberStructure> | WriterFunction | string> | string | WriterFunction): (EnumMember | CommentEnumMember)[];
  /**
   * Inserts a member to the enum.
   * @param index - Child index to insert at.
   * @param structure - Structure of the enum.
   */
  insertMember(index: number, structure: OptionalKind<EnumMemberStructure>): EnumMember;
  /**
   * Inserts a member to the enum.
   * @param index - Child index to insert at.
   * @param structure - Structure of the enum.
   */
  insertMember(index: number, structure: OptionalKind<EnumMemberStructure> | WriterFunction | string): EnumMember | CommentEnumMember;
  /**
   * Inserts members to an enum.
   * @param index - Child index to insert at.
   * @param structures - Structures of the enums.
   */
  insertMembers(index: number, structures: ReadonlyArray<OptionalKind<EnumMemberStructure>>): EnumMember[];
  /**
   * Inserts members to an enum.
   * @param index - Child index to insert at.
   * @param structures - Structures of the enums.
   */
  insertMembers(index: number, structures: ReadonlyArray<OptionalKind<EnumMemberStructure> | WriterFunction | string> | WriterFunction | string): (EnumMember | CommentEnumMember)[];
  /**
   * Gets an enum member.
   * @param name - Name of the member.
   */
  getMember(name: string): EnumMember | undefined;
  /**
   * Gets an enum member.
   * @param findFunction - Function to use to find the member.
   */
  getMember(findFunction: (declaration: EnumMember) => boolean): EnumMember | undefined;
  /**
   * Gets an enum member or throws if not found.
   * @param name - Name of the member.
   */
  getMemberOrThrow(name: string): EnumMember;
  /**
   * Gets an enum member or throws if not found.
   * @param findFunction - Function to use to find the member.
   */
  getMemberOrThrow(findFunction: (declaration: EnumMember) => boolean): EnumMember;
  /** Gets the enum's members. */
  getMembers(): EnumMember[];
  /** Gets the enum's members with comment enum members. */
  getMembersWithComments(): (EnumMember | CommentEnumMember)[];
  /** Toggle if it's a const enum. */
  setIsConstEnum(value: boolean): this;
  /** Gets if it's a const enum. */
  isConstEnum(): boolean;
  /** Gets the const enum keyword or undefined if not exists. */
  getConstKeyword(): Node<ts.Node> | undefined;
  /** Gets the structure equivalent to this node. */
  getStructure(): EnumDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.EnumDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.EnumDeclaration>>;
}

declare const EnumMemberBase: Constructor<JSDocableNode> & Constructor<InitializerExpressionableNode> & Constructor<PropertyNamedNode> & typeof Node;

export declare class EnumMember extends EnumMemberBase<ts.EnumMember> {
  /** Gets the constant value of the enum. */
  getValue(): string | number | undefined;
  /**
   * Sets the enum value.
   *
   * This is a helper method. Use `#setInitializer` if you want to set the initializer
   * to something other than a string or number.
   * @param value - Enum value.
   */
  setValue(value: string | number): this;
  /** Removes this enum member. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<EnumMemberStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): EnumMemberStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.EnumMember>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.EnumMember>>;
}

declare const ArrayDestructuringAssignmentBase: typeof AssignmentExpression;

export declare class ArrayDestructuringAssignment extends ArrayDestructuringAssignmentBase<ts.ArrayDestructuringAssignment> {
  /** Gets the left array literal expression of the array destructuring assignment. */
  getLeft(): ArrayLiteralExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ArrayDestructuringAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ArrayDestructuringAssignment>>;
}

export declare class ArrayLiteralExpression extends PrimaryExpression<ts.ArrayLiteralExpression> {
  /** Gets the array's elements. */
  getElements(): Expression[];
  /**
   * Adds an element to the array.
   * @param textOrWriterFunction - Text to add as an element.
   * @param options - Options.
   */
  addElement(textOrWriterFunction: string | WriterFunction, options?: {
        useNewLines?: boolean;
    }): Expression<ts.Expression>;
  /**
   * Adds elements to the array.
   * @param textsOrWriterFunction - Texts to add as elements.
   * @param options - Options.
   */
  addElements(textsOrWriterFunction: ReadonlyArray<string | WriterFunction> | WriterFunction, options?: {
        useNewLines?: boolean;
    }): Expression<ts.Expression>[];
  /**
   * Insert an element into the array.
   * @param index - Child index to insert at.
   * @param text - Text to insert as an element.
   * @param options - Options.
   */
  insertElement(index: number, textOrWriterFunction: string | WriterFunction, options?: {
        useNewLines?: boolean;
    }): Expression<ts.Expression>;
  /**
   * Insert elements into the array.
   * @param index - Child index to insert at.
   * @param textsOrWriterFunction - Texts to insert as elements.
   * @param options - Options.
   */
  insertElements(index: number, textsOrWriterFunction: ReadonlyArray<string | WriterFunction> | WriterFunction, options?: {
        useNewLines?: boolean;
    }): Expression<ts.Expression>[];
  /**
   * Removes an element from the array.
   * @param index - Index to remove from.
   */
  removeElement(index: number): void;
  /**
   * Removes an element from the array.
   * @param element - Element to remove.
   */
  removeElement(element: Expression): void;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ArrayLiteralExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ArrayLiteralExpression>>;
}

declare const AsExpressionBase: Constructor<TypedNode> & Constructor<ExpressionedNode> & typeof Expression;

export declare class AsExpression extends AsExpressionBase<ts.AsExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.AsExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.AsExpression>>;
}

declare const AssignmentExpressionBase: typeof BinaryExpression;

export declare class AssignmentExpression<T extends ts.AssignmentExpression<ts.AssignmentOperatorToken> = ts.AssignmentExpression<ts.AssignmentOperatorToken>> extends AssignmentExpressionBase<T> {
  /** Gets the operator token of the assignment expression. */
  getOperatorToken(): Node<ts.AssignmentOperatorToken>;
}

declare const AwaitExpressionBase: Constructor<UnaryExpressionedNode> & typeof UnaryExpression;

export declare class AwaitExpression extends AwaitExpressionBase<ts.AwaitExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.AwaitExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.AwaitExpression>>;
}

export interface InstanceofExpression extends BinaryExpression {
  compilerNode: ts.InstanceofExpression;
  getOperatorToken(): Node<ts.Token<SyntaxKind.InstanceOfKeyword>>;
}

declare const BinaryExpressionBase: typeof Expression;

export declare class BinaryExpression<T extends ts.BinaryExpression = ts.BinaryExpression> extends BinaryExpressionBase<T> {
  /** Gets the left side of the binary expression. */
  getLeft(): Expression;
  /** Gets the operator token of the binary expression. */
  getOperatorToken(): Node<ts.BinaryOperatorToken>;
  /** Gets the right side of the binary expression. */
  getRight(): Expression;
}

declare const CallExpressionBase: Constructor<TypeArgumentedNode> & Constructor<ArgumentedNode> & Constructor<QuestionDotTokenableNode> & Constructor<LeftHandSideExpressionedNode> & typeof LeftHandSideExpression;

export declare class CallExpression<T extends ts.CallExpression = ts.CallExpression> extends CallExpressionBase<T> {
  /** Gets the return type of the call expression. */
  getReturnType(): Type;
}

declare const CommaListExpressionBase: typeof Expression;

export declare class CommaListExpression extends CommaListExpressionBase<ts.CommaListExpression> {
  /** Gets the elements. */
  getElements(): Expression[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.CommaListExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.CommaListExpression>>;
}

declare const ConditionalExpressionBase: typeof Expression;

export declare class ConditionalExpression extends ConditionalExpressionBase<ts.ConditionalExpression> {
  /** Gets the condition of the conditional expression. */
  getCondition(): Expression;
  /** Gets the question token of the conditional expression. */
  getQuestionToken(): Node<ts.QuestionToken>;
  /** Gets the when true expression of the conditional expression. */
  getWhenTrue(): Expression;
  /** Gets the colon token of the conditional expression. */
  getColonToken(): Node<ts.ColonToken>;
  /** Gets the when false expression of the conditional expression. */
  getWhenFalse(): Expression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ConditionalExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ConditionalExpression>>;
}

declare const DeleteExpressionBase: Constructor<UnaryExpressionedNode> & typeof UnaryExpression;

export declare class DeleteExpression extends DeleteExpressionBase<ts.DeleteExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.DeleteExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.DeleteExpression>>;
}

declare const ElementAccessExpressionBase: Constructor<QuestionDotTokenableNode> & Constructor<LeftHandSideExpressionedNode> & typeof MemberExpression;

export declare class ElementAccessExpression<T extends ts.ElementAccessExpression = ts.ElementAccessExpression> extends ElementAccessExpressionBase<T> {
  /** Gets this element access expression's argument expression or undefined if none exists. */
  getArgumentExpression(): Expression | undefined;
  /** Gets this element access expression's argument expression or throws if none exists. */
  getArgumentExpressionOrThrow(message?: string | (() => string)): Expression<ts.Expression>;
}

export declare class Expression<T extends ts.Expression = ts.Expression> extends Node<T> {
  /** Gets the contextual type of the expression. */
  getContextualType(): Type | undefined;
}

export declare function ExpressionableNode<T extends Constructor<ExpressionableNodeExtensionType>>(Base: T): Constructor<ExpressionableNode> & T;

export interface ExpressionableNode {
  /** Gets the expression if it exists or returns undefined. */
  getExpression(): Expression | undefined;
  /** Gets the expression if it exists or throws. */
  getExpressionOrThrow(message?: string | (() => string)): Expression;
  /** Gets the expression if it is of the specified syntax kind or returns undefined. */
  getExpressionIfKind<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind] | undefined;
  /** Gets the expression if it is of the specified syntax kind or throws. */
  getExpressionIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind];
}

type ExpressionableNodeExtensionType = Node<ts.Node & {
      expression?: ts.Expression;
  }>;
export declare function BaseExpressionedNode<T extends Constructor<ExpressionedNodeExtensionType>, TExpression extends Node = CompilerNodeToWrappedType<InstanceOf<T>["compilerNode"]>>(Base: T): Constructor<BaseExpressionedNode<TExpression>> & T;

export interface BaseExpressionedNode<TExpression extends Node> {
  /** Gets the expression. */
  getExpression(): TExpression;
  /**
   * Gets the expression if its of a certain kind or returns undefined.
   * @param kind - Syntax kind of the expression.
   */
  getExpressionIfKind<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind] | undefined;
  /**
   * Gets the expression if its of a certain kind or throws.
   * @param kind - Syntax kind of the expression.
   */
  getExpressionIfKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToExpressionMappings[TKind];
  /**
   * Sets the expression.
   * @param textOrWriterFunction - Text to set the expression with.
   */
  setExpression(textOrWriterFunction: string | WriterFunction): this;
}

export declare function ExpressionedNode<T extends Constructor<ExpressionedNodeExtensionType>>(Base: T): Constructor<ExpressionedNode> & T;

export interface ExpressionedNode extends BaseExpressionedNode<Expression> {
}

type ExpressionedNodeExtensionType = Node<ts.Node & {
      expression: ts.Expression;
  }>;
export declare function ImportExpressionedNode<T extends Constructor<ImportExpressionedNodeExtensionType>>(Base: T): Constructor<ImportExpressionedNode> & T;

export interface ImportExpressionedNode extends BaseExpressionedNode<ImportExpression> {
}

type ImportExpressionedNodeExtensionType = Node<ts.Node & {
      expression: ts.ImportExpression;
  }>;
export declare function LeftHandSideExpressionedNode<T extends Constructor<LeftHandSideExpressionedNodeExtensionType>>(Base: T): Constructor<LeftHandSideExpressionedNode> & T;

export interface LeftHandSideExpressionedNode extends BaseExpressionedNode<LeftHandSideExpression> {
}

type LeftHandSideExpressionedNodeExtensionType = Node<ts.Node & {
      expression: ts.LeftHandSideExpression;
  }>;
export declare function SuperExpressionedNode<T extends Constructor<SuperExpressionedNodeExtensionType>>(Base: T): Constructor<SuperExpressionedNode> & T;

export interface SuperExpressionedNode extends BaseExpressionedNode<SuperExpression> {
}

type SuperExpressionedNodeExtensionType = Node<ts.Node & {
      expression: ts.SuperExpression;
  }>;
export declare function UnaryExpressionedNode<T extends Constructor<UnaryExpressionedNodeExtensionType>>(Base: T): Constructor<UnaryExpressionedNode> & T;

export interface UnaryExpressionedNode extends BaseExpressionedNode<UnaryExpression> {
}

type UnaryExpressionedNodeExtensionType = Node<ts.Node & {
      expression: ts.UnaryExpression;
  }>;
declare const ImportExpressionBase: typeof PrimaryExpression;

export declare class ImportExpression extends ImportExpressionBase<ts.ImportExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportExpression>>;
}

export declare class LeftHandSideExpression<T extends ts.LeftHandSideExpression = ts.LeftHandSideExpression> extends UpdateExpression<T> {
}

declare const LiteralExpressionBase: Constructor<LiteralLikeNode> & typeof PrimaryExpression;

export declare class LiteralExpression<T extends ts.LiteralExpression = ts.LiteralExpression> extends LiteralExpressionBase<T> {
}

export declare class MemberExpression<T extends ts.MemberExpression = ts.MemberExpression> extends LeftHandSideExpression<T> {
}

declare const MetaPropertyBase: Constructor<NamedNode> & typeof PrimaryExpression;

export declare class MetaProperty extends MetaPropertyBase<ts.MetaProperty> {
  /** Gets the keyword token. */
  getKeywordToken(): SyntaxKind.ImportKeyword | SyntaxKind.NewKeyword;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.MetaProperty>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.MetaProperty>>;
}

declare const NewExpressionBase: Constructor<TypeArgumentedNode> & Constructor<ArgumentedNode> & Constructor<LeftHandSideExpressionedNode> & typeof PrimaryExpression;

export declare class NewExpression extends NewExpressionBase<ts.NewExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NewExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NewExpression>>;
}

declare const NonNullExpressionBase: Constructor<ExpressionedNode> & typeof LeftHandSideExpression;

export declare class NonNullExpression extends NonNullExpressionBase<ts.NonNullExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NonNullExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NonNullExpression>>;
}

export declare class CommentObjectLiteralElement extends ObjectLiteralElement<CompilerCommentObjectLiteralElement> {
}

declare const ObjectDestructuringAssignmentBase: typeof AssignmentExpression;

export declare class ObjectDestructuringAssignment extends ObjectDestructuringAssignmentBase<ts.ObjectDestructuringAssignment> {
  /** Gets the left object literal expression of the object destructuring assignment. */
  getLeft(): ObjectLiteralExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ObjectDestructuringAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ObjectDestructuringAssignment>>;
}

export declare class ObjectLiteralElement<T extends ts.ObjectLiteralElement = ts.ObjectLiteralElement> extends Node<T> {
  /** Removes the object literal element from the object literal expression. */
  remove(): void;
}

declare const ObjectLiteralExpressionBase: typeof PrimaryExpression;

export declare class ObjectLiteralExpression extends ObjectLiteralExpressionBase<ts.ObjectLiteralExpression> {
  #private;
  /**
   * Gets the first property by the provided name or throws.
   * @param name - Name of the property.
   */
  getPropertyOrThrow(name: string): ObjectLiteralElementLike;
  /**
   * Gets the first property that matches the provided find function or throws.
   * @param findFunction - Find function.
   */
  getPropertyOrThrow(findFunction: (property: ObjectLiteralElementLike) => boolean): ObjectLiteralElementLike;
  /**
   * Gets the first property by the provided name or returns undefined.
   * @param name - Name of the property.
   */
  getProperty(name: string): ObjectLiteralElementLike | undefined;
  /**
   * Gets the first property that matches the provided find function or returns undefined.
   * @param findFunction - Find function.
   */
  getProperty(findFunction: (property: ObjectLiteralElementLike) => boolean): ObjectLiteralElementLike | undefined;
  /** Gets the properties. */
  getProperties(): ObjectLiteralElementLike[];
  /** Gets the properties with comment object literal elements. */
  getPropertiesWithComments(): (ObjectLiteralElementLike | CommentObjectLiteralElement)[];
  /**
   * Adds the specified property to the object literal expression.
   *
   * Note: If you only want to add a property assignment, then it might be more convenient to use #addPropertyAssignment.
   * @structure - The structure to add.
   */
  addProperty(structure: string | WriterFunction | ObjectLiteralExpressionPropertyStructures): CommentObjectLiteralElement | ObjectLiteralElementLike;
  /**
   * Adds the specified properties to the object literal expression.
   *
   * Note: If you only want to add property assignments, then it might be more convenient to use #addPropertyAssignments.
   * @structures - The structures to add.
   */
  addProperties(structures: string | WriterFunction | ReadonlyArray<string | WriterFunction | ObjectLiteralExpressionPropertyStructures>): (CommentObjectLiteralElement | ObjectLiteralElementLike)[];
  /**
   * Inserts the specified property to the object literal expression.
   *
   * Note: If you only want to insert a property assignment, then it might be more convenient to use #insertPropertyAssignment.
   * @index - The index to insert at.
   * @structure - The structure to insert.
   */
  insertProperty(index: number, structure: string | WriterFunction | ObjectLiteralExpressionPropertyStructures): CommentObjectLiteralElement | ObjectLiteralElementLike;
  /**
   * Inserts the specified properties to the object literal expression.
   *
   * Note: If you only want to insert property assignments, then it might be more convenient to use #insertPropertyAssignments.
   * @index - The index to insert at.
   * @structures - The structures to insert.
   */
  insertProperties(index: number, structures: string | WriterFunction | ReadonlyArray<string | WriterFunction | ObjectLiteralExpressionPropertyStructures>): (CommentObjectLiteralElement | ObjectLiteralElementLike)[];
  /**
   * Adds a property assignment.
   * @param structure - Structure that represents the property assignment to add.
   */
  addPropertyAssignment(structure: OptionalKind<PropertyAssignmentStructure>): PropertyAssignment;
  /**
   * Adds property assignments.
   * @param structures - Structure that represents the property assignments to add.
   */
  addPropertyAssignments(structures: ReadonlyArray<OptionalKind<PropertyAssignmentStructure>>): PropertyAssignment[];
  /**
   * Inserts a property assignment at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the property assignment to insert.
   */
  insertPropertyAssignment(index: number, structure: OptionalKind<PropertyAssignmentStructure>): PropertyAssignment;
  /**
   * Inserts property assignments at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the property assignments to insert.
   */
  insertPropertyAssignments(index: number, structures: ReadonlyArray<OptionalKind<PropertyAssignmentStructure>>): PropertyAssignment[];
  /**
   * Adds a shorthand property assignment.
   * @param structure - Structure that represents the shorthand property assignment to add.
   */
  addShorthandPropertyAssignment(structure: OptionalKind<ShorthandPropertyAssignmentStructure>): ShorthandPropertyAssignment;
  /**
   * Adds shorthand property assignments.
   * @param structures - Structure that represents the shorthand property assignments to add.
   */
  addShorthandPropertyAssignments(structures: ReadonlyArray<OptionalKind<ShorthandPropertyAssignmentStructure>>): ShorthandPropertyAssignment[];
  /**
   * Inserts a shorthand property assignment at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the shorthand property assignment to insert.
   */
  insertShorthandPropertyAssignment(index: number, structure: OptionalKind<ShorthandPropertyAssignmentStructure>): ShorthandPropertyAssignment;
  /**
   * Inserts shorthand property assignments at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the shorthand property assignments to insert.
   */
  insertShorthandPropertyAssignments(index: number, structures: ReadonlyArray<OptionalKind<ShorthandPropertyAssignmentStructure>>): ShorthandPropertyAssignment[];
  /**
   * Adds a spread assignment.
   * @param structure - Structure that represents the spread assignment to add.
   */
  addSpreadAssignment(structure: OptionalKind<SpreadAssignmentStructure>): SpreadAssignment;
  /**
   * Adds spread assignments.
   * @param structures - Structure that represents the spread assignments to add.
   */
  addSpreadAssignments(structures: ReadonlyArray<OptionalKind<SpreadAssignmentStructure>>): SpreadAssignment[];
  /**
   * Inserts a spread assignment at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the spread assignment to insert.
   */
  insertSpreadAssignment(index: number, structure: OptionalKind<SpreadAssignmentStructure>): SpreadAssignment;
  /**
   * Inserts spread assignments at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the spread assignments to insert.
   */
  insertSpreadAssignments(index: number, structures: ReadonlyArray<OptionalKind<SpreadAssignmentStructure>>): SpreadAssignment[];
  /**
   * Adds a method.
   * @param structure - Structure that represents the method to add.
   */
  addMethod(structure: OptionalKind<MethodDeclarationStructure>): MethodDeclaration;
  /**
   * Adds methods.
   * @param structures - Structure that represents the methods to add.
   */
  addMethods(structures: ReadonlyArray<OptionalKind<MethodDeclarationStructure>>): MethodDeclaration[];
  /**
   * Inserts a method at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the method to insert.
   */
  insertMethod(index: number, structure: OptionalKind<MethodDeclarationStructure>): MethodDeclaration;
  /**
   * Inserts methods at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the methods to insert.
   */
  insertMethods(index: number, structures: ReadonlyArray<OptionalKind<MethodDeclarationStructure>>): MethodDeclaration[];
  /**
   * Adds a get accessor.
   * @param structure - Structure that represents the property assignment to add.
   */
  addGetAccessor(structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Adds get accessors.
   * @param structures - Structure that represents the get accessors to add.
   */
  addGetAccessors(structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Inserts a get accessor at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the get accessor to insert.
   */
  insertGetAccessor(index: number, structure: OptionalKind<GetAccessorDeclarationStructure>): GetAccessorDeclaration;
  /**
   * Inserts get accessors at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the get accessors to insert.
   */
  insertGetAccessors(index: number, structures: ReadonlyArray<OptionalKind<GetAccessorDeclarationStructure>>): GetAccessorDeclaration[];
  /**
   * Adds a set accessor.
   * @param structure - Structure that represents the property assignment to add.
   */
  addSetAccessor(structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Adds set accessors.
   * @param structures - Structure that represents the set accessors to add.
   */
  addSetAccessors(structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /**
   * Inserts a set accessor at the specified index.
   * @param index - Child index to insert at.
   * @param structure - Structure that represents the set accessor to insert.
   */
  insertSetAccessor(index: number, structure: OptionalKind<SetAccessorDeclarationStructure>): SetAccessorDeclaration;
  /**
   * Inserts set accessors at the specified index.
   * @param index - Child index to insert at.
   * @param structures - Structures that represent the set accessors to insert.
   */
  insertSetAccessors(index: number, structures: ReadonlyArray<OptionalKind<SetAccessorDeclarationStructure>>): SetAccessorDeclaration[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ObjectLiteralExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ObjectLiteralExpression>>;
}

declare const PropertyAssignmentBase: Constructor<InitializerExpressionGetableNode> & Constructor<QuestionTokenableNode> & Constructor<PropertyNamedNode> & typeof ObjectLiteralElement;

export declare class PropertyAssignment extends PropertyAssignmentBase<ts.PropertyAssignment> {
  /**
   * Removes the initializer and returns the new shorthand property assignment.
   *
   * Note: The current node will no longer be valid because it's no longer a property assignment.
   */
  removeInitializer(): ShorthandPropertyAssignment;
  /**
   * Sets the initializer.
   * @param textOrWriterFunction - New text ot set for the initializer.
   */
  setInitializer(textOrWriterFunction: string | WriterFunction): this;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<PropertyAssignmentStructure>): this | ShorthandPropertyAssignment;
  /** Gets the structure equivalent to this node. */
  getStructure(): PropertyAssignmentStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PropertyAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PropertyAssignment>>;
}

declare const ShorthandPropertyAssignmentBase: Constructor<InitializerExpressionGetableNode> & Constructor<QuestionTokenableNode> & Constructor<NamedNode> & typeof ObjectLiteralElement;

export declare class ShorthandPropertyAssignment extends ShorthandPropertyAssignmentBase<ts.ShorthandPropertyAssignment> {
  /** Gets if the shorthand property assignment has an object assignment initializer. */
  hasObjectAssignmentInitializer(): boolean;
  /** Gets the object assignment initializer or throws if it doesn't exist. */
  getObjectAssignmentInitializerOrThrow(message?: string | (() => string)): Expression<ts.Expression>;
  /** Gets the object assignment initializer if it exists. */
  getObjectAssignmentInitializer(): Expression | undefined;
  /** Gets the equals token or throws if it doesn't exist. */
  getEqualsTokenOrThrow(message?: string | (() => string)): Node<ts.EqualsToken>;
  /** Gets the equals token if it exists. */
  getEqualsToken(): Node<ts.EqualsToken> | undefined;
  /**
   * Remove the object assignment initializer.
   *
   * This is only useful to remove bad code.
   */
  removeObjectAssignmentInitializer(): this;
  /**
   * Sets the initializer.
   *
   * Note: The current node will no longer be valid because it's no longer a shorthand property assignment.
   * @param text - New text to set for the initializer.
   */
  setInitializer(text: string): PropertyAssignment;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ShorthandPropertyAssignmentStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ShorthandPropertyAssignmentStructure;
  /**
   * Gets the shorthand assignment value symbol of this node if it exists. Convenience API
   * for TypeChecker#getShorthandAssignmentValueSymbol(node)
   */
  getValueSymbol(): Symbol | undefined;
  /** Gets the value symbol or throws if it doesn't exist. */
  getValueSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ShorthandPropertyAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ShorthandPropertyAssignment>>;
}

declare const SpreadAssignmentBase: Constructor<ExpressionedNode> & typeof ObjectLiteralElement;

export declare class SpreadAssignment extends SpreadAssignmentBase<ts.SpreadAssignment> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<SpreadAssignmentStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): SpreadAssignmentStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SpreadAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SpreadAssignment>>;
}

declare const OmittedExpressionBase: typeof Expression;

export declare class OmittedExpression extends OmittedExpressionBase<ts.OmittedExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.OmittedExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.OmittedExpression>>;
}

declare const ParenthesizedExpressionBase: Constructor<ExpressionedNode> & typeof Expression;

export declare class ParenthesizedExpression extends ParenthesizedExpressionBase<ts.ParenthesizedExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ParenthesizedExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ParenthesizedExpression>>;
}

declare const PartiallyEmittedExpressionBase: Constructor<ExpressionedNode> & typeof Expression;

export declare class PartiallyEmittedExpression extends PartiallyEmittedExpressionBase<ts.PartiallyEmittedExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PartiallyEmittedExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PartiallyEmittedExpression>>;
}

declare const PostfixUnaryExpressionBase: typeof UnaryExpression;

export declare class PostfixUnaryExpression extends PostfixUnaryExpressionBase<ts.PostfixUnaryExpression> {
  /** Gets the operator token of the postfix unary expression. */
  getOperatorToken(): ts.PostfixUnaryOperator;
  /** Gets the operand of the postfix unary expression. */
  getOperand(): LeftHandSideExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PostfixUnaryExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PostfixUnaryExpression>>;
}

declare const PrefixUnaryExpressionBase: typeof UnaryExpression;

export declare class PrefixUnaryExpression extends PrefixUnaryExpressionBase<ts.PrefixUnaryExpression> {
  /** Gets the operator token of the prefix unary expression. */
  getOperatorToken(): ts.PrefixUnaryOperator;
  /** Gets the operand of the prefix unary expression. */
  getOperand(): UnaryExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PrefixUnaryExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PrefixUnaryExpression>>;
}

export declare class PrimaryExpression<T extends ts.PrimaryExpression = ts.PrimaryExpression> extends MemberExpression<T> {
}

declare const PropertyAccessExpressionBase: Constructor<NamedNode> & Constructor<QuestionDotTokenableNode> & Constructor<LeftHandSideExpressionedNode> & typeof MemberExpression;

export declare class PropertyAccessExpression<T extends ts.PropertyAccessExpression = ts.PropertyAccessExpression> extends PropertyAccessExpressionBase<T> {
}

declare const SatisfiesExpressionBase: Constructor<TypedNode> & Constructor<ExpressionedNode> & typeof Expression;

export declare class SatisfiesExpression extends SatisfiesExpressionBase<ts.SatisfiesExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SatisfiesExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SatisfiesExpression>>;
}

declare const SpreadElementBase: Constructor<ExpressionedNode> & typeof Expression;

export declare class SpreadElement extends SpreadElementBase<ts.SpreadElement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SpreadElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SpreadElement>>;
}

declare const SuperElementAccessExpressionBase: Constructor<SuperExpressionedNode> & typeof ElementAccessExpression;

export declare class SuperElementAccessExpression extends SuperElementAccessExpressionBase<ts.SuperElementAccessExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SuperElementAccessExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SuperElementAccessExpression>>;
}

declare const SuperExpressionBase: typeof PrimaryExpression;

export declare class SuperExpression extends SuperExpressionBase<ts.SuperExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SuperExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SuperExpression>>;
}

declare const SuperPropertyAccessExpressionBase: Constructor<SuperExpressionedNode> & typeof PropertyAccessExpression;

export declare class SuperPropertyAccessExpression extends SuperPropertyAccessExpressionBase<ts.SuperPropertyAccessExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SuperPropertyAccessExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SuperPropertyAccessExpression>>;
}

declare const ThisExpressionBase: typeof PrimaryExpression;

export declare class ThisExpression extends ThisExpressionBase<ts.ThisExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ThisExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ThisExpression>>;
}

declare const TypeAssertionBase: Constructor<TypedNode> & Constructor<UnaryExpressionedNode> & typeof UnaryExpression;

export declare class TypeAssertion extends TypeAssertionBase<ts.TypeAssertion> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeAssertion>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeAssertion>>;
}

declare const TypeOfExpressionBase: Constructor<UnaryExpressionedNode> & typeof UnaryExpression;

export declare class TypeOfExpression extends TypeOfExpressionBase<ts.TypeOfExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeOfExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeOfExpression>>;
}

export declare class UnaryExpression<T extends ts.UnaryExpression = ts.UnaryExpression> extends Expression<T> {
}

export declare class UpdateExpression<T extends ts.UpdateExpression = ts.UpdateExpression> extends UnaryExpression<T> {
}

declare const VoidExpressionBase: Constructor<UnaryExpressionedNode> & typeof UnaryExpression;

export declare class VoidExpression extends VoidExpressionBase<ts.VoidExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.VoidExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.VoidExpression>>;
}

declare const YieldExpressionBase: Constructor<ExpressionableNode> & Constructor<GeneratorableNode> & typeof Expression;

export declare class YieldExpression extends YieldExpressionBase<ts.YieldExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.YieldExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.YieldExpression>>;
}

declare const ArrowFunctionBase: Constructor<TextInsertableNode> & Constructor<BodiedNode> & Constructor<AsyncableNode> & Constructor<FunctionLikeDeclaration> & typeof Expression;

export declare class ArrowFunction extends ArrowFunctionBase<ts.ArrowFunction> {
  /** Gets the equals greater than token of the arrow function. */
  getEqualsGreaterThan(): Node<ts.Token<SyntaxKind.EqualsGreaterThanToken>>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ArrowFunction>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ArrowFunction>>;
}

declare const FunctionDeclarationBase: Constructor<UnwrappableNode> & Constructor<TextInsertableNode> & Constructor<OverloadableNode> & Constructor<BodyableNode> & Constructor<AsyncableNode> & Constructor<GeneratorableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<FunctionLikeDeclaration> & Constructor<ModuleChildableNode> & Constructor<NameableNode> & typeof Statement;
declare const FunctionDeclarationOverloadBase: Constructor<UnwrappableNode> & Constructor<TextInsertableNode> & Constructor<AsyncableNode> & Constructor<GeneratorableNode> & Constructor<SignaturedDeclaration> & Constructor<AmbientableNode> & Constructor<ModuleChildableNode> & Constructor<JSDocableNode> & Constructor<TypeParameteredNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & typeof Statement;

export declare class FunctionDeclaration extends FunctionDeclarationBase<ts.FunctionDeclaration> {
  /**
   * Adds a function overload.
   * @param structure - Structure of the overload.
   */
  addOverload(structure: OptionalKind<FunctionDeclarationOverloadStructure>): FunctionDeclaration;
  /**
   * Adds function overloads.
   * @param structures - Structures of the overloads.
   */
  addOverloads(structures: ReadonlyArray<OptionalKind<FunctionDeclarationOverloadStructure>>): FunctionDeclaration[];
  /**
   * Inserts a function overload.
   * @param index - Child index to insert at.
   * @param structure - Structure of the overload.
   */
  insertOverload(index: number, structure: OptionalKind<FunctionDeclarationOverloadStructure>): FunctionDeclaration;
  /**
   * Inserts function overloads.
   * @param index - Child index to insert at.
   * @param structure - Structures of the overloads.
   */
  insertOverloads(index: number, structures: ReadonlyArray<OptionalKind<FunctionDeclarationOverloadStructure>>): FunctionDeclaration[];
  /** Removes this function declaration. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<FunctionDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): FunctionDeclarationStructure | FunctionDeclarationOverloadStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.FunctionDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.FunctionDeclaration>>;
}

declare const FunctionExpressionBase: Constructor<JSDocableNode> & Constructor<TextInsertableNode> & Constructor<BodiedNode> & Constructor<AsyncableNode> & Constructor<GeneratorableNode> & Constructor<StatementedNode> & Constructor<TypeParameteredNode> & Constructor<SignaturedDeclaration> & Constructor<ModifierableNode> & Constructor<NameableNode> & typeof PrimaryExpression;

export declare class FunctionExpression extends FunctionExpressionBase<ts.FunctionExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.FunctionExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.FunctionExpression>>;
}

export declare function FunctionLikeDeclaration<T extends Constructor<FunctionLikeDeclarationExtensionType>>(Base: T): Constructor<FunctionLikeDeclaration> & T;

export interface FunctionLikeDeclaration extends JSDocableNode, TypeParameteredNode, SignaturedDeclaration, StatementedNode, ModifierableNode {
}

type FunctionLikeDeclarationExtensionType = Node<ts.FunctionLikeDeclaration>;
export declare function OverloadableNode<T extends Constructor<OverloadableNodeExtensionType>>(Base: T): Constructor<OverloadableNode> & T;

/** Node that supports overloads. */
export interface OverloadableNode {
  /** Gets all the overloads associated with this node. */
  getOverloads(): this[];
  /** Gets the implementation or undefined if it doesn't exist. */
  getImplementation(): this | undefined;
  /** Gets the implementation or throws if it doesn't exist. */
  getImplementationOrThrow(message?: string | (() => string)): this;
  /** Gets if this is not the implementation. */
  isOverload(): boolean;
  /** Gets if this is the implementation. */
  isImplementation(): boolean;
}

type OverloadableNodeExtensionType = Node & BodyableNode;
declare const ParameterDeclarationBase: Constructor<OverrideableNode> & Constructor<QuestionTokenableNode> & Constructor<DecoratableNode> & Constructor<ScopeableNode> & Constructor<ReadonlyableNode> & Constructor<ModifierableNode> & Constructor<DotDotDotTokenableNode> & Constructor<TypedNode> & Constructor<InitializerExpressionableNode> & Constructor<BindingNamedNode> & typeof Node;

export declare class ParameterDeclaration extends ParameterDeclarationBase<ts.ParameterDeclaration> {
  /** Gets if it's a rest parameter. */
  isRestParameter(): boolean;
  /** Gets if this is a property with a scope, readonly, or override keyword (found in class constructors). */
  isParameterProperty(): boolean;
  /**
   * Sets if it's a rest parameter.
   * @param value - Sets if it's a rest parameter or not.
   */
  setIsRestParameter(value: boolean): this;
  /** Gets if it's optional. */
  isOptional(): boolean;
  /** Remove this parameter. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ParameterDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ParameterDeclarationStructure;
  /**
   * Sets if this node has a question token.
   * @param value - If it should have a question token or not.
   */
  setHasQuestionToken(value: boolean): this;
  /**
   * Sets the initializer.
   * @param text - Text or writer function to set for the initializer.
   */
  setInitializer(textOrWriterFunction: string | WriterFunction): this;
  /**
   * Sets the type.
   * @param textOrWriterFunction - Text or writer function to set the type with.
   */
  setType(textOrWriterFunction: string | WriterFunction): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ParameterDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ParameterDeclaration>>;
}

export declare class HeritageClause extends Node<ts.HeritageClause> {
  /** Gets all the type nodes for the heritage clause. */
  getTypeNodes(): ExpressionWithTypeArguments[];
  /** Gets the heritage clause token. */
  getToken(): SyntaxKind.ExtendsKeyword | SyntaxKind.ImplementsKeyword;
  /**
   * Remove the expression from the heritage clause.
   * @param index - Index of the expression to remove.
   */
  removeExpression(index: number): this;
  /**
   * Removes the expression from the heritage clause.
   * @param expressionNode - Expression to remove.
   */
  removeExpression(expressionNode: ExpressionWithTypeArguments): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.HeritageClause>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.HeritageClause>>;
}

declare const CallSignatureDeclarationBase: Constructor<TypeParameteredNode> & Constructor<ChildOrderableNode> & Constructor<JSDocableNode> & Constructor<SignaturedDeclaration> & typeof TypeElement;

export declare class CallSignatureDeclaration extends CallSignatureDeclarationBase<ts.CallSignatureDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<CallSignatureDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): CallSignatureDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.CallSignatureDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.CallSignatureDeclaration>>;
}

export declare class CommentTypeElement extends TypeElement<CompilerCommentTypeElement> {
}

declare const ConstructSignatureDeclarationBase: Constructor<TypeParameteredNode> & Constructor<ChildOrderableNode> & Constructor<JSDocableNode> & Constructor<SignaturedDeclaration> & typeof TypeElement;

export declare class ConstructSignatureDeclaration extends ConstructSignatureDeclarationBase<ts.ConstructSignatureDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ConstructSignatureDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ConstructSignatureDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ConstructSignatureDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ConstructSignatureDeclaration>>;
}

declare const IndexSignatureDeclarationBase: Constructor<ReturnTypedNode> & Constructor<ChildOrderableNode> & Constructor<JSDocableNode> & Constructor<ReadonlyableNode> & Constructor<ModifierableNode> & typeof TypeElement;

export declare class IndexSignatureDeclaration extends IndexSignatureDeclarationBase<ts.IndexSignatureDeclaration> {
  /** Gets the key name. */
  getKeyName(): string;
  /**
   * Sets the key name.
   * @param name - New name.
   */
  setKeyName(name: string): void;
  /** Gets the key name node. */
  getKeyNameNode(): BindingName;
  /** Gets the key type. */
  getKeyType(): Type;
  /**
   * Sets the key type.
   * @param type - Type.
   */
  setKeyType(type: string): this;
  /** Gets the key type node. */
  getKeyTypeNode(): TypeNode;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<IndexSignatureDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): IndexSignatureDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.IndexSignatureDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.IndexSignatureDeclaration>>;
}

declare const InterfaceDeclarationBase: Constructor<TypeElementMemberedNode> & Constructor<TextInsertableNode> & Constructor<ExtendsClauseableNode> & Constructor<HeritageClauseableNode> & Constructor<TypeParameteredNode> & Constructor<JSDocableNode> & Constructor<AmbientableNode> & Constructor<ModuleChildableNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & Constructor<NamedNode> & typeof Statement;

export declare class InterfaceDeclaration extends InterfaceDeclarationBase<ts.InterfaceDeclaration> {
  /** Gets the base types. */
  getBaseTypes(): Type[];
  /** Gets the base declarations. */
  getBaseDeclarations(): (TypeAliasDeclaration | InterfaceDeclaration | ClassDeclaration)[];
  /**
   * Gets all the implementations of the interface.
   *
   * This is similar to "go to implementation."
   */
  getImplementations(): ImplementationLocation[];
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<InterfaceDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): InterfaceDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.InterfaceDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.InterfaceDeclaration>>;
}

declare const MethodSignatureBase: Constructor<ChildOrderableNode> & Constructor<JSDocableNode> & Constructor<QuestionTokenableNode> & Constructor<TypeParameteredNode> & Constructor<SignaturedDeclaration> & Constructor<PropertyNamedNode> & typeof TypeElement;

export declare class MethodSignature extends MethodSignatureBase<ts.MethodSignature> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<MethodSignatureStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): MethodSignatureStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.MethodSignature>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.MethodSignature>>;
}

declare const PropertySignatureBase: Constructor<ChildOrderableNode> & Constructor<JSDocableNode> & Constructor<ReadonlyableNode> & Constructor<QuestionTokenableNode> & Constructor<InitializerExpressionableNode> & Constructor<TypedNode> & Constructor<PropertyNamedNode> & Constructor<ModifierableNode> & typeof TypeElement;

export declare class PropertySignature extends PropertySignatureBase<ts.PropertySignature> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<PropertySignatureStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): PropertySignatureStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PropertySignature>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PropertySignature>>;
}

export declare class TypeElement<TNode extends ts.TypeElement = ts.TypeElement> extends Node<TNode> {
  /** Removes the member. */
  remove(): void;
}

export declare function JsxAttributedNode<T extends Constructor<JsxAttributedNodeExtensionType>>(Base: T): Constructor<JsxAttributedNode> & T;

export interface JsxAttributedNode {
  /** Gets the JSX element's attributes. */
  getAttributes(): JsxAttributeLike[];
  /**
   * Gets an attribute by name or returns undefined when it can't be found.
   * @param name - Name to search for.
   */
  getAttribute(name: string): JsxAttributeLike | undefined;
  /**
   * Gets an attribute by a find function or returns undefined when it can't be found.
   * @param findFunction - Find function.
   */
  getAttribute(findFunction: (attribute: JsxAttributeLike) => boolean): JsxAttributeLike | undefined;
  /**
   * Gets an attribute by name or throws when it can't be found.
   * @param name - Name to search for.
   */
  getAttributeOrThrow(name: string): JsxAttributeLike;
  /**
   * Gets an attribute by a find function or throws when it can't be found.
   * @param findFunction - Find function.
   */
  getAttributeOrThrow(findFunction: (attribute: JsxAttributeLike) => boolean): JsxAttributeLike;
  /** Adds an attribute into the element. */
  addAttribute(attribute: OptionalKind<JsxAttributeStructure> | OptionalKind<JsxSpreadAttributeStructure>): JsxAttributeLike;
  /** Adds attributes into the element. */
  addAttributes(attributes: ReadonlyArray<OptionalKind<JsxAttributeStructure> | OptionalKind<JsxSpreadAttributeStructure>>): JsxAttributeLike[];
  /** Inserts an attribute into the element. */
  insertAttribute(index: number, attribute: OptionalKind<JsxAttributeStructure> | OptionalKind<JsxSpreadAttributeStructure>): JsxAttributeLike;
  /** Inserts attributes into the element. */
  insertAttributes(index: number, attributes: ReadonlyArray<OptionalKind<JsxAttributeStructure> | OptionalKind<JsxSpreadAttributeStructure>>): JsxAttributeLike[];
}

type JsxAttributedNodeExtensionType = Node<ts.Node & {
      attributes: ts.JsxAttributes;
  }> & JsxTagNamedNode;
export declare function JsxTagNamedNode<T extends Constructor<JsxTagNamedNodeExtensionType>>(Base: T): Constructor<JsxTagNamedNode> & T;

export interface JsxTagNamedNode {
  /** Gets the tag name of the JSX closing element. */
  getTagNameNode(): JsxTagNameExpression;
}

type JsxTagNamedNodeExtensionType = Node<ts.Node & {
      tagName: ts.JsxTagNameExpression;
  }>;
declare const JsxAttributeBase: typeof Node;

export declare class JsxAttribute extends JsxAttributeBase<ts.JsxAttribute> {
  /** Gets the name node of the JSX attribute. */
  getNameNode(): JsxAttributeName;
  /** Sets the name of the JSX attribute. */
  setName(name: string | JsxNamespacedNameStructure): this;
  /** Gets the JSX attribute's initializer or throws if it doesn't exist. */
  getInitializerOrThrow(message?: string | (() => string)): StringLiteral | JsxElement | JsxSelfClosingElement | JsxFragment | JsxExpression;
  /** Gets the JSX attribute's initializer or returns undefined if it doesn't exist. */
  getInitializer(): JsxElement | JsxExpression | JsxFragment | JsxSelfClosingElement | StringLiteral | undefined;
  /**
   * Sets the initializer.
   * @param textOrWriterFunction - Text or writer function to set the initializer with.
   * @remarks You need to provide the quotes or braces.
   */
  setInitializer(textOrWriterFunction: string | WriterFunction): this;
  /** Removes the initializer. */
  removeInitializer(): this;
  /** Removes the JSX attribute. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<JsxAttributeStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): JsxAttributeStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxAttribute>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxAttribute>>;
}

declare const JsxClosingElementBase: Constructor<JsxTagNamedNode> & typeof Node;

export declare class JsxClosingElement extends JsxClosingElementBase<ts.JsxClosingElement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxClosingElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxClosingElement>>;
}

export declare class JsxClosingFragment extends Expression<ts.JsxClosingFragment> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxClosingFragment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxClosingFragment>>;
}

declare const JsxElementBase: typeof PrimaryExpression;

export declare class JsxElement extends JsxElementBase<ts.JsxElement> {
  /** Gets the children of the JSX element. */
  getJsxChildren(): JsxChild[];
  /** Gets the opening element. */
  getOpeningElement(): JsxOpeningElement;
  /** Gets the closing element. */
  getClosingElement(): JsxClosingElement;
  /**
   * Sets the body text.
   * @param textOrWriterFunction - Text or writer function to set as the body.
   */
  setBodyText(textOrWriterFunction: string | WriterFunction): this;
  /**
   * Sets the body text without surrounding new lines.
   * @param textOrWriterFunction - Text to set as the body.
   */
  setBodyTextInline(textOrWriterFunction: string | WriterFunction): this;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<JsxElementStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): JsxElementStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxElement>>;
}

declare const JsxExpressionBase: Constructor<ExpressionableNode> & Constructor<DotDotDotTokenableNode> & typeof Expression;

export declare class JsxExpression extends JsxExpressionBase<ts.JsxExpression> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxExpression>>;
}

export declare class JsxFragment extends PrimaryExpression<ts.JsxFragment> {
  /** Gets the children of the JSX fragment. */
  getJsxChildren(): JsxChild[];
  /** Gets the opening fragment. */
  getOpeningFragment(): JsxOpeningFragment;
  /** Gets the closing fragment. */
  getClosingFragment(): JsxClosingFragment;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxFragment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxFragment>>;
}

declare const JsxNamespacedNameBase: typeof Node;

export declare class JsxNamespacedName extends JsxNamespacedNameBase<ts.JsxNamespacedName> {
  /** Gets the namespace name node. */
  getNamespaceNode(): Identifier;
  /** Gets the name node. */
  getNameNode(): Identifier;
  set(structure: JsxNamespacedNameStructure): this;
  getStructure(): JsxNamespacedNameStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxNamespacedName>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxNamespacedName>>;
}

declare const JsxOpeningElementBase: Constructor<JsxAttributedNode> & Constructor<JsxTagNamedNode> & typeof Expression;

export declare class JsxOpeningElement extends JsxOpeningElementBase<ts.JsxOpeningElement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxOpeningElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxOpeningElement>>;
}

export declare class JsxOpeningFragment extends Expression<ts.JsxOpeningFragment> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxOpeningFragment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxOpeningFragment>>;
}

declare const JsxSelfClosingElementBase: Constructor<JsxAttributedNode> & Constructor<JsxTagNamedNode> & typeof PrimaryExpression;

export declare class JsxSelfClosingElement extends JsxSelfClosingElementBase<ts.JsxSelfClosingElement> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<JsxSelfClosingElementStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): JsxSelfClosingElementStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxSelfClosingElement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxSelfClosingElement>>;
}

declare const JsxSpreadAttributeBase: Constructor<ExpressionedNode> & typeof Node;

export declare class JsxSpreadAttribute extends JsxSpreadAttributeBase<ts.JsxSpreadAttribute> {
  /** Removes the JSX spread attribute. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<JsxSpreadAttributeStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): JsxSpreadAttributeStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxSpreadAttribute>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxSpreadAttribute>>;
}

declare const JsxTextBase: Constructor<LiteralLikeNode> & typeof Node;

export declare class JsxText extends JsxTextBase<ts.JsxText> {
  /** Gets if the JSX text contains only white spaces. */
  containsOnlyTriviaWhiteSpaces(): boolean;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.JsxText>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.JsxText>>;
}

export interface ImplementedKindToNodeMappings {
  [SyntaxKind.SourceFile]: SourceFile;
  [SyntaxKind.ArrayBindingPattern]: ArrayBindingPattern;
  [SyntaxKind.ArrayLiteralExpression]: ArrayLiteralExpression;
  [SyntaxKind.ArrayType]: ArrayTypeNode;
  [SyntaxKind.ArrowFunction]: ArrowFunction;
  [SyntaxKind.AsExpression]: AsExpression;
  [SyntaxKind.AwaitExpression]: AwaitExpression;
  [SyntaxKind.BigIntLiteral]: BigIntLiteral;
  [SyntaxKind.BindingElement]: BindingElement;
  [SyntaxKind.BinaryExpression]: BinaryExpression;
  [SyntaxKind.Block]: Block;
  [SyntaxKind.BreakStatement]: BreakStatement;
  [SyntaxKind.CallExpression]: CallExpression;
  [SyntaxKind.CallSignature]: CallSignatureDeclaration;
  [SyntaxKind.CaseBlock]: CaseBlock;
  [SyntaxKind.CaseClause]: CaseClause;
  [SyntaxKind.CatchClause]: CatchClause;
  [SyntaxKind.ClassDeclaration]: ClassDeclaration;
  [SyntaxKind.ClassExpression]: ClassExpression;
  [SyntaxKind.ClassStaticBlockDeclaration]: ClassStaticBlockDeclaration;
  [SyntaxKind.ConditionalType]: ConditionalTypeNode;
  [SyntaxKind.Constructor]: ConstructorDeclaration;
  [SyntaxKind.ConstructorType]: ConstructorTypeNode;
  [SyntaxKind.ConstructSignature]: ConstructSignatureDeclaration;
  [SyntaxKind.ContinueStatement]: ContinueStatement;
  [SyntaxKind.CommaListExpression]: CommaListExpression;
  [SyntaxKind.ComputedPropertyName]: ComputedPropertyName;
  [SyntaxKind.ConditionalExpression]: ConditionalExpression;
  [SyntaxKind.DebuggerStatement]: DebuggerStatement;
  [SyntaxKind.Decorator]: Decorator;
  [SyntaxKind.DefaultClause]: DefaultClause;
  [SyntaxKind.DeleteExpression]: DeleteExpression;
  [SyntaxKind.DoStatement]: DoStatement;
  [SyntaxKind.ElementAccessExpression]: ElementAccessExpression;
  [SyntaxKind.EmptyStatement]: EmptyStatement;
  [SyntaxKind.EnumDeclaration]: EnumDeclaration;
  [SyntaxKind.EnumMember]: EnumMember;
  [SyntaxKind.ExportAssignment]: ExportAssignment;
  [SyntaxKind.ExportDeclaration]: ExportDeclaration;
  [SyntaxKind.ExportSpecifier]: ExportSpecifier;
  [SyntaxKind.ExpressionWithTypeArguments]: ExpressionWithTypeArguments;
  [SyntaxKind.ExpressionStatement]: ExpressionStatement;
  [SyntaxKind.ExternalModuleReference]: ExternalModuleReference;
  [SyntaxKind.QualifiedName]: QualifiedName;
  [SyntaxKind.ForInStatement]: ForInStatement;
  [SyntaxKind.ForOfStatement]: ForOfStatement;
  [SyntaxKind.ForStatement]: ForStatement;
  [SyntaxKind.FunctionDeclaration]: FunctionDeclaration;
  [SyntaxKind.FunctionExpression]: FunctionExpression;
  [SyntaxKind.FunctionType]: FunctionTypeNode;
  [SyntaxKind.GetAccessor]: GetAccessorDeclaration;
  [SyntaxKind.HeritageClause]: HeritageClause;
  [SyntaxKind.Identifier]: Identifier;
  [SyntaxKind.IfStatement]: IfStatement;
  [SyntaxKind.ImportClause]: ImportClause;
  [SyntaxKind.ImportDeclaration]: ImportDeclaration;
  [SyntaxKind.ImportEqualsDeclaration]: ImportEqualsDeclaration;
  [SyntaxKind.ImportSpecifier]: ImportSpecifier;
  [SyntaxKind.ImportType]: ImportTypeNode;
  [SyntaxKind.ImportAttribute]: ImportAttribute;
  [SyntaxKind.ImportAttributes]: ImportAttributes;
  [SyntaxKind.IndexedAccessType]: IndexedAccessTypeNode;
  [SyntaxKind.IndexSignature]: IndexSignatureDeclaration;
  [SyntaxKind.InferType]: InferTypeNode;
  [SyntaxKind.InterfaceDeclaration]: InterfaceDeclaration;
  [SyntaxKind.IntersectionType]: IntersectionTypeNode;
  [SyntaxKind.JSDocAllType]: JSDocAllType;
  [SyntaxKind.JSDocAugmentsTag]: JSDocAugmentsTag;
  [SyntaxKind.JSDocAuthorTag]: JSDocAuthorTag;
  [SyntaxKind.JSDocCallbackTag]: JSDocCallbackTag;
  [SyntaxKind.JSDocClassTag]: JSDocClassTag;
  [SyntaxKind.JSDocDeprecatedTag]: JSDocDeprecatedTag;
  [SyntaxKind.JSDocEnumTag]: JSDocEnumTag;
  [SyntaxKind.JSDocFunctionType]: JSDocFunctionType;
  [SyntaxKind.JSDocImplementsTag]: JSDocImplementsTag;
  [SyntaxKind.JSDocImportTag]: JSDocImportTag;
  [SyntaxKind.JSDocLink]: JSDocLink;
  [SyntaxKind.JSDocLinkCode]: JSDocLinkCode;
  [SyntaxKind.JSDocLinkPlain]: JSDocLinkPlain;
  [SyntaxKind.JSDocMemberName]: JSDocMemberName;
  [SyntaxKind.JSDocNamepathType]: JSDocNamepathType;
  [SyntaxKind.JSDocNameReference]: JSDocNameReference;
  [SyntaxKind.JSDocNonNullableType]: JSDocNonNullableType;
  [SyntaxKind.JSDocNullableType]: JSDocNullableType;
  [SyntaxKind.JSDocOptionalType]: JSDocOptionalType;
  [SyntaxKind.JSDocOverrideTag]: JSDocOverrideTag;
  [SyntaxKind.JSDocParameterTag]: JSDocParameterTag;
  [SyntaxKind.JSDocPrivateTag]: JSDocPrivateTag;
  [SyntaxKind.JSDocPropertyTag]: JSDocPropertyTag;
  [SyntaxKind.JSDocProtectedTag]: JSDocProtectedTag;
  [SyntaxKind.JSDocPublicTag]: JSDocPublicTag;
  [SyntaxKind.JSDocReturnTag]: JSDocReturnTag;
  [SyntaxKind.JSDocReadonlyTag]: JSDocReadonlyTag;
  [SyntaxKind.JSDocThrowsTag]: JSDocThrowsTag;
  [SyntaxKind.JSDocOverloadTag]: JSDocOverloadTag;
  [SyntaxKind.JSDocSatisfiesTag]: JSDocSatisfiesTag;
  [SyntaxKind.JSDocSeeTag]: JSDocSeeTag;
  [SyntaxKind.JSDocSignature]: JSDocSignature;
  [SyntaxKind.JSDocTag]: JSDocUnknownTag;
  [SyntaxKind.JSDocTemplateTag]: JSDocTemplateTag;
  [SyntaxKind.JSDocText]: JSDocText;
  [SyntaxKind.JSDocThisTag]: JSDocThisTag;
  [SyntaxKind.JSDocTypeExpression]: JSDocTypeExpression;
  [SyntaxKind.JSDocTypeLiteral]: JSDocTypeLiteral;
  [SyntaxKind.JSDocTypeTag]: JSDocTypeTag;
  [SyntaxKind.JSDocTypedefTag]: JSDocTypedefTag;
  [SyntaxKind.JSDocUnknownType]: JSDocUnknownType;
  [SyntaxKind.JSDocVariadicType]: JSDocVariadicType;
  [SyntaxKind.JsxAttribute]: JsxAttribute;
  [SyntaxKind.JsxClosingElement]: JsxClosingElement;
  [SyntaxKind.JsxClosingFragment]: JsxClosingFragment;
  [SyntaxKind.JsxElement]: JsxElement;
  [SyntaxKind.JsxExpression]: JsxExpression;
  [SyntaxKind.JsxFragment]: JsxFragment;
  [SyntaxKind.JsxNamespacedName]: JsxNamespacedName;
  [SyntaxKind.JsxOpeningElement]: JsxOpeningElement;
  [SyntaxKind.JsxOpeningFragment]: JsxOpeningFragment;
  [SyntaxKind.JsxSelfClosingElement]: JsxSelfClosingElement;
  [SyntaxKind.JsxSpreadAttribute]: JsxSpreadAttribute;
  [SyntaxKind.JsxText]: JsxText;
  [SyntaxKind.LabeledStatement]: LabeledStatement;
  [SyntaxKind.LiteralType]: LiteralTypeNode;
  [SyntaxKind.MappedType]: MappedTypeNode;
  [SyntaxKind.MetaProperty]: MetaProperty;
  [SyntaxKind.MethodDeclaration]: MethodDeclaration;
  [SyntaxKind.MethodSignature]: MethodSignature;
  [SyntaxKind.ModuleBlock]: ModuleBlock;
  [SyntaxKind.ModuleDeclaration]: ModuleDeclaration;
  [SyntaxKind.NamedExports]: NamedExports;
  [SyntaxKind.NamedImports]: NamedImports;
  [SyntaxKind.NamedTupleMember]: NamedTupleMember;
  [SyntaxKind.NamespaceExport]: NamespaceExport;
  [SyntaxKind.NamespaceImport]: NamespaceImport;
  [SyntaxKind.NewExpression]: NewExpression;
  [SyntaxKind.NonNullExpression]: NonNullExpression;
  [SyntaxKind.NotEmittedStatement]: NotEmittedStatement;
  [SyntaxKind.NoSubstitutionTemplateLiteral]: NoSubstitutionTemplateLiteral;
  [SyntaxKind.NumericLiteral]: NumericLiteral;
  [SyntaxKind.ObjectBindingPattern]: ObjectBindingPattern;
  [SyntaxKind.ObjectLiteralExpression]: ObjectLiteralExpression;
  [SyntaxKind.OmittedExpression]: OmittedExpression;
  [SyntaxKind.OptionalType]: OptionalTypeNode;
  [SyntaxKind.Parameter]: ParameterDeclaration;
  [SyntaxKind.ParenthesizedExpression]: ParenthesizedExpression;
  [SyntaxKind.ParenthesizedType]: ParenthesizedTypeNode;
  [SyntaxKind.PartiallyEmittedExpression]: PartiallyEmittedExpression;
  [SyntaxKind.PostfixUnaryExpression]: PostfixUnaryExpression;
  [SyntaxKind.PrefixUnaryExpression]: PrefixUnaryExpression;
  [SyntaxKind.PrivateIdentifier]: PrivateIdentifier;
  [SyntaxKind.PropertyAccessExpression]: PropertyAccessExpression;
  [SyntaxKind.PropertyAssignment]: PropertyAssignment;
  [SyntaxKind.PropertyDeclaration]: PropertyDeclaration;
  [SyntaxKind.PropertySignature]: PropertySignature;
  [SyntaxKind.RegularExpressionLiteral]: RegularExpressionLiteral;
  [SyntaxKind.RestType]: RestTypeNode;
  [SyntaxKind.ReturnStatement]: ReturnStatement;
  [SyntaxKind.SatisfiesExpression]: SatisfiesExpression;
  [SyntaxKind.SetAccessor]: SetAccessorDeclaration;
  [SyntaxKind.ShorthandPropertyAssignment]: ShorthandPropertyAssignment;
  [SyntaxKind.SpreadAssignment]: SpreadAssignment;
  [SyntaxKind.SpreadElement]: SpreadElement;
  [SyntaxKind.StringLiteral]: StringLiteral;
  [SyntaxKind.SwitchStatement]: SwitchStatement;
  [SyntaxKind.SyntaxList]: SyntaxList;
  [SyntaxKind.TaggedTemplateExpression]: TaggedTemplateExpression;
  [SyntaxKind.TemplateExpression]: TemplateExpression;
  [SyntaxKind.TemplateHead]: TemplateHead;
  [SyntaxKind.TemplateLiteralType]: TemplateLiteralTypeNode;
  [SyntaxKind.TemplateMiddle]: TemplateMiddle;
  [SyntaxKind.TemplateSpan]: TemplateSpan;
  [SyntaxKind.TemplateTail]: TemplateTail;
  [SyntaxKind.ThisType]: ThisTypeNode;
  [SyntaxKind.ThrowStatement]: ThrowStatement;
  [SyntaxKind.TryStatement]: TryStatement;
  [SyntaxKind.TupleType]: TupleTypeNode;
  [SyntaxKind.TypeAliasDeclaration]: TypeAliasDeclaration;
  [SyntaxKind.TypeAssertionExpression]: TypeAssertion;
  [SyntaxKind.TypeLiteral]: TypeLiteralNode;
  [SyntaxKind.TypeOperator]: TypeOperatorTypeNode;
  [SyntaxKind.TypeParameter]: TypeParameterDeclaration;
  [SyntaxKind.TypePredicate]: TypePredicateNode;
  [SyntaxKind.TypeQuery]: TypeQueryNode;
  [SyntaxKind.TypeReference]: TypeReferenceNode;
  [SyntaxKind.UnionType]: UnionTypeNode;
  [SyntaxKind.VariableDeclaration]: VariableDeclaration;
  [SyntaxKind.VariableDeclarationList]: VariableDeclarationList;
  [SyntaxKind.VariableStatement]: VariableStatement;
  [SyntaxKind.JSDoc]: JSDoc;
  [SyntaxKind.TypeOfExpression]: TypeOfExpression;
  [SyntaxKind.WhileStatement]: WhileStatement;
  [SyntaxKind.WithStatement]: WithStatement;
  [SyntaxKind.YieldExpression]: YieldExpression;
  [SyntaxKind.SemicolonToken]: Node<ts.Token<SyntaxKind.SemicolonToken>>;
  [SyntaxKind.InferKeyword]: Node<ts.Token<SyntaxKind.InferKeyword>>;
  [SyntaxKind.NeverKeyword]: Node<ts.Token<SyntaxKind.NeverKeyword>>;
  [SyntaxKind.AnyKeyword]: Expression;
  [SyntaxKind.BooleanKeyword]: Expression;
  [SyntaxKind.NumberKeyword]: Expression;
  [SyntaxKind.ObjectKeyword]: Expression;
  [SyntaxKind.StringKeyword]: Expression;
  [SyntaxKind.SymbolKeyword]: Expression;
  [SyntaxKind.UndefinedKeyword]: Expression;
  [SyntaxKind.FalseKeyword]: FalseLiteral;
  [SyntaxKind.ImportKeyword]: ImportExpression;
  [SyntaxKind.NullKeyword]: NullLiteral;
  [SyntaxKind.SuperKeyword]: SuperExpression;
  [SyntaxKind.ThisKeyword]: ThisExpression;
  [SyntaxKind.TrueKeyword]: TrueLiteral;
  [SyntaxKind.VoidExpression]: VoidExpression;
}

export interface KindToNodeMappings extends ImplementedKindToNodeMappings {
  [kind: number]: Node;
}

export interface KindToExpressionMappings {
  [kind: number]: Node;
  [SyntaxKind.ArrayLiteralExpression]: ArrayLiteralExpression;
  [SyntaxKind.ArrowFunction]: ArrowFunction;
  [SyntaxKind.AsExpression]: AsExpression;
  [SyntaxKind.AwaitExpression]: AwaitExpression;
  [SyntaxKind.BigIntLiteral]: BigIntLiteral;
  [SyntaxKind.BinaryExpression]: BinaryExpression;
  [SyntaxKind.CallExpression]: CallExpression;
  [SyntaxKind.ClassExpression]: ClassExpression;
  [SyntaxKind.CommaListExpression]: CommaListExpression;
  [SyntaxKind.ConditionalExpression]: ConditionalExpression;
  [SyntaxKind.DeleteExpression]: DeleteExpression;
  [SyntaxKind.ElementAccessExpression]: ElementAccessExpression;
  [SyntaxKind.FunctionExpression]: FunctionExpression;
  [SyntaxKind.Identifier]: Identifier;
  [SyntaxKind.JsxClosingFragment]: JsxClosingFragment;
  [SyntaxKind.JsxElement]: JsxElement;
  [SyntaxKind.JsxExpression]: JsxExpression;
  [SyntaxKind.JsxFragment]: JsxFragment;
  [SyntaxKind.JsxOpeningElement]: JsxOpeningElement;
  [SyntaxKind.JsxOpeningFragment]: JsxOpeningFragment;
  [SyntaxKind.JsxSelfClosingElement]: JsxSelfClosingElement;
  [SyntaxKind.MetaProperty]: MetaProperty;
  [SyntaxKind.NewExpression]: NewExpression;
  [SyntaxKind.NonNullExpression]: NonNullExpression;
  [SyntaxKind.NoSubstitutionTemplateLiteral]: NoSubstitutionTemplateLiteral;
  [SyntaxKind.NumericLiteral]: NumericLiteral;
  [SyntaxKind.ObjectLiteralExpression]: ObjectLiteralExpression;
  [SyntaxKind.OmittedExpression]: OmittedExpression;
  [SyntaxKind.ParenthesizedExpression]: ParenthesizedExpression;
  [SyntaxKind.PartiallyEmittedExpression]: PartiallyEmittedExpression;
  [SyntaxKind.PostfixUnaryExpression]: PostfixUnaryExpression;
  [SyntaxKind.PrefixUnaryExpression]: PrefixUnaryExpression;
  [SyntaxKind.PropertyAccessExpression]: PropertyAccessExpression;
  [SyntaxKind.RegularExpressionLiteral]: RegularExpressionLiteral;
  [SyntaxKind.SatisfiesExpression]: SatisfiesExpression;
  [SyntaxKind.SpreadElement]: SpreadElement;
  [SyntaxKind.StringLiteral]: StringLiteral;
  [SyntaxKind.TaggedTemplateExpression]: TaggedTemplateExpression;
  [SyntaxKind.TemplateExpression]: TemplateExpression;
  [SyntaxKind.TypeAssertionExpression]: TypeAssertion;
  [SyntaxKind.TypeOfExpression]: TypeOfExpression;
  [SyntaxKind.YieldExpression]: YieldExpression;
  [SyntaxKind.AnyKeyword]: Expression;
  [SyntaxKind.BooleanKeyword]: Expression;
  [SyntaxKind.NumberKeyword]: Expression;
  [SyntaxKind.ObjectKeyword]: Expression;
  [SyntaxKind.StringKeyword]: Expression;
  [SyntaxKind.SymbolKeyword]: Expression;
  [SyntaxKind.UndefinedKeyword]: Expression;
  [SyntaxKind.FalseKeyword]: FalseLiteral;
  [SyntaxKind.ImportKeyword]: ImportExpression;
  [SyntaxKind.NullKeyword]: NullLiteral;
  [SyntaxKind.SuperKeyword]: SuperExpression;
  [SyntaxKind.ThisKeyword]: ThisExpression;
  [SyntaxKind.TrueKeyword]: TrueLiteral;
  [SyntaxKind.VoidExpression]: VoidExpression;
}

declare const BigIntLiteralBase: typeof LiteralExpression;

export declare class BigIntLiteral extends BigIntLiteralBase<ts.BigIntLiteral> {
  /**
   * Gets the BigInt literal value.
   *
   * Assert this as a `bigint` in environments that support it.
   */
  getLiteralValue(): unknown;
  /**
   * Sets the bigint literal value.
   * @param value - Value to set (must provide a bigint here at runtime).
   */
  setLiteralValue(value: unknown): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.BigIntLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.BigIntLiteral>>;
}

declare const TrueLiteralBase: typeof PrimaryExpression;

export declare class TrueLiteral extends TrueLiteralBase<ts.TrueLiteral> {
  /** Gets the literal value. */
  getLiteralValue(): boolean;
  /**
   * Sets the literal value.
   *
   * Note: This forgets the current node and returns the new node if the value changes.
   * @param value - Value to set.
   */
  setLiteralValue(value: boolean): this | FalseLiteral;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TrueLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TrueLiteral>>;
}

declare const FalseLiteralBase: typeof PrimaryExpression;

export declare class FalseLiteral extends FalseLiteralBase<ts.FalseLiteral> {
  /** Gets the literal value. */
  getLiteralValue(): boolean;
  /**
   * Sets the literal value.
   *
   * Note: This forgets the current node and returns the new node if the value changes.
   * @param value - Value to set.
   */
  setLiteralValue(value: boolean): this | TrueLiteral;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.FalseLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.FalseLiteral>>;
}

declare const NullLiteralBase: typeof PrimaryExpression;

export declare class NullLiteral extends NullLiteralBase<ts.NullLiteral> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NullLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NullLiteral>>;
}

declare const NumericLiteralBase: typeof LiteralExpression;

export declare class NumericLiteral extends NumericLiteralBase<ts.NumericLiteral> {
  /** Gets the literal value. */
  getLiteralValue(): number;
  /**
   * Sets the literal value.
   * @param value - Value to set.
   */
  setLiteralValue(value: number): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NumericLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NumericLiteral>>;
}

/** Quote type for a string literal. */
export declare enum QuoteKind {
  /** Single quote */
  Single = "'",
  /** Double quote */
  Double = "\""
}

declare const RegularExpressionLiteralBase: typeof LiteralExpression;

export declare class RegularExpressionLiteral extends RegularExpressionLiteralBase<ts.RegularExpressionLiteral> {
  /** Gets the literal value. */
  getLiteralValue(): RegExp;
  /**
   * Sets the literal value according to a pattern and some flags.
   * @param pattern - Pattern.
   * @param flags - Flags.
   */
  setLiteralValue(pattern: string, flags?: string): this;
  /**
   * Sets the literal value according to a regular expression object.
   * @param regExp - Regular expression.
   */
  setLiteralValue(regExp: RegExp): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.RegularExpressionLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.RegularExpressionLiteral>>;
}

declare const StringLiteralBase: typeof LiteralExpression;

export declare class StringLiteral extends StringLiteralBase<ts.StringLiteral> {
  /**
   * Gets the literal value.
   *
   * This is equivalent to .getLiteralText() for string literals and only exists for consistency with other literals.
   */
  getLiteralValue(): string;
  /**
   * Sets the literal value.
   * @param value - Value to set.
   */
  setLiteralValue(value: string): this;
  /** Gets the quote kind. */
  getQuoteKind(): QuoteKind;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.StringLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.StringLiteral>>;
}

declare const NoSubstitutionTemplateLiteralBase: typeof LiteralExpression;

export declare class NoSubstitutionTemplateLiteral extends NoSubstitutionTemplateLiteralBase<ts.NoSubstitutionTemplateLiteral> {
  /** Gets the literal value. */
  getLiteralValue(): string;
  /**
   * Sets the literal value.
   *
   * Note: This could possibly replace the node if you add a tagged template.
   * @param value - Value to set.
   * @returns The new node if the kind changed; the current node otherwise.
   */
  setLiteralValue(value: string): TemplateLiteral;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NoSubstitutionTemplateLiteral>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NoSubstitutionTemplateLiteral>>;
}

export declare class TaggedTemplateExpression extends MemberExpression<ts.TaggedTemplateExpression> {
  /** Gets the tag. */
  getTag(): LeftHandSideExpression;
  /** Gets the template literal. */
  getTemplate(): TemplateLiteral;
  /**
   * Removes the tag from the tagged template.
   * @returns The new template expression.
   */
  removeTag(): TemplateLiteral;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TaggedTemplateExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TaggedTemplateExpression>>;
}

declare const TemplateExpressionBase: typeof PrimaryExpression;

export declare class TemplateExpression extends TemplateExpressionBase<ts.TemplateExpression> {
  /** Gets the template head. */
  getHead(): TemplateHead;
  /** Gets the template spans. */
  getTemplateSpans(): TemplateSpan[];
  /**
   * Sets the literal value.
   *
   * Note: This could possibly replace the node if you remove all the tagged templates.
   * @param value - Value to set.
   * @returns The new node if the kind changed; the current node otherwise.
   */
  setLiteralValue(value: string): Node<ts.Node>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateExpression>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateExpression>>;
}

declare const TemplateHeadBase: Constructor<LiteralLikeNode> & typeof Node;

export declare class TemplateHead extends TemplateHeadBase<ts.TemplateHead> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateHead>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateHead>>;
}

declare const TemplateMiddleBase: Constructor<LiteralLikeNode> & typeof Node;

export declare class TemplateMiddle extends TemplateMiddleBase<ts.TemplateMiddle> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateMiddle>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateMiddle>>;
}

declare const TemplateSpanBase: Constructor<ExpressionedNode> & typeof Node;

export declare class TemplateSpan extends TemplateSpanBase<ts.TemplateSpan> {
  /** Gets the template literal. */
  getLiteral(): TemplateMiddle | TemplateTail;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateSpan>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateSpan>>;
}

declare const TemplateTailBase: Constructor<LiteralLikeNode> & typeof Node;

export declare class TemplateTail extends TemplateTailBase<ts.TemplateTail> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateTail>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateTail>>;
}

declare const ExportAssignmentBase: Constructor<ExpressionedNode> & Constructor<JSDocableNode> & typeof Statement;

export declare class ExportAssignment extends ExportAssignmentBase<ts.ExportAssignment> {
  /**
   * Gets if this is an export equals assignment.
   *
   * If this is false, then it's `export default`.
   */
  isExportEquals(): boolean;
  /**
   * Sets if this is an export equals assignment or export default.
   * @param value - Whether it should be an export equals assignment.
   */
  setIsExportEquals(value: boolean): this;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ExportAssignmentStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ExportAssignmentStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExportAssignment>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExportAssignment>>;
}

declare const ExportDeclarationBase: typeof Statement;

export declare class ExportDeclaration extends ExportDeclarationBase<ts.ExportDeclaration> {
  /** Gets if this export declaration is type only. */
  isTypeOnly(): boolean;
  /** Sets if this export declaration is type only. */
  setIsTypeOnly(value: boolean): this;
  /** Gets the namespace export or returns undefined if it doesn't exist. (ex. `* as ns`, but not `*`). */
  getNamespaceExport(): NamespaceExport | undefined;
  /** Gets the namespace export or throws if it doesn't exist. (ex. `* as ns`, but not `*`) */
  getNamespaceExportOrThrow(message?: string | (() => string)): NamespaceExport;
  /** Sets the namespace export name. */
  setNamespaceExport(name: string): this;
  /**
   * Sets the import specifier.
   * @param text - Text to set as the module specifier.
   */
  setModuleSpecifier(text: string): this;
  /**
   * Sets the import specifier.
   * @param sourceFile - Source file to set the module specifier from.
   */
  setModuleSpecifier(sourceFile: SourceFile): this;
  /** Gets the module specifier or undefined if it doesn't exist. */
  getModuleSpecifier(): StringLiteral | undefined;
  /** Gets the module specifier value or undefined if it doesn't exist. */
  getModuleSpecifierValue(): string | undefined;
  /** Gets the source file referenced in the module specifier or throws if it can't find it or it doesn't exist. */
  getModuleSpecifierSourceFileOrThrow(message?: string | (() => string)): SourceFile;
  /** Gets the source file referenced in the module specifier. */
  getModuleSpecifierSourceFile(): SourceFile | undefined;
  /** Gets if the module specifier starts with `./` or `../`. */
  isModuleSpecifierRelative(): boolean;
  /** Removes the module specifier. */
  removeModuleSpecifier(): this;
  /** Gets if the module specifier exists */
  hasModuleSpecifier(): boolean;
  /** Gets if this export declaration is a namespace export. */
  isNamespaceExport(): boolean;
  /** Gets if the export declaration has named exports. */
  hasNamedExports(): boolean;
  /**
   * Adds a named export.
   * @param namedExport - Structure, name, or writer function to write the named export.
   */
  addNamedExport(namedExport: OptionalKind<ExportSpecifierStructure> | string | WriterFunction): ExportSpecifier;
  /**
   * Adds named exports.
   * @param namedExports - Structures, names, or writer function to write the named exports.
   */
  addNamedExports(namedExports: ReadonlyArray<OptionalKind<ExportSpecifierStructure> | string | WriterFunction> | WriterFunction): ExportSpecifier[];
  /**
   * Inserts a named export.
   * @param index - Child index to insert at.
   * @param namedExport - Structure, name, or writer function to write the named export.
   */
  insertNamedExport(index: number, namedExport: OptionalKind<ExportSpecifierStructure> | string | WriterFunction): ExportSpecifier;
  /**
   * Inserts named exports into the export declaration.
   * @param index - Child index to insert at.
   * @param namedExports - Structures, names, or writer funciton to write the named exports.
   */
  insertNamedExports(index: number, namedExports: ReadonlyArray<OptionalKind<ExportSpecifierStructure> | string | WriterFunction> | WriterFunction): ExportSpecifier[];
  /** Gets the named exports. */
  getNamedExports(): ExportSpecifier[];
  /** Changes the export declaration to namespace export. Removes all the named exports. */
  toNamespaceExport(): this;
  /** Sets the import attributes. */
  setAttributes(elements: ReadonlyArray<OptionalKind<ImportAttributeStructure>> | undefined): this;
  /** Gets the import attributes or returns undefined if it doesn't exist. */
  getAttributes(): ImportAttributes | undefined;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ExportDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ExportDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExportDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExportDeclaration>>;
}

declare const ExportSpecifierBase: typeof Node;

export declare class ExportSpecifier extends ExportSpecifierBase<ts.ExportSpecifier> {
  /** Sets the name of what's being exported. */
  setName(name: string): this;
  /** Gets the name of the export specifier. */
  getName(): string;
  /** Gets the name node of what's being exported. */
  getNameNode(): StringLiteral | Identifier;
  /**
   * Sets the alias for the name being exported and renames all the usages.
   * @param alias - Alias to set.
   */
  renameAlias(alias: string): this;
  /**
   * Sets the alias without renaming all the usages.
   * @param alias - Alias to set.
   */
  setAlias(alias: string): this;
  /**
   * Removes the alias without renaming.
   * @remarks Use removeAliasWithRename() if you want it to rename any usages to the name of the export specifier.
   */
  removeAlias(): this;
  /** Removes the alias and renames any usages to the name of the export specifier. */
  removeAliasWithRename(): this;
  /** Gets the alias identifier, if it exists. */
  getAliasNode(): StringLiteral | Identifier | undefined;
  /** Gets if this is a type only import specifier. */
  isTypeOnly(): boolean;
  /** Sets if this is a type only import specifier. */
  setIsTypeOnly(value: boolean): this;
  /** Gets the export declaration associated with this export specifier. */
  getExportDeclaration(): ExportDeclaration;
  /** Gets the local target symbol of the export specifier or throws if it doesn't exist. */
  getLocalTargetSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets the local target symbol of the export specifier or undefined if it doesn't exist. */
  getLocalTargetSymbol(): Symbol | undefined;
  /** Gets all the declarations referenced by the export specifier. */
  getLocalTargetDeclarations(): LocalTargetDeclarations[];
  /** Removes the export specifier. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ExportSpecifierStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ExportSpecifierStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExportSpecifier>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExportSpecifier>>;
}

declare const ExternalModuleReferenceBase: Constructor<ExpressionableNode> & typeof Node;

export declare class ExternalModuleReference extends ExternalModuleReferenceBase<ts.ExternalModuleReference> {
  /** Gets the source file referenced or throws if it can't find it. */
  getReferencedSourceFileOrThrow(message?: string | (() => string)): SourceFile;
  /** Gets if the external module reference is relative. */
  isRelative(): boolean;
  /** Gets the source file referenced or returns undefined if it can't find it. */
  getReferencedSourceFile(): SourceFile | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExternalModuleReference>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExternalModuleReference>>;
}

declare const ImportAttributeBase: Constructor<ImportAttributeNamedNode> & typeof Node;

export declare class ImportAttribute extends ImportAttributeBase<ts.ImportAttribute> {
  /** Gets the value of the assert entry. */
  getValue(): Expression;
  /** Sets the name and value. */
  set(structure: Partial<ImportAttributeStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ImportAttributeStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportAttribute>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportAttribute>>;
}

declare const ImportAttributesBase: typeof Node;

export declare class ImportAttributes extends ImportAttributesBase<ts.ImportAttributes> {
  /** Sets the elements in the import attributes */
  setElements(elements: ReadonlyArray<OptionalKind<ImportAttributeStructure>>): this;
  /** Gets the elements of the import attributes. */
  getElements(): ImportAttribute[];
  /** Removes the assert clause. */
  remove(): void;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportAttributes>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportAttributes>>;
}

declare const ImportClauseBase: typeof Node;

export declare class ImportClause extends ImportClauseBase<ts.ImportClause> {
  /** Gets the phase modifier of the import clause. */
  getPhaseModifier(): ImportPhaseModifierSyntaxKind | undefined;
  /** Gets if this import clause is type only. */
  isTypeOnly(): boolean;
  /** Sets if this import declaration is type only. */
  setIsTypeOnly(value: boolean): this;
  /** Gets if this import clause has a defer phase modifier. */
  isDeferred(): boolean;
  /**
   * Sets if this import declaration should have a defer keyword.
   * @throws When not a namespace import.
   */
  setIsDeferred(value: boolean): this;
  /** Gets the default import or throws if it doesn't exit. */
  getDefaultImportOrThrow(message?: string | (() => string)): Identifier;
  /** Gets the default import or returns undefined if it doesn't exist. */
  getDefaultImport(): Identifier | undefined;
  /** Gets the named bindings of the import clause or throws if it doesn't exist. */
  getNamedBindingsOrThrow(message?: string | (() => string)): NamespaceImport | NamedImports;
  /** Gets the named bindings of the import clause or returns undefined if it doesn't exist. */
  getNamedBindings(): NamespaceImport | NamedImports | undefined;
  /** Gets the namespace import if it exists or throws. */
  getNamespaceImportOrThrow(message?: string | (() => string)): Identifier;
  /** Gets the namespace import identifier, if it exists. */
  getNamespaceImport(): Identifier | undefined;
  /** Gets the namespace import identifier, if it exists. */
  getNamedImports(): ImportSpecifier[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportClause>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportClause>>;
}

declare const ImportDeclarationBase: typeof Statement;

export declare class ImportDeclaration extends ImportDeclarationBase<ts.ImportDeclaration> {
  /** Gets if this import declaration is type only. */
  isTypeOnly(): boolean;
  /** Sets if this import declaration is type only. */
  setIsTypeOnly(value: boolean): this;
  /** Gets if this import declaration has a `defer` phase modifier. */
  isDeferred(): boolean;
  /**
   * Sets if this import declaration is a deferred import.
   * @throws When the import is not a namespace import.
   */
  setIsDeferred(value: boolean): this;
  /** Gets the phase modifier of the import declaration. */
  getPhaseModifier(): ImportPhaseModifierSyntaxKind | undefined;
  /**
   * Sets the import specifier.
   * @param text - Text to set as the module specifier.
   */
  setModuleSpecifier(text: string): this;
  /**
   * Sets the import specifier.
   * @param sourceFile - Source file to set the module specifier from.
   */
  setModuleSpecifier(sourceFile: SourceFile): this;
  /** Gets the module specifier. */
  getModuleSpecifier(): StringLiteral;
  /** Gets the module specifier string literal value. */
  getModuleSpecifierValue(): string;
  /** Gets the source file referenced in the module specifier or throws if it can't find it. */
  getModuleSpecifierSourceFileOrThrow(message?: string | (() => string)): SourceFile;
  /** Gets the source file referenced in the module specifier or returns undefined if it can't find it. */
  getModuleSpecifierSourceFile(): SourceFile | undefined;
  /** Gets if the module specifier starts with `./` or `../`. */
  isModuleSpecifierRelative(): boolean;
  /**
   * Sets the default import.
   * @param text - Text to set as the default import.
   * @remarks Use renameDefaultImport to rename.
   */
  setDefaultImport(text: string): this;
  /**
   * Renames or sets the provided default import.
   * @param text - Text to set or rename the default import with.
   */
  renameDefaultImport(text: string): this;
  /** Gets the default import or throws if it doesn't exit. */
  getDefaultImportOrThrow(message?: string | (() => string)): Identifier;
  /** Gets the default import or returns undefined if it doesn't exist. */
  getDefaultImport(): Identifier | undefined;
  /**
   * Sets the namespace import.
   * @param text - Text to set as the namespace import.
   * @throws - InvalidOperationError if a named import exists.
   */
  setNamespaceImport(text: string): this;
  /** Removes the namespace import. */
  removeNamespaceImport(): this;
  /** Removes the default import. */
  removeDefaultImport(): this;
  /** Gets the namespace import if it exists or throws. */
  getNamespaceImportOrThrow(message?: string | (() => string)): Identifier;
  /** Gets the namespace import identifier, if it exists. */
  getNamespaceImport(): Identifier | undefined;
  /**
   * Adds a named import.
   * @param namedImport - Name, structure, or writer to write the named import with.
   */
  addNamedImport(namedImport: OptionalKind<ImportSpecifierStructure> | string | WriterFunction): ImportSpecifier;
  /**
   * Adds named imports.
   * @param namedImport - Structures, names, or writer function to write the named import with.
   */
  addNamedImports(namedImports: ReadonlyArray<OptionalKind<ImportSpecifierStructure> | string | WriterFunction> | WriterFunction): ImportSpecifier[];
  /**
   * Inserts a named import.
   * @param index - Child index to insert at.
   * @param namedImport - Structure, name, or writer function to write the named import with.
   */
  insertNamedImport(index: number, namedImport: OptionalKind<ImportSpecifierStructure> | string | WriterFunction): ImportSpecifier;
  /**
   * Inserts named imports into the import declaration.
   * @param index - Child index to insert at.
   * @param namedImports - Structures, names, or writer function to write the named import with.
   */
  insertNamedImports(index: number, namedImports: ReadonlyArray<OptionalKind<ImportSpecifierStructure> | string | WriterFunction> | WriterFunction): ImportSpecifier[];
  /** Gets the named imports. */
  getNamedImports(): ImportSpecifier[];
  /**
   * Removes all the named imports.
   * @remarks To remove a single named import, get the named import and call `#remove()` on it.
   */
  removeNamedImports(): this;
  /** Gets the import clause or throws if it doesn't exist. */
  getImportClauseOrThrow(message?: string | (() => string)): ImportClause;
  /** Gets the import clause or returns undefined if it doesn't exist. */
  getImportClause(): ImportClause | undefined;
  /** Sets the import attributes. */
  setAttributes(elements: ReadonlyArray<OptionalKind<ImportAttributeStructure>> | undefined): this;
  /** Gets the import attributes or returns undefined if it doesn't exist. */
  getAttributes(): ImportAttributes | undefined;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ImportDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ImportDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportDeclaration>>;
}

declare const ImportEqualsDeclarationBase: Constructor<ExportableNode> & Constructor<ModifierableNode> & Constructor<JSDocableNode> & Constructor<NamedNode> & typeof Statement;

export declare class ImportEqualsDeclaration extends ImportEqualsDeclarationBase<ts.ImportEqualsDeclaration> {
  /** Gets if this import equals declaration is type only. */
  isTypeOnly(): boolean;
  /** Sets if this import equals declaration is type only. */
  setIsTypeOnly(value: boolean): this;
  /** Gets the module reference of the import equals declaration. */
  getModuleReference(): ModuleReference;
  /** Gets if the external module reference is relative. */
  isExternalModuleReferenceRelative(): boolean;
  /**
   * Sets the external module reference.
   * @param externalModuleReference - External module reference as a string.
   */
  setExternalModuleReference(externalModuleReference: string): this;
  /**
   * Sets the external module reference.
   * @param sourceFile - Source file to set the external module reference to.
   */
  setExternalModuleReference(sourceFile: SourceFile): this;
  /** Gets the source file referenced in the external module reference or throws if it doesn't exist. */
  getExternalModuleReferenceSourceFileOrThrow(message?: string | (() => string)): SourceFile;
  /** Gets the source file referenced in the external module reference or returns undefined if it doesn't exist. */
  getExternalModuleReferenceSourceFile(): SourceFile | undefined;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportEqualsDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportEqualsDeclaration>>;
}

declare const ImportSpecifierBase: typeof Node;

export declare class ImportSpecifier extends ImportSpecifierBase<ts.ImportSpecifier> {
  /**
   * Sets the identifier being imported.
   * @param name - Name being imported.
   */
  setName(name: string): this;
  /** Gets the name of the import specifier. */
  getName(): string;
  /** Gets the name node of what's being imported. */
  getNameNode(): StringLiteral | Identifier;
  /**
   * Sets the alias for the name being imported and renames all the usages.
   * @param alias - Alias to set.
   */
  renameAlias(alias: string): this;
  /**
   * Sets the alias without renaming all the usages.
   * @param alias - Alias to set.
   */
  setAlias(alias: string): this;
  /**
   * Removes the alias without renaming.
   * @remarks Use removeAliasWithRename() if you want it to rename any usages to the name of the import specifier.
   */
  removeAlias(): this;
  /** Removes the alias and renames any usages to the name of the import specifier. */
  removeAliasWithRename(): this;
  /** Gets the alias identifier, if it exists. */
  getAliasNode(): Identifier | undefined;
  /** Gets if this is a type only import specifier. */
  isTypeOnly(): boolean;
  /** Sets if this is a type only import specifier. */
  setIsTypeOnly(value: boolean): this;
  /** Gets the import declaration associated with this import specifier. */
  getImportDeclaration(): ImportDeclaration;
  /** Remove the import specifier. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ImportSpecifierStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ImportSpecifierStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportSpecifier>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportSpecifier>>;
}

declare const ModuleBlockBase: Constructor<StatementedNode> & typeof Statement;

export declare class ModuleBlock extends ModuleBlockBase<ts.ModuleBlock> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ModuleBlock>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ModuleBlock>>;
}

export declare function ModuleChildableNode<T extends Constructor<ModuleChildableNodeExtensionType>>(Base: T): Constructor<ModuleChildableNode> & T;

export interface ModuleChildableNode {
  /** Gets the parent module declaration or undefined if it doesn't exist. */
  getParentModule(): ModuleDeclaration | undefined;
  /** Gets the parent module declaration or throws if it doesn't exist. */
  getParentModuleOrThrow(message?: string | (() => string)): ModuleDeclaration;
}

type ModuleChildableNodeExtensionType = Node;
declare const ModuleDeclarationBase: Constructor<ModuledNode> & Constructor<UnwrappableNode> & Constructor<TextInsertableNode> & Constructor<BodyableNode> & Constructor<ModuleChildableNode> & Constructor<StatementedNode> & Constructor<JSDocableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & Constructor<ModuleNamedNode> & typeof Statement;

export declare class ModuleDeclaration extends ModuleDeclarationBase<ts.ModuleDeclaration> {
  /** Gets the full name of the namespace. */
  getName(): string;
  /**
   * Sets the name without renaming references.
   * @param newName - New full namespace name.
   */
  setName(newName: string): this;
  /**
   * Renames the module name.
   *
   * Note: The TS compiler does not update module declarations for string literal module names unfortunately.
   * @param newName - New name.
   * @param options - Options for renaming.
   */
  rename(newName: string, options?: RenameOptions): this;
  /** Gets the name nodes or the string literal. */
  getNameNodes(): Identifier[] | StringLiteral;
  /** Gets if this namespace has a namespace keyword. */
  hasNamespaceKeyword(): boolean;
  /** Gets if this namespace has a namespace keyword. */
  hasModuleKeyword(): boolean;
  /**
   * Sets the namespace declaration kind.
   * @param kind - Kind to set.
   */
  setDeclarationKind(kind: ModuleDeclarationKind): this;
  /** Gets the namesapce declaration kind. */
  getDeclarationKind(): ModuleDeclarationKind;
  /** Gets the namespace or module keyword or returns undefined if it's global. */
  getDeclarationKindKeyword(): Node<ts.Node> | undefined;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<ModuleDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): ModuleDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ModuleDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ModuleDeclaration>>;
}

export declare enum ModuleDeclarationKind {
  Namespace = "namespace",
  Module = "module",
  Global = "global"
}

declare const NamedExportsBase: typeof Node;

export declare class NamedExports extends NamedExportsBase<ts.NamedExports> {
  /** Gets the export specifiers. */
  getElements(): ExportSpecifier[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NamedExports>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NamedExports>>;
}

declare const NamedImportsBase: typeof Node;

export declare class NamedImports extends NamedImportsBase<ts.NamedImports> {
  /** Gets the import specifiers. */
  getElements(): ImportSpecifier[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NamedImports>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NamedImports>>;
}

declare const NamespaceExportBase: Constructor<RenameableNode> & typeof Node;

export declare class NamespaceExport extends NamespaceExportBase<ts.NamespaceExport> {
  /** Sets the name of the namespace export. */
  setName(name: string): this;
  /** Gets the name of the namespace export. */
  getName(): string;
  /** Gets the namespace export's name node. */
  getNameNode(): StringLiteral | Identifier;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NamespaceExport>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NamespaceExport>>;
}

declare const NamespaceImportBase: Constructor<RenameableNode> & typeof Node;

export declare class NamespaceImport extends NamespaceImportBase<ts.NamespaceImport> {
  /** Sets the name of the namespace import. */
  setName(name: string): this;
  /** Gets the name of the namespace import. */
  getName(): string;
  /** Gets the namespace import's name node. */
  getNameNode(): Identifier;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NamespaceImport>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NamespaceImport>>;
}

export declare class FileReference extends TextRange<ts.FileReference> {
  constructor(compilerObject: ts.FileReference, sourceFile: SourceFile);
  /** Gets the referenced file name. */
  getFileName(): string;
}

/** Result of refreshing a source file from the file system. */
export declare enum FileSystemRefreshResult {
  /** The source file did not change. */
  NoChange = 0,
  /** The source file was updated from the file system. */
  Updated = 1,
  /** The source file was deleted. */
  Deleted = 2
}

export interface SourceFileCopyOptions {
  overwrite?: boolean;
}

export interface SourceFileMoveOptions {
  overwrite?: boolean;
}

/** Options for emitting a source file. */
export interface SourceFileEmitOptions extends EmitOptionsBase {
}

declare const SourceFileBase: Constructor<ModuledNode> & Constructor<StatementedNode> & Constructor<TextInsertableNode> & typeof Node;

export declare class SourceFile extends SourceFileBase<ts.SourceFile> {
  #private;
  private constructor();
  /** Gets the file path. */
  getFilePath(): StandardizedFilePath;
  /** Gets the file path's base name. */
  getBaseName(): string;
  /** Gets the file path's base name without the extension. */
  getBaseNameWithoutExtension(): string;
  /** Gets the file path's extension. */
  getExtension(): string;
  /** Gets the directory that the source file is contained in. */
  getDirectory(): Directory;
  /** Gets the directory path that the source file is contained in. */
  getDirectoryPath(): StandardizedFilePath;
  /** Gets the full text with leading trivia. */
  getFullText(): string;
  /**
   * Gets the line and column number at the provided position (1-indexed).
   * @param pos - Position in the source file.
   */
  getLineAndColumnAtPos(pos: number): {
        line: number;
        column: number;
    };
  /**
   * Gets the character count from the start of the line to the provided position.
   * @param pos - Position.
   */
  getLengthFromLineStartAtPos(pos: number): number;
  /**
   * Copies this source file to the specified directory.
   *
   * This will modify the module specifiers in the new file, if necessary.
   * @param dirPathOrDirectory Directory path or directory object to copy the file to.
   * @param options Options for copying.
   * @returns The source file the copy was made to.
   */
  copyToDirectory(dirPathOrDirectory: string | Directory, options?: SourceFileCopyOptions): SourceFile;
  /**
   * Copy this source file to a new file.
   *
   * This will modify the module specifiers in the new file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for copying.
   */
  copy(filePath: string, options?: SourceFileCopyOptions): SourceFile;
  /**
   * Copy this source file to a new file and immediately saves it to the file system asynchronously.
   *
   * This will modify the module specifiers in the new file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for copying.
   */
  copyImmediately(filePath: string, options?: SourceFileCopyOptions): Promise<SourceFile>;
  /**
   * Copy this source file to a new file and immediately saves it to the file system synchronously.
   *
   * This will modify the module specifiers in the new file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for copying.
   */
  copyImmediatelySync(filePath: string, options?: SourceFileCopyOptions): SourceFile;
  /**
   * Moves this source file to the specified directory.
   *
   * This will modify the module specifiers in other files that specify this file and the module specifiers in the current file, if necessary.
   * @param dirPathOrDirectory Directory path or directory object to move the file to.
   * @param options Options for moving.
   */
  moveToDirectory(dirPathOrDirectory: string | Directory, options?: SourceFileMoveOptions): SourceFile;
  /**
   * Moves this source file to a new file.
   *
   * This will modify the module specifiers in other files that specify this file and the module specifiers in the current file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for moving.
   */
  move(filePath: string, options?: SourceFileMoveOptions): SourceFile;
  /**
   * Moves this source file to a new file and asynchronously updates the file system immediately.
   *
   * This will modify the module specifiers in other files that specify this file and the module specifiers in the current file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for moving.
   */
  moveImmediately(filePath: string, options?: SourceFileMoveOptions): Promise<SourceFile>;
  /**
   * Moves this source file to a new file and synchronously updates the file system immediately.
   *
   * This will modify the module specifiers in other files that specify this file and the module specifiers in the current file, if necessary.
   * @param filePath - New file path. Can be relative to the original file or an absolute path.
   * @param options - Options for moving.
   */
  moveImmediatelySync(filePath: string, options?: SourceFileMoveOptions): SourceFile;
  /**
   * Queues a deletion of the file to the file system.
   *
   * The file will be deleted when you call ast.save(). If you wish to immediately delete the file, then use deleteImmediately().
   */
  delete(): void;
  /** Asynchronously deletes the file from the file system. */
  deleteImmediately(): Promise<void>;
  /** Synchronously deletes the file from the file system. */
  deleteImmediatelySync(): void;
  /** Asynchronously saves this file with any changes. */
  save(): Promise<void>;
  /** Synchronously saves this file with any changes. */
  saveSync(): void;
  /** Gets any `/// <reference path="..." />` comments. */
  getPathReferenceDirectives(): FileReference[];
  /** Gets any `/// <reference types="..." />` comments. */
  getTypeReferenceDirectives(): FileReference[];
  /** Gets any `/// <reference lib="..." />` comments. */
  getLibReferenceDirectives(): FileReference[];
  /** Gets any source files that reference this source file. */
  getReferencingSourceFiles(): SourceFile[];
  /** Gets the import and exports in other source files that reference this source file. */
  getReferencingNodesInOtherSourceFiles(): SourceFileReferencingNodes[];
  /** Gets the string literals in other source files that reference this source file. */
  getReferencingLiteralsInOtherSourceFiles(): StringLiteral[];
  /** Gets the source files this source file references in string literals. */
  getReferencedSourceFiles(): SourceFile[];
  /** Gets the nodes that reference other source files in string literals. */
  getNodesReferencingOtherSourceFiles(): SourceFileReferencingNodes[];
  /**
   * Gets the string literals in this source file that references other source files.
   * @remarks This is similar to `getImportStringLiterals()`, but `getImportStringLiterals()`
   * will return import string literals that may not be referencing another source file
   * or have not been able to be resolved.
   */
  getLiteralsReferencingOtherSourceFiles(): StringLiteral[];
  /** Gets all the descendant string literals that reference a module. */
  getImportStringLiterals(): StringLiteral[];
  /** Gets the script target of the source file. */
  getLanguageVersion(): ScriptTarget;
  /** Gets the language variant of the source file. */
  getLanguageVariant(): LanguageVariant;
  /** Gets the script kind of the source file. */
  getScriptKind(): ScriptKind;
  /** Gets if this is a declaration file. */
  isDeclarationFile(): boolean;
  /** Gets if the source file was discovered while loading an external library. */
  isFromExternalLibrary(): boolean;
  /** Gets if the source file is a descendant of a node_modules directory. */
  isInNodeModules(): boolean;
  /** Gets if this source file has been saved or if the latest changes have been saved. */
  isSaved(): boolean;
  /** Gets the pre-emit diagnostics of the specified source file. */
  getPreEmitDiagnostics(): Diagnostic[];
  /**
   * Deindents the line at the specified position.
   * @param pos - Position.
   * @param times - Times to unindent. Specify a negative value to indent.
   */
  unindent(pos: number, times?: number): this;
  /**
   * Deindents the lines within the specified range.
   * @param positionRange - Position range.
   * @param times - Times to unindent. Specify a negative value to indent.
   */
  unindent(positionRange: [number, number], times?: number): this;
  /**
   * Indents the line at the specified position.
   * @param pos - Position.
   * @param times - Times to indent. Specify a negative value to unindent.
   */
  indent(pos: number, times?: number): this;
  /**
   * Indents the lines within the specified range.
   * @param positionRange - Position range.
   * @param times - Times to indent. Specify a negative value to unindent.
   */
  indent(positionRange: [number, number], times?: number): this;
  /** Asynchronously emits the source file as a JavaScript file. */
  emit(options?: SourceFileEmitOptions): Promise<EmitResult>;
  /** Synchronously emits the source file as a JavaScript file. */
  emitSync(options?: SourceFileEmitOptions): EmitResult;
  /**
   * Gets the emit output of this source file.
   * @param options - Emit options.
   */
  getEmitOutput(options?: {
        emitOnlyDtsFiles?: boolean;
    }): EmitOutput;
  /**
   * Formats the source file text using the internal TypeScript formatting API.
   * @param settings - Format code settings.
   */
  formatText(settings?: FormatCodeSettings): void;
  /**
   * Refresh the source file from the file system.
   *
   * WARNING: When updating from the file system, this will "forget" any previously navigated nodes.
   * @returns What action ended up taking place.
   */
  refreshFromFileSystem(): Promise<FileSystemRefreshResult>;
  /**
   * Synchronously refreshes the source file from the file system.
   *
   * WARNING: When updating from the file system, this will "forget" any previously navigated nodes.
   * @returns What action ended up taking place.
   */
  refreshFromFileSystemSync(): FileSystemRefreshResult;
  /**
   * Gets the relative path to the specified path.
   * @param fileOrDirPath - The file or directory path.
   */
  getRelativePathTo(fileOrDirPath: string): string;
  /**
   * Gets the relative path to another source file.
   * @param sourceFile - Source file.
   */
  getRelativePathTo(sourceFile: SourceFile): string;
  /**
   * Gets the relative path to another directory.
   * @param directory - Directory.
   */
  getRelativePathTo(directory: Directory): string;
  /**
   * Gets the relative path to the specified file path as a module specifier.
   * @param filePath - File path.
   * @remarks To get to a directory, provide `path/to/directory/index.ts`.
   */
  getRelativePathAsModuleSpecifierTo(filePath: string): string;
  /**
   * Gets the relative path to the specified source file as a module specifier.
   * @param sourceFile - Source file.
   */
  getRelativePathAsModuleSpecifierTo(sourceFile: SourceFile): string;
  /**
   * Gets the relative path to the specified directory as a module specifier.
   * @param directory - Directory.
   */
  getRelativePathAsModuleSpecifierTo(directory: Directory): string;
  /**
   * Subscribe to when the source file is modified.
   * @param subscription - Subscription.
   * @param subscribe - Optional and defaults to true. Use an explicit false to unsubscribe.
   */
  onModified(subscription: (sender: SourceFile) => void, subscribe?: boolean): this;
  /**
   * Organizes the imports in the file.
   *
   * WARNING! This will forget all the nodes in the file! It's best to do this after you're all done with the file.
   * @param formatSettings - Format code settings.
   * @param userPreferences - User preferences for refactoring.
   */
  organizeImports(formatSettings?: FormatCodeSettings, userPreferences?: UserPreferences): this;
  /**
   * Removes all unused declarations like interfaces, classes, enums, functions, variables, parameters,
   * methods, properties, imports, etc. from this file.
   *
   * Tip: For optimal results, sometimes this method needs to be called more than once. There could be nodes
   * that are only referenced in unused declarations and in this case, another call will also remove them.
   *
   * WARNING! This will forget all the nodes in the file! It's best to do this after you're all done with the file.
   * @param formatSettings - Format code settings.
   * @param userPreferences - User preferences for refactoring.
   */
  fixUnusedIdentifiers(formatSettings?: FormatCodeSettings, userPreferences?: UserPreferences): this;
  /**
   * Code fix to add import declarations for identifiers that are referenced, but not imported in the source file.
   * @param formatSettings - Format code settings.
   * @param userPreferences - User preferences for refactoring.
   */
  fixMissingImports(formatSettings?: FormatCodeSettings, userPreferences?: UserPreferences): this;
  /**
   * Applies the text changes to the source file.
   *
   * WARNING! This will forget all the nodes in the file! It's best to do this after you're all done with the file.
   * @param textChanges - Text changes.
   */
  applyTextChanges(textChanges: ReadonlyArray<ts.TextChange | TextChange>): this;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<SourceFileStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): SourceFileStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SourceFile>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SourceFile>>;
}

declare function CommonIdentifierBase<T extends Constructor<CommonIdentifierBaseExtensionType>>(Base: T): Constructor<CommonIdentifierBase> & T;

interface CommonIdentifierBase {
  /** Gets the text for the identifier. */
  getText(): string;
  /**
   * Gets the definition nodes of the identifier.
   * @remarks This is similar to "go to definition" and `.getDefinitions()`, but only returns the nodes.
   */
  getDefinitionNodes(): Node[];
  /**
   * Gets the definitions of the identifier.
   * @remarks This is similar to "go to definition." Use `.getDefinitionNodes()` if you only care about the nodes.
   */
  getDefinitions(): DefinitionInfo[];
}

type CommonIdentifierBaseExtensionType = Node<ts.Node & {
      text: string;
  }>;
declare const ComputedPropertyNameBase: Constructor<ExpressionedNode> & typeof Node;

export declare class ComputedPropertyName extends ComputedPropertyNameBase<ts.ComputedPropertyName> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ComputedPropertyName>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ComputedPropertyName>>;
}

declare const IdentifierBase: Constructor<CommonIdentifierBase> & Constructor<ReferenceFindableNode> & Constructor<RenameableNode> & typeof PrimaryExpression;

export declare class Identifier extends IdentifierBase<ts.Identifier> {
  /**
   * Gets the implementations of the identifier.
   *
   * This is similar to "go to implementation."
   */
  getImplementations(): ImplementationLocation[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.Identifier>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.Identifier>>;
}

declare const PrivateIdentifierBase: Constructor<CommonIdentifierBase> & Constructor<ReferenceFindableNode> & Constructor<RenameableNode> & typeof Node;

export declare class PrivateIdentifier extends PrivateIdentifierBase<ts.PrivateIdentifier> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.PrivateIdentifier>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.PrivateIdentifier>>;
}

export declare class QualifiedName extends Node<ts.QualifiedName> {
  /** Gets the left side of the qualified name. */
  getLeft(): EntityName;
  /** Gets the right identifier of the qualified name. */
  getRight(): Identifier;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.QualifiedName>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.QualifiedName>>;
}

declare const BlockBase: Constructor<TextInsertableNode> & Constructor<StatementedNode> & typeof Statement;

export declare class Block extends BlockBase<ts.Block> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.Block>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.Block>>;
}

export declare class BreakStatement extends Statement<ts.BreakStatement> {
  /** Gets this break statement's label or undefined if it does not exist. */
  getLabel(): Identifier | undefined;
  /** Gets this break statement's label or throw if it does not exist. */
  getLabelOrThrow(message?: string | (() => string)): Identifier;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.BreakStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.BreakStatement>>;
}

declare const CaseBlockBase: Constructor<TextInsertableNode> & typeof Node;

export declare class CaseBlock extends CaseBlockBase<ts.CaseBlock> {
  /** Gets the clauses. */
  getClauses(): CaseOrDefaultClause[];
  /**
   * Removes the clause at the specified index.
   * @param index - Index.
   */
  removeClause(index: number): this;
  /**
   * Removes the clauses in the specified range.
   * @param indexRange - Index range.
   */
  removeClauses(indexRange: [number, number]): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.CaseBlock>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.CaseBlock>>;
}

declare const CaseClauseBase: Constructor<JSDocableNode> & Constructor<ExpressionedNode> & Constructor<TextInsertableNode> & Constructor<StatementedNode> & typeof Node;

export declare class CaseClause extends CaseClauseBase<ts.CaseClause> {
  /** Removes this case clause. */
  remove(): void;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.CaseClause>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.CaseClause>>;
}

declare const CatchClauseBase: typeof Node;

export declare class CatchClause extends CatchClauseBase<ts.CatchClause> {
  /** Gets this catch clause's block. */
  getBlock(): Block;
  /** Gets this catch clause's variable declaration or undefined if none exists. */
  getVariableDeclaration(): VariableDeclaration | undefined;
  /** Gets this catch clause's variable declaration or throws if none exists. */
  getVariableDeclarationOrThrow(message?: string | (() => string)): VariableDeclaration;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.CatchClause>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.CatchClause>>;
}

export declare class CommentStatement extends Statement<CompilerCommentStatement> {
}

export declare class ContinueStatement extends Statement<ts.ContinueStatement> {
  /** Gets this continue statement's label or undefined if it does not exist. */
  getLabel(): Identifier | undefined;
  /** Gets this continue statement's label or throw if it does not exist. */
  getLabelOrThrow(message?: string | (() => string)): Identifier;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ContinueStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ContinueStatement>>;
}

declare const DebuggerStatementBase: typeof Statement;

export declare class DebuggerStatement extends DebuggerStatementBase<ts.DebuggerStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.DebuggerStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.DebuggerStatement>>;
}

declare const DefaultClauseBase: Constructor<TextInsertableNode> & Constructor<StatementedNode> & typeof Node;

export declare class DefaultClause extends DefaultClauseBase<ts.DefaultClause> {
  /** Removes the default clause. */
  remove(): void;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.DefaultClause>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.DefaultClause>>;
}

declare const DoStatementBase: Constructor<ExpressionedNode> & typeof IterationStatement;

export declare class DoStatement extends DoStatementBase<ts.DoStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.DoStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.DoStatement>>;
}

declare const EmptyStatementBase: typeof Statement;

export declare class EmptyStatement extends EmptyStatementBase<ts.EmptyStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.EmptyStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.EmptyStatement>>;
}

declare const ExpressionStatementBase: Constructor<ExpressionedNode> & Constructor<JSDocableNode> & typeof Statement;

export declare class ExpressionStatement extends ExpressionStatementBase<ts.ExpressionStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExpressionStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExpressionStatement>>;
}

declare const ForInStatementBase: Constructor<ExpressionedNode> & typeof IterationStatement;

export declare class ForInStatement extends ForInStatementBase<ts.ForInStatement> {
  /** Gets this for in statement's initializer. */
  getInitializer(): VariableDeclarationList | Expression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ForInStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ForInStatement>>;
}

declare const ForOfStatementBase: Constructor<ExpressionedNode> & Constructor<AwaitableNode> & typeof IterationStatement;

export declare class ForOfStatement extends ForOfStatementBase<ts.ForOfStatement> {
  /** Gets this for of statement's initializer. */
  getInitializer(): VariableDeclarationList | Expression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ForOfStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ForOfStatement>>;
}

declare const ForStatementBase: typeof IterationStatement;

export declare class ForStatement extends ForStatementBase<ts.ForStatement> {
  /** Gets this for statement's initializer or undefined if none exists. */
  getInitializer(): VariableDeclarationList | Expression | undefined;
  /** Gets this for statement's initializer or throws if none exists. */
  getInitializerOrThrow(message?: string | (() => string)): Expression<ts.Expression> | VariableDeclarationList;
  /** Gets this for statement's condition or undefined if none exists. */
  getCondition(): Expression | undefined;
  /** Gets this for statement's condition or throws if none exists. */
  getConditionOrThrow(message?: string | (() => string)): Expression<ts.Expression>;
  /** Gets this for statement's incrementor. */
  getIncrementor(): Expression | undefined;
  /** Gets this for statement's incrementor or throws if none exists. */
  getIncrementorOrThrow(message?: string | (() => string)): Expression<ts.Expression>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ForStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ForStatement>>;
}

declare const IfStatementBase: Constructor<ExpressionedNode> & typeof Statement;

export declare class IfStatement extends IfStatementBase<ts.IfStatement> {
  /** Gets this if statement's then statement. */
  getThenStatement(): Statement;
  /** Gets this if statement's else statement. */
  getElseStatement(): Statement | undefined;
  /** @inheritdoc */
  remove(): void;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.IfStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.IfStatement>>;
}

export declare class IterationStatement<T extends ts.IterationStatement = ts.IterationStatement> extends Statement<T> {
  /** Gets this iteration statement's statement. */
  getStatement(): Statement;
}

declare const LabeledStatementBase: Constructor<JSDocableNode> & typeof Statement;

export declare class LabeledStatement extends LabeledStatementBase<ts.LabeledStatement> {
  /** Gets this labeled statement's label */
  getLabel(): Identifier;
  /** Gets this labeled statement's statement */
  getStatement(): Statement;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.LabeledStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.LabeledStatement>>;
}

declare const NotEmittedStatementBase: typeof Statement;

export declare class NotEmittedStatement extends NotEmittedStatementBase<ts.NotEmittedStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NotEmittedStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NotEmittedStatement>>;
}

declare const ReturnStatementBase: Constructor<ExpressionableNode> & typeof Statement;

export declare class ReturnStatement extends ReturnStatementBase<ts.ReturnStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ReturnStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ReturnStatement>>;
}

declare const StatementBase: Constructor<ChildOrderableNode> & typeof Node;

export declare class Statement<T extends ts.Statement = ts.Statement> extends StatementBase<T> {
  /** Removes the statement. */
  remove(): void;
}

export declare function StatementedNode<T extends Constructor<StatementedNodeExtensionType>>(Base: T): Constructor<StatementedNode> & T;

export interface StatementedNode {
  /** Gets the node's statements. */
  getStatements(): Statement[];
  /** Gets the node's statements with comment statements. */
  getStatementsWithComments(): Statement[];
  /**
   * Gets the first statement that matches the provided condition or returns undefined if it doesn't exist.
   * @param findFunction - Function to find the statement by.
   */
  getStatement<T extends Statement>(findFunction: (statement: Statement) => statement is T): T | undefined;
  /**
   * Gets the first statement that matches the provided condition or returns undefined if it doesn't exist.
   * @param findFunction - Function to find the statement by.
   */
  getStatement(findFunction: (statement: Statement) => boolean): Statement | undefined;
  /**
   * Gets the first statement that matches the provided condition or throws if it doesn't exist.
   * @param findFunction - Function to find the statement by.
   */
  getStatementOrThrow<T extends Statement>(findFunction: (statement: Statement) => statement is T): T;
  /**
   * Gets the first statement that matches the provided condition or throws if it doesn't exist.
   * @param findFunction - Function to find the statement by.
   */
  getStatementOrThrow(findFunction: (statement: Statement) => boolean): Statement;
  /**
   * Gets the first statement that matches the provided syntax kind or returns undefined if it doesn't exist.
   * @param kind - Syntax kind to find the node by.
   */
  getStatementByKind<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappingsWithCommentStatements[TKind] | undefined;
  /**
   * Gets the first statement that matches the provided syntax kind or throws if it doesn't exist.
   * @param kind - Syntax kind to find the node by.
   */
  getStatementByKindOrThrow<TKind extends SyntaxKind>(kind: TKind): KindToNodeMappingsWithCommentStatements[TKind];
  /**
   * Add statements.
   * @param statements - statements to add.
   * @returns The statements that were added.
   */
  addStatements(statements: string | WriterFunction | ReadonlyArray<string | WriterFunction | StatementStructures>): Statement[];
  /**
   * Inserts statements at the specified index.
   * @param index - Child index to insert at.
   * @param statements - Statements to insert.
   * @returns The statements that were inserted.
   */
  insertStatements(index: number, statements: string | WriterFunction | ReadonlyArray<string | WriterFunction | StatementStructures>): Statement[];
  /**
   * Removes the statement at the specified index.
   * @param index - Child index to remove the statement at.
   */
  removeStatement(index: number): this;
  /**
   * Removes the statements at the specified index range.
   * @param indexRange - The start and end inclusive index range to remove.
   */
  removeStatements(indexRange: [number, number]): this;
  /**
   * Adds an class declaration as a child.
   * @param structure - Structure of the class declaration to add.
   */
  addClass(structure: OptionalKind<ClassDeclarationStructure>): ClassDeclaration;
  /**
   * Adds class declarations as a child.
   * @param structures - Structures of the class declarations to add.
   */
  addClasses(structures: ReadonlyArray<OptionalKind<ClassDeclarationStructure>>): ClassDeclaration[];
  /**
   * Inserts an class declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the class declaration to insert.
   */
  insertClass(index: number, structure: OptionalKind<ClassDeclarationStructure>): ClassDeclaration;
  /**
   * Inserts class declarations as a child.
   * @param index - Child index to insert at.
   * @param structures - Structures of the class declarations to insert.
   */
  insertClasses(index: number, structures: ReadonlyArray<OptionalKind<ClassDeclarationStructure>>): ClassDeclaration[];
  /** Gets the direct class declaration children. */
  getClasses(): ClassDeclaration[];
  /**
   * Gets a class.
   * @param name - Name of the class.
   */
  getClass(name: string): ClassDeclaration | undefined;
  /**
   * Gets a class.
   * @param findFunction - Function to use to find the class.
   */
  getClass(findFunction: (declaration: ClassDeclaration) => boolean): ClassDeclaration | undefined;
  /**
   * Gets a class or throws if it doesn't exist.
   * @param name - Name of the class.
   */
  getClassOrThrow(name: string): ClassDeclaration;
  /**
   * Gets a class or throws if it doesn't exist.
   * @param findFunction - Function to use to find the class.
   */
  getClassOrThrow(findFunction: (declaration: ClassDeclaration) => boolean): ClassDeclaration;
  /**
   * Adds an enum declaration as a child.
   * @param structure - Structure of the enum declaration to add.
   */
  addEnum(structure: OptionalKind<EnumDeclarationStructure>): EnumDeclaration;
  /**
   * Adds enum declarations as a child.
   * @param structures - Structures of the enum declarations to add.
   */
  addEnums(structures: ReadonlyArray<OptionalKind<EnumDeclarationStructure>>): EnumDeclaration[];
  /**
   * Inserts an enum declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the enum declaration to insert.
   */
  insertEnum(index: number, structure: OptionalKind<EnumDeclarationStructure>): EnumDeclaration;
  /**
   * Inserts enum declarations as a child.
   * @param index - Child index to insert at.
   * @param structures - Structures of the enum declarations to insert.
   */
  insertEnums(index: number, structures: ReadonlyArray<OptionalKind<EnumDeclarationStructure>>): EnumDeclaration[];
  /** Gets the direct enum declaration children. */
  getEnums(): EnumDeclaration[];
  /**
   * Gets an enum.
   * @param name - Name of the enum.
   */
  getEnum(name: string): EnumDeclaration | undefined;
  /**
   * Gets an enum.
   * @param findFunction - Function to use to find the enum.
   */
  getEnum(findFunction: (declaration: EnumDeclaration) => boolean): EnumDeclaration | undefined;
  /**
   * Gets an enum or throws if it doesn't exist.
   * @param name - Name of the enum.
   */
  getEnumOrThrow(name: string): EnumDeclaration;
  /**
   * Gets an enum or throws if it doesn't exist.
   * @param findFunction - Function to use to find the enum.
   */
  getEnumOrThrow(findFunction: (declaration: EnumDeclaration) => boolean): EnumDeclaration;
  /**
   * Adds a function declaration as a child.
   * @param structure - Structure of the function declaration to add.
   */
  addFunction(structure: OptionalKind<FunctionDeclarationStructure>): FunctionDeclaration;
  /**
   * Adds function declarations as a child.
   * @param structures - Structures of the function declarations to add.
   */
  addFunctions(structures: ReadonlyArray<OptionalKind<FunctionDeclarationStructure>>): FunctionDeclaration[];
  /**
   * Inserts an function declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the function declaration to insert.
   */
  insertFunction(index: number, structure: OptionalKind<FunctionDeclarationStructure>): FunctionDeclaration;
  /**
   * Inserts function declarations as a child.
   * @param index - Child index to insert at.
   * @param structures - Structures of the function declarations to insert.
   */
  insertFunctions(index: number, structures: ReadonlyArray<OptionalKind<FunctionDeclarationStructure>>): FunctionDeclaration[];
  /** Gets the direct function declaration children. */
  getFunctions(): FunctionDeclaration[];
  /**
   * Gets a function.
   * @param name - Name of the function.
   */
  getFunction(name: string): FunctionDeclaration | undefined;
  /**
   * Gets a function.
   * @param findFunction - Function to use to find the function.
   */
  getFunction(findFunction: (declaration: FunctionDeclaration) => boolean): FunctionDeclaration | undefined;
  /**
   * Gets a function or throws if it doesn't exist.
   * @param name - Name of the function.
   */
  getFunctionOrThrow(name: string): FunctionDeclaration;
  /**
   * Gets a function or throws if it doesn't exist.
   * @param findFunction - Function to use to find the function.
   */
  getFunctionOrThrow(findFunction: (declaration: FunctionDeclaration) => boolean): FunctionDeclaration;
  /**
   * Adds a interface declaration as a child.
   * @param structure - Structure of the interface declaration to add.
   */
  addInterface(structure: OptionalKind<InterfaceDeclarationStructure>): InterfaceDeclaration;
  /**
   * Adds interface declarations as a child.
   * @param structures - Structures of the interface declarations to add.
   */
  addInterfaces(structures: ReadonlyArray<OptionalKind<InterfaceDeclarationStructure>>): InterfaceDeclaration[];
  /**
   * Inserts an interface declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the interface declaration to insert.
   */
  insertInterface(index: number, structure: OptionalKind<InterfaceDeclarationStructure>): InterfaceDeclaration;
  /**
   * Inserts interface declarations as a child.
   * @param index - Child index to insert at.
   * @param structures - Structures of the interface declarations to insert.
   */
  insertInterfaces(index: number, structures: ReadonlyArray<OptionalKind<InterfaceDeclarationStructure>>): InterfaceDeclaration[];
  /** Gets the direct interface declaration children. */
  getInterfaces(): InterfaceDeclaration[];
  /**
   * Gets an interface.
   * @param name - Name of the interface.
   */
  getInterface(name: string): InterfaceDeclaration | undefined;
  /**
   * Gets an interface.
   * @param findFunction - Function to use to find the interface.
   */
  getInterface(findFunction: (declaration: InterfaceDeclaration) => boolean): InterfaceDeclaration | undefined;
  /**
   * Gets an interface or throws if it doesn't exist.
   * @param name - Name of the interface.
   */
  getInterfaceOrThrow(name: string): InterfaceDeclaration;
  /**
   * Gets an interface or throws if it doesn't exist.
   * @param findFunction - Function to use to find the interface.
   */
  getInterfaceOrThrow(findFunction: (declaration: InterfaceDeclaration) => boolean): InterfaceDeclaration;
  /**
   * Adds a module declaration as a child.
   * @param structure - Structure of the namespace declaration to add.
   */
  addModule(structure: OptionalKind<ModuleDeclarationStructure>): ModuleDeclaration;
  /**
   * Adds module declarations as a child.
   * @param structures - Structures of the namespace declarations to add.
   */
  addModules(structures: ReadonlyArray<OptionalKind<ModuleDeclarationStructure>>): ModuleDeclaration[];
  /**
   * Inserts a module declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the namespace declaration to insert.
   */
  insertModule(index: number, structure: OptionalKind<ModuleDeclarationStructure>): ModuleDeclaration;
  /**
   * Inserts module declarations as children.
   * @param index - Child index to insert at.
   * @param structures - Structures of the namespace declarations to insert.
   */
  insertModules(index: number, structures: ReadonlyArray<OptionalKind<ModuleDeclarationStructure>>): ModuleDeclaration[];
  /** Gets the module declaration children. */
  getModules(): ModuleDeclaration[];
  /**
   * Gets a module declaration child by name.
   * @param name - Name of the namespace.
   */
  getModule(name: string): ModuleDeclaration | undefined;
  /**
   * Gets a module declaration child by condition.
   * @param findFunction - Function to use to find the namespace.
   */
  getModule(findFunction: (declaration: ModuleDeclaration) => boolean): ModuleDeclaration | undefined;
  /**
   * Gets a module declaration child by name or throws if it doesn't exist.
   * @param name - Name of the namespace.
   */
  getModuleOrThrow(name: string): ModuleDeclaration;
  /**
   * Gets a module declaration child by condition or throws if it doesn't exist.
   * @param findFunction - Function to use to find the namespace.
   */
  getModuleOrThrow(findFunction: (declaration: ModuleDeclaration) => boolean): ModuleDeclaration;
  /**
   * Adds a type alias declaration as a child.
   * @param structure - Structure of the type alias declaration to add.
   */
  addTypeAlias(structure: OptionalKind<TypeAliasDeclarationStructure>): TypeAliasDeclaration;
  /**
   * Adds type alias declarations as a child.
   * @param structures - Structures of the type alias declarations to add.
   */
  addTypeAliases(structures: ReadonlyArray<OptionalKind<TypeAliasDeclarationStructure>>): TypeAliasDeclaration[];
  /**
   * Inserts an type alias declaration as a child.
   * @param index - Child index to insert at.
   * @param structure - Structure of the type alias declaration to insert.
   */
  insertTypeAlias(index: number, structure: OptionalKind<TypeAliasDeclarationStructure>): TypeAliasDeclaration;
  /**
   * Inserts type alias declarations as a child.
   * @param index - Child index to insert at.
   * @param structures - Structures of the type alias declarations to insert.
   */
  insertTypeAliases(index: number, structures: ReadonlyArray<OptionalKind<TypeAliasDeclarationStructure>>): TypeAliasDeclaration[];
  /** Gets the direct type alias declaration children. */
  getTypeAliases(): TypeAliasDeclaration[];
  /**
   * Gets a type alias.
   * @param name - Name of the type alias.
   */
  getTypeAlias(name: string): TypeAliasDeclaration | undefined;
  /**
   * Gets a type alias.
   * @param findFunction - Function to use to find the type alias.
   */
  getTypeAlias(findFunction: (declaration: TypeAliasDeclaration) => boolean): TypeAliasDeclaration | undefined;
  /**
   * Gets a type alias or throws if it doesn't exist.
   * @param name - Name of the type alias.
   */
  getTypeAliasOrThrow(name: string): TypeAliasDeclaration;
  /**
   * Gets a type alias or throws if it doesn't exist.
   * @param findFunction - Function to use to find the type alias.
   */
  getTypeAliasOrThrow(findFunction: (declaration: TypeAliasDeclaration) => boolean): TypeAliasDeclaration;
  /**
   * Adds a variable statement.
   * @param structure - Structure of the variable statement.
   */
  addVariableStatement(structure: OptionalKind<VariableStatementStructure>): VariableStatement;
  /**
   * Adds variable statements.
   * @param structures - Structures of the variable statements.
   */
  addVariableStatements(structures: ReadonlyArray<OptionalKind<VariableStatementStructure>>): VariableStatement[];
  /**
   * Inserts a variable statement.
   * @param structure - Structure of the variable statement.
   */
  insertVariableStatement(index: number, structure: OptionalKind<VariableStatementStructure>): VariableStatement;
  /**
   * Inserts variable statements.
   * @param structures - Structures of the variable statements.
   */
  insertVariableStatements(index: number, structures: ReadonlyArray<OptionalKind<VariableStatementStructure>>): VariableStatement[];
  /** Gets the direct variable statement children. */
  getVariableStatements(): VariableStatement[];
  /**
   * Gets a variable statement.
   * @param name - Name of one of the variable statement's declarations.
   */
  getVariableStatement(name: string): VariableStatement | undefined;
  /**
   * Gets a variable statement.
   * @param findFunction - Function to use to find the variable statement.
   */
  getVariableStatement(findFunction: (declaration: VariableStatement) => boolean): VariableStatement | undefined;
  /**
   * Gets a variable statement or throws if it doesn't exist.
   * @param name - Name of one of the variable statement's declarations.
   */
  getVariableStatementOrThrow(name: string): VariableStatement;
  /**
   * Gets a variable statement or throws if it doesn't exist.
   * @param findFunction - Function to use to find the variable statement.
   */
  getVariableStatementOrThrow(findFunction: (declaration: VariableStatement) => boolean): VariableStatement;
  /**
   * Gets all the variable declarations within the variable statement children.
   * @remarks This does not return the variable declarations within for statements or for of statements.
   */
  getVariableDeclarations(): VariableDeclaration[];
  /**
   * Gets a variable declaration.
   * @param name - Name of the variable declaration.
   */
  getVariableDeclaration(name: string): VariableDeclaration | undefined;
  /**
   * Gets a variable declaration.
   * @param findFunction - Function to use to find the variable declaration.
   */
  getVariableDeclaration(findFunction: (declaration: VariableDeclaration) => boolean): VariableDeclaration | undefined;
  /**
   * Gets a variable declaration or throws if it doesn't exist.
   * @param name - Name of the variable declaration.
   */
  getVariableDeclarationOrThrow(name: string): VariableDeclaration;
  /**
   * Gets a variable declaration or throws if it doesn't exist.
   * @param findFunction - Function to use to find the variable declaration.
   */
  getVariableDeclarationOrThrow(findFunction: (declaration: VariableDeclaration) => boolean): VariableDeclaration;
}

type StatementedNodeExtensionType = Node<ts.SourceFile | ts.FunctionDeclaration | ts.ModuleDeclaration | ts.FunctionLikeDeclaration | ts.CaseClause | ts.DefaultClause | ts.ModuleBlock>;

export interface KindToNodeMappingsWithCommentStatements extends ImplementedKindToNodeMappings {
  [kind: number]: Node;
  [SyntaxKind.SingleLineCommentTrivia]: CommentStatement;
  [SyntaxKind.MultiLineCommentTrivia]: CommentStatement;
}

declare const SwitchStatementBase: Constructor<ExpressionedNode> & typeof Statement;

export declare class SwitchStatement extends SwitchStatementBase<ts.SwitchStatement> {
  /** Gets this switch statement's case block. */
  getCaseBlock(): CaseBlock;
  /** Gets the switch statement's case block's clauses. */
  getClauses(): CaseOrDefaultClause[];
  /**
   * Removes the specified clause based on the provided index.
   * @param index - Index.
   */
  removeClause(index: number): CaseBlock;
  /**
   * Removes the specified clauses based on the provided index range.
   * @param indexRange - Index range.
   */
  removeClauses(indexRange: [number, number]): CaseBlock;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.SwitchStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.SwitchStatement>>;
}

declare const ThrowStatementBase: Constructor<ExpressionedNode> & typeof Statement;

export declare class ThrowStatement extends ThrowStatementBase<ts.ThrowStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ThrowStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ThrowStatement>>;
}

declare const TryStatementBase: typeof Statement;

export declare class TryStatement extends TryStatementBase<ts.TryStatement> {
  /** Gets this try statement's try block. */
  getTryBlock(): Block;
  /** Gets this try statement's catch clause or undefined if none exists. */
  getCatchClause(): CatchClause | undefined;
  /** Gets this try statement's catch clause or throws if none exists. */
  getCatchClauseOrThrow(message?: string | (() => string)): CatchClause;
  /** Gets this try statement's finally block or undefined if none exists. */
  getFinallyBlock(): Block | undefined;
  /** Gets this try statement's finally block or throws if none exists. */
  getFinallyBlockOrThrow(message?: string | (() => string)): Block;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TryStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TryStatement>>;
}

declare const VariableStatementBase: Constructor<ModuleChildableNode> & Constructor<JSDocableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & typeof Statement;

export declare class VariableStatement extends VariableStatementBase<ts.VariableStatement> {
  /** Get variable declaration list. */
  getDeclarationList(): VariableDeclarationList;
  /** Get the variable declarations. */
  getDeclarations(): VariableDeclaration[];
  /** Gets the variable declaration kind. */
  getDeclarationKind(): VariableDeclarationKind;
  /** Gets the variable declaration kind keywords. */
  getDeclarationKindKeywords(): Node<ts.Node>[];
  /**
   * Sets the variable declaration kind.
   * @param type - Type to set.
   */
  setDeclarationKind(type: VariableDeclarationKind): VariableDeclarationList;
  /**
   * Add a variable declaration to the statement.
   * @param structure - Structure representing the variable declaration to add.
   */
  addDeclaration(structure: OptionalKind<VariableDeclarationStructure>): VariableDeclaration;
  /**
   * Adds variable declarations to the statement.
   * @param structures - Structures representing the variable declarations to add.
   */
  addDeclarations(structures: ReadonlyArray<OptionalKind<VariableDeclarationStructure>>): VariableDeclaration[];
  /**
   * Inserts a variable declaration at the specified index within the statement.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the variable declaration to insert.
   */
  insertDeclaration(index: number, structure: OptionalKind<VariableDeclarationStructure>): VariableDeclaration;
  /**
   * Inserts variable declarations at the specified index within the statement.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the variable declarations to insert.
   */
  insertDeclarations(index: number, structures: ReadonlyArray<OptionalKind<VariableDeclarationStructure>>): VariableDeclaration[];
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<VariableStatementStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): VariableStatementStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.VariableStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.VariableStatement>>;
}

declare const WhileStatementBase: Constructor<ExpressionedNode> & typeof IterationStatement;

export declare class WhileStatement extends WhileStatementBase<ts.WhileStatement> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.WhileStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.WhileStatement>>;
}

declare const WithStatementBase: Constructor<ExpressionedNode> & typeof Statement;

export declare class WithStatement extends WithStatementBase<ts.WithStatement> {
  /** Gets this with statement's statement. */
  getStatement(): Statement;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.WithStatement>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.WithStatement>>;
}

export declare class ArrayTypeNode extends TypeNode<ts.ArrayTypeNode> {
  /** Gets the array type node's element type node. */
  getElementTypeNode(): TypeNode;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ArrayTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ArrayTypeNode>>;
}

export declare class ConditionalTypeNode extends TypeNode<ts.ConditionalTypeNode> {
  /**
   * Gets the conditional type node's check type.
   *
   * Ex. In `CheckType extends ExtendsType ? TrueType : FalseType` returns `CheckType`.
   */
  getCheckType(): TypeNode<ts.TypeNode>;
  /**
   * Gets the conditional type node's extends type.
   *
   * Ex. In `CheckType extends ExtendsType ? TrueType : FalseType` returns `ExtendsType`.
   */
  getExtendsType(): TypeNode<ts.TypeNode>;
  /**
   * Gets the conditional type node's true type.
   *
   * Ex. In `CheckType extends ExtendsType ? TrueType : FalseType` returns `TrueType`.
   */
  getTrueType(): TypeNode<ts.TypeNode>;
  /**
   * Gets the conditional type node's false type.
   *
   * Ex. In `CheckType extends ExtendsType ? TrueType : FalseType` returns `FalseType`.
   */
  getFalseType(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ConditionalTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ConditionalTypeNode>>;
}

declare const ConstructorTypeNodeBase: Constructor<AbstractableNode> & Constructor<ModifierableNode> & typeof FunctionOrConstructorTypeNodeBase;

export declare class ConstructorTypeNode extends ConstructorTypeNodeBase<ts.ConstructorTypeNode> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ConstructorTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ConstructorTypeNode>>;
}

declare const ExpressionWithTypeArgumentsBase: Constructor<LeftHandSideExpressionedNode> & typeof NodeWithTypeArguments;

export declare class ExpressionWithTypeArguments extends ExpressionWithTypeArgumentsBase<ts.ExpressionWithTypeArguments> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ExpressionWithTypeArguments>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ExpressionWithTypeArguments>>;
}

declare const FunctionOrConstructorTypeNodeBaseBase: Constructor<SignaturedDeclaration> & typeof TypeNode;

export declare class FunctionOrConstructorTypeNodeBase<T extends ts.FunctionOrConstructorTypeNode = ts.FunctionOrConstructorTypeNode> extends FunctionOrConstructorTypeNodeBaseBase<T> {
}

declare const FunctionTypeNodeBase: Constructor<TypeParameteredNode> & typeof FunctionOrConstructorTypeNodeBase;

export declare class FunctionTypeNode extends FunctionTypeNodeBase<ts.FunctionTypeNode> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.FunctionTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.FunctionTypeNode>>;
}

export declare class ImportTypeNode extends NodeWithTypeArguments<ts.ImportTypeNode> {
  /**
   * Sets the argument text.
   * @param text - Text of the argument.
   */
  setArgument(text: string): this;
  /** Gets the argument passed into the import type. */
  getArgument(): TypeNode;
  /**
   * Sets the qualifier text.
   * @param text - Text.
   */
  setQualifier(text: string): this;
  /** Gets the qualifier of the import type if it exists or throws */
  getQualifierOrThrow(message?: string | (() => string)): EntityName;
  /** Gets the qualifier of the import type if it exists or returns undefined. */
  getQualifier(): EntityName | undefined;
  /** Gets the import attributes container if it exists. */
  getAttributes(): ImportAttributes | undefined;
  /** Gets the import attributes container if it exists or throws. */
  getAttributesOrThrow(message?: string | (() => string)): ImportAttributes;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ImportTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ImportTypeNode>>;
}

export declare class IndexedAccessTypeNode extends TypeNode<ts.IndexedAccessTypeNode> {
  /**
   * Gets the indexed access type node's object type node.
   *
   * This is `MyObjectType` in `MyObjectType["myIndex"]`.
   */
  getObjectTypeNode(): TypeNode;
  /**
   * Gets the indexed access type node's index type node.
   *
   * This is `"myIndex"` in `MyObjectType["myIndex"]`.
   */
  getIndexTypeNode(): TypeNode;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.IndexedAccessTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.IndexedAccessTypeNode>>;
}

export declare class InferTypeNode extends TypeNode<ts.InferTypeNode> {
  /**
   * Gets the infer type node's type parameter.
   *
   * Ex. In `infer R` returns `R`.
   */
  getTypeParameter(): TypeParameterDeclaration;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.InferTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.InferTypeNode>>;
}

export declare class IntersectionTypeNode extends TypeNode<ts.IntersectionTypeNode> {
  /** Gets the intersection type nodes. */
  getTypeNodes(): TypeNode[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.IntersectionTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.IntersectionTypeNode>>;
}

export declare class LiteralTypeNode extends TypeNode<ts.LiteralTypeNode> {
  /** Gets the literal type node's literal. */
  getLiteral(): NullLiteral | BooleanLiteral | LiteralExpression | PrefixUnaryExpression;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.LiteralTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.LiteralTypeNode>>;
}

export declare class MappedTypeNode extends TypeNode<ts.MappedTypeNode> {
  /** Gets the mapped type node's name type node if any. */
  getNameTypeNode(): TypeNode | undefined;
  /** Gets the mapped type node's name type node or throws if it doesn't exist. */
  getNameTypeNodeOrThrow(message?: string | (() => string)): TypeNode;
  /** Gets the mapped type's readonly token. */
  getReadonlyToken(): Node<ts.ReadonlyKeyword> | Node<ts.PlusToken> | Node<ts.MinusToken> | undefined;
  /** Gets the mapped type's readonly token or throws if not exist. */
  getReadonlyTokenOrThrow(message?: string | (() => string)): Node<ts.ReadonlyKeyword> | Node<ts.PlusToken> | Node<ts.MinusToken>;
  /** Gets the mapped type's question token. */
  getQuestionToken(): Node<ts.QuestionToken> | Node<ts.PlusToken> | Node<ts.MinusToken> | undefined;
  /** Gets the mapped type's question token or throws if not exist. */
  getQuestionTokenOrThrow(message?: string | (() => string)): Node<ts.QuestionToken> | Node<ts.PlusToken> | Node<ts.MinusToken>;
  /** Gets the mapped type node's type parameter. */
  getTypeParameter(): TypeParameterDeclaration;
  /** Gets the mapped type node's type node if it exists or returns undefined when not. */
  getTypeNode(): TypeNode | undefined;
  /** Gets the mapped type node's type node if it exists or throws when undefined. */
  getTypeNodeOrThrow(message?: string | (() => string)): TypeNode;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.MappedTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.MappedTypeNode>>;
}

declare const NamedTupleMemberBase: Constructor<TypedNode> & Constructor<QuestionTokenableNode> & Constructor<DotDotDotTokenableNode> & Constructor<JSDocableNode> & Constructor<NamedNode> & typeof TypeNode;

/**
 * A named/labeled tuple element.
 *
 * Ex. `start: number` in `type Range = [start: number, end: number]`
 */
export declare class NamedTupleMember extends NamedTupleMemberBase<ts.NamedTupleMember> {
  /** Gets the named tuple type's type. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** Throws. This is not supported for NamedTupleMember. */
  removeType(): never;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.NamedTupleMember>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.NamedTupleMember>>;
}

export declare class OptionalTypeNode extends TypeNode<ts.OptionalTypeNode> {
  /** Gets the optional type node's inner type. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.OptionalTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.OptionalTypeNode>>;
}

export declare class ParenthesizedTypeNode extends TypeNode<ts.ParenthesizedTypeNode> {
  /** Gets the node within the parentheses. */
  getTypeNode(): TypeNode;
  /**
   * Sets the type within the parentheses.
   * @param textOrWriterFunction - Text or writer function to set the type with.
   */
  setType(textOrWriterFunction: string | WriterFunction): this;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ParenthesizedTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ParenthesizedTypeNode>>;
}

export declare class RestTypeNode extends TypeNode<ts.RestTypeNode> {
  /** Gets the rest type node's inner type. */
  getTypeNode(): TypeNode<ts.TypeNode>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.RestTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.RestTypeNode>>;
}

export declare class TemplateLiteralTypeNode extends TypeNode<ts.TemplateLiteralTypeNode> {
  /** Gets the template head. */
  getHead(): TemplateHead;
  /** Gets the template spans. */
  getTemplateSpans(): TypeNode<ts.TypeNode>[];
  /**
   * Sets the literal value.
   *
   * Note: This could possibly replace the node if you remove all the tagged templates.
   * @param value - Value to set.
   * @returns The new node if the kind changed; the current node otherwise.
   */
  setLiteralValue(value: string): Node<ts.Node>;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TemplateLiteralTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TemplateLiteralTypeNode>>;
}

export declare class ThisTypeNode extends TypeNode<ts.ThisTypeNode> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.ThisTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.ThisTypeNode>>;
}

export declare class TupleTypeNode extends TypeNode<ts.TupleTypeNode> {
  /** Gets the tuple element type nodes. */
  getElements(): (TypeNode<ts.TypeNode> | NamedTupleMember)[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TupleTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TupleTypeNode>>;
}

declare const TypeAliasDeclarationBase: Constructor<TypeParameteredNode> & Constructor<TypedNode> & Constructor<JSDocableNode> & Constructor<AmbientableNode> & Constructor<ExportableNode> & Constructor<ModifierableNode> & Constructor<NamedNode> & typeof Statement;

export declare class TypeAliasDeclaration extends TypeAliasDeclarationBase<ts.TypeAliasDeclaration> {
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<TypeAliasDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): TypeAliasDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeAliasDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeAliasDeclaration>>;
}

declare const TypeLiteralNodeBase: Constructor<TypeElementMemberedNode> & typeof TypeNode;

export declare class TypeLiteralNode extends TypeLiteralNodeBase<ts.TypeLiteralNode> {
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeLiteralNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeLiteralNode>>;
}

export declare class TypeNode<T extends ts.TypeNode = ts.TypeNode> extends Node<T> {
}

declare const NodeWithTypeArgumentsBase: Constructor<TypeArgumentedNode> & typeof TypeNode;

export declare class NodeWithTypeArguments<T extends ts.NodeWithTypeArguments = ts.NodeWithTypeArguments> extends NodeWithTypeArgumentsBase<T> {
}

export declare class TypeOperatorTypeNode extends TypeNode<ts.TypeOperatorNode> {
  /** Gets the operator of the type node. */
  getOperator(): SyntaxKind.KeyOfKeyword | SyntaxKind.ReadonlyKeyword | SyntaxKind.UniqueKeyword;
  /** Gets the node within the type operator. */
  getTypeNode(): TypeNode;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeOperatorNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeOperatorNode>>;
}

/** Variance of the type parameter. */
export declare enum TypeParameterVariance {
  /** Variance is not specified. */
  None = 0,
  /** Contravariant. */
  In = 1,
  /** Covariant. */
  Out = 2,
  /** Invariant. */
  InOut = 3
}

declare const TypeParameterDeclarationBase: Constructor<ModifierableNode> & Constructor<NamedNode> & typeof Node;

export declare class TypeParameterDeclaration extends TypeParameterDeclarationBase<ts.TypeParameterDeclaration> {
  /** Gets if this is a const type parameter. */
  isConst(): boolean;
  /** Sets if this is a const type parameter or not. */
  setIsConst(value: boolean): this;
  /** Gets the constraint of the type parameter. */
  getConstraint(): TypeNode | undefined;
  /** Gets the constraint of the type parameter or throws if it doesn't exist. */
  getConstraintOrThrow(message?: string | (() => string)): TypeNode<ts.TypeNode>;
  /**
   * Sets the type parameter constraint.
   * @param text - Text to set as the constraint.
   */
  setConstraint(text: string | WriterFunction): this;
  /** Removes the constraint type node. */
  removeConstraint(): this;
  /** Gets the default node of the type parameter. */
  getDefault(): TypeNode | undefined;
  /** Gets the default node of the type parameter or throws if it doesn't exist. */
  getDefaultOrThrow(message?: string | (() => string)): TypeNode<ts.TypeNode>;
  /**
   * Sets the type parameter default type node.
   * @param text - Text to set as the default type node.
   */
  setDefault(text: string | WriterFunction): this;
  /** Removes the default type node. */
  removeDefault(): this;
  /** Set the variance of the type parameter. */
  setVariance(variance: TypeParameterVariance): this;
  /** Gets the variance of the type parameter. */
  getVariance(): TypeParameterVariance;
  /** Removes this type parameter. */
  remove(): void;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<TypeParameterDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): TypeParameterDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeParameterDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeParameterDeclaration>>;
}

/**
 * A type predicate node which says the specified parameter name is a specific type if the function returns true.
 *
 * Examples:
 * * `param is string` in `declare function isString(param: unknown): param is string;`.
 * * `asserts condition` in `declare function assert(condition: any): asserts condition;`.
 */
export declare class TypePredicateNode extends TypeNode<ts.TypePredicateNode> {
  /** Gets the parameter name node */
  getParameterNameNode(): Identifier | ThisTypeNode;
  /** Gets if the type predicate has an `asserts` modifier (ex. `asserts condition`). */
  hasAssertsModifier(): boolean;
  /** Gets the asserts modifier if it exists. */
  getAssertsModifier(): Node<ts.AssertsKeyword> | undefined;
  /** Gets the asserts modifier if it exists or throws otherwise. */
  getAssertsModifierOrThrow(message?: string | (() => string)): Node<ts.AssertsKeyword>;
  /** Gets the type name if it exists or returns undefined when it asserts a condition. */
  getTypeNode(): TypeNode | undefined;
  /** Gets the type name if it exists or throws when it asserts a condition. */
  getTypeNodeOrThrow(message?: string | (() => string)): TypeNode;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypePredicateNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypePredicateNode>>;
}

export declare class TypeQueryNode extends NodeWithTypeArguments<ts.TypeQueryNode> {
  /** Gets the expression name. */
  getExprName(): EntityName;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeQueryNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeQueryNode>>;
}

export declare class TypeReferenceNode extends NodeWithTypeArguments<ts.TypeReferenceNode> {
  /** Gets the type name. */
  getTypeName(): EntityName;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.TypeReferenceNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.TypeReferenceNode>>;
}

export declare class UnionTypeNode extends TypeNode<ts.UnionTypeNode> {
  /** Gets the union type nodes. */
  getTypeNodes(): TypeNode[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.UnionTypeNode>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.UnionTypeNode>>;
}

declare const VariableDeclarationBase: Constructor<ExportGetableNode> & Constructor<ExclamationTokenableNode> & Constructor<TypedNode> & Constructor<InitializerExpressionableNode> & Constructor<BindingNamedNode> & typeof Node;

export declare class VariableDeclaration extends VariableDeclarationBase<ts.VariableDeclaration> {
  /** Removes this variable declaration. */
  remove(): void;
  /** Gets the corresponding variable statement if it exists. Throws for variable declarations in for statements. */
  getVariableStatementOrThrow(message?: string | (() => string)): VariableStatement;
  /** Gets the corresponding variable statement if it exists. Returns undefined for variable declarations in for statements. */
  getVariableStatement(): VariableStatement | undefined;
  /**
   * Sets the node from a structure.
   * @param structure - Structure to set the node with.
   */
  set(structure: Partial<VariableDeclarationStructure>): this;
  /** Gets the structure equivalent to this node. */
  getStructure(): VariableDeclarationStructure;
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.VariableDeclaration>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.VariableDeclaration>>;
}

export declare enum VariableDeclarationKind {
  Var = "var",
  Let = "let",
  Const = "const",
  AwaitUsing = "await using",
  Using = "using"
}

declare const VariableDeclarationListBase: Constructor<ModifierableNode> & typeof Node;

export declare class VariableDeclarationList extends VariableDeclarationListBase<ts.VariableDeclarationList> {
  /** Get the variable declarations. */
  getDeclarations(): VariableDeclaration[];
  /** Gets the variable declaration kind. */
  getDeclarationKind(): VariableDeclarationKind;
  /** Gets the variable declaration kind keywords. */
  getDeclarationKindKeywords(): Node[];
  /**
   * Sets the variable declaration kind.
   * @param type - Type to set.
   */
  setDeclarationKind(type: VariableDeclarationKind): this;
  /**
   * Add a variable declaration to the statement.
   * @param structure - Structure representing the variable declaration to add.
   */
  addDeclaration(structure: OptionalKind<VariableDeclarationStructure>): VariableDeclaration;
  /**
   * Adds variable declarations to the statement.
   * @param structures - Structures representing the variable declarations to add.
   */
  addDeclarations(structures: ReadonlyArray<OptionalKind<VariableDeclarationStructure>>): VariableDeclaration[];
  /**
   * Inserts a variable declaration at the specified index within the statement.
   * @param index - Child index to insert at.
   * @param structure - Structure representing the variable declaration to insert.
   */
  insertDeclaration(index: number, structure: OptionalKind<VariableDeclarationStructure>): VariableDeclaration;
  /**
   * Inserts variable declarations at the specified index within the statement.
   * @param index - Child index to insert at.
   * @param structures - Structures representing the variable declarations to insert.
   */
  insertDeclarations(index: number, structures: ReadonlyArray<OptionalKind<VariableDeclarationStructure>>): VariableDeclaration[];
  /** @inheritdoc **/
  getParent(): NodeParentType<ts.VariableDeclarationList>;
  /** @inheritdoc **/
  getParentOrThrow(message?: string | (() => string)): NonNullable<NodeParentType<ts.VariableDeclarationList>>;
}

export declare class Signature {
  #private;
  private constructor();
  /** Gets the underlying compiler signature. */
  get compilerSignature(): ts.Signature;
  /** Gets the type parameters. */
  getTypeParameters(): TypeParameter[];
  /** Gets the parameters. */
  getParameters(): Symbol[];
  /** Gets the signature return type. */
  getReturnType(): Type;
  /** Get the documentation comments. */
  getDocumentationComments(): SymbolDisplayPart[];
  /** Gets the JS doc tags. */
  getJsDocTags(): JSDocTagInfo[];
  /** Gets the signature's declaration. */
  getDeclaration(): MethodSignature | MethodDeclaration | ConstructorDeclaration | GetAccessorDeclaration | SetAccessorDeclaration | CallSignatureDeclaration | ConstructSignatureDeclaration | IndexSignatureDeclaration | FunctionTypeNode | ConstructorTypeNode | FunctionExpression | ArrowFunction | FunctionDeclaration | JSDocFunctionType;
}

export declare class Symbol {
  #private;
  private constructor();
  /** Gets the underlying compiler symbol. */
  get compilerSymbol(): ts.Symbol;
  /** Gets the symbol name. */
  getName(): string;
  /** Gets the escaped name. */
  getEscapedName(): string;
  /** Gets the aliased symbol or throws if it doesn't exist. */
  getAliasedSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Follows a single alias to get the immediately aliased symbol or returns undefined if it doesn't exist. */
  getImmediatelyAliasedSymbol(): Symbol | undefined;
  /** Follows a single alias to get the immediately aliased symbol or throws if it doesn't exist. */
  getImmediatelyAliasedSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets the aliased symbol or returns undefined if it doesn't exist. */
  getAliasedSymbol(): Symbol | undefined;
  /**
   * Gets the export symbol of the symbol if its a local symbol with a corresponding export symbol. Otherwise returns the current symbol.
   *
   * The following is from the compiler API documentation:
   *
   * For example, at `export type T = number;`:
   *     - `getSymbolAtLocation` at the location `T` will return the exported symbol for `T`.
   *     - But the result of `getSymbolsInScope` will contain the *local* symbol for `T`, not the exported symbol.
   *     - Calling `getExportSymbol` on that local symbol will return the exported symbol.
   */
  getExportSymbol(): Symbol;
  /** Gets if the symbol is an alias. */
  isAlias(): boolean;
  /** Gets if the symbol is optional. */
  isOptional(): boolean;
  /** Gets the symbol flags. */
  getFlags(): SymbolFlags;
  /**
   * Gets if the symbol has the specified flags.
   * @param flags - Flags to check if the symbol has.
   */
  hasFlags(flags: SymbolFlags): boolean;
  /** Gets the value declaration of a symbol or throws if it doesn't exist. */
  getValueDeclarationOrThrow(message?: string | (() => string)): Node;
  /** Gets the value declaration of the symbol or returns undefined if it doesn't exist. */
  getValueDeclaration(): Node | undefined;
  /** Gets the symbol declarations. */
  getDeclarations(): Node[];
  /**
   * Gets the export of the symbol by the specified name or throws if not exists.
   * @param name - Name of the export.
   */
  getExportOrThrow(name: string, message?: string | (() => string)): Symbol;
  /**
   * Gets the export of the symbol by the specified name or returns undefined if not exists.
   * @param name - Name of the export.
   */
  getExport(name: string): Symbol | undefined;
  /** Gets the exports from the symbol. */
  getExports(): Symbol[];
  /**
   * Gets the global export of the symbol by the specified name or throws if not exists.
   * @param name - Name of the global export.
   */
  getGlobalExportOrThrow(name: string, message?: string | (() => string)): Symbol;
  /**
   * Gets the global export of the symbol by the specified name or returns undefined if not exists.
   * @param name - Name of the global export.
   */
  getGlobalExport(name: string): Symbol | undefined;
  /** Gets the global exports from the symbol. */
  getGlobalExports(): Symbol[];
  /**
   * Gets the member of the symbol by the specified name or throws if not exists.
   * @param name - Name of the export.
   */
  getMemberOrThrow(name: string, message?: string | (() => string)): Symbol;
  /**
   * Gets the member of the symbol by the specified name or returns undefined if not exists.
   * @param name - Name of the member.
   */
  getMember(name: string): Symbol | undefined;
  /** Gets the members of the symbol */
  getMembers(): Symbol[];
  /** Gets the declared type of the symbol. */
  getDeclaredType(): Type;
  /**
   * Gets the type of the symbol at a location.
   * @param node - Location to get the type at for this symbol.
   */
  getTypeAtLocation(node: Node): Type<ts.Type>;
  /** Gets the fully qualified name. */
  getFullyQualifiedName(): string;
  /** Gets the JS doc tag infos of the symbol. */
  getJsDocTags(): JSDocTagInfo[];
}

export interface FormatCodeSettings extends ts.FormatCodeSettings {
  ensureNewLineAtEndOfFile?: boolean;
}

/** Options for renaming a node. */
export interface RenameOptions {
  /**
   * Whether comments referencing this node should be renamed.
   * @remarks False by default.
   */
  renameInComments?: boolean;
  /**
   * Whether strings referencing this node should be renamed.
   * @remarks False by default.
   */
  renameInStrings?: boolean;
  /**
   * Whether to enable renaming shorthand property assignments, binding elements, and import & export specifiers without changing behaviour.
   * @remarks Defaults to the `usePrefixAndSuffixTextForRename` manipulation setting.
   * This setting is only available when using TypeScript 3.4+.
   */
  usePrefixAndSuffixText?: boolean;
}

/** User preferences for refactoring. */
export interface UserPreferences extends ts.UserPreferences {
}

export declare class LanguageService {
  #private;
  private constructor();
  /** Gets the compiler language service. */
  get compilerObject(): ts.LanguageService;
  /** Gets the language service's program. */
  getProgram(): Program;
  /**
   * Gets the definitions for the specified node.
   * @param node - Node.
   */
  getDefinitions(node: Node): DefinitionInfo[];
  /**
   * Gets the definitions at the specified position.
   * @param sourceFile - Source file.
   * @param pos - Position.
   */
  getDefinitionsAtPosition(sourceFile: SourceFile, pos: number): DefinitionInfo[];
  /**
   * Gets the implementations for the specified node.
   * @param node - Node.
   */
  getImplementations(node: Node): ImplementationLocation[];
  /**
   * Gets the implementations at the specified position.
   * @param sourceFile - Source file.
   * @param pos - Position.
   */
  getImplementationsAtPosition(sourceFile: SourceFile, pos: number): ImplementationLocation[];
  /**
   * Finds references based on the specified node.
   * @param node - Node to find references for.
   */
  findReferences(node: Node): ReferencedSymbol[];
  /**
   * Finds the nodes that reference the definition(s) of the specified node.
   * @param node - Node.
   */
  findReferencesAsNodes(node: Node): Node<ts.Node>[];
  /**
   * Finds references based on the specified position.
   * @param sourceFile - Source file.
   * @param pos - Position to find the reference at.
   */
  findReferencesAtPosition(sourceFile: SourceFile, pos: number): ReferencedSymbol[];
  /**
   * Find the rename locations for the specified node.
   * @param node - Node to get the rename locations for.
   * @param options - Options for renaming.
   */
  findRenameLocations(node: Node, options?: RenameOptions): RenameLocation[];
  /**
   * Gets the suggestion diagnostics.
   * @param filePathOrSourceFile - The source file or file path to get suggestions for.
   */
  getSuggestionDiagnostics(filePathOrSourceFile: SourceFile | string): DiagnosticWithLocation[];
  /**
   * Gets the formatting edits for a range.
   * @param filePath - File path.
   * @param range - Position range.
   * @param formatSettings - Format code settings.
   */
  getFormattingEditsForRange(filePath: string, range: [number, number], formatSettings: FormatCodeSettings): TextChange[];
  /**
   * Gets the formatting edits for a document.
   * @param filePath - File path of the source file.
   * @param formatSettings - Format code settings.
   */
  getFormattingEditsForDocument(filePath: string, formatSettings: FormatCodeSettings): TextChange[];
  /**
   * Gets the formatted text for a document.
   * @param filePath - File path of the source file.
   * @param formatSettings - Format code settings.
   */
  getFormattedDocumentText(filePath: string, formatSettings: FormatCodeSettings): string;
  /**
   * Gets the emit output of a source file.
   * @param sourceFile - Source file.
   * @param emitOnlyDtsFiles - Whether to only emit the d.ts files.
   */
  getEmitOutput(sourceFile: SourceFile, emitOnlyDtsFiles?: boolean): EmitOutput;
  /**
   * Gets the emit output of a source file.
   * @param filePath - File path.
   * @param emitOnlyDtsFiles - Whether to only emit the d.ts files.
   */
  getEmitOutput(filePath: string, emitOnlyDtsFiles?: boolean): EmitOutput;
  /**
   * Gets the indentation at the specified position.
   * @param sourceFile - Source file.
   * @param position - Position.
   * @param settings - Editor settings.
   */
  getIdentationAtPosition(sourceFile: SourceFile, position: number, settings?: EditorSettings): number;
  /**
   * Gets the indentation at the specified position.
   * @param filePath - File path.
   * @param position - Position.
   * @param settings - Editor settings.
   */
  getIdentationAtPosition(filePath: string, position: number, settings?: EditorSettings): number;
  /**
   * Gets the file text changes for organizing the imports in a source file.
   *
   * @param sourceFile - Source file.
   * @param formatSettings - Format code settings.
   * @param userPreferences - User preferences for refactoring.
   */
  organizeImports(sourceFile: SourceFile, formatSettings?: FormatCodeSettings, userPreferences?: UserPreferences): FileTextChanges[];
  /**
   * Gets the file text changes for organizing the imports in a source file.
   *
   * @param filePath - File path of the source file.
   * @param formatSettings - Format code settings.
   * @param userPreferences - User preferences for refactoring.
   */
  organizeImports(filePath: string, formatSettings?: FormatCodeSettings, userPreferences?: UserPreferences): FileTextChanges[];
  /**
   * Gets the edit information for applying a refactor at a the provided position in a source file.
   * @param filePathOrSourceFile - File path or source file to get the edits for.
   * @param formatSettings - Fomat code settings.
   * @param positionOrRange - Position in the source file where to apply given refactor.
   * @param refactorName - Refactor name.
   * @param actionName - Refactor action name.
   * @param preferences - User preferences for refactoring.
   */
  getEditsForRefactor(filePathOrSourceFile: string | SourceFile, formatSettings: FormatCodeSettings, positionOrRange: number | {
        getPos(): number;
        getEnd(): number;
    }, refactorName: string, actionName: string, preferences?: UserPreferences): RefactorEditInfo | undefined;
  /**
   * Gets file changes and actions to perform for the provided fixId.
   * @param filePathOrSourceFile - File path or source file to get the combined code fixes for.
   * @param fixId - Identifier for the code fix (ex. "fixMissingImport"). These ids are found in the `ts.codefix` namespace in the compiler api source.
   * @param formatSettings - Format code settings.
   * @param preferences - User preferences for refactoring.
   */
  getCombinedCodeFix(filePathOrSourceFile: string | SourceFile, fixId: {}, formatSettings?: FormatCodeSettings, preferences?: UserPreferences): CombinedCodeActions;
  /**
   * Gets the edit information for applying a code fix at the provided text range in a source file.
   * @param filePathOrSourceFile - File path or source file to get the code fixes for.
   * @param start - Start position of the text range to be fixed.
   * @param end - End position of the text range to be fixed.
   * @param errorCodes - One or more error codes associated with the code fixes to retrieve.
   * @param formatOptions - Format code settings.
   * @param preferences - User preferences for refactoring.
   */
  getCodeFixesAtPosition(filePathOrSourceFile: string | SourceFile, start: number, end: number, errorCodes: ReadonlyArray<number>, formatOptions?: FormatCodeSettings, preferences?: UserPreferences): CodeFixAction[];
}

/** Options for emitting from a Program. */
export interface ProgramEmitOptions extends EmitOptions {
  writeFile?: ts.WriteFileCallback;
}

/** Options for emitting. */
export interface EmitOptions extends EmitOptionsBase {
  /** Optional source file to only emit. */
  targetSourceFile?: SourceFile;
}

export interface EmitOptionsBase {
  /** Whether only .d.ts files should be emitted. */
  emitOnlyDtsFiles?: boolean;
  /** Transformers to act on the files when emitting. */
  customTransformers?: ts.CustomTransformers;
}

/** Wrapper around Program. */
export declare class Program {
  #private;
  private constructor();
  /** Gets the underlying compiler program. */
  get compilerObject(): ts.Program;
  /** Get the program's type checker. */
  getTypeChecker(): TypeChecker;
  /**
   * Asynchronously emits the TypeScript files as JavaScript files.
   * @param options - Options for emitting.
   */
  emit(options?: ProgramEmitOptions): Promise<EmitResult>;
  /**
   * Synchronously emits the TypeScript files as JavaScript files.
   * @param options - Options for emitting.
   * @remarks Use `emit()` as the asynchronous version will be much faster.
   */
  emitSync(options?: ProgramEmitOptions): EmitResult;
  /**
   * Emits the TypeScript files to JavaScript files to memory.
   * @param options - Options for emitting.
   */
  emitToMemory(options?: EmitOptions): MemoryEmitResult;
  /**
   * Gets the syntactic diagnostics.
   * @param sourceFile - Optional source file to filter by.
   */
  getSyntacticDiagnostics(sourceFile?: SourceFile): DiagnosticWithLocation[];
  /**
   * Gets the semantic diagnostics.
   * @param sourceFile - Optional source file to filter by.
   */
  getSemanticDiagnostics(sourceFile?: SourceFile): Diagnostic[];
  /**
   * Gets the declaration diagnostics.
   * @param sourceFile - Optional source file to filter by.
   */
  getDeclarationDiagnostics(sourceFile?: SourceFile): DiagnosticWithLocation[];
  /** Gets the global diagnostics. */
  getGlobalDiagnostics(): Diagnostic[];
  /** Gets the diagnostics found when parsing the tsconfig.json file. */
  getConfigFileParsingDiagnostics(): Diagnostic[];
  /** Gets the emit module resolution kind. */
  getEmitModuleResolutionKind(): ModuleResolutionKind;
  /**
   * Gets if the provided source file was discovered while loading an external library.
   * @param sourceFile - Source file.
   */
  isSourceFileFromExternalLibrary(sourceFile: SourceFile): boolean;
}

/** Represents a code action. */
export declare class CodeAction<TCompilerObject extends ts.CodeAction = ts.CodeAction> {
  #private;
  protected constructor();
  /** Gets the compiler object. */
  get compilerObject(): TCompilerObject;
  /** Description of the code action. */
  getDescription(): string;
  /** Text changes to apply to each file as part of the code action. */
  getChanges(): FileTextChanges[];
}

/** Represents a code fix action. */
export declare class CodeFixAction extends CodeAction<ts.CodeFixAction> {
  /** Short name to identify the fix, for use by telemetry. */
  getFixName(): string;
  /**
   * If present, one may call 'getCombinedCodeFix' with this fixId.
   * This may be omitted to indicate that the code fix can't be applied in a group.
   */
  getFixId(): {} | undefined;
  /** Gets the description of the code fix when fixing everything. */
  getFixAllDescription(): string | undefined;
}

/**
 * Represents file changes.
 *
 * @remarks Commands are currently not implemented.
 */
export declare class CombinedCodeActions {
  #private;
  private constructor();
  /** Gets the compiler object. */
  get compilerObject(): ts.CombinedCodeActions;
  /** Text changes to apply to each file. */
  getChanges(): FileTextChanges[];
  /**
   * Executes the combined code actions.
   *
   * WARNING: This will cause all nodes to be forgotten in the changed files.
   * @options - Options used when applying the changes.
   */
  applyChanges(options?: ApplyFileTextChangesOptions): this;
}

/** Definition info. */
export declare class DefinitionInfo<TCompilerObject extends ts.DefinitionInfo = ts.DefinitionInfo> extends DocumentSpan<TCompilerObject> {
  protected constructor();
  /** Gets the kind. */
  getKind(): ts.ScriptElementKind;
  /** Gets the name. */
  getName(): string;
  /** Gets the container kind. */
  getContainerKind(): ts.ScriptElementKind;
  /** Gets the container name. */
  getContainerName(): string;
  /** Gets the declaration node. */
  getDeclarationNode(): Node | undefined;
}

/** Diagnostic. */
export declare class Diagnostic<TCompilerObject extends ts.Diagnostic = ts.Diagnostic> {
  protected constructor();
  /** Gets the underlying compiler diagnostic. */
  get compilerObject(): TCompilerObject;
  /** Gets the source file. */
  getSourceFile(): SourceFile | undefined;
  /** Gets the message text. */
  getMessageText(): string | DiagnosticMessageChain;
  /** Gets the line number. */
  getLineNumber(): number | undefined;
  /** Gets the start. */
  getStart(): number | undefined;
  /** Gets the length. */
  getLength(): number | undefined;
  /** Gets the diagnostic category. */
  getCategory(): DiagnosticCategory;
  /** Gets the code of the diagnostic. */
  getCode(): number;
  /** Gets the source. */
  getSource(): string | undefined;
}

/** Diagnostic message chain. */
export declare class DiagnosticMessageChain {
  private constructor();
  /** Gets the underlying compiler object. */
  get compilerObject(): ts.DiagnosticMessageChain;
  /** Gets the message text. */
  getMessageText(): string;
  /** Gets the next diagnostic message chains in the chain. */
  getNext(): DiagnosticMessageChain[] | undefined;
  /** Gets the code of the diagnostic message chain. */
  getCode(): number;
  /** Gets the category of the diagnostic message chain. */
  getCategory(): DiagnosticCategory;
}

export declare class DiagnosticWithLocation extends Diagnostic<ts.DiagnosticWithLocation> {
  private constructor();
  /** Gets the line number. */
  getLineNumber(): number;
  /** Gets the start. */
  getStart(): number;
  /** Gets the length */
  getLength(): number;
  /** Gets the source file. */
  getSourceFile(): SourceFile;
}

/** Document span. */
export declare class DocumentSpan<TCompilerObject extends ts.DocumentSpan = ts.DocumentSpan> {
  protected constructor();
  /** Gets the compiler object. */
  get compilerObject(): TCompilerObject;
  /** Gets the source file this reference is in. */
  getSourceFile(): SourceFile;
  /** Gets the text span. */
  getTextSpan(): TextSpan;
  /** Gets the node at the start of the text span. */
  getNode(): Node<ts.Node>;
  /** Gets the original text span if the span represents a location that was remapped. */
  getOriginalTextSpan(): TextSpan | undefined;
  /** Gets the original file name if the span represents a location that was remapped. */
  getOriginalFileName(): string | undefined;
}

/** Output of an emit on a single file. */
export declare class EmitOutput {
  #private;
  private constructor();
  /** TypeScript compiler emit result. */
  get compilerObject(): ts.EmitOutput;
  /** Gets the diagnostics. */
  getDiagnostics(): Diagnostic<ts.Diagnostic>[];
  /** Gets if the emit was skipped. */
  getEmitSkipped(): boolean;
  /** Gets the output files. */
  getOutputFiles(): OutputFile[];
}

/** Result of an emit. */
export declare class EmitResult {
  protected constructor();
  /** TypeScript compiler emit result. */
  get compilerObject(): ts.EmitResult;
  /** If the emit was skipped. */
  getEmitSkipped(): boolean;
  /**
   * Contains declaration emit diagnostics.
   *
   * If the `noEmitOnError` compiler option is true, this will also include the program's semantic, syntactic, global, options, and if enabled declaration diagnostics.
   * @remarks If you are looking for non-declaration emit diagnostics, then call `Project#getPreEmitDiagnostics()` or get specific diagnostics available from the program.
   */
  getDiagnostics(): Diagnostic<ts.Diagnostic>[];
}

export interface ApplyFileTextChangesOptions {
  /** If a file should be overwritten when the file text change is for a new file, but the file currently exists. */
  overwrite?: boolean;
}

export declare class FileTextChanges {
  #private;
  private constructor();
  /** Gets the file path. */
  getFilePath(): string;
  /** Gets the source file if it was in the cache at the time of this class' creation. */
  getSourceFile(): SourceFile | undefined;
  /** Gets the text changes */
  getTextChanges(): TextChange[];
  /**
   * Applies the text changes to the file. This modifies and possibly creates a new source file.
   *
   * WARNING: This will forget any previously navigated descendant nodes in the source file.
   * @param options - Options for applying the text changes to the file.
   */
  applyChanges(options?: ApplyFileTextChangesOptions): this | undefined;
  /** Gets if this change is for creating a new file. */
  isNewFile(): boolean;
}

export declare class ImplementationLocation extends DocumentSpan<ts.ImplementationLocation> {
  private constructor();
  /** Gets the kind. */
  getKind(): ts.ScriptElementKind;
  /** Gets the display parts. */
  getDisplayParts(): SymbolDisplayPart[];
}

/** The emitted file in memory. */
export interface MemoryEmitResultFile {
  /** File path that was emitted to. */
  filePath: StandardizedFilePath;
  /** The text that was emitted. */
  text: string;
  /** Whether the byte order mark should be written. */
  writeByteOrderMark: boolean;
}

/** Result of an emit to memory. */
export declare class MemoryEmitResult extends EmitResult {
  #private;
  private constructor();
  /** Gets the files that were emitted to memory. */
  getFiles(): MemoryEmitResultFile[];
  /** Asynchronously writes the files to the file system. */
  saveFiles(): Promise<void[]>;
  /**
   * Synchronously writes the files to the file system.
   * @remarks Use `saveFiles()` as the asynchronous version will be much faster.
   */
  saveFilesSync(): void;
}

/** Output file of an emit. */
export declare class OutputFile {
  #private;
  private constructor();
  /** TypeScript compiler output file. */
  get compilerObject(): ts.OutputFile;
  /** Gets the file path. */
  getFilePath(): StandardizedFilePath;
  /** Gets whether the byte order mark should be written. */
  getWriteByteOrderMark(): boolean;
  /** Gets the file text. */
  getText(): string;
}

/** Set of edits to make in response to a refactor action, plus an optional location where renaming should be invoked from. */
export declare class RefactorEditInfo {
  #private;
  private constructor();
  /** Gets the compiler refactor edit info. */
  get compilerObject(): ts.RefactorEditInfo;
  /** Gets refactor file text changes */
  getEdits(): FileTextChanges[];
  /** Gets the file path for a rename refactor. */
  getRenameFilePath(): string | undefined;
  /** Location where renaming should be invoked from. */
  getRenameLocation(): number | undefined;
  /**
   * Executes the combined code actions.
   *
   * WARNING: This will cause all nodes to be forgotten in the changed files.
   * @options - Options used when applying the changes.
   */
  applyChanges(options?: ApplyFileTextChangesOptions): this;
}

/** Referenced symbol. */
export declare class ReferencedSymbol {
  #private;
  private constructor();
  /** Gets the compiler referenced symbol. */
  get compilerObject(): ts.ReferencedSymbol;
  /** Gets the definition. */
  getDefinition(): ReferencedSymbolDefinitionInfo;
  /** Gets the references. */
  getReferences(): ReferencedSymbolEntry[];
}

export declare class ReferencedSymbolDefinitionInfo extends DefinitionInfo<ts.ReferencedSymbolDefinitionInfo> {
  private constructor();
  /** Gets the display parts. */
  getDisplayParts(): SymbolDisplayPart[];
}

export declare class ReferenceEntry<T extends ts.ReferenceEntry = ts.ReferenceEntry> extends DocumentSpan<T> {
  protected constructor();
  isWriteAccess(): boolean;
  isInString(): true | undefined;
}

export declare class ReferencedSymbolEntry extends ReferenceEntry<ts.ReferencedSymbolEntry> {
  private constructor();
  /** If this is the definition reference. */
  isDefinition(): boolean | undefined;
}

/** Rename location. */
export declare class RenameLocation extends DocumentSpan<ts.RenameLocation> {
  /** Gets the text to insert before the rename. */
  getPrefixText(): string | undefined;
  /** Gets the text to insert after the rename. */
  getSuffixText(): string | undefined;
}

/** Symbol display part. */
export declare class SymbolDisplayPart {
  #private;
  private constructor();
  /** Gets the compiler symbol display part. */
  get compilerObject(): ts.SymbolDisplayPart;
  /** Gets the text. */
  getText(): string;
  /**
   * Gets the kind.
   *
   * Examples: "text", "lineBreak"
   */
  getKind(): string;
}

/** Represents a text change. */
export declare class TextChange {
  #private;
  private constructor();
  /** Gets the compiler text change. */
  get compilerObject(): ts.TextChange;
  /** Gets the text span. */
  getSpan(): TextSpan;
  /** Gets the new text. */
  getNewText(): string;
}

/** Represents a span of text. */
export declare class TextSpan {
  #private;
  private constructor();
  /** Gets the compiler text span. */
  get compilerObject(): ts.TextSpan;
  /** Gets the start. */
  getStart(): number;
  /** Gets the start + length. */
  getEnd(): number;
  /** Gets the length. */
  getLength(): number;
}

/** Wrapper around the TypeChecker. */
export declare class TypeChecker {
  #private;
  private constructor();
  /** Gets the compiler's TypeChecker. */
  get compilerObject(): ts.TypeChecker;
  /**
   * Gets the ambient module symbols (ex. modules in the
   * @types folder or node_modules).
   */
  getAmbientModules(): Symbol[];
  /**
   * Gets the apparent type of a type.
   * @param type - Type to get the apparent type of.
   */
  getApparentType(type: Type): Type<ts.Type>;
  /**
   * Gets the awaited type of a type (ex. `Promise<string>` -> `string`).
   * @param type - Type to get the awaited type of.
   */
  getAwaitedType(type: Type): Type<ts.Type> | undefined;
  /**
   * Gets the constant value of a declaration.
   * @param node - Node to get the constant value from.
   */
  getConstantValue(node: EnumMember): string | number | undefined;
  /**
   * Gets the fully qualified name of a symbol.
   * @param symbol - Symbol to get the fully qualified name of.
   */
  getFullyQualifiedName(symbol: Symbol): string;
  /**
   * Gets the type at the specified location.
   * @param node - Node to get the type for.
   */
  getTypeAtLocation(node: Node): Type;
  /**
   * Gets the contextual type of an expression.
   * @param expression - Expression.
   */
  getContextualType(expression: Expression): Type | undefined;
  /**
   * Gets the type of a symbol at the specified location.
   * @param symbol - Symbol to get the type for.
   * @param node - Location to get the type for.
   */
  getTypeOfSymbolAtLocation(symbol: Symbol, node: Node): Type;
  /**
   * Gets the declared type of a symbol.
   * @param symbol - Symbol to get the type for.
   */
  getDeclaredTypeOfSymbol(symbol: Symbol): Type;
  /**
   * Gets the symbol at the specified location or undefined if none exists.
   * @param node - Node to get the symbol for.
   */
  getSymbolAtLocation(node: Node): Symbol | undefined;
  /**
   * Gets the aliased symbol of a symbol.
   * @param symbol - Symbol to get the alias symbol of.
   */
  getAliasedSymbol(symbol: Symbol): Symbol | undefined;
  /**
   * Follow a single alias to get the immediately aliased symbol.
   * @param symbol - Symbol to get the immediate alias symbol of.
   */
  getImmediatelyAliasedSymbol(symbol: Symbol): Symbol | undefined;
  /**
   * Gets the export symbol of a local symbol with a corresponding export symbol. Otherwise returns the input symbol.
   *
   * The following is from the compiler API documentation:
   *
   * For example, at `export type T = number;`:
   *     - `getSymbolAtLocation` at the location `T` will return the exported symbol for `T`.
   *     - But the result of `getSymbolsInScope` will contain the *local* symbol for `T`, not the exported symbol.
   *     - Calling `getExportSymbolOfSymbol` on that local symbol will return the exported symbol.
   */
  getExportSymbolOfSymbol(symbol: Symbol): Symbol;
  /**
   * Gets the properties of a type.
   * @param type - Type.
   */
  getPropertiesOfType(type: Type): Symbol[];
  /**
   * Gets the type text
   * @param type - Type to get the text of.
   * @param enclosingNode - Enclosing node.
   * @param typeFormatFlags - Type format flags.
   */
  getTypeText(type: Type, enclosingNode?: Node, typeFormatFlags?: TypeFormatFlags): string;
  /**
   * Gets the return type of a signature.
   * @param signature - Signature to get the return type of.
   */
  getReturnTypeOfSignature(signature: Signature): Type;
  /**
   * Gets a signature from a node.
   * @param node - Node to get the signature from.
   */
  getSignatureFromNode(node: Node<ts.SignatureDeclaration>): Signature | undefined;
  /**
   * Gets the exports of a module.
   * @param moduleSymbol - Module symbol.
   */
  getExportsOfModule(moduleSymbol: Symbol): Symbol[];
  /**
   * Gets the local target symbol of the provided export specifier.
   * @param exportSpecifier - Export specifier.
   */
  getExportSpecifierLocalTargetSymbol(exportSpecifier: ExportSpecifier): Symbol | undefined;
  /**
   * Gets the resolved signature from a node or returns undefined if the signature can't be resolved.
   * @param node - Node to get the signature from.
   */
  getResolvedSignature(node: CallLikeExpression): Signature | undefined;
  /**
   * Gets the resolved signature from a node or throws if the signature cannot be resolved.
   * @param node - Node to get the signature from.
   */
  getResolvedSignatureOrThrow(node: CallLikeExpression, message?: string | (() => string)): Signature;
  /**
   * Gets the base type of a literal type.
   *
   * For example, for a number literal type it will return the number type.
   * @param type - Literal type to get the base type of.
   */
  getBaseTypeOfLiteralType(type: Type): Type<ts.Type>;
  /**
   * Gets the symbols in the scope of the provided node.
   *
   * Note: This will always return the local symbols. If you want the export symbol from a local symbol, then
   * use the `#getExportSymbolOfSymbol(symbol)` method.
   * @param node - Node to check the scope for.
   * @param meaning - Meaning of symbol to filter by.
   */
  getSymbolsInScope(node: Node, meaning: SymbolFlags): Symbol[];
  /**
   * Gets the type arguments from a type reference.
   * @param typeReference - Type reference.
   */
  getTypeArguments(typeReference: Type): Type<ts.Type>[];
  /** Checks if a type is assignable to another type. */
  isTypeAssignableTo(sourceType: Type, targetType: Type): boolean;
  /** Gets the shorthand assignment value symbol of the provided node. */
  getShorthandAssignmentValueSymbol(node: Node): Symbol | undefined;
  resolveName(name: string, location: Node | undefined, meaning: SymbolFlags, excludeGlobals: boolean): Symbol | undefined;
}

export declare class Type<TType extends ts.Type = ts.Type> {
  #private;
  protected constructor();
  /** Gets the underlying compiler type. */
  get compilerType(): TType;
  /**
   * Gets the type text.
   * @param enclosingNode - The enclosing node.
   * @param typeFormatFlags - Format flags for the type text.
   */
  getText(enclosingNode?: Node, typeFormatFlags?: TypeFormatFlags): string;
  /** Gets the alias symbol if it exists. */
  getAliasSymbol(): Symbol | undefined;
  /** Gets the alias symbol if it exists, or throws. */
  getAliasSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets the alias type arguments. */
  getAliasTypeArguments(): Type[];
  /** Gets the apparent type. */
  getApparentType(): Type;
  /** Gets the awaited type. */
  getAwaitedType(): Type | undefined;
  /** Gets the array element type or throws if it doesn't exist (ex. for `T[]` it would be `T`). */
  getArrayElementTypeOrThrow(message?: string | (() => string)): Type<ts.Type>;
  /** Gets the array element type or returns undefined if it doesn't exist (ex. for `T[]` it would be `T`). */
  getArrayElementType(): Type<ts.Type> | undefined;
  /** Gets the base types. */
  getBaseTypes(): Type<ts.BaseType>[];
  /**
   * Gets the base type of a literal type.
   *
   * For example, for a number literal type it will return the number type.
   */
  getBaseTypeOfLiteralType(): Type<ts.Type>;
  /** Gets the call signatures. */
  getCallSignatures(): Signature[];
  /** Gets the construct signatures. */
  getConstructSignatures(): Signature[];
  /** Gets the constraint or throws if it doesn't exist. */
  getConstraintOrThrow(message?: string | (() => string)): Type<ts.Type>;
  /** Gets the constraint or returns undefined if it doesn't exist. */
  getConstraint(): Type<ts.Type> | undefined;
  /** Gets the default type or throws if it doesn't exist. */
  getDefaultOrThrow(message?: string | (() => string)): Type<ts.Type>;
  /** Gets the default type or returns undefined if it doesn't exist. */
  getDefault(): Type<ts.Type> | undefined;
  /** Gets the properties of the type. */
  getProperties(): Symbol[];
  /**
   * Gets a property or throws if it doesn't exist.
   * @param name - By a name.
   */
  getPropertyOrThrow(name: string): Symbol;
  /**
   * Gets a property or throws if it doesn't exist.
   * @param findFunction - Function for searching for a property.
   */
  getPropertyOrThrow(findFunction: (declaration: Symbol) => boolean): Symbol;
  /**
   * Gets a property or returns undefined if it does not exist.
   * @param name - By a name.
   */
  getProperty(name: string): Symbol | undefined;
  /**
   * Gets a property or returns undefined if it does not exist.
   * @param findFunction - Function for searching for a property.
   */
  getProperty(findFunction: (declaration: Symbol) => boolean): Symbol | undefined;
  /** Gets the apparent properties of the type. */
  getApparentProperties(): Symbol[];
  /**
   * Gets an apparent property.
   * @param name - By a name.
   * @param findFunction - Function for searching for an apparent property.
   */
  getApparentProperty(name: string): Symbol | undefined;
  getApparentProperty(findFunction: (declaration: Symbol) => boolean): Symbol | undefined;
  /** Gets if the type is possibly null or undefined. */
  isNullable(): boolean;
  /** Gets the non-nullable type. */
  getNonNullableType(): Type;
  /** Gets the number index type. */
  getNumberIndexType(): Type | undefined;
  /** Gets the string index type. */
  getStringIndexType(): Type | undefined;
  /**
   * Returns the generic type when the type is a type reference, returns itself when it's
   * already a generic type, or otherwise returns undefined.
   *
   * For example:
   *
   * - Given type reference `Promise<string>` returns `Promise<T>`.
   * - Given generic type `Promise<T>` returns the same `Promise<T>`.
   * - Given `string` returns `undefined`.
   */
  getTargetType(): Type<ts.GenericType> | undefined;
  /**
   * Returns the generic type when the type is a type reference, returns itself when it's
   * already a generic type, or otherwise throws an error.
   *
   * For example:
   *
   * - Given type reference `Promise<string>` returns `Promise<T>`.
   * - Given generic type `Promise<T>` returns the same `Promise<T>`.
   * - Given `string` throws an error.
   */
  getTargetTypeOrThrow(message?: string | (() => string)): Type<ts.GenericType>;
  /** Gets type arguments. */
  getTypeArguments(): Type[];
  /** Gets the individual element types of the tuple. */
  getTupleElements(): Type[];
  /** Gets the union types (ex. for `T | U` it returns the array `[T, U]`). */
  getUnionTypes(): Type[];
  /** Gets the intersection types (ex. for `T & U` it returns the array `[T, U]`). */
  getIntersectionTypes(): Type[];
  /** Gets the value of a literal or returns undefined if this is not a literal type. */
  getLiteralValue(): string | number | ts.PseudoBigInt | undefined;
  /** Gets the value of the literal or throws if this is not a literal type. */
  getLiteralValueOrThrow(message?: string | (() => string)): string | number | ts.PseudoBigInt;
  /**
   * Gets the fresh type of the literal or returns undefined if this is not a literal type.
   *
   * Note: I have no idea what this means. Please help contribute to these js docs if you know.
   */
  getLiteralFreshType(): Type<ts.FreshableType> | undefined;
  /**
   * Gets the fresh type of the literal or throws if this is not a literal type.
   *
   * Note: I have no idea what this means. Please help contribute to these js docs if you know.
   */
  getLiteralFreshTypeOrThrow(message?: string | (() => string)): Type<ts.FreshableType>;
  /**
   * Gets the regular type of the literal or returns undefined if this is not a literal type.
   *
   * Note: I have no idea what this means. Please help contribute to these js docs if you know.
   */
  getLiteralRegularType(): Type<ts.FreshableType> | undefined;
  /**
   * Gets the regular type of the literal or throws if this is not a literal type.
   *
   * Note: I have no idea what this means. Please help contribute to these js docs if you know.
   */
  getLiteralRegularTypeOrThrow(message?: string | (() => string)): Type<ts.FreshableType>;
  /** Gets the symbol of the type. */
  getSymbol(): Symbol | undefined;
  /** Gets the symbol of the type or throws. */
  getSymbolOrThrow(message?: string | (() => string)): Symbol;
  /** Gets if the type is assignable to another type. */
  isAssignableTo(target: Type): boolean;
  /** Gets if this is an anonymous type. */
  isAnonymous(): boolean;
  /** Gets if this is an any type. */
  isAny(): boolean;
  /** Gets if this is a never type. */
  isNever(): boolean;
  /** Gets if this is an array type. */
  isArray(): boolean;
  /** Gets if this is a readonly array type. */
  isReadonlyArray(): boolean;
  /** Gets if this is a template literal type. */
  isTemplateLiteral(): this is Type<ts.TemplateLiteralType>;
  /** Gets if this is a boolean type. */
  isBoolean(): boolean;
  /** Gets if this is a string type. */
  isString(): boolean;
  /** Gets if this is a number type. */
  isNumber(): boolean;
  /** Gets if this is a BigInt. */
  isBigInt(): boolean;
  /** Gets if this is a literal type. */
  isLiteral(): boolean;
  /** Gets if this is a boolean literal type. */
  isBooleanLiteral(): boolean;
  /** Gets if this is a BigInt literal type. */
  isBigIntLiteral(): boolean;
  /** Gets if this is an enum literal type. */
  isEnumLiteral(): boolean;
  /** Gets if this is a number literal type. */
  isNumberLiteral(): this is Type<ts.NumberLiteralType>;
  /** Gets if this is a string literal type. */
  isStringLiteral(): this is Type<ts.StringLiteralType>;
  /** Gets if this is a class type. */
  isClass(): this is Type<ts.InterfaceType>;
  /** Gets if this is a class or interface type. */
  isClassOrInterface(): this is Type<ts.InterfaceType>;
  /** Gets if this is an enum type. */
  isEnum(): boolean;
  /** Gets if this is an interface type. */
  isInterface(): this is Type<ts.InterfaceType>;
  /** Gets if this is an object type. */
  isObject(): this is Type<ts.ObjectType>;
  /** Gets if this is a type parameter. */
  isTypeParameter(): this is TypeParameter;
  /** Gets if this is a tuple type. */
  isTuple(): this is Type<ts.TupleType>;
  /** Gets if this is a union type. */
  isUnion(): this is Type<ts.UnionType>;
  /** Gets if this is an intersection type. */
  isIntersection(): this is Type<ts.IntersectionType>;
  /** Gets if this is a union or intersection type. */
  isUnionOrIntersection(): this is Type<ts.UnionOrIntersectionType>;
  /** Gets if this is the unknown type. */
  isUnknown(): boolean;
  /** Gets if this is the null type. */
  isNull(): boolean;
  /** Gets if this is the undefined type. */
  isUndefined(): boolean;
  /** Gets if this is the void type. */
  isVoid(): boolean;
  /** Gets the type flags. */
  getFlags(): TypeFlags;
  /**
   * Gets the object flags.
   * @remarks Returns 0 for a non-object type.
   */
  getObjectFlags(): 0 | ObjectFlags.Class | ObjectFlags.Interface | ObjectFlags.Reference | ObjectFlags.Tuple | ObjectFlags.Anonymous | ObjectFlags.Mapped | ObjectFlags.Instantiated | ObjectFlags.ObjectLiteral | ObjectFlags.EvolvingArray | ObjectFlags.ObjectLiteralPatternWithComputedProperties | ObjectFlags.ReverseMapped | ObjectFlags.JsxAttributes | ObjectFlags.JSLiteral | ObjectFlags.FreshLiteral | ObjectFlags.ArrayLiteral | ObjectFlags.SingleSignatureType | ObjectFlags.ClassOrInterface | ObjectFlags.ContainsSpread | ObjectFlags.ObjectRestType | ObjectFlags.InstantiationExpressionType;
}

export declare class TypeParameter extends Type<ts.TypeParameter> {
  #private;
  /** Gets the constraint or throws if it doesn't exist. */
  getConstraintOrThrow(message?: string | (() => string)): Type;
  /** Gets the constraint type. */
  getConstraint(): Type | undefined;
  /** Gets the default type or throws if it doesn't exist. */
  getDefaultOrThrow(message?: string | (() => string)): Type;
  /** Gets the default type or undefined if it doesn't exist. */
  getDefault(): Type | undefined;
}

/** Kinds of indentation */
export declare enum IndentationText {
  /** Two spaces */
  TwoSpaces = "  ",
  /** Four spaces */
  FourSpaces = "    ",
  /** Eight spaces */
  EightSpaces = "        ",
  /** Tab */
  Tab = "\t"
}

/** Manipulation settings. */
export interface ManipulationSettings extends SupportedFormatCodeSettingsOnly {
  /** Indentation text */
  indentationText: IndentationText;
  /** New line kind */
  newLineKind: NewLineKind;
  /** Quote type used for string literals. */
  quoteKind: QuoteKind;
  /**
   * Whether to enable renaming shorthand property assignments, binding elements,
   * and import & export specifiers without changing behaviour.
   * @remarks Defaults to true.
   * This setting is only available when using TypeScript 3.4+.
   */
  usePrefixAndSuffixTextForRename: boolean;
  /** Whether to use trailing commas when inserting or removing nodes. */
  useTrailingCommas: boolean;
}

/** FormatCodeSettings that are currently supported in the library. */
export interface SupportedFormatCodeSettings extends SupportedFormatCodeSettingsOnly, EditorSettings {
}

/** FormatCodeSettings that are currently supported in the library. */
export interface SupportedFormatCodeSettingsOnly {
  /**
   * Whether to insert a space after opening and before closing non-empty braces.
   *
   * ex. `import { Item } from "./Item";` or `import {Item} from "./Item";`
   * @remarks Defaults to true.
   */
  insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: boolean;
}

/** Holds the manipulation settings. */
export declare class ManipulationSettingsContainer extends SettingsContainer<ManipulationSettings> {
  #private;
  constructor();
  /** Gets the editor settings based on the current manipulation settings. */
  getEditorSettings(): Readonly<EditorSettings>;
  /** Gets the format code settings. */
  getFormatCodeSettings(): Readonly<SupportedFormatCodeSettings>;
  /** Gets the user preferences. */
  getUserPreferences(): Readonly<UserPreferences>;
  /** Gets the quote kind used for string literals. */
  getQuoteKind(): QuoteKind;
  /** Gets the new line kind. */
  getNewLineKind(): NewLineKind;
  /** Gets the new line kind as a string. */
  getNewLineKindAsString(): "\r\n" | "\n";
  /** Gets the indentation text. */
  getIndentationText(): IndentationText;
  /** Gets whether to use prefix and suffix text when renaming. */
  getUsePrefixAndSuffixTextForRename(): boolean;
  /** Gets whether trailing commas should be used. */
  getUseTrailingCommas(): boolean;
  /**
   * Sets one or all of the settings.
   * @param settings - Settings to set.
   */
  set(settings: Partial<ManipulationSettings>): void;
}

export type StatementStructures = ClassDeclarationStructure | EnumDeclarationStructure | FunctionDeclarationStructure | InterfaceDeclarationStructure | ModuleDeclarationStructure | TypeAliasDeclarationStructure | ImportDeclarationStructure | ExportDeclarationStructure | ExportAssignmentStructure | VariableStatementStructure;
export type ClassMemberStructures = ConstructorDeclarationStructure | GetAccessorDeclarationStructure | SetAccessorDeclarationStructure | MethodDeclarationStructure | PropertyDeclarationStructure | ClassStaticBlockDeclarationStructure;
export type TypeElementMemberStructures = CallSignatureDeclarationStructure | ConstructSignatureDeclarationStructure | IndexSignatureDeclarationStructure | MethodSignatureStructure | PropertySignatureStructure;
export type InterfaceMemberStructures = TypeElementMemberStructures;
export type ObjectLiteralExpressionPropertyStructures = PropertyAssignmentStructure | ShorthandPropertyAssignmentStructure | SpreadAssignmentStructure | GetAccessorDeclarationStructure | SetAccessorDeclarationStructure | MethodDeclarationStructure;
export type JsxStructures = JsxAttributeStructure | JsxSpreadAttributeStructure | JsxElementStructure | JsxSelfClosingElementStructure;
export type Structures = ImportAttributeStructure | StatementStructures | ClassMemberStructures | EnumMemberStructure | InterfaceMemberStructures | ObjectLiteralExpressionPropertyStructures | JsxStructures | FunctionDeclarationOverloadStructure | MethodDeclarationOverloadStructure | ConstructorDeclarationOverloadStructure | ParameterDeclarationStructure | TypeParameterDeclarationStructure | SourceFileStructure | ExportSpecifierStructure | ImportSpecifierStructure | VariableDeclarationStructure | JSDocStructure | JSDocTagStructure | DecoratorStructure;

export interface AbstractableNodeStructure {
  isAbstract?: boolean;
}

export interface AmbientableNodeStructure {
  hasDeclareKeyword?: boolean;
}

export interface AsyncableNodeStructure {
  isAsync?: boolean;
}

export interface AwaitableNodeStructure {
  isAwaited?: boolean;
}

export interface DecoratableNodeStructure {
  decorators?: OptionalKind<DecoratorStructure>[];
}

export interface ExclamationTokenableNodeStructure {
  hasExclamationToken?: boolean;
}

export interface ExportableNodeStructure {
  isExported?: boolean;
  isDefaultExport?: boolean;
}

export interface ExtendsClauseableNodeStructure {
  extends?: (string | WriterFunction)[] | WriterFunction;
}

export interface GeneratorableNodeStructure {
  isGenerator?: boolean;
}

export interface ImplementsClauseableNodeStructure {
  implements?: (string | WriterFunction)[] | WriterFunction;
}

export interface InitializerExpressionableNodeStructure {
  initializer?: string | WriterFunction;
}

export interface JSDocableNodeStructure {
  docs?: (OptionalKind<JSDocStructure> | string)[];
}

export interface BindingNamedNodeStructure {
  name: string;
}

export interface ImportAttributeNamedNodeStructure {
  name: string;
}

export interface ModuleNamedNodeStructure {
  name: string;
}

export interface NameableNodeStructure {
  name?: string;
}

export interface NamedNodeStructure {
  name: string;
}

export interface PropertyNameableNodeStructure {
  name?: string;
}

export interface PropertyNamedNodeStructure {
  name: string;
}

export interface OverrideableNodeStructure {
  hasOverrideKeyword?: boolean;
}

export interface ParameteredNodeStructure {
  parameters?: OptionalKind<ParameterDeclarationStructure>[];
}

export interface QuestionDotTokenableNodeStructure {
  hasQuestionDotToken?: boolean;
}

export interface QuestionTokenableNodeStructure {
  hasQuestionToken?: boolean;
}

export interface ReadonlyableNodeStructure {
  isReadonly?: boolean;
}

export interface ReturnTypedNodeStructure {
  returnType?: string | WriterFunction;
}

export interface ScopeableNodeStructure {
  scope?: Scope;
}

export interface ScopedNodeStructure {
  scope?: Scope;
}

export interface SignaturedDeclarationStructure extends ParameteredNodeStructure, ReturnTypedNodeStructure {
}

export interface StaticableNodeStructure {
  isStatic?: boolean;
}

export interface TypedNodeStructure {
  type?: string | WriterFunction;
}

export interface TypeElementMemberedNodeStructure {
  callSignatures?: OptionalKind<CallSignatureDeclarationStructure>[];
  constructSignatures?: OptionalKind<ConstructSignatureDeclarationStructure>[];
  getAccessors?: OptionalKind<GetAccessorDeclarationStructure>[];
  indexSignatures?: OptionalKind<IndexSignatureDeclarationStructure>[];
  methods?: OptionalKind<MethodSignatureStructure>[];
  properties?: OptionalKind<PropertySignatureStructure>[];
  setAccessors?: OptionalKind<SetAccessorDeclarationStructure>[];
}

export interface TypeParameteredNodeStructure {
  typeParameters?: (OptionalKind<TypeParameterDeclarationStructure> | string)[];
}

export interface ClassLikeDeclarationBaseStructure extends NameableNodeStructure, ClassLikeDeclarationBaseSpecificStructure, ImplementsClauseableNodeStructure, DecoratableNodeStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, AbstractableNodeStructure {
}

interface ClassLikeDeclarationBaseSpecificStructure {
  extends?: string | WriterFunction;
  ctors?: OptionalKind<ConstructorDeclarationStructure>[];
  staticBlocks?: OptionalKind<ClassStaticBlockDeclarationStructure>[];
  properties?: OptionalKind<PropertyDeclarationStructure>[];
  getAccessors?: OptionalKind<GetAccessorDeclarationStructure>[];
  setAccessors?: OptionalKind<SetAccessorDeclarationStructure>[];
  methods?: OptionalKind<MethodDeclarationStructure>[];
}

export interface ClassDeclarationStructure extends Structure, ClassLikeDeclarationBaseStructure, ClassDeclarationSpecificStructure, AmbientableNodeStructure, ExportableNodeStructure {
  /**
   * The class name.
   * @remarks Can be undefined. For example: `export default class { ... }`
   */
  name?: string;
}

interface ClassDeclarationSpecificStructure extends KindedStructure<StructureKind.Class> {
}

export interface ClassStaticBlockDeclarationStructure extends Structure, ClassStaticBlockDeclarationSpecificStructure, JSDocableNodeStructure, StatementedNodeStructure {
}

interface ClassStaticBlockDeclarationSpecificStructure extends KindedStructure<StructureKind.ClassStaticBlock> {
}

export interface ConstructorDeclarationStructure extends Structure, ConstructorDeclarationSpecificStructure, ScopedNodeStructure, FunctionLikeDeclarationStructure {
}

interface ConstructorDeclarationSpecificStructure extends KindedStructure<StructureKind.Constructor> {
  overloads?: OptionalKind<ConstructorDeclarationOverloadStructure>[];
}

export interface ConstructorDeclarationOverloadStructure extends Structure, ConstructorDeclarationOverloadSpecificStructure, ScopedNodeStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure, JSDocableNodeStructure {
}

interface ConstructorDeclarationOverloadSpecificStructure extends KindedStructure<StructureKind.ConstructorOverload> {
}

export interface GetAccessorDeclarationStructure extends Structure, GetAccessorDeclarationSpecificStructure, PropertyNamedNodeStructure, StaticableNodeStructure, DecoratableNodeStructure, AbstractableNodeStructure, ScopedNodeStructure, FunctionLikeDeclarationStructure {
}

interface GetAccessorDeclarationSpecificStructure extends KindedStructure<StructureKind.GetAccessor> {
}

export interface MethodDeclarationStructure extends Structure, MethodDeclarationSpecificStructure, PropertyNamedNodeStructure, StaticableNodeStructure, DecoratableNodeStructure, AbstractableNodeStructure, ScopedNodeStructure, AsyncableNodeStructure, GeneratorableNodeStructure, FunctionLikeDeclarationStructure, QuestionTokenableNodeStructure, OverrideableNodeStructure {
}

interface MethodDeclarationSpecificStructure extends KindedStructure<StructureKind.Method> {
  overloads?: OptionalKind<MethodDeclarationOverloadStructure>[];
}

export interface MethodDeclarationOverloadStructure extends Structure, MethodDeclarationOverloadSpecificStructure, StaticableNodeStructure, AbstractableNodeStructure, ScopedNodeStructure, AsyncableNodeStructure, GeneratorableNodeStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, QuestionTokenableNodeStructure, OverrideableNodeStructure {
}

interface MethodDeclarationOverloadSpecificStructure extends KindedStructure<StructureKind.MethodOverload> {
}

export interface PropertyDeclarationStructure extends Structure, PropertyDeclarationSpecificStructure, PropertyNamedNodeStructure, TypedNodeStructure, QuestionTokenableNodeStructure, ExclamationTokenableNodeStructure, StaticableNodeStructure, ScopedNodeStructure, JSDocableNodeStructure, ReadonlyableNodeStructure, InitializerExpressionableNodeStructure, DecoratableNodeStructure, AbstractableNodeStructure, AmbientableNodeStructure, OverrideableNodeStructure {
}

interface PropertyDeclarationSpecificStructure extends KindedStructure<StructureKind.Property> {
  hasAccessorKeyword?: boolean;
}

export interface SetAccessorDeclarationStructure extends Structure, SetAccessorDeclarationSpecificStructure, PropertyNamedNodeStructure, StaticableNodeStructure, DecoratableNodeStructure, AbstractableNodeStructure, ScopedNodeStructure, FunctionLikeDeclarationStructure {
}

interface SetAccessorDeclarationSpecificStructure extends KindedStructure<StructureKind.SetAccessor> {
}

export interface DecoratorStructure extends Structure, DecoratorSpecificStructure {
}

interface DecoratorSpecificStructure extends KindedStructure<StructureKind.Decorator> {
  name: string;
  /**
   * Arguments for a decorator factory.
   * @remarks Provide an empty array to make the structure a decorator factory.
   */
  arguments?: (string | WriterFunction)[] | WriterFunction;
  typeArguments?: string[];
}

export interface JSDocStructure extends Structure, JSDocSpecificStructure {
}

interface JSDocSpecificStructure extends KindedStructure<StructureKind.JSDoc> {
  /**
   * The description of the JS doc.
   * @remarks To force this to be multi-line, add a newline to the front of the string.
   */
  description?: string | WriterFunction;
  /** JS doc tags (ex. `&#64;param value - Some description.`). */
  tags?: OptionalKind<JSDocTagStructure>[];
}

export interface JSDocTagStructure extends Structure, JSDocTagSpecificStructure {
}

interface JSDocTagSpecificStructure extends KindedStructure<StructureKind.JSDocTag> {
  /** The name for the JS doc tag that comes after the "at" symbol. */
  tagName: string;
  /** The text that follows the tag name. */
  text?: string | WriterFunction;
}

export interface EnumDeclarationStructure extends Structure, NamedNodeStructure, EnumDeclarationSpecificStructure, JSDocableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure {
}

interface EnumDeclarationSpecificStructure extends KindedStructure<StructureKind.Enum> {
  isConst?: boolean;
  members?: OptionalKind<EnumMemberStructure>[];
}

export interface EnumMemberStructure extends Structure, EnumMemberSpecificStructure, PropertyNamedNodeStructure, JSDocableNodeStructure, InitializerExpressionableNodeStructure {
}

interface EnumMemberSpecificStructure extends KindedStructure<StructureKind.EnumMember> {
  /** Convenience property for setting the initializer. */
  value?: number | string;
}

export interface ExpressionedNodeStructure {
  expression: string | WriterFunction;
}

export interface PropertyAssignmentStructure extends Structure, PropertyAssignmentSpecificStructure, PropertyNamedNodeStructure {
}

interface PropertyAssignmentSpecificStructure extends KindedStructure<StructureKind.PropertyAssignment> {
  initializer: string | WriterFunction;
}

export interface ShorthandPropertyAssignmentStructure extends Structure, ShorthandPropertyAssignmentSpecificStructure, NamedNodeStructure {
}

interface ShorthandPropertyAssignmentSpecificStructure extends KindedStructure<StructureKind.ShorthandPropertyAssignment> {
}

export interface SpreadAssignmentStructure extends Structure, SpreadAssignmentSpecificStructure, ExpressionedNodeStructure {
}

interface SpreadAssignmentSpecificStructure extends KindedStructure<StructureKind.SpreadAssignment> {
}

export interface FunctionDeclarationStructure extends Structure, FunctionDeclarationSpecificStructure, NameableNodeStructure, FunctionLikeDeclarationStructure, AsyncableNodeStructure, GeneratorableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure {
}

interface FunctionDeclarationSpecificStructure extends KindedStructure<StructureKind.Function> {
  overloads?: OptionalKind<FunctionDeclarationOverloadStructure>[];
}

export interface FunctionDeclarationOverloadStructure extends Structure, FunctionDeclarationOverloadSpecificStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, AsyncableNodeStructure, GeneratorableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure {
}

interface FunctionDeclarationOverloadSpecificStructure extends KindedStructure<StructureKind.FunctionOverload> {
}

export interface FunctionLikeDeclarationStructure extends SignaturedDeclarationStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, StatementedNodeStructure {
}

export interface ParameterDeclarationStructure extends Structure, BindingNamedNodeStructure, TypedNodeStructure, ReadonlyableNodeStructure, DecoratableNodeStructure, QuestionTokenableNodeStructure, ScopeableNodeStructure, InitializerExpressionableNodeStructure, ParameterDeclarationSpecificStructure, OverrideableNodeStructure {
}

interface ParameterDeclarationSpecificStructure extends KindedStructure<StructureKind.Parameter> {
  isRestParameter?: boolean;
}

export interface CallSignatureDeclarationStructure extends Structure, CallSignatureDeclarationSpecificStructure, JSDocableNodeStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure {
}

interface CallSignatureDeclarationSpecificStructure extends KindedStructure<StructureKind.CallSignature> {
}

export interface ConstructSignatureDeclarationStructure extends Structure, ConstructSignatureDeclarationSpecificStructure, JSDocableNodeStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure {
}

interface ConstructSignatureDeclarationSpecificStructure extends KindedStructure<StructureKind.ConstructSignature> {
}

export interface IndexSignatureDeclarationStructure extends Structure, IndexSignatureDeclarationSpecificStructure, JSDocableNodeStructure, ReadonlyableNodeStructure, ReturnTypedNodeStructure {
}

interface IndexSignatureDeclarationSpecificStructure extends KindedStructure<StructureKind.IndexSignature> {
  keyName?: string;
  keyType?: string;
}

export interface InterfaceDeclarationStructure extends Structure, NamedNodeStructure, InterfaceDeclarationSpecificStructure, ExtendsClauseableNodeStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure, TypeElementMemberedNodeStructure {
}

interface InterfaceDeclarationSpecificStructure extends KindedStructure<StructureKind.Interface> {
}

export interface MethodSignatureStructure extends Structure, PropertyNamedNodeStructure, MethodSignatureSpecificStructure, QuestionTokenableNodeStructure, JSDocableNodeStructure, SignaturedDeclarationStructure, TypeParameteredNodeStructure {
}

interface MethodSignatureSpecificStructure extends KindedStructure<StructureKind.MethodSignature> {
}

export interface PropertySignatureStructure extends Structure, PropertySignatureSpecificStructure, PropertyNamedNodeStructure, TypedNodeStructure, QuestionTokenableNodeStructure, JSDocableNodeStructure, ReadonlyableNodeStructure, InitializerExpressionableNodeStructure {
}

interface PropertySignatureSpecificStructure extends KindedStructure<StructureKind.PropertySignature> {
}

export interface JsxAttributedNodeStructure {
  attributes?: (OptionalKind<JsxAttributeStructure> | JsxSpreadAttributeStructure)[];
}

export interface JsxTagNamedNodeStructure {
  name: string;
}

export interface JsxAttributeStructure extends Structure, JsxAttributeSpecificStructure {
}

interface JsxAttributeSpecificStructure extends KindedStructure<StructureKind.JsxAttribute> {
  name: string | JsxNamespacedNameStructure;
  initializer?: string;
}

export interface JsxElementStructure extends Structure, JsxElementSpecificStructure {
}

interface JsxElementSpecificStructure extends KindedStructure<StructureKind.JsxElement> {
  name: string;
  attributes?: (OptionalKind<JsxAttributeStructure> | JsxSpreadAttributeStructure)[];
  children?: (OptionalKind<JsxElementStructure> | JsxSelfClosingElementStructure)[];
  bodyText?: string;
}

export interface JsxNamespacedNameStructure {
  namespace: string;
  name: string;
}

export interface JsxSelfClosingElementStructure extends Structure, JsxTagNamedNodeStructure, JsxSelfClosingElementSpecificStructure, JsxAttributedNodeStructure {
}

interface JsxSelfClosingElementSpecificStructure extends KindedStructure<StructureKind.JsxSelfClosingElement> {
}

export interface JsxSpreadAttributeStructure extends Structure, JsxSpreadAttributeSpecificStructure {
}

interface JsxSpreadAttributeSpecificStructure extends KindedStructure<StructureKind.JsxSpreadAttribute> {
  expression: string;
}

export interface ExportAssignmentStructure extends Structure, ExportAssignmentSpecificStructure, JSDocableNodeStructure {
}

interface ExportAssignmentSpecificStructure extends KindedStructure<StructureKind.ExportAssignment> {
  isExportEquals?: boolean;
  expression: string | WriterFunction;
}

export interface ExportDeclarationStructure extends Structure, ExportDeclarationSpecificStructure {
}

interface ExportDeclarationSpecificStructure extends KindedStructure<StructureKind.ExportDeclaration> {
  isTypeOnly?: boolean;
  namespaceExport?: string;
  namedExports?: (string | OptionalKind<ExportSpecifierStructure> | WriterFunction)[] | WriterFunction;
  moduleSpecifier?: string;
  attributes?: OptionalKind<ImportAttributeStructure>[] | undefined;
}

export interface ExportSpecifierStructure extends Structure, ExportSpecifierSpecificStructure {
}

interface ExportSpecifierSpecificStructure extends KindedStructure<StructureKind.ExportSpecifier> {
  name: string;
  alias?: string;
  isTypeOnly?: boolean;
}

export interface ImportAttributeStructure extends Structure, ImportAttributeStructureSpecificStructure, ImportAttributeNamedNodeStructure {
}

interface ImportAttributeStructureSpecificStructure extends KindedStructure<StructureKind.ImportAttribute> {
  /** Expression value. Quote this when providing a string. */
  value: string;
}

export interface ImportDeclarationStructure extends Structure, ImportDeclarationSpecificStructure {
}

interface ImportDeclarationSpecificStructure extends KindedStructure<StructureKind.ImportDeclaration> {
  isTypeOnly?: boolean;
  defaultImport?: string;
  namespaceImport?: string;
  namedImports?: (OptionalKind<ImportSpecifierStructure> | string | WriterFunction)[] | WriterFunction;
  moduleSpecifier: string;
  attributes?: OptionalKind<ImportAttributeStructure>[] | undefined;
}

export interface ImportSpecifierStructure extends Structure, ImportSpecifierSpecificStructure {
}

interface ImportSpecifierSpecificStructure extends KindedStructure<StructureKind.ImportSpecifier> {
  name: string;
  isTypeOnly?: boolean;
  alias?: string;
}

export interface ModuleDeclarationStructure extends Structure, ModuleNamedNodeStructure, ModuleDeclarationSpecificStructure, JSDocableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure, StatementedNodeStructure {
}

interface ModuleDeclarationSpecificStructure extends KindedStructure<StructureKind.Module> {
  /**
   * The module declaration kind.
   *
   * @remarks Defaults to "namespace".
   */
  declarationKind?: ModuleDeclarationKind;
}

export interface SourceFileStructure extends Structure, SourceFileSpecificStructure, StatementedNodeStructure {
}

interface SourceFileSpecificStructure {
  kind: StructureKind.SourceFile;
}

export interface StatementedNodeStructure {
  statements?: (string | WriterFunction | StatementStructures)[] | string | WriterFunction;
}

export interface VariableDeclarationStructure extends Structure, VariableDeclarationSpecificStructure, BindingNamedNodeStructure, InitializerExpressionableNodeStructure, TypedNodeStructure, ExclamationTokenableNodeStructure {
}

interface VariableDeclarationSpecificStructure extends KindedStructure<StructureKind.VariableDeclaration> {
}

export interface VariableStatementStructure extends Structure, VariableStatementSpecificStructure, JSDocableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure {
}

interface VariableStatementSpecificStructure extends KindedStructure<StructureKind.VariableStatement> {
  declarationKind?: VariableDeclarationKind;
  declarations: OptionalKind<VariableDeclarationStructure>[];
}

export interface Structure {
  /** Leading comments or whitespace. */
  leadingTrivia?: string | WriterFunction | (string | WriterFunction)[];
  /** Trailing comments or whitespace. */
  trailingTrivia?: string | WriterFunction | (string | WriterFunction)[];
}

/** Type guards for use on structures. */
export declare const Structure: {
      /**
       * Gets if the provided structure has a name.
       */
      readonly hasName: <T extends Structure>(structure: T) => structure is T & {
          name: string;
      };
      /** Gets if the provided structure is a CallSignatureDeclarationStructure. */
      readonly isCallSignature: (structure: unknown) => structure is CallSignatureDeclarationStructure;
      /** Gets if the provided structure is a JSDocableNodeStructure. */
      readonly isJSDocable: <T>(structure: T) => structure is T & JSDocableNodeStructure;
      /** Gets if the provided structure is a SignaturedDeclarationStructure. */
      readonly isSignatured: <T>(structure: T) => structure is T & SignaturedDeclarationStructure;
      /** Gets if the provided structure is a ParameteredNodeStructure. */
      readonly isParametered: <T>(structure: T) => structure is T & ParameteredNodeStructure;
      /** Gets if the provided structure is a ReturnTypedNodeStructure. */
      readonly isReturnTyped: <T>(structure: T) => structure is T & ReturnTypedNodeStructure;
      /** Gets if the provided structure is a TypeParameteredNodeStructure. */
      readonly isTypeParametered: <T>(structure: T) => structure is T & TypeParameteredNodeStructure;
      /** Gets if the provided structure is a ClassDeclarationStructure. */
      readonly isClass: (structure: unknown) => structure is ClassDeclarationStructure;
      /** Gets if the provided structure is a ClassLikeDeclarationBaseStructure. */
      readonly isClassLikeDeclarationBase: <T>(structure: T) => structure is T & ClassLikeDeclarationBaseStructure;
      /** Gets if the provided structure is a NameableNodeStructure. */
      readonly isNameable: <T>(structure: T) => structure is T & NameableNodeStructure;
      /** Gets if the provided structure is a ImplementsClauseableNodeStructure. */
      readonly isImplementsClauseable: <T>(structure: T) => structure is T & ImplementsClauseableNodeStructure;
      /** Gets if the provided structure is a DecoratableNodeStructure. */
      readonly isDecoratable: <T>(structure: T) => structure is T & DecoratableNodeStructure;
      /** Gets if the provided structure is a AbstractableNodeStructure. */
      readonly isAbstractable: <T>(structure: T) => structure is T & AbstractableNodeStructure;
      /** Gets if the provided structure is a AmbientableNodeStructure. */
      readonly isAmbientable: <T>(structure: T) => structure is T & AmbientableNodeStructure;
      /** Gets if the provided structure is a ExportableNodeStructure. */
      readonly isExportable: <T>(structure: T) => structure is T & ExportableNodeStructure;
      /** Gets if the provided structure is a ClassStaticBlockDeclarationStructure. */
      readonly isClassStaticBlock: (structure: unknown) => structure is ClassStaticBlockDeclarationStructure;
      /** Gets if the provided structure is a StatementedNodeStructure. */
      readonly isStatemented: <T>(structure: T) => structure is T & StatementedNodeStructure;
      /** Gets if the provided structure is a ConstructorDeclarationOverloadStructure. */
      readonly isConstructorDeclarationOverload: (structure: unknown) => structure is ConstructorDeclarationOverloadStructure;
      /** Gets if the provided structure is a ScopedNodeStructure. */
      readonly isScoped: <T>(structure: T) => structure is T & ScopedNodeStructure;
      /** Gets if the provided structure is a ConstructorDeclarationStructure. */
      readonly isConstructor: (structure: unknown) => structure is ConstructorDeclarationStructure;
      /** Gets if the provided structure is a FunctionLikeDeclarationStructure. */
      readonly isFunctionLike: <T>(structure: T) => structure is T & FunctionLikeDeclarationStructure;
      /** Gets if the provided structure is a ConstructSignatureDeclarationStructure. */
      readonly isConstructSignature: (structure: unknown) => structure is ConstructSignatureDeclarationStructure;
      /** Gets if the provided structure is a DecoratorStructure. */
      readonly isDecorator: (structure: unknown) => structure is DecoratorStructure;
      /** Gets if the provided structure is a EnumDeclarationStructure. */
      readonly isEnum: (structure: unknown) => structure is EnumDeclarationStructure;
      /** Gets if the provided structure is a NamedNodeStructure. */
      readonly isNamed: <T>(structure: T) => structure is T & NamedNodeStructure;
      /** Gets if the provided structure is a EnumMemberStructure. */
      readonly isEnumMember: (structure: unknown) => structure is EnumMemberStructure;
      /** Gets if the provided structure is a PropertyNamedNodeStructure. */
      readonly isPropertyNamed: <T>(structure: T) => structure is T & PropertyNamedNodeStructure;
      /** Gets if the provided structure is a InitializerExpressionableNodeStructure. */
      readonly isInitializerExpressionable: <T>(structure: T) => structure is T & InitializerExpressionableNodeStructure;
      /** Gets if the provided structure is a ExportAssignmentStructure. */
      readonly isExportAssignment: (structure: unknown) => structure is ExportAssignmentStructure;
      /** Gets if the provided structure is a ExportDeclarationStructure. */
      readonly isExportDeclaration: (structure: unknown) => structure is ExportDeclarationStructure;
      /** Gets if the provided structure is a ExportSpecifierStructure. */
      readonly isExportSpecifier: (structure: unknown) => structure is ExportSpecifierStructure;
      /** Gets if the provided structure is a FunctionDeclarationOverloadStructure. */
      readonly isFunctionDeclarationOverload: (structure: unknown) => structure is FunctionDeclarationOverloadStructure;
      /** Gets if the provided structure is a AsyncableNodeStructure. */
      readonly isAsyncable: <T>(structure: T) => structure is T & AsyncableNodeStructure;
      /** Gets if the provided structure is a GeneratorableNodeStructure. */
      readonly isGeneratorable: <T>(structure: T) => structure is T & GeneratorableNodeStructure;
      /** Gets if the provided structure is a FunctionDeclarationStructure. */
      readonly isFunction: (structure: unknown) => structure is FunctionDeclarationStructure;
      /** Gets if the provided structure is a GetAccessorDeclarationStructure. */
      readonly isGetAccessor: (structure: unknown) => structure is GetAccessorDeclarationStructure;
      /** Gets if the provided structure is a StaticableNodeStructure. */
      readonly isStaticable: <T>(structure: T) => structure is T & StaticableNodeStructure;
      /** Gets if the provided structure is a ImportAttributeStructure. */
      readonly isImportAttribute: (structure: unknown) => structure is ImportAttributeStructure;
      /** Gets if the provided structure is a ImportAttributeNamedNodeStructure. */
      readonly isImportAttributeNamed: <T>(structure: T) => structure is T & ImportAttributeNamedNodeStructure;
      /** Gets if the provided structure is a ImportDeclarationStructure. */
      readonly isImportDeclaration: (structure: unknown) => structure is ImportDeclarationStructure;
      /** Gets if the provided structure is a ImportSpecifierStructure. */
      readonly isImportSpecifier: (structure: unknown) => structure is ImportSpecifierStructure;
      /** Gets if the provided structure is a IndexSignatureDeclarationStructure. */
      readonly isIndexSignature: (structure: unknown) => structure is IndexSignatureDeclarationStructure;
      /** Gets if the provided structure is a ReadonlyableNodeStructure. */
      readonly isReadonlyable: <T>(structure: T) => structure is T & ReadonlyableNodeStructure;
      /** Gets if the provided structure is a InterfaceDeclarationStructure. */
      readonly isInterface: (structure: unknown) => structure is InterfaceDeclarationStructure;
      /** Gets if the provided structure is a ExtendsClauseableNodeStructure. */
      readonly isExtendsClauseable: <T>(structure: T) => structure is T & ExtendsClauseableNodeStructure;
      /** Gets if the provided structure is a TypeElementMemberedNodeStructure. */
      readonly isTypeElementMembered: <T>(structure: T) => structure is T & TypeElementMemberedNodeStructure;
      /** Gets if the provided structure is a JSDocStructure. */
      readonly isJSDoc: (structure: unknown) => structure is JSDocStructure;
      /** Gets if the provided structure is a JSDocTagStructure. */
      readonly isJSDocTag: (structure: unknown) => structure is JSDocTagStructure;
      /** Gets if the provided structure is a JsxAttributeStructure. */
      readonly isJsxAttribute: (structure: unknown) => structure is JsxAttributeStructure;
      /** Gets if the provided structure is a JsxElementStructure. */
      readonly isJsxElement: (structure: unknown) => structure is JsxElementStructure;
      /** Gets if the provided structure is a JsxSelfClosingElementStructure. */
      readonly isJsxSelfClosingElement: (structure: unknown) => structure is JsxSelfClosingElementStructure;
      /** Gets if the provided structure is a JsxTagNamedNodeStructure. */
      readonly isJsxTagNamed: <T>(structure: T) => structure is T & JsxTagNamedNodeStructure;
      /** Gets if the provided structure is a JsxAttributedNodeStructure. */
      readonly isJsxAttributed: <T>(structure: T) => structure is T & JsxAttributedNodeStructure;
      /** Gets if the provided structure is a JsxSpreadAttributeStructure. */
      readonly isJsxSpreadAttribute: (structure: unknown) => structure is JsxSpreadAttributeStructure;
      /** Gets if the provided structure is a MethodDeclarationOverloadStructure. */
      readonly isMethodDeclarationOverload: (structure: unknown) => structure is MethodDeclarationOverloadStructure;
      /** Gets if the provided structure is a QuestionTokenableNodeStructure. */
      readonly isQuestionTokenable: <T>(structure: T) => structure is T & QuestionTokenableNodeStructure;
      /** Gets if the provided structure is a OverrideableNodeStructure. */
      readonly isOverrideable: <T>(structure: T) => structure is T & OverrideableNodeStructure;
      /** Gets if the provided structure is a MethodDeclarationStructure. */
      readonly isMethod: (structure: unknown) => structure is MethodDeclarationStructure;
      /** Gets if the provided structure is a MethodSignatureStructure. */
      readonly isMethodSignature: (structure: unknown) => structure is MethodSignatureStructure;
      /** Gets if the provided structure is a ModuleDeclarationStructure. */
      readonly isModule: (structure: unknown) => structure is ModuleDeclarationStructure;
      /** Gets if the provided structure is a ModuleNamedNodeStructure. */
      readonly isModuleNamed: <T>(structure: T) => structure is T & ModuleNamedNodeStructure;
      /** Gets if the provided structure is a ParameterDeclarationStructure. */
      readonly isParameter: (structure: unknown) => structure is ParameterDeclarationStructure;
      /** Gets if the provided structure is a BindingNamedNodeStructure. */
      readonly isBindingNamed: <T>(structure: T) => structure is T & BindingNamedNodeStructure;
      /** Gets if the provided structure is a TypedNodeStructure. */
      readonly isTyped: <T>(structure: T) => structure is T & TypedNodeStructure;
      /** Gets if the provided structure is a ScopeableNodeStructure. */
      readonly isScopeable: <T>(structure: T) => structure is T & ScopeableNodeStructure;
      /** Gets if the provided structure is a PropertyAssignmentStructure. */
      readonly isPropertyAssignment: (structure: unknown) => structure is PropertyAssignmentStructure;
      /** Gets if the provided structure is a PropertyDeclarationStructure. */
      readonly isProperty: (structure: unknown) => structure is PropertyDeclarationStructure;
      /** Gets if the provided structure is a ExclamationTokenableNodeStructure. */
      readonly isExclamationTokenable: <T>(structure: T) => structure is T & ExclamationTokenableNodeStructure;
      /** Gets if the provided structure is a PropertySignatureStructure. */
      readonly isPropertySignature: (structure: unknown) => structure is PropertySignatureStructure;
      /** Gets if the provided structure is a SetAccessorDeclarationStructure. */
      readonly isSetAccessor: (structure: unknown) => structure is SetAccessorDeclarationStructure;
      /** Gets if the provided structure is a ShorthandPropertyAssignmentStructure. */
      readonly isShorthandPropertyAssignment: (structure: unknown) => structure is ShorthandPropertyAssignmentStructure;
      /** Gets if the provided structure is a SourceFileStructure. */
      readonly isSourceFile: (structure: unknown) => structure is SourceFileStructure;
      /** Gets if the provided structure is a SpreadAssignmentStructure. */
      readonly isSpreadAssignment: (structure: unknown) => structure is SpreadAssignmentStructure;
      /** Gets if the provided structure is a ExpressionedNodeStructure. */
      readonly isExpressioned: <T>(structure: T) => structure is T & ExpressionedNodeStructure;
      /** Gets if the provided structure is a TypeAliasDeclarationStructure. */
      readonly isTypeAlias: (structure: unknown) => structure is TypeAliasDeclarationStructure;
      /** Gets if the provided structure is a TypeParameterDeclarationStructure. */
      readonly isTypeParameter: (structure: unknown) => structure is TypeParameterDeclarationStructure;
      /** Gets if the provided structure is a VariableDeclarationStructure. */
      readonly isVariableDeclaration: (structure: unknown) => structure is VariableDeclarationStructure;
      /** Gets if the provided structure is a VariableStatementStructure. */
      readonly isVariableStatement: (structure: unknown) => structure is VariableStatementStructure;
  };

export interface KindedStructure<TKind extends StructureKind> {
  kind: TKind;
}

export declare enum StructureKind {
  ImportAttribute = 0,
  CallSignature = 1,
  Class = 2,
  ClassStaticBlock = 3,
  ConstructSignature = 4,
  Constructor = 5,
  ConstructorOverload = 6,
  Decorator = 7,
  Enum = 8,
  EnumMember = 9,
  ExportAssignment = 10,
  ExportDeclaration = 11,
  ExportSpecifier = 12,
  Function = 13,
  FunctionOverload = 14,
  GetAccessor = 15,
  ImportDeclaration = 16,
  ImportSpecifier = 17,
  IndexSignature = 18,
  Interface = 19,
  JsxAttribute = 20,
  JsxSpreadAttribute = 21,
  JsxElement = 22,
  JsxSelfClosingElement = 23,
  JSDoc = 24,
  JSDocTag = 25,
  Method = 26,
  MethodOverload = 27,
  MethodSignature = 28,
  Module = 29,
  Parameter = 30,
  Property = 31,
  PropertyAssignment = 32,
  PropertySignature = 33,
  SetAccessor = 34,
  ShorthandPropertyAssignment = 35,
  SourceFile = 36,
  SpreadAssignment = 37,
  TypeAlias = 38,
  TypeParameter = 39,
  VariableDeclaration = 40,
  VariableStatement = 41
}

export interface TypeAliasDeclarationStructure extends Structure, TypeAliasDeclarationSpecificStructure, NamedNodeStructure, TypedNodeStructure, TypeParameteredNodeStructure, JSDocableNodeStructure, AmbientableNodeStructure, ExportableNodeStructure {
  type: string | WriterFunction;
}

interface TypeAliasDeclarationSpecificStructure extends KindedStructure<StructureKind.TypeAlias> {
  type: string | WriterFunction;
}

export interface TypeParameterDeclarationStructure extends Structure, TypeParameterDeclarationSpecificStructure, NamedNodeStructure {
}

interface TypeParameterDeclarationSpecificStructure extends KindedStructure<StructureKind.TypeParameter> {
  isConst?: boolean;
  constraint?: string | WriterFunction;
  default?: string | WriterFunction;
  variance?: TypeParameterVariance;
}

export type OptionalKind<TStructure extends {
      kind?: StructureKind;
  }> = Pick<TStructure, Exclude<keyof TStructure, "kind">> & Partial<Pick<TStructure, "kind">>;
/**
 * Iterates over the elements in the provided array.
 * @param structures - Array of structures to iterate over.
 * @param callback - Callback to do on each element in the array. Returning a truthy value will return that value in the main function call.
 */
export declare function forEachStructureChild<TStructure>(structures: ReadonlyArray<Structures>, callback: (child: Structures) => TStructure | void): TStructure | undefined;
/**
 * Iterates over the children of the provided array.
 * @remarks If the children do not have a `kind` property, it will be automatically added.
 * @param structure - Structure to iterate over.
 * @param callback - Callback to do on each child of the provided structure. Returning a truthy value will return that value in the main function call.
 */
export declare function forEachStructureChild<TStructure>(structure: Structures, callback: (child: Structures) => TStructure | void): TStructure | undefined;
import { CompilerOptions, DiagnosticCategory, EditorSettings, EmitHint, ImportPhaseModifierSyntaxKind, LanguageVariant, ModuleKind, ModuleResolutionKind, NewLineKind, NodeFlags, ObjectFlags, ScriptKind, ScriptTarget, SymbolFlags, SyntaxKind, TypeFlags, TypeFormatFlags } from "@ts-morph/common";
export { ts, CompilerOptions, DiagnosticCategory, EditorSettings, EmitHint, ImportPhaseModifierSyntaxKind, LanguageVariant, ModuleKind, ModuleResolutionKind, NewLineKind, NodeFlags, ObjectFlags, ScriptKind, ScriptTarget, SymbolFlags, SyntaxKind, TypeFlags, TypeFormatFlags };

/** Code writer that assists with formatting and visualizing blocks of JavaScript or TypeScript code. */
export declare class CodeBlockWriter {
  /**
   * Constructor.
   * @param opts - Options for the writer.
   */
  constructor(opts?: Partial<CodeBlockWriterOptions>);
  /** Gets the options. */
  getOptions(): CodeBlockWriterOptions;
  /**
   * Queues the indentation level for the next lines written.
   * @param indentationLevel - Indentation level to queue.
   */
  queueIndentationLevel(indentationLevel: number): this;
  /**
   * Queues the indentation level for the next lines written using the provided indentation text.
   * @param whitespaceText - Gets the indentation level from the indentation text.
   */
  queueIndentationLevel(whitespaceText: string): this;
  /**
   * Writes the text within the provided action with hanging indentation.
   * @param action - Action to perform with hanging indentation.
   */
  hangingIndent(action: () => void): this;
  /**
   * Writes the text within the provided action with hanging indentation unless writing a block.
   * @param action - Action to perform with hanging indentation unless a block is written.
   */
  hangingIndentUnlessBlock(action: () => void): this;
  /**
   * Sets the current indentation level.
   * @param indentationLevel - Indentation level to be at.
   */
  setIndentationLevel(indentationLevel: number): this;
  /**
   * Sets the current indentation using the provided indentation text.
   * @param whitespaceText - Gets the indentation level from the indentation text.
   */
  setIndentationLevel(whitespaceText: string): this;
  /**
   * Sets the indentation level within the provided action and restores the writer's indentation
   * state afterwards.
   * @remarks Restores the writer's state after the action.
   * @param indentationLevel - Indentation level to set.
   * @param action - Action to perform with the indentation.
   */
  withIndentationLevel(indentationLevel: number, action: () => void): this;
  /**
   * Sets the indentation level with the provided indentation text within the provided action
   * and restores the writer's indentation state afterwards.
   * @param whitespaceText - Gets the indentation level from the indentation text.
   * @param action - Action to perform with the indentation.
   */
  withIndentationLevel(whitespaceText: string, action: () => void): this;
  /** Gets the current indentation level. */
  getIndentationLevel(): number;
  /**
   * Writes a block using braces.
   * @param block - Write using the writer within this block.
   */
  block(block?: () => void): this;
  /**
   * Writes an inline block with braces.
   * @param block - Write using the writer within this block.
   */
  inlineBlock(block?: () => void): this;
  /** Indents the code one level for the current line. */
  indent(times?: number): this;
  /**
   * Indents a block of code.
   * @param block - Block to indent.
   */
  indent(block: () => void): this;
  /**
   * Conditionally writes a line of text.
   * @param condition - Condition to evaluate.
   * @param textFunc - A function that returns a string to write if the condition is true.
   */
  conditionalWriteLine(condition: boolean | undefined, textFunc: () => string): this;
  /**
   * Conditionally writes a line of text.
   * @param condition - Condition to evaluate.
   * @param text - Text to write if the condition is true.
   */
  conditionalWriteLine(condition: boolean | undefined, text: string): this;
  /**
   * Writes a line of text.
   * @param text - String to write.
   */
  writeLine(text: string): this;
  /** Writes a newline if the last line was not a newline. */
  newLineIfLastNot(): this;
  /** Writes a blank line if the last written text was not a blank line. */
  blankLineIfLastNot(): this;
  /**
   * Writes a blank line if the condition is true.
   * @param condition - Condition to evaluate.
   */
  conditionalBlankLine(condition: boolean | undefined): this;
  /** Writes a blank line. */
  blankLine(): this;
  /**
   * Writes a newline if the condition is true.
   * @param condition - Condition to evaluate.
   */
  conditionalNewLine(condition: boolean | undefined): this;
  /** Writes a newline. */
  newLine(): this;
  /** Writes a quote character. */
  quote(): this;
  /**
   * Writes text surrounded in quotes.
   * @param text - Text to write.
   */
  quote(text: string): this;
  /** Writes a space if the last character was not a space. */
  spaceIfLastNot(): this;
  /**
   * Writes a space.
   * @param times - Number of times to write a space.
   */
  space(times?: number): this;
  /** Writes a tab if the last character was not a tab. */
  tabIfLastNot(): this;
  /**
   * Writes a tab.
   * @param times - Number of times to write a tab.
   */
  tab(times?: number): this;
  /**
   * Conditionally writes text.
   * @param condition - Condition to evaluate.
   * @param textFunc - A function that returns a string to write if the condition is true.
   */
  conditionalWrite(condition: boolean | undefined, textFunc: () => string): this;
  /**
   * Conditionally writes text.
   * @param condition - Condition to evaluate.
   * @param text - Text to write if the condition is true.
   */
  conditionalWrite(condition: boolean | undefined, text: string): this;
  /**
   * Writes the provided text.
   * @param text - Text to write.
   */
  write(text: string): this;
  /** Writes text to exit a comment if in a comment. */
  closeComment(): this;
  /**
   * Inserts text at the provided position.
   *
   * This method is "unsafe" because it won't update the state of the writer unless
   * inserting at the end position. It is biased towards being fast at inserting closer
   * to the start or end, but slower to insert in the middle. Only use this if
   * absolutely necessary.
   * @param pos - Position to insert at.
   * @param text - Text to insert.
   */
  unsafeInsert(pos: number, text: string): this;
  /** Gets the length of the string in the writer. */
  getLength(): number;
  /** Gets if the writer is currently in a comment. */
  isInComment(): boolean;
  /** Gets if the writer is currently at the start of the first line of the text, block, or indentation block. */
  isAtStartOfFirstLineOfBlock(): boolean;
  /** Gets if the writer is currently on the first line of the text, block, or indentation block. */
  isOnFirstLineOfBlock(): boolean;
  /** Gets if the writer is currently in a string. */
  isInString(): boolean;
  /** Gets if the last chars written were for a newline. */
  isLastNewLine(): boolean;
  /** Gets if the last chars written were for a blank line. */
  isLastBlankLine(): boolean;
  /** Gets if the last char written was a space. */
  isLastSpace(): boolean;
  /** Gets if the last char written was a tab. */
  isLastTab(): boolean;
  /** Gets the last char written. */
  getLastChar(): string | undefined;
  /**
   * Gets if the writer ends with the provided text.
   * @param text - Text to check if the writer ends with the provided text.
   */
  endsWith(text: string): boolean;
  /**
   * Iterates over the writer characters in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string.
   */
  iterateLastChars<T>(action: (char: string, index: number) => T | undefined): T | undefined;
  /**
   * Iterates over the writer character char codes in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string. Additionally, this is slightly more efficient that
   * `iterateLastChars` as this won't allocate a string per character.
   */
  iterateLastCharCodes<T>(action: (charCode: number, index: number) => T | undefined): T | undefined;
  /** Gets the writer's text. */
  toString(): string;
}

/** Options for the writer. */
export interface CodeBlockWriterOptions {
  /**
   * Newline character.
   * @remarks Defaults to \n.
   */
  newLine: "\n" | "\r\n";
  /**
   * Number of spaces to indent when `useTabs` is false.
   * @remarks Defaults to 4.
   */
  indentNumberOfSpaces: number;
  /**
   * Whether to use tabs (true) or spaces (false).
   * @remarks Defaults to false.
   */
  useTabs: boolean;
  /**
   * Whether to use a single quote (true) or double quote (false).
   * @remarks Defaults to false.
   */
  useSingleQuote: boolean;
}
