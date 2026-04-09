"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserMessageLog = void 0;
const ParserMessage_1 = require("./ParserMessage");
/**
 * Used to report errors and warnings that occurred during parsing.
 */
class ParserMessageLog {
    constructor() {
        this._messages = [];
    }
    /**
     * The unfiltered list of all messages.
     */
    get messages() {
        return this._messages;
    }
    /**
     * Append a message to the log.
     */
    addMessage(parserMessage) {
        this._messages.push(parserMessage);
    }
    /**
     * Append a message associated with a TextRange.
     */
    addMessageForTextRange(messageId, messageText, textRange) {
        this.addMessage(new ParserMessage_1.ParserMessage({
            messageId,
            messageText,
            textRange
        }));
    }
    /**
     * Append a message associated with a TokenSequence.
     */
    addMessageForTokenSequence(messageId, messageText, tokenSequence, docNode) {
        this.addMessage(new ParserMessage_1.ParserMessage({
            messageId,
            messageText,
            textRange: tokenSequence.getContainingTextRange(),
            tokenSequence,
            docNode
        }));
    }
    /**
     * Append a message associated with a TokenSequence.
     */
    addMessageForDocErrorText(docErrorText) {
        let tokenSequence;
        if (docErrorText.textExcerpt) {
            // If there is an excerpt directly associated with the DocErrorText, highlight that:
            tokenSequence = docErrorText.textExcerpt;
        }
        else {
            // Otherwise we can use the errorLocation, but typically that is meant to give additional
            // details, not to indicate the primary location of the problem.
            tokenSequence = docErrorText.errorLocation;
        }
        this.addMessage(new ParserMessage_1.ParserMessage({
            messageId: docErrorText.messageId,
            messageText: docErrorText.errorMessage,
            textRange: tokenSequence.getContainingTextRange(),
            tokenSequence: tokenSequence,
            docNode: docErrorText
        }));
    }
}
exports.ParserMessageLog = ParserMessageLog;
//# sourceMappingURL=ParserMessageLog.js.map