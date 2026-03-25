"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserMessageLog = void 0;
var ParserMessage_1 = require("./ParserMessage");
/**
 * Used to report errors and warnings that occurred during parsing.
 */
var ParserMessageLog = /** @class */ (function () {
    function ParserMessageLog() {
        this._messages = [];
    }
    Object.defineProperty(ParserMessageLog.prototype, "messages", {
        /**
         * The unfiltered list of all messages.
         */
        get: function () {
            return this._messages;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Append a message to the log.
     */
    ParserMessageLog.prototype.addMessage = function (parserMessage) {
        this._messages.push(parserMessage);
    };
    /**
     * Append a message associated with a TextRange.
     */
    ParserMessageLog.prototype.addMessageForTextRange = function (messageId, messageText, textRange) {
        this.addMessage(new ParserMessage_1.ParserMessage({
            messageId: messageId,
            messageText: messageText,
            textRange: textRange
        }));
    };
    /**
     * Append a message associated with a TokenSequence.
     */
    ParserMessageLog.prototype.addMessageForTokenSequence = function (messageId, messageText, tokenSequence, docNode) {
        this.addMessage(new ParserMessage_1.ParserMessage({
            messageId: messageId,
            messageText: messageText,
            textRange: tokenSequence.getContainingTextRange(),
            tokenSequence: tokenSequence,
            docNode: docNode
        }));
    };
    /**
     * Append a message associated with a TokenSequence.
     */
    ParserMessageLog.prototype.addMessageForDocErrorText = function (docErrorText) {
        var tokenSequence;
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
    };
    return ParserMessageLog;
}());
exports.ParserMessageLog = ParserMessageLog;
//# sourceMappingURL=ParserMessageLog.js.map