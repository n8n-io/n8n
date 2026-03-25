import type { JsonSchema, IJsonSchemaErrorInfo, IJsonSchemaValidateOptions } from './JsonSchema';
import { type NewlineKind } from './Text';
/**
 * Represents a JSON-serializable object whose type has not been determined yet.
 *
 * @remarks
 *
 * This type is similar to `any`, except that it communicates that the object is serializable JSON.
 *
 * @public
 */
export type JsonObject = any;
/**
 * The Rush Stack lint rules discourage usage of `null`.  However, JSON parsers always return JavaScript's
 * `null` to keep the two syntaxes consistent.  When creating interfaces that describe JSON structures,
 * use `JsonNull` to avoid triggering the lint rule.  Do not use `JsonNull` for any other purpose.
 *
 * @remarks
 * If you are designing a new JSON file format, it's a good idea to avoid `null` entirely.  In most cases
 * there are better representations that convey more information about an item that is unknown, omitted, or disabled.
 *
 * To understand why `null` is deprecated, please see the `@rushstack/eslint-plugin` documentation here:
 *
 * {@link https://www.npmjs.com/package/@rushstack/eslint-plugin#rushstackno-null}
 *
 * @public
 */
export type JsonNull = null;
/**
 * Specifies the variant of JSON syntax to be used.
 *
 * @public
 */
export declare enum JsonSyntax {
    /**
     * Specifies the exact RFC 8259 format as implemented by the `JSON.parse()` system API.
     * This format was designed for machine generated inputs such as an HTTP payload.
     * It is not a recommend choice for human-authored files, because it does not support
     * code comments.
     *
     * @remarks
     *
     * A well-known quote from Douglas Crockford, the inventor of JSON:
     *
     * "I removed comments from JSON because I saw people were using them to hold parsing directives,
     * a practice which would have destroyed interoperability.  I know that the lack of comments makes
     * some people sad, but it shouldn't.  Suppose you are using JSON to keep configuration files,
     * which you would like to annotate.  Go ahead and insert all the comments you like.
     * Then pipe it through JSMin before handing it to your JSON parser."
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc8259 | RFC 8259}
     */
    Strict = "strict",
    /**
     * `JsonSyntax.JsonWithComments` is the recommended format for human-authored config files.
     * It is a minimal extension to `JsonSyntax.Strict` adding support for code comments
     * using `//` and `/*`.
     *
     * @remarks
     *
     * VS Code calls this format `jsonc`, but it should not be confused with unrelated file formats
     * and libraries that also use the name "JSONC".
     *
     * To fix VS Code syntax highlighting, add this setting:
     * `"files.associations": { "*.json": "jsonc" }`
     *
     * To fix GitHub syntax highlighting, add this to your `.gitattributes`:
     * `*.json linguist-language=JSON-with-Comments`
     */
    JsonWithComments = "jsonWithComments",
    /**
     * JSON5 is a project that proposes a JSON-like format supplemented with ECMAScript 5.1
     * notations for objects, numbers, comments, and more.
     *
     * @remarks
     * Files using this format should use the `.json5` file extension instead of `.json`.
     *
     * JSON5 has substantial differences from JSON: object keys may be unquoted, trailing commas
     * are allowed, and strings may span multiple lines.  Whereas {@link JsonSyntax.JsonWithComments} can
     * be cheaply converted to standard JSON by stripping comments, parsing JSON5 requires a
     * nontrivial algorithm that may not be easily available in some contexts or programming languages.
     *
     * @see {@link https://json5.org/ | JSON5 project website}
     */
    Json5 = "json5"
}
/**
 * Options for {@link JsonFile.parseString}, {@link JsonFile.load}, and {@link JsonFile.loadAsync}.
 *
 * @public
 */
export interface IJsonFileParseOptions {
    /**
     * Specifies the variant of JSON syntax to be used.
     *
     * @defaultValue
     * {@link JsonSyntax.Json5}
     *
     * NOTE: This default will be changed to `JsonSyntax.JsonWithComments` in a future release.
     */
    jsonSyntax?: JsonSyntax;
}
/**
 * Options for {@link JsonFile.loadAndValidate} and {@link JsonFile.loadAndValidateAsync}
 *
 * @public
 */
export interface IJsonFileLoadAndValidateOptions extends IJsonFileParseOptions, IJsonSchemaValidateOptions {
}
/**
 * Options for {@link JsonFile.stringify}
 *
 * @public
 */
export interface IJsonFileStringifyOptions extends IJsonFileParseOptions {
    /**
     * If provided, the specified newline type will be used instead of the default `\r\n`.
     */
    newlineConversion?: NewlineKind;
    /**
     * By default, {@link JsonFile.stringify} validates that the object does not contain any
     * keys whose value is `undefined`.  To disable this validation, set
     * {@link IJsonFileStringifyOptions.ignoreUndefinedValues} to `true`
     * which causes such keys to be silently discarded, consistent with the system `JSON.stringify()`.
     *
     * @remarks
     *
     * The JSON file format can represent `null` values ({@link JsonNull}) but not `undefined` values.
     * In ECMAScript code however, we generally avoid `null` and always represent empty states
     * as `undefined`, because it is the default value of missing/uninitialized variables.
     * (In practice, distinguishing "null" versus "uninitialized" has more drawbacks than benefits.)
     * This poses a problem when serializing ECMAScript objects that contain `undefined` members.
     * As a safeguard, {@link JsonFile} will report an error if any `undefined` values are encountered
     * during serialization.  Set {@link IJsonFileStringifyOptions.ignoreUndefinedValues} to `true`
     * to disable this safeguard.
     */
    ignoreUndefinedValues?: boolean;
    /**
     * If true, then the "jju" library will be used to improve the text formatting.
     * Note that this is slightly slower than the native JSON.stringify() implementation.
     */
    prettyFormatting?: boolean;
    /**
     * If specified, this header will be prepended to the start of the file.  The header must consist
     * of lines prefixed by "//" characters.
     * @remarks
     * When used with {@link IJsonFileSaveOptions.updateExistingFile}
     * or {@link JsonFile.updateString}, the header will ONLY be added for a newly created file.
     */
    headerComment?: string;
}
/**
 * Options for {@link JsonFile.save} and {@link JsonFile.saveAsync}.
 *
 * @public
 */
export interface IJsonFileSaveOptions extends IJsonFileStringifyOptions {
    /**
     * If there is an existing file, and the contents have not changed, then
     * don't write anything; this preserves the old timestamp.
     */
    onlyIfChanged?: boolean;
    /**
     * Creates the folder recursively using FileSystem.ensureFolder()
     * Defaults to false.
     */
    ensureFolderExists?: boolean;
    /**
     * If true, use the "jju" library to preserve the existing JSON formatting:  The file will be loaded
     * from the target filename, the new content will be merged in (preserving whitespace and comments),
     * and then the file will be overwritten with the merged contents.  If the target file does not exist,
     * then the file is saved normally.
     */
    updateExistingFile?: boolean;
}
/**
 * Utilities for reading/writing JSON files.
 * @public
 */
export declare class JsonFile {
    /**
     * @internal
     */
    static _formatPathForError: (path: string) => string;
    /**
     * Loads a JSON file.
     */
    static load(jsonFilename: string, options?: IJsonFileParseOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.load}.
     */
    static loadAsync(jsonFilename: string, options?: IJsonFileParseOptions): Promise<JsonObject>;
    /**
     * Parses a JSON file's contents.
     */
    static parseString(jsonContents: string, options?: IJsonFileParseOptions): JsonObject;
    /**
     * Loads a JSON file and validate its schema.
     */
    static loadAndValidate(jsonFilename: string, jsonSchema: JsonSchema, options?: IJsonFileLoadAndValidateOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.loadAndValidate}.
     */
    static loadAndValidateAsync(jsonFilename: string, jsonSchema: JsonSchema, options?: IJsonFileLoadAndValidateOptions): Promise<JsonObject>;
    /**
     * Loads a JSON file and validate its schema, reporting errors using a callback
     * @remarks
     * See JsonSchema.validateObjectWithCallback() for more info.
     */
    static loadAndValidateWithCallback(jsonFilename: string, jsonSchema: JsonSchema, errorCallback: (errorInfo: IJsonSchemaErrorInfo) => void, options?: IJsonFileLoadAndValidateOptions): JsonObject;
    /**
     * An async version of {@link JsonFile.loadAndValidateWithCallback}.
     */
    static loadAndValidateWithCallbackAsync(jsonFilename: string, jsonSchema: JsonSchema, errorCallback: (errorInfo: IJsonSchemaErrorInfo) => void, options?: IJsonFileLoadAndValidateOptions): Promise<JsonObject>;
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param jsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static stringify(jsonObject: JsonObject, options?: IJsonFileStringifyOptions): string;
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param previousJson - the previous JSON string, which will be updated
     * @param newJsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static updateString(previousJson: string, newJsonObject: JsonObject, options?: IJsonFileStringifyOptions): string;
    /**
     * Saves the file to disk.  Returns false if nothing was written due to options.onlyIfChanged.
     * @param jsonObject - the object to be saved
     * @param jsonFilename - the file path to write
     * @param options - other settings that control how the file is saved
     * @returns false if ISaveJsonFileOptions.onlyIfChanged didn't save anything; true otherwise
     */
    static save(jsonObject: JsonObject, jsonFilename: string, options?: IJsonFileSaveOptions): boolean;
    /**
     * An async version of {@link JsonFile.save}.
     */
    static saveAsync(jsonObject: JsonObject, jsonFilename: string, options?: IJsonFileSaveOptions): Promise<boolean>;
    /**
     * Used to validate a data structure before writing.  Reports an error if there
     * are any undefined members.
     */
    static validateNoUndefinedMembers(jsonObject: JsonObject): void;
    private static _validateNoUndefinedMembers;
    private static _formatKeyPath;
    private static _formatJsonHeaderComment;
    private static _buildJjuParseOptions;
}
//# sourceMappingURL=JsonFile.d.ts.map