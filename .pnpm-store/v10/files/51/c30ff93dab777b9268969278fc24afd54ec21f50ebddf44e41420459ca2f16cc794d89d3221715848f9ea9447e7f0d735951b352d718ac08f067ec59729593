"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveColorsTextRewriter = void 0;
const AnsiEscape_1 = require("./AnsiEscape");
const TextRewriter_1 = require("./TextRewriter");
var State;
(function (State) {
    // Buffer is empty, and we're looking for the ESC character
    State[State["Start"] = 0] = "Start";
    // We're looking for the '[' character
    State[State["AwaitingBracket"] = 1] = "AwaitingBracket";
    // We're reading the codes after the '[' character
    State[State["ReadingCodes"] = 2] = "ReadingCodes";
})(State || (State = {}));
/**
 * For use with {@link TextRewriterTransform}, this rewriter removes ANSI escape codes
 * including colored text.
 *
 * @remarks
 * The implementation also removes other ANSI escape codes such as cursor positioning.
 * The specific set of affected codes may be adjusted in the future.
 *
 * @public
 */
class RemoveColorsTextRewriter extends TextRewriter_1.TextRewriter {
    initialize() {
        return { buffer: '', parseState: State.Start };
    }
    process(unknownState, text) {
        const state = unknownState;
        // We will be matching AnsiEscape._csiRegExp:
        //
        //  /\x1b\[([\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e])/gu
        //
        const ESC = '\x1b';
        let result = '';
        let index = 0;
        while (index < text.length) {
            if (state.parseState === State.Start) {
                // The buffer is empty, which means we haven't found anything yet
                const csiIndex = text.indexOf(ESC, index);
                if (csiIndex < 0) {
                    // We reached the end of "text" without finding another CSI prefix
                    result += text.substring(index);
                    break;
                }
                // Append everything up to the CSI prefix
                result += text.substring(index, csiIndex);
                // Save the partial match in the buffer
                state.buffer = ESC;
                index = csiIndex + 1;
                state.parseState = State.AwaitingBracket;
            }
            else {
                // The buffer has characters, which means we started matching a partial sequence
                // Read another character into the buffer
                const c = text[index];
                ++index;
                state.buffer += c;
                if (state.parseState === State.AwaitingBracket) {
                    if (c === '[') {
                        state.parseState = State.ReadingCodes;
                    }
                    else {
                        // Failed to match, so append the buffer and start over
                        result += state.buffer;
                        state.buffer = '';
                        state.parseState = State.Start;
                    }
                }
                else {
                    // state.state === State.ReadingCodes
                    // Stop when we reach any character that is not [\x30-\x3f] or [\x20-\x2f]
                    const code = c.charCodeAt(0);
                    if (code < 0x20 || code > 0x3f) {
                        result += AnsiEscape_1.AnsiEscape.removeCodes(state.buffer);
                        state.buffer = '';
                        state.parseState = State.Start;
                    }
                }
            }
        }
        return result;
    }
    close(unknownState) {
        const state = unknownState;
        const result = state.buffer;
        state.buffer = '';
        return result;
    }
}
exports.RemoveColorsTextRewriter = RemoveColorsTextRewriter;
//# sourceMappingURL=RemoveColorsTextRewriter.js.map