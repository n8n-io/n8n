import type * as tsdoc from '@microsoft/tsdoc';
import type { ExtractorMessageId } from './ExtractorMessageId';
import { ExtractorLogLevel } from './ExtractorLogLevel';
import type { ConsoleMessageId } from './ConsoleMessageId';
/**
 * Used by {@link ExtractorMessage.properties}.
 *
 * @public
 */
export interface IExtractorMessageProperties {
    /**
     * A declaration can have multiple names if it is exported more than once.
     * If an `ExtractorMessage` applies to a specific export name, this property can indicate that.
     *
     * @remarks
     *
     * Used by {@link ExtractorMessageId.InternalMissingUnderscore}.
     */
    readonly exportName?: string;
}
/**
 * Specifies a category of messages for use with {@link ExtractorMessage}.
 * @public
 */
export declare enum ExtractorMessageCategory {
    /**
     * Messages originating from the TypeScript compiler.
     *
     * @remarks
     * These strings begin with the prefix "TS" and have a numeric error code.
     * Example: `TS2551`
     */
    Compiler = "Compiler",
    /**
     * Messages related to parsing of TSDoc comments.
     *
     * @remarks
     * These strings begin with the prefix "tsdoc-".
     * Example: `tsdoc-link-tag-unescaped-text`
     */
    TSDoc = "TSDoc",
    /**
     * Messages related to API Extractor's analysis.
     *
     * @remarks
     * These strings begin with the prefix "ae-".
     * Example: `ae-extra-release-tag`
     */
    Extractor = "Extractor",
    /**
     * Console messages communicate the progress of the overall operation.  They may include newlines to ensure
     * nice formatting.  They are output in real time, and cannot be routed to the API Report file.
     *
     * @remarks
     * These strings begin with the prefix "console-".
     * Example: `console-writing-typings-file`
     */
    Console = "console"
}
/**
 * Constructor options for `ExtractorMessage`.
 */
export interface IExtractorMessageOptions {
    category: ExtractorMessageCategory;
    messageId: tsdoc.TSDocMessageId | ExtractorMessageId | ConsoleMessageId | string;
    text: string;
    sourceFilePath?: string;
    sourceFileLine?: number;
    sourceFileColumn?: number;
    properties?: IExtractorMessageProperties;
    logLevel?: ExtractorLogLevel;
}
/**
 * This object is used to report an error or warning that occurred during API Extractor's analysis.
 *
 * @public
 */
export declare class ExtractorMessage {
    private _handled;
    private _logLevel;
    /**
     * The category of issue.
     */
    readonly category: ExtractorMessageCategory;
    /**
     * A text string that uniquely identifies the issue type.  This identifier can be used to suppress
     * or configure the reporting of issues, and also to search for help about an issue.
     */
    readonly messageId: tsdoc.TSDocMessageId | ExtractorMessageId | ConsoleMessageId | string;
    /**
     * The text description of this issue.
     */
    readonly text: string;
    /**
     * The absolute path to the affected input source file, if there is one.
     */
    readonly sourceFilePath: string | undefined;
    /**
     * The line number where the issue occurred in the input source file.  This is not used if `sourceFilePath`
     * is undefined.  The first line number is 1.
     */
    readonly sourceFileLine: number | undefined;
    /**
     * The column number where the issue occurred in the input source file.  This is not used if `sourceFilePath`
     * is undefined.  The first column number is 1.
     */
    readonly sourceFileColumn: number | undefined;
    /**
     * Additional contextual information about the message that may be useful when reporting errors.
     * All properties are optional.
     */
    readonly properties: IExtractorMessageProperties;
    /** @internal */
    constructor(options: IExtractorMessageOptions);
    /**
     * If the {@link IExtractorInvokeOptions.messageCallback} sets this property to true, it will prevent the message
     * from being displayed by API Extractor.
     *
     * @remarks
     * If the `messageCallback` routes the message to a custom handler (e.g. a toolchain logger), it should
     * assign `handled = true` to prevent API Extractor from displaying it.  Assigning `handled = true` for all messages
     * would effectively disable all console output from the `Extractor` API.
     *
     * If `handled` is set to true, the message will still be included in the count of errors/warnings;
     * to discard a message entirely, instead assign `logLevel = none`.
     */
    get handled(): boolean;
    set handled(value: boolean);
    /**
     * Specifies how the message should be reported.
     *
     * @remarks
     * If the {@link IExtractorInvokeOptions.messageCallback} handles the message (i.e. sets `handled = true`),
     * it can use the `logLevel` to determine how to display the message.
     *
     * Alternatively, if API Extractor is handling the message, the `messageCallback` could assign `logLevel` to change
     * how it will be processed.  However, in general the recommended practice is to configure message routing
     * using the `messages` section in api-extractor.json.
     *
     * To discard a message entirely, assign `logLevel = none`.
     */
    get logLevel(): ExtractorLogLevel;
    set logLevel(value: ExtractorLogLevel);
    /**
     * Returns the message formatted with its identifier and file position.
     * @remarks
     * Example:
     * ```
     * src/folder/File.ts:123:4 - (ae-extra-release-tag) The doc comment should not contain more than one release tag.
     * ```
     */
    formatMessageWithLocation(workingPackageFolderPath: string | undefined): string;
    formatMessageWithoutLocation(): string;
}
//# sourceMappingURL=ExtractorMessage.d.ts.map