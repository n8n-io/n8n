import * as ts from 'typescript';
import type * as tsdoc from '@microsoft/tsdoc';
import { AstDeclaration } from '../analyzer/AstDeclaration';
import type { AstSymbol } from '../analyzer/AstSymbol';
import { ExtractorMessage, type IExtractorMessageProperties } from '../api/ExtractorMessage';
import { type ExtractorMessageId } from '../api/ExtractorMessageId';
import type { IExtractorMessagesConfig } from '../api/IConfigFile';
import type { SourceMapper } from './SourceMapper';
import { ConsoleMessageId } from '../api/ConsoleMessageId';
export interface IMessageRouterOptions {
    workingPackageFolder: string | undefined;
    messageCallback: ((message: ExtractorMessage) => void) | undefined;
    messagesConfig: IExtractorMessagesConfig;
    showVerboseMessages: boolean;
    showDiagnostics: boolean;
    tsdocConfiguration: tsdoc.TSDocConfiguration;
    sourceMapper: SourceMapper;
}
export interface IBuildJsonDumpObjectOptions {
    /**
     * {@link MessageRouter.buildJsonDumpObject} will omit any objects keys with these names.
     */
    keyNamesToOmit?: string[];
}
export declare class MessageRouter {
    static readonly DIAGNOSTICS_LINE: string;
    private readonly _workingPackageFolder;
    private readonly _messageCallback;
    private readonly _messages;
    private readonly _associatedMessagesForAstDeclaration;
    private readonly _sourceMapper;
    private readonly _tsdocConfiguration;
    private _reportingRuleByMessageId;
    private _compilerDefaultRule;
    private _extractorDefaultRule;
    private _tsdocDefaultRule;
    errorCount: number;
    warningCount: number;
    /**
     * See {@link IExtractorInvokeOptions.showVerboseMessages}
     */
    readonly showVerboseMessages: boolean;
    /**
     * See {@link IExtractorInvokeOptions.showDiagnostics}
     */
    readonly showDiagnostics: boolean;
    constructor(options: IMessageRouterOptions);
    /**
     * Read the api-extractor.json configuration and build up the tables of routing rules.
     */
    private _applyMessagesConfig;
    private static _getNormalizedRule;
    get messages(): ReadonlyArray<ExtractorMessage>;
    /**
     * Add a diagnostic message reported by the TypeScript compiler
     */
    addCompilerDiagnostic(diagnostic: ts.Diagnostic): void;
    /**
     * Add a message from the API Extractor analysis
     */
    addAnalyzerIssue(messageId: ExtractorMessageId, messageText: string, astDeclarationOrSymbol: AstDeclaration | AstSymbol, properties?: IExtractorMessageProperties): void;
    /**
     * Add all messages produced from an invocation of the TSDoc parser, assuming they refer to
     * code in the specified source file.
     */
    addTsdocMessages(parserContext: tsdoc.ParserContext, sourceFile: ts.SourceFile, astDeclaration?: AstDeclaration): void;
    /**
     * Recursively collects the primitive members (numbers, strings, arrays, etc) into an object that
     * is JSON serializable.  This is used by the "--diagnostics" feature to dump the state of configuration objects.
     *
     * @returns a JSON serializable object (possibly including `null` values)
     *          or `undefined` if the input cannot be represented as JSON
     */
    static buildJsonDumpObject(input: any, options?: IBuildJsonDumpObjectOptions): any | undefined;
    private static _buildJsonDumpObject;
    /**
     * Record this message in  _associatedMessagesForAstDeclaration
     */
    private _associateMessageWithAstDeclaration;
    /**
     * Add a message for a location in an arbitrary source file.
     */
    addAnalyzerIssueForPosition(messageId: ExtractorMessageId, messageText: string, sourceFile: ts.SourceFile, pos: number, properties?: IExtractorMessageProperties): ExtractorMessage;
    /**
     * This is used when writing the API report file.  It looks up any messages that were configured to get emitted
     * in the API report file and returns them.  It also records that they were emitted, which suppresses them from
     * being shown on the console.
     */
    fetchAssociatedMessagesForReviewFile(astDeclaration: AstDeclaration): ExtractorMessage[];
    /**
     * This returns all remaining messages that were flagged with `addToApiReportFile`, but which were not
     * retreieved using `fetchAssociatedMessagesForReviewFile()`.
     */
    fetchUnassociatedMessagesForReviewFile(): ExtractorMessage[];
    /**
     * This returns the list of remaining messages that were not already processed by
     * `fetchAssociatedMessagesForReviewFile()` or `fetchUnassociatedMessagesForReviewFile()`.
     * These messages will be shown on the console.
     */
    handleRemainingNonConsoleMessages(): void;
    logError(messageId: ConsoleMessageId, message: string, properties?: IExtractorMessageProperties): void;
    logWarning(messageId: ConsoleMessageId, message: string, properties?: IExtractorMessageProperties): void;
    logInfo(messageId: ConsoleMessageId, message: string, properties?: IExtractorMessageProperties): void;
    logVerbose(messageId: ConsoleMessageId, message: string, properties?: IExtractorMessageProperties): void;
    logDiagnosticHeader(title: string): void;
    logDiagnosticFooter(): void;
    logDiagnostic(message: string): void;
    /**
     * Give the calling application a chance to handle the `ExtractorMessage`, and if not, display it on the console.
     */
    private _handleMessage;
    /**
     * For a given message, determine the IReportingRule based on the rule tables.
     */
    private _getRuleForMessage;
    /**
     * Sorts an array of messages according to a reasonable ordering
     */
    private _sortMessagesForOutput;
}
//# sourceMappingURL=MessageRouter.d.ts.map