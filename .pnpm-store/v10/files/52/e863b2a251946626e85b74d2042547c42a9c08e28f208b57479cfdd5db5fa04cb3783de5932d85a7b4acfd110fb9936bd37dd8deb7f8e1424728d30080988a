"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRouter = void 0;
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const terminal_1 = require("@rushstack/terminal");
const AstDeclaration_1 = require("../analyzer/AstDeclaration");
const ExtractorMessage_1 = require("../api/ExtractorMessage");
const ExtractorMessageId_1 = require("../api/ExtractorMessageId");
const ExtractorLogLevel_1 = require("../api/ExtractorLogLevel");
const ConsoleMessageId_1 = require("../api/ConsoleMessageId");
class MessageRouter {
    constructor(options) {
        // Normalized representation of the routing rules from api-extractor.json
        this._reportingRuleByMessageId = new Map();
        this._compilerDefaultRule = {
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.None,
            addToApiReportFile: false
        };
        this._extractorDefaultRule = {
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.None,
            addToApiReportFile: false
        };
        this._tsdocDefaultRule = { logLevel: ExtractorLogLevel_1.ExtractorLogLevel.None, addToApiReportFile: false };
        this.errorCount = 0;
        this.warningCount = 0;
        this._workingPackageFolder = options.workingPackageFolder;
        this._messageCallback = options.messageCallback;
        this._messages = [];
        this._associatedMessagesForAstDeclaration = new Map();
        this._sourceMapper = options.sourceMapper;
        this._tsdocConfiguration = options.tsdocConfiguration;
        // showDiagnostics implies showVerboseMessages
        this.showVerboseMessages = options.showVerboseMessages || options.showDiagnostics;
        this.showDiagnostics = options.showDiagnostics;
        this._applyMessagesConfig(options.messagesConfig);
    }
    /**
     * Read the api-extractor.json configuration and build up the tables of routing rules.
     */
    _applyMessagesConfig(messagesConfig) {
        if (messagesConfig.compilerMessageReporting) {
            for (const messageId of Object.getOwnPropertyNames(messagesConfig.compilerMessageReporting)) {
                const reportingRule = MessageRouter._getNormalizedRule(messagesConfig.compilerMessageReporting[messageId]);
                if (messageId === 'default') {
                    this._compilerDefaultRule = reportingRule;
                }
                else if (!/^TS[0-9]+$/.test(messageId)) {
                    throw new Error(`Error in API Extractor config: The messages.compilerMessageReporting table contains` +
                        ` an invalid entry "${messageId}". The identifier format is "TS" followed by an integer.`);
                }
                else {
                    this._reportingRuleByMessageId.set(messageId, reportingRule);
                }
            }
        }
        if (messagesConfig.extractorMessageReporting) {
            for (const messageId of Object.getOwnPropertyNames(messagesConfig.extractorMessageReporting)) {
                const reportingRule = MessageRouter._getNormalizedRule(messagesConfig.extractorMessageReporting[messageId]);
                if (messageId === 'default') {
                    this._extractorDefaultRule = reportingRule;
                }
                else if (!/^ae-/.test(messageId)) {
                    throw new Error(`Error in API Extractor config: The messages.extractorMessageReporting table contains` +
                        ` an invalid entry "${messageId}".  The name should begin with the "ae-" prefix.`);
                }
                else if (!ExtractorMessageId_1.allExtractorMessageIds.has(messageId)) {
                    throw new Error(`Error in API Extractor config: The messages.extractorMessageReporting table contains` +
                        ` an unrecognized identifier "${messageId}".  Is it spelled correctly?`);
                }
                else {
                    this._reportingRuleByMessageId.set(messageId, reportingRule);
                }
            }
        }
        if (messagesConfig.tsdocMessageReporting) {
            for (const messageId of Object.getOwnPropertyNames(messagesConfig.tsdocMessageReporting)) {
                const reportingRule = MessageRouter._getNormalizedRule(messagesConfig.tsdocMessageReporting[messageId]);
                if (messageId === 'default') {
                    this._tsdocDefaultRule = reportingRule;
                }
                else if (!/^tsdoc-/.test(messageId)) {
                    throw new Error(`Error in API Extractor config: The messages.tsdocMessageReporting table contains` +
                        ` an invalid entry "${messageId}".  The name should begin with the "tsdoc-" prefix.`);
                }
                else if (!this._tsdocConfiguration.isKnownMessageId(messageId)) {
                    throw new Error(`Error in API Extractor config: The messages.tsdocMessageReporting table contains` +
                        ` an unrecognized identifier "${messageId}".  Is it spelled correctly?`);
                }
                else {
                    this._reportingRuleByMessageId.set(messageId, reportingRule);
                }
            }
        }
    }
    static _getNormalizedRule(rule) {
        return {
            logLevel: rule.logLevel || 'none',
            addToApiReportFile: rule.addToApiReportFile || false
        };
    }
    get messages() {
        return this._messages;
    }
    /**
     * Add a diagnostic message reported by the TypeScript compiler
     */
    addCompilerDiagnostic(diagnostic) {
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Suggestion:
            case ts.DiagnosticCategory.Message:
                return; // ignore noise
        }
        const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        const options = {
            category: ExtractorMessage_1.ExtractorMessageCategory.Compiler,
            messageId: `TS${diagnostic.code}`,
            text: messageText
        };
        if (diagnostic.file) {
            // NOTE: Since compiler errors pertain to issues specific to the .d.ts files,
            // we do not apply source mappings for them.
            const sourceFile = diagnostic.file;
            const sourceLocation = this._sourceMapper.getSourceLocation({
                sourceFile,
                pos: diagnostic.start || 0,
                useDtsLocation: true
            });
            options.sourceFilePath = sourceLocation.sourceFilePath;
            options.sourceFileLine = sourceLocation.sourceFileLine;
            options.sourceFileColumn = sourceLocation.sourceFileColumn;
        }
        this._messages.push(new ExtractorMessage_1.ExtractorMessage(options));
    }
    /**
     * Add a message from the API Extractor analysis
     */
    addAnalyzerIssue(messageId, messageText, astDeclarationOrSymbol, properties) {
        let astDeclaration;
        if (astDeclarationOrSymbol instanceof AstDeclaration_1.AstDeclaration) {
            astDeclaration = astDeclarationOrSymbol;
        }
        else {
            astDeclaration = astDeclarationOrSymbol.astDeclarations[0];
        }
        const extractorMessage = this.addAnalyzerIssueForPosition(messageId, messageText, astDeclaration.declaration.getSourceFile(), astDeclaration.declaration.getStart(), properties);
        this._associateMessageWithAstDeclaration(extractorMessage, astDeclaration);
    }
    /**
     * Add all messages produced from an invocation of the TSDoc parser, assuming they refer to
     * code in the specified source file.
     */
    addTsdocMessages(parserContext, sourceFile, astDeclaration) {
        for (const message of parserContext.log.messages) {
            const options = {
                category: ExtractorMessage_1.ExtractorMessageCategory.TSDoc,
                messageId: message.messageId,
                text: message.unformattedText
            };
            const sourceLocation = this._sourceMapper.getSourceLocation({
                sourceFile,
                pos: message.textRange.pos
            });
            options.sourceFilePath = sourceLocation.sourceFilePath;
            options.sourceFileLine = sourceLocation.sourceFileLine;
            options.sourceFileColumn = sourceLocation.sourceFileColumn;
            const extractorMessage = new ExtractorMessage_1.ExtractorMessage(options);
            if (astDeclaration) {
                this._associateMessageWithAstDeclaration(extractorMessage, astDeclaration);
            }
            this._messages.push(extractorMessage);
        }
    }
    /**
     * Recursively collects the primitive members (numbers, strings, arrays, etc) into an object that
     * is JSON serializable.  This is used by the "--diagnostics" feature to dump the state of configuration objects.
     *
     * @returns a JSON serializable object (possibly including `null` values)
     *          or `undefined` if the input cannot be represented as JSON
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static buildJsonDumpObject(input, options) {
        if (!options) {
            options = {};
        }
        const keyNamesToOmit = new Set(options.keyNamesToOmit);
        return MessageRouter._buildJsonDumpObject(input, keyNamesToOmit);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static _buildJsonDumpObject(input, keyNamesToOmit) {
        if (input === null || input === undefined) {
            return null; // JSON uses null instead of undefined
        }
        switch (typeof input) {
            case 'boolean':
            case 'number':
            case 'string':
                return input;
            case 'object':
                if (Array.isArray(input)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const outputArray = [];
                    for (const element of input) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const serializedElement = MessageRouter._buildJsonDumpObject(element, keyNamesToOmit);
                        if (serializedElement !== undefined) {
                            outputArray.push(serializedElement);
                        }
                    }
                    return outputArray;
                }
                const outputObject = {};
                for (const key of Object.getOwnPropertyNames(input)) {
                    if (keyNamesToOmit.has(key)) {
                        continue;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const value = input[key];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const serializedValue = MessageRouter._buildJsonDumpObject(value, keyNamesToOmit);
                    if (serializedValue !== undefined) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        outputObject[key] = serializedValue;
                    }
                }
                return outputObject;
        }
        return undefined;
    }
    /**
     * Record this message in  _associatedMessagesForAstDeclaration
     */
    _associateMessageWithAstDeclaration(extractorMessage, astDeclaration) {
        let associatedMessages = this._associatedMessagesForAstDeclaration.get(astDeclaration);
        if (!associatedMessages) {
            associatedMessages = [];
            this._associatedMessagesForAstDeclaration.set(astDeclaration, associatedMessages);
        }
        associatedMessages.push(extractorMessage);
    }
    /**
     * Add a message for a location in an arbitrary source file.
     */
    addAnalyzerIssueForPosition(messageId, messageText, sourceFile, pos, properties) {
        const options = {
            category: ExtractorMessage_1.ExtractorMessageCategory.Extractor,
            messageId,
            text: messageText,
            properties
        };
        const sourceLocation = this._sourceMapper.getSourceLocation({
            sourceFile,
            pos
        });
        options.sourceFilePath = sourceLocation.sourceFilePath;
        options.sourceFileLine = sourceLocation.sourceFileLine;
        options.sourceFileColumn = sourceLocation.sourceFileColumn;
        const extractorMessage = new ExtractorMessage_1.ExtractorMessage(options);
        this._messages.push(extractorMessage);
        return extractorMessage;
    }
    /**
     * This is used when writing the API report file.  It looks up any messages that were configured to get emitted
     * in the API report file and returns them.  It also records that they were emitted, which suppresses them from
     * being shown on the console.
     */
    fetchAssociatedMessagesForReviewFile(astDeclaration) {
        const messagesForApiReportFile = [];
        const associatedMessages = this._associatedMessagesForAstDeclaration.get(astDeclaration) || [];
        for (const associatedMessage of associatedMessages) {
            // Make sure we didn't already report this message for some reason
            if (!associatedMessage.handled) {
                // Is this message type configured to go in the API report file?
                const reportingRule = this._getRuleForMessage(associatedMessage);
                if (reportingRule.addToApiReportFile) {
                    // Include it in the result, and record that it went to the API report file
                    messagesForApiReportFile.push(associatedMessage);
                    associatedMessage.handled = true;
                }
            }
        }
        this._sortMessagesForOutput(messagesForApiReportFile);
        return messagesForApiReportFile;
    }
    /**
     * This returns all remaining messages that were flagged with `addToApiReportFile`, but which were not
     * retrieved using `fetchAssociatedMessagesForReviewFile()`.
     */
    fetchUnassociatedMessagesForReviewFile() {
        const messagesForApiReportFile = [];
        for (const unassociatedMessage of this.messages) {
            // Make sure we didn't already report this message for some reason
            if (!unassociatedMessage.handled) {
                // Is this message type configured to go in the API report file?
                const reportingRule = this._getRuleForMessage(unassociatedMessage);
                if (reportingRule.addToApiReportFile) {
                    // Include it in the result, and record that it went to the API report file
                    messagesForApiReportFile.push(unassociatedMessage);
                    unassociatedMessage.handled = true;
                }
            }
        }
        this._sortMessagesForOutput(messagesForApiReportFile);
        return messagesForApiReportFile;
    }
    /**
     * This returns the list of remaining messages that were not already processed by
     * `fetchAssociatedMessagesForReviewFile()` or `fetchUnassociatedMessagesForReviewFile()`.
     * These messages will be shown on the console.
     */
    handleRemainingNonConsoleMessages() {
        const messagesForLogger = [];
        for (const message of this.messages) {
            // Make sure we didn't already report this message
            if (!message.handled) {
                messagesForLogger.push(message);
            }
        }
        this._sortMessagesForOutput(messagesForLogger);
        for (const message of messagesForLogger) {
            this._handleMessage(message);
        }
    }
    logError(messageId, message, properties) {
        this._handleMessage(new ExtractorMessage_1.ExtractorMessage({
            category: ExtractorMessage_1.ExtractorMessageCategory.Console,
            messageId,
            text: message,
            properties,
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.Error
        }));
    }
    logWarning(messageId, message, properties) {
        this._handleMessage(new ExtractorMessage_1.ExtractorMessage({
            category: ExtractorMessage_1.ExtractorMessageCategory.Console,
            messageId,
            text: message,
            properties,
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.Warning
        }));
    }
    logInfo(messageId, message, properties) {
        this._handleMessage(new ExtractorMessage_1.ExtractorMessage({
            category: ExtractorMessage_1.ExtractorMessageCategory.Console,
            messageId,
            text: message,
            properties,
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.Info
        }));
    }
    logVerbose(messageId, message, properties) {
        this._handleMessage(new ExtractorMessage_1.ExtractorMessage({
            category: ExtractorMessage_1.ExtractorMessageCategory.Console,
            messageId,
            text: message,
            properties,
            logLevel: ExtractorLogLevel_1.ExtractorLogLevel.Verbose
        }));
    }
    logDiagnosticHeader(title) {
        this.logDiagnostic(MessageRouter.DIAGNOSTICS_LINE);
        this.logDiagnostic(`DIAGNOSTIC: ` + title);
        this.logDiagnostic(MessageRouter.DIAGNOSTICS_LINE);
    }
    logDiagnosticFooter() {
        this.logDiagnostic(MessageRouter.DIAGNOSTICS_LINE + '\n');
    }
    logDiagnostic(message) {
        if (this.showDiagnostics) {
            this.logVerbose(ConsoleMessageId_1.ConsoleMessageId.Diagnostics, message);
        }
    }
    /**
     * Give the calling application a chance to handle the `ExtractorMessage`, and if not, display it on the console.
     */
    _handleMessage(message) {
        // Don't tally messages that were already "handled" by writing them into the API report
        if (message.handled) {
            return;
        }
        // Assign the ExtractorMessage.logLevel; the message callback may adjust it below
        if (message.category === ExtractorMessage_1.ExtractorMessageCategory.Console) {
            // Console messages have their category log level assigned via logInfo(), logVerbose(), etc.
        }
        else {
            const reportingRule = this._getRuleForMessage(message);
            message.logLevel = reportingRule.logLevel;
        }
        // If there is a callback, allow it to modify and/or handle the message
        if (this._messageCallback) {
            this._messageCallback(message);
        }
        // Update the statistics
        switch (message.logLevel) {
            case ExtractorLogLevel_1.ExtractorLogLevel.Error:
                ++this.errorCount;
                break;
            case ExtractorLogLevel_1.ExtractorLogLevel.Warning:
                ++this.warningCount;
                break;
        }
        if (message.handled) {
            return;
        }
        // The messageCallback did not handle the message, so perform default handling
        message.handled = true;
        if (message.logLevel === ExtractorLogLevel_1.ExtractorLogLevel.None) {
            return;
        }
        let messageText;
        if (message.category === ExtractorMessage_1.ExtractorMessageCategory.Console) {
            messageText = message.text;
        }
        else {
            messageText = message.formatMessageWithLocation(this._workingPackageFolder);
        }
        switch (message.logLevel) {
            case ExtractorLogLevel_1.ExtractorLogLevel.Error:
                console.error(terminal_1.Colorize.red('Error: ' + messageText));
                break;
            case ExtractorLogLevel_1.ExtractorLogLevel.Warning:
                console.warn(terminal_1.Colorize.yellow('Warning: ' + messageText));
                break;
            case ExtractorLogLevel_1.ExtractorLogLevel.Info:
                console.log(messageText);
                break;
            case ExtractorLogLevel_1.ExtractorLogLevel.Verbose:
                if (this.showVerboseMessages) {
                    console.log(terminal_1.Colorize.cyan(messageText));
                }
                break;
            default:
                throw new Error(`Invalid logLevel value: ${JSON.stringify(message.logLevel)}`);
        }
    }
    /**
     * For a given message, determine the IReportingRule based on the rule tables.
     */
    _getRuleForMessage(message) {
        const reportingRule = this._reportingRuleByMessageId.get(message.messageId);
        if (reportingRule) {
            return reportingRule;
        }
        switch (message.category) {
            case ExtractorMessage_1.ExtractorMessageCategory.Compiler:
                return this._compilerDefaultRule;
            case ExtractorMessage_1.ExtractorMessageCategory.Extractor:
                return this._extractorDefaultRule;
            case ExtractorMessage_1.ExtractorMessageCategory.TSDoc:
                return this._tsdocDefaultRule;
            case ExtractorMessage_1.ExtractorMessageCategory.Console:
                throw new node_core_library_1.InternalError('ExtractorMessageCategory.Console is not supported with IReportingRule');
        }
    }
    /**
     * Sorts an array of messages according to a reasonable ordering
     */
    _sortMessagesForOutput(messages) {
        messages.sort((a, b) => {
            let diff;
            // First sort by file name
            diff = node_core_library_1.Sort.compareByValue(a.sourceFilePath, b.sourceFilePath);
            if (diff !== 0) {
                return diff;
            }
            // Then sort by line number
            diff = node_core_library_1.Sort.compareByValue(a.sourceFileLine, b.sourceFileLine);
            if (diff !== 0) {
                return diff;
            }
            // Then sort by messageId
            return node_core_library_1.Sort.compareByValue(a.messageId, b.messageId);
        });
    }
}
exports.MessageRouter = MessageRouter;
MessageRouter.DIAGNOSTICS_LINE = '============================================================';
//# sourceMappingURL=MessageRouter.js.map