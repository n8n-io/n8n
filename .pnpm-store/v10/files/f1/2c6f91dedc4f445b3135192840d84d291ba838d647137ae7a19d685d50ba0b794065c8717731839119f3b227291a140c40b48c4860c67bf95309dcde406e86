"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintUtilities = exports.DEFAULT_CONSOLE_WIDTH = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
/**
 * A sensible fallback column width for consoles.
 *
 * @public
 */
exports.DEFAULT_CONSOLE_WIDTH = 80;
/**
 * A collection of utilities for printing messages to the console.
 *
 * @public
 */
class PrintUtilities {
    /**
     * Returns the width of the console, measured in columns
     */
    static getConsoleWidth() {
        var _a;
        return (_a = process.stdout) === null || _a === void 0 ? void 0 : _a.columns;
    }
    static wrapWords(text, maxLineLength, indentOrLinePrefix) {
        const wrappedLines = PrintUtilities.wrapWordsToLines(text, maxLineLength, indentOrLinePrefix // TS is confused by the overloads
        );
        return wrappedLines.join('\n');
    }
    static wrapWordsToLines(text, maxLineLength, indentOrLinePrefix) {
        var _a;
        let linePrefix;
        switch (typeof indentOrLinePrefix) {
            case 'number':
                linePrefix = ' '.repeat(indentOrLinePrefix);
                break;
            case 'string':
                linePrefix = indentOrLinePrefix;
                break;
            default:
                linePrefix = '';
                break;
        }
        const linePrefixLength = linePrefix.length;
        if (!maxLineLength) {
            maxLineLength = PrintUtilities.getConsoleWidth() || exports.DEFAULT_CONSOLE_WIDTH;
        }
        // Apply word wrapping and the provided line prefix, while also respecting existing newlines
        // and prefix spaces that may exist in the text string already.
        const lines = node_core_library_1.Text.splitByNewLines(text);
        const wrappedLines = [];
        for (const line of lines) {
            if (line.length + linePrefixLength <= maxLineLength) {
                wrappedLines.push(linePrefix + line);
            }
            else {
                const lineAdditionalPrefix = ((_a = line.match(/^\s*/)) === null || _a === void 0 ? void 0 : _a[0]) || '';
                const whitespaceRegexp = /\s+/g;
                let currentWhitespaceMatch = null;
                let previousWhitespaceMatch;
                let currentLineStartIndex = lineAdditionalPrefix.length;
                let previousBreakRanOver = false;
                while ((currentWhitespaceMatch = whitespaceRegexp.exec(line)) !== null) {
                    if (currentWhitespaceMatch.index + linePrefixLength - currentLineStartIndex > maxLineLength) {
                        let whitespaceToSplitAt;
                        if (!previousWhitespaceMatch ||
                            // Handle the case where there are two words longer than the maxLineLength in a row
                            previousBreakRanOver) {
                            whitespaceToSplitAt = currentWhitespaceMatch;
                        }
                        else {
                            whitespaceToSplitAt = previousWhitespaceMatch;
                        }
                        wrappedLines.push(linePrefix +
                            lineAdditionalPrefix +
                            line.substring(currentLineStartIndex, whitespaceToSplitAt.index));
                        previousBreakRanOver = whitespaceToSplitAt.index - currentLineStartIndex > maxLineLength;
                        currentLineStartIndex = whitespaceToSplitAt.index + whitespaceToSplitAt[0].length;
                    }
                    else {
                        previousBreakRanOver = false;
                    }
                    previousWhitespaceMatch = currentWhitespaceMatch;
                }
                if (previousWhitespaceMatch &&
                    line.length + linePrefixLength - currentLineStartIndex > maxLineLength) {
                    const whitespaceToSplitAt = previousWhitespaceMatch;
                    wrappedLines.push(linePrefix +
                        lineAdditionalPrefix +
                        line.substring(currentLineStartIndex, whitespaceToSplitAt.index));
                    currentLineStartIndex = whitespaceToSplitAt.index + whitespaceToSplitAt[0].length;
                }
                if (currentLineStartIndex < line.length) {
                    wrappedLines.push(linePrefix + lineAdditionalPrefix + line.substring(currentLineStartIndex));
                }
            }
        }
        return wrappedLines;
    }
    /**
     * Displays a message in the console wrapped in a box UI.
     *
     * @param message - The message to display.
     * @param terminal - The terminal to write the message to.
     * @param boxWidth - The width of the box, defaults to half of the console width.
     */
    static printMessageInBox(message, terminal, boxWidth) {
        if (!boxWidth) {
            const consoleWidth = PrintUtilities.getConsoleWidth() || exports.DEFAULT_CONSOLE_WIDTH;
            boxWidth = Math.floor(consoleWidth / 2);
        }
        const maxLineLength = boxWidth - 10;
        const wrappedMessageLines = PrintUtilities.wrapWordsToLines(message, maxLineLength);
        let longestLineLength = 0;
        const trimmedLines = [];
        for (const line of wrappedMessageLines) {
            const trimmedLine = line.trim();
            trimmedLines.push(trimmedLine);
            longestLineLength = Math.max(longestLineLength, trimmedLine.length);
        }
        if (longestLineLength > boxWidth - 2) {
            // If the longest line is longer than the box, print bars above and below the message
            // ═════════════
            //  Message
            // ═════════════
            const headerAndFooter = ` ${'═'.repeat(boxWidth)}`;
            terminal.writeLine(headerAndFooter);
            for (const line of wrappedMessageLines) {
                terminal.writeLine(` ${line}`);
            }
            terminal.writeLine(headerAndFooter);
        }
        else {
            // ╔═══════════╗
            // ║  Message  ║
            // ╚═══════════╝
            terminal.writeLine(` ╔${'═'.repeat(boxWidth - 2)}╗`);
            for (const trimmedLine of trimmedLines) {
                const padding = boxWidth - trimmedLine.length - 2;
                const leftPadding = Math.floor(padding / 2);
                const rightPadding = padding - leftPadding;
                terminal.writeLine(` ║${' '.repeat(leftPadding)}${trimmedLine}${' '.repeat(rightPadding)}║`);
            }
            terminal.writeLine(` ╚${'═'.repeat(boxWidth - 2)}╝`);
        }
    }
}
exports.PrintUtilities = PrintUtilities;
//# sourceMappingURL=PrintUtilities.js.map