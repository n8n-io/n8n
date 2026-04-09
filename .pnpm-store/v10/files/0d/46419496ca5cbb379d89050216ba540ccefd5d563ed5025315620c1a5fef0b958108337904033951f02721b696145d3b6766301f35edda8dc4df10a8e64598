// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/**
 * Represents an error or warning that occurred during parsing.
 */
export class ParserMessage {
    constructor(parameters) {
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
    static _formatMessageText(message, range) {
        if (!message) {
            message = 'An unknown error occurred';
        }
        if (range.pos !== 0 || range.end !== 0) {
            // NOTE: This currently a potentially expensive operation, since TSDoc currently doesn't
            // have a full newline analysis for the input buffer.
            const location = range.getLocation(range.pos);
            if (location.line) {
                return `(${location.line},${location.column}): ` + message;
            }
        }
        return message;
    }
    /**
     * The message text.
     */
    get text() {
        if (this._text === undefined) {
            // NOTE: This currently a potentially expensive operation, since TSDoc currently doesn't
            // have a full newline analysis for the input buffer.
            this._text = ParserMessage._formatMessageText(this.unformattedText, this.textRange);
        }
        return this._text;
    }
    toString() {
        return this.text;
    }
}
//# sourceMappingURL=ParserMessage.js.map