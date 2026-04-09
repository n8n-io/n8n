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
exports.Text = exports.NewlineKind = exports.Encoding = void 0;
const os = __importStar(require("node:os"));
/**
 * The allowed types of encodings, as supported by Node.js
 * @public
 */
var Encoding;
(function (Encoding) {
    Encoding["Utf8"] = "utf8";
})(Encoding || (exports.Encoding = Encoding = {}));
/**
 * Enumeration controlling conversion of newline characters.
 * @public
 */
var NewlineKind;
(function (NewlineKind) {
    /**
     * Windows-style newlines
     */
    NewlineKind["CrLf"] = "\r\n";
    /**
     * POSIX-style newlines
     *
     * @remarks
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    NewlineKind["Lf"] = "\n";
    /**
     * Default newline type for this operating system (`os.EOL`).
     */
    NewlineKind["OsDefault"] = "os";
})(NewlineKind || (exports.NewlineKind = NewlineKind = {}));
const NEWLINE_REGEX = /\r\n|\n\r|\r|\n/g;
const NEWLINE_AT_END_REGEX = /(\r\n|\n\r|\r|\n)$/;
function* readLinesFromChunk(
// eslint-disable-next-line @rushstack/no-new-null
chunk, encoding, ignoreEmptyLines, state) {
    if (!chunk) {
        return;
    }
    const remaining = state.remaining + (typeof chunk === 'string' ? chunk : chunk.toString(encoding));
    let startIndex = 0;
    const matches = remaining.matchAll(NEWLINE_REGEX);
    for (const match of matches) {
        const endIndex = match.index;
        if (startIndex !== endIndex || !ignoreEmptyLines) {
            yield remaining.substring(startIndex, endIndex);
        }
        startIndex = endIndex + match[0].length;
    }
    state.remaining = remaining.substring(startIndex);
}
/**
 * Operations for working with strings that contain text.
 *
 * @remarks
 * The utilities provided by this class are intended to be simple, small, and very
 * broadly applicable.
 *
 * @public
 */
class Text {
    /**
     * Returns the same thing as targetString.replace(searchValue, replaceValue), except that
     * all matches are replaced, rather than just the first match.
     * @param input         - The string to be modified
     * @param searchValue   - The value to search for
     * @param replaceValue  - The replacement text
     */
    static replaceAll(input, searchValue, replaceValue) {
        return input.split(searchValue).join(replaceValue);
    }
    /**
     * Converts all newlines in the provided string to use Windows-style CRLF end of line characters.
     */
    static convertToCrLf(input) {
        return input.replace(Text._newLineRegEx, '\r\n');
    }
    /**
     * Converts all newlines in the provided string to use POSIX-style LF end of line characters.
     *
     * POSIX is a registered trademark of the Institute of Electrical and Electronic Engineers, Inc.
     */
    static convertToLf(input) {
        return input.replace(Text._newLineRegEx, '\n');
    }
    /**
     * Converts all newlines in the provided string to use the specified newline type.
     */
    static convertTo(input, newlineKind) {
        return input.replace(Text._newLineRegEx, Text.getNewline(newlineKind));
    }
    /**
     * Returns the newline character sequence for the specified `NewlineKind`.
     */
    static getNewline(newlineKind) {
        switch (newlineKind) {
            case NewlineKind.CrLf:
                return '\r\n';
            case NewlineKind.Lf:
                return '\n';
            case NewlineKind.OsDefault:
                return os.EOL;
            default:
                throw new Error('Unsupported newline kind');
        }
    }
    /**
     * Append characters to the end of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padEnd(s, minimumLength, paddingCharacter = ' ') {
        if (paddingCharacter.length !== 1) {
            throw new Error('The paddingCharacter parameter must be a single character.');
        }
        if (s.length < minimumLength) {
            const paddingArray = new Array(minimumLength - s.length);
            paddingArray.unshift(s);
            return paddingArray.join(paddingCharacter);
        }
        else {
            return s;
        }
    }
    /**
     * Append characters to the start of a string to ensure the result has a minimum length.
     * @remarks
     * If the string length already exceeds the minimum length, then the string is unchanged.
     * The string is not truncated.
     */
    static padStart(s, minimumLength, paddingCharacter = ' ') {
        if (paddingCharacter.length !== 1) {
            throw new Error('The paddingCharacter parameter must be a single character.');
        }
        if (s.length < minimumLength) {
            const paddingArray = new Array(minimumLength - s.length);
            paddingArray.push(s);
            return paddingArray.join(paddingCharacter);
        }
        else {
            return s;
        }
    }
    /**
     * If the string is longer than maximumLength characters, truncate it to that length
     * using "..." to indicate the truncation.
     *
     * @remarks
     * For example truncateWithEllipsis('1234578', 5) would produce '12...'.
     */
    static truncateWithEllipsis(s, maximumLength) {
        if (maximumLength < 0) {
            throw new Error('The maximumLength cannot be a negative number');
        }
        if (s.length <= maximumLength) {
            return s;
        }
        if (s.length <= 3) {
            return s.substring(0, maximumLength);
        }
        return s.substring(0, maximumLength - 3) + '...';
    }
    /**
     * Returns the input string with a trailing `\n` character appended, if not already present.
     */
    static ensureTrailingNewline(s, newlineKind = NewlineKind.Lf) {
        // Is there already a newline?
        if (Text._newLineAtEndRegEx.test(s)) {
            return s; // yes, no change
        }
        return s + newlineKind; // no, add it
    }
    /**
     * Escapes a string so that it can be treated as a literal string when used in a regular expression.
     */
    static escapeRegExp(literal) {
        return literal.replace(/[^A-Za-z0-9_]/g, '\\$&');
    }
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static async *readLinesFromIterableAsync(iterable, options = {}) {
        const { encoding = Encoding.Utf8, ignoreEmptyLines = false } = options;
        const state = { remaining: '' };
        for await (const chunk of iterable) {
            yield* readLinesFromChunk(chunk, encoding, ignoreEmptyLines, state);
        }
        const remaining = state.remaining;
        if (remaining.length) {
            yield remaining;
        }
    }
    /**
     * Read lines from an iterable object that returns strings or buffers, and return a generator that
     * produces the lines as strings. The lines will not include the newline characters.
     *
     * @param iterable - An iterable object that returns strings or buffers
     * @param options - Options used when reading the lines from the provided iterable
     */
    static *readLinesFromIterable(
    // eslint-disable-next-line @rushstack/no-new-null
    iterable, options = {}) {
        const { encoding = Encoding.Utf8, ignoreEmptyLines = false } = options;
        const state = { remaining: '' };
        for (const chunk of iterable) {
            yield* readLinesFromChunk(chunk, encoding, ignoreEmptyLines, state);
        }
        const remaining = state.remaining;
        if (remaining.length) {
            yield remaining;
        }
    }
    /**
     * Returns a new string that is the input string with the order of characters reversed.
     */
    static reverse(s) {
        // Benchmarks of several algorithms: https://jsbench.me/4bkfflcm2z
        return s.split('').reduce((newString, char) => char + newString, '');
    }
    static splitByNewLines(s) {
        return s === null || s === void 0 ? void 0 : s.split(/\r?\n/);
    }
}
exports.Text = Text;
Text._newLineRegEx = NEWLINE_REGEX;
Text._newLineAtEndRegEx = NEWLINE_AT_END_REGEX;
//# sourceMappingURL=Text.js.map