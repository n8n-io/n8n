"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserMessage = void 0;
/**
 * Represents an error or warning that occurred during parsing.
 */
var ParserMessage = /** @class */ (function () {
    function ParserMessage(parameters) {
        this.messageId = parameters.messageId;
        this.unformattedText = parameters.messageText;
        this.textRange = parameters.textRange;
        this.tokenSequence = parameters.tokenSequence;
        this.docNode = parameters.docNode;
        this._text = undefined;
    }
    /**
     * Generates a line/column prefix.  Example with line=2 and column=5
     * and message="An error occurred":
     * ```
     * "(2,5): An error occurred"
     * ```
     */
    ParserMessage._formatMessageText = function (message, range) {
        if (!message) {
            message = 'An unknown error occurred';
        }
        if (range.pos !== 0 || range.end !== 0) {
            // NOTE: This currently a potentially expensive operation, since TSDoc currently doesn't
            // have a full newline analysis for the input buffer.
            var location_1 = range.getLocation(range.pos);
            if (location_1.line) {
                return "(".concat(location_1.line, ",").concat(location_1.column, "): ") + message;
            }
        }
        return message;
    };
    Object.defineProperty(ParserMessage.prototype, "text", {
        /**
         * The message text.
         */
        get: function () {
            if (this._text === undefined) {
                // NOTE: This currently a potentially expensive operation, since TSDoc currently doesn't
                // have a full newline analysis for the input buffer.
                this._text = ParserMessage._formatMessageText(this.unformattedText, this.textRange);
            }
            return this._text;
        },
        enumerable: false,
        configurable: true
    });
    ParserMessage.prototype.toString = function () {
        return this.text;
    };
    return ParserMessage;
}());
exports.ParserMessage = ParserMessage;
//# sourceMappingURL=ParserMessage.js.map