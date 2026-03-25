import { TSDocTagDefinition, type TSDocConfiguration, ParserMessageLog, type ITSDocTagDefinitionParameters } from '@microsoft/tsdoc';
/**
 * Represents an individual `tsdoc.json` file.
 *
 * @public
 */
export declare class TSDocConfigFile {
    static readonly FILENAME: string;
    static readonly CURRENT_SCHEMA_URL: string;
    /**
     * A queryable log that reports warnings and error messages that occurred during parsing.
     */
    readonly log: ParserMessageLog;
    private readonly _extendsFiles;
    private _filePath;
    private _fileNotFound;
    private _fileMTime;
    private _hasErrors;
    private _tsdocSchema;
    private readonly _extendsPaths;
    private _noStandardTags;
    private readonly _tagDefinitions;
    private readonly _tagDefinitionNames;
    private readonly _supportForTags;
    private _supportedHtmlElements;
    private _reportUnsupportedHtmlElements;
    private constructor();
    /**
     * Other config files that this file extends from.
     */
    get extendsFiles(): ReadonlyArray<TSDocConfigFile>;
    /**
     * The full path of the file that was attempted to load, or an empty string if the configuration was
     * loaded from a source that is not a file.
     */
    get filePath(): string;
    /**
     * If true, then the TSDocConfigFile object contains an empty state, because the `tsdoc.json` file
     * was not found by the loader.
     *
     * @remarks
     * A missing "tsdoc.json" file is not considered an error.  It simply means that the defaults will be used.
     */
    get fileNotFound(): boolean;
    /**
     * If true, then at least one error was encountered while loading this file or one of its "extends" files.
     *
     * @remarks
     * You can use {@link TSDocConfigFile.getErrorSummary} to report these errors.
     *
     * The individual messages can be retrieved from the {@link TSDocConfigFile.log} property of each `TSDocConfigFile`
     * object (including the {@link TSDocConfigFile.extendsFiles} tree).
     */
    get hasErrors(): boolean;
    /**
     * The `$schema` field from the `tsdoc.json` file.
     */
    get tsdocSchema(): string;
    /**
     * The `extends` field from the `tsdoc.json` file.  For the parsed file contents,
     * use the `extendsFiles` property instead.
     */
    get extendsPaths(): ReadonlyArray<string>;
    /**
     * By default, the config file loader will predefine all of the standardized TSDoc tags.  To disable this and
     * start with a completely empty configuration, set `noStandardTags` to true.
     *
     * @remarks
     * If a config file uses `"extends"` to include settings from base config files, then its setting will
     * override any settings from the base config files.  If `"noStandardTags"` is not specified, then this
     * property will be `undefined`.  The config files are applied in the order they are processed (a depth-first
     * traversal of the `"extends"` references), and files processed later can override earlier files.
     * If no config file specifies `noStandardTags` then the default value is `false`.
     */
    get noStandardTags(): boolean | undefined;
    set noStandardTags(value: boolean | undefined);
    get tagDefinitions(): ReadonlyArray<TSDocTagDefinition>;
    get supportForTags(): ReadonlyMap<string, boolean>;
    get supportedHtmlElements(): ReadonlyArray<string> | undefined;
    get reportUnsupportedHtmlElements(): boolean | undefined;
    set reportUnsupportedHtmlElements(value: boolean | undefined);
    /**
     * Removes all items from the `tagDefinitions` array.
     */
    clearTagDefinitions(): void;
    /**
     * Adds a new item to the `tagDefinitions` array.
     */
    addTagDefinition(parameters: ITSDocTagDefinitionParameters): void;
    private _addTagDefinitionForLoad;
    /**
     * Adds a new item to the `supportedHtmlElements` array.
     */
    addSupportedHtmlElement(htmlElement: string): void;
    /**
     * Removes the explicit list of allowed html elements.
     */
    clearSupportedHtmlElements(): void;
    /**
     * Removes all entries from the "supportForTags" map.
     */
    clearSupportForTags(): void;
    /**
     * Sets an entry in the "supportForTags" map.
     */
    setSupportForTag(tagName: string, supported: boolean): void;
    /**
     * This can be used for cache eviction.  It returns true if the modification timestamp has changed for
     * any of the files that were read when loading this `TSDocConfigFile`, which indicates that the file should be
     * reloaded.  It does not consider cases where `TSDocConfigFile.fileNotFound` was `true`.
     *
     * @remarks
     * This can be used for cache eviction.  An example eviction strategy might be like this:
     *
     * - call `checkForModifiedFiles()` once per second, and reload the configuration if it returns true
     *
     * - otherwise, reload the configuration when it is more than 10 seconds old (to handle less common cases such
     *   as creation of a missing file, or creation of a file at an earlier location in the search path).
     */
    checkForModifiedFiles(): boolean;
    /**
     * Checks the last modification time for `TSDocConfigFile.filePath` and returns `true` if it has changed
     * since the file was loaded.  If the file is missing, this returns `false`.  If the timestamp cannot be read,
     * then this returns `true`.
     */
    private _checkForModifiedFile;
    private _reportError;
    private _loadJsonObject;
    private _loadWithExtends;
    /**
     * For the given folder, look for the relevant tsdoc.json file (if any), and return its path.
     *
     * @param folderPath - the path to a folder where the search should start
     * @returns the (possibly relative) path to tsdoc.json, or an empty string if not found
     */
    static findConfigPathForFolder(folderPath: string): string;
    /**
     * Calls `TSDocConfigFile.findConfigPathForFolder()` to find the relevant tsdoc.json config file, if one exists.
     * Then calls `TSDocConfigFile.findConfigPathForFolder()` to return the loaded result.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     *
     * @param folderPath - the path to a folder where the search should start
     */
    static loadForFolder(folderPath: string): TSDocConfigFile;
    /**
     * Loads the specified tsdoc.json and any base files that it refers to using the "extends" option.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     *
     * @param tsdocJsonFilePath - the path to the tsdoc.json config file
     */
    static loadFile(tsdocJsonFilePath: string): TSDocConfigFile;
    /**
     * Loads the object state from a JSON-serializable object as produced by {@link TSDocConfigFile.saveToObject}.
     *
     * @remarks
     * The serialized object has the same structure as `tsdoc.json`; however the `"extends"` field is not allowed.
     *
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     */
    static loadFromObject(jsonObject: unknown): TSDocConfigFile;
    /**
     * Initializes a TSDocConfigFile object using the state from the provided `TSDocConfiguration` object.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     */
    static loadFromParser(configuration: TSDocConfiguration): TSDocConfigFile;
    /**
     * Writes the config file content to a JSON file with the specified file path.
     */
    saveFile(jsonFilePath: string): void;
    /**
     * Writes the object state into a JSON-serializable object.
     */
    saveToObject(): unknown;
    private static _serializeTagDefinition;
    /**
     * Returns a report of any errors that occurred while attempting to load this file or any files
     * referenced via the "extends" field.
     *
     * @remarks
     * Use {@link TSDocConfigFile.hasErrors} to determine whether any errors occurred.
     */
    getErrorSummary(): string;
    /**
     * Applies the settings from this config file to a TSDoc parser configuration.
     * Any `extendsFile` settings will also applied.
     *
     * @remarks
     * Additional validation is performed during this operation.  The caller is expected to check for errors
     * using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log}, or {@link TSDocConfigFile.getErrorSummary}.
     */
    configureParser(configuration: TSDocConfiguration): void;
    /**
     * This is the same as {@link configureParser}, but it preserves any previous state.
     *
     * @remarks
     * Additional validation is performed during this operation.  The caller is expected to check for errors
     * using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log}, or {@link TSDocConfigFile.getErrorSummary}.
     */
    updateParser(configuration: TSDocConfiguration): void;
    private _getNoStandardTagsWithExtends;
}
//# sourceMappingURL=TSDocConfigFile.d.ts.map