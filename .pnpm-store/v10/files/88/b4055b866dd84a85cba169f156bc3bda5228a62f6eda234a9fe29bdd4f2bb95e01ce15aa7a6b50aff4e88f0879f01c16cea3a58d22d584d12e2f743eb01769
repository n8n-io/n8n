// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TSDocMessageId } from './TSDocMessageId';
// Internal parser state
var State;
(function (State) {
    // Initial state, looking for "/*"
    State[State["BeginComment1"] = 0] = "BeginComment1";
    // Looking for "*" or "* " after "/*"
    State[State["BeginComment2"] = 1] = "BeginComment2";
    // Like State.CollectingLine except immediately after the "/**"
    State[State["CollectingFirstLine"] = 2] = "CollectingFirstLine";
    // Collecting characters until we reach a newline
    State[State["CollectingLine"] = 3] = "CollectingLine";
    // After a newline, looking for the "*" that begins a new line, or the "*/" to end the comment
    State[State["AdvancingLine"] = 4] = "AdvancingLine";
    // Exiting the parser loop
    State[State["Done"] = 5] = "Done";
})(State || (State = {}));
/**
 * The main API for parsing TSDoc comments.
 */
export class LineExtractor {
    /**
     * This step parses an entire code comment from slash-star-star until star-slash,
     * and extracts the content lines.  The lines are stored in IDocCommentParameters.lines
     * and the overall text range is assigned to IDocCommentParameters.range.
     */
    static extract(parserContext) {
        const range = parserContext.sourceRange;
        const buffer = range.buffer;
        let commentRangeStart = 0;
        let commentRangeEnd = 0;
        // These must be set before entering CollectingFirstLine, CollectingLine, or AdvancingLine
        let collectingLineStart = 0;
        let collectingLineEnd = 0;
        let nextIndex = range.pos;
        let state = State.BeginComment1;
        const lines = [];
        while (state !== State.Done) {
            if (nextIndex >= range.end) {
                // reached the end of the input
                switch (state) {
                    case State.BeginComment1:
                    case State.BeginComment2:
                        parserContext.log.addMessageForTextRange(TSDocMessageId.CommentNotFound, 'Expecting a "/**" comment', range);
                        return false;
                    default:
                        parserContext.log.addMessageForTextRange(TSDocMessageId.CommentMissingClosingDelimiter, 'Unexpected end of input', range);
                        return false;
                }
            }
            const current = buffer[nextIndex];
            const currentIndex = nextIndex;
            ++nextIndex;
            const next = nextIndex < range.end ? buffer[nextIndex] : '';
            switch (state) {
                case State.BeginComment1:
                    if (current === '/' && next === '*') {
                        commentRangeStart = currentIndex;
                        ++nextIndex; // skip the star
                        state = State.BeginComment2;
                    }
                    else if (!LineExtractor._whitespaceCharacterRegExp.test(current)) {
                        parserContext.log.addMessageForTextRange(TSDocMessageId.CommentOpeningDelimiterSyntax, 'Expecting a leading "/**"', range.getNewRange(currentIndex, currentIndex + 1));
                        return false;
                    }
                    break;
                case State.BeginComment2:
                    if (current === '*') {
                        if (next === ' ') {
                            ++nextIndex; // Discard the space after the star
                        }
                        collectingLineStart = nextIndex;
                        collectingLineEnd = nextIndex;
                        state = State.CollectingFirstLine;
                    }
                    else {
                        parserContext.log.addMessageForTextRange(TSDocMessageId.CommentOpeningDelimiterSyntax, 'Expecting a leading "/**"', range.getNewRange(currentIndex, currentIndex + 1));
                        return false;
                    }
                    break;
                case State.CollectingFirstLine:
                case State.CollectingLine:
                    if (current === '\n') {
                        // Ignore an empty line if it is immediately after the "/**"
                        if (state !== State.CollectingFirstLine || collectingLineEnd > collectingLineStart) {
                            // Record the line that we collected
                            lines.push(range.getNewRange(collectingLineStart, collectingLineEnd));
                        }
                        collectingLineStart = nextIndex;
                        collectingLineEnd = nextIndex;
                        state = State.AdvancingLine;
                    }
                    else if (current === '*' && next === '/') {
                        if (collectingLineEnd > collectingLineStart) {
                            lines.push(range.getNewRange(collectingLineStart, collectingLineEnd));
                        }
                        collectingLineStart = 0;
                        collectingLineEnd = 0;
                        ++nextIndex; // skip the slash
                        commentRangeEnd = nextIndex;
                        state = State.Done;
                    }
                    else if (!LineExtractor._whitespaceCharacterRegExp.test(current)) {
                        collectingLineEnd = nextIndex;
                    }
                    break;
                case State.AdvancingLine:
                    if (current === '*') {
                        if (next === '/') {
                            collectingLineStart = 0;
                            collectingLineEnd = 0;
                            ++nextIndex; // skip the slash
                            commentRangeEnd = nextIndex;
                            state = State.Done;
                        }
                        else {
                            // Discard the "*" at the start of a line
                            if (next === ' ') {
                                ++nextIndex; // Discard the space after the star
                            }
                            collectingLineStart = nextIndex;
                            collectingLineEnd = nextIndex;
                            state = State.CollectingLine;
                        }
                    }
                    else if (current === '\n') {
                        // Blank line
                        lines.push(range.getNewRange(currentIndex, currentIndex));
                        collectingLineStart = nextIndex;
                    }
                    else if (!LineExtractor._whitespaceCharacterRegExp.test(current)) {
                        // If the star is missing, then start the line here
                        // Example: "/**\nL1*/"
                        // (collectingLineStart was the start of this line)
                        collectingLineEnd = nextIndex;
                        state = State.CollectingLine;
                    }
                    break;
            }
        }
        /**
         * Only fill in these if we successfully scanned a comment
         */
        parserContext.commentRange = range.getNewRange(commentRangeStart, commentRangeEnd);
        parserContext.lines = lines;
        return true;
    }
}
LineExtractor._whitespaceCharacterRegExp = /^\s$/;
//# sourceMappingURL=LineExtractor.js.map