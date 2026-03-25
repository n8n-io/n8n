"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioSummarizer = void 0;
const ITerminalChunk_1 = require("./ITerminalChunk");
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * Summarizes the results of a failed build task by returning a subset of `stderr` output not to exceed
 * a specified maximum number of lines.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input was prepared by {@link StderrLineTransform}, so that each
 * {@link ITerminalChunk.text} item is a single line terminated by a `"\n"` character.
 *
 * The {@link IStdioSummarizerOptions.leadingLines} and {@link IStdioSummarizerOptions.trailingLines}
 * counts specify the maximum number of lines to be returned. Any additional lines will be omitted.
 * For example, if `leadingLines` and `trailingLines` were set to `3`, then the summary of 16 `stderr` lines might
 * look like this:
 *
 * ```
 * Line 1
 * Line 2
 * Line 3
 *   ...10 lines omitted...
 * Line 14
 * Line 15
 * Line 16
 * ```
 *
 * If the `stderr` output is completely empty, then the `stdout` output will be summarized instead.
 *
 * @beta
 */
class StdioSummarizer extends TerminalWritable_1.TerminalWritable {
    constructor(options) {
        super(options);
        this._abridgedOmittedLines = 0;
        if (!options) {
            options = {};
        }
        this._leadingLines = options.leadingLines !== undefined ? options.leadingLines : 10;
        this._trailingLines = options.trailingLines !== undefined ? options.trailingLines : 10;
        this._abridgedLeading = [];
        this._abridgedTrailing = [];
        this._abridgedStderr = false;
    }
    /**
     * Returns the summary report.
     *
     * @remarks
     * The `close()` method must be called before `getReport()` can be used.
     */
    getReport() {
        if (this.isOpen) {
            throw new Error('The summary cannot be prepared until after close() is called.');
        }
        const report = [...this._abridgedLeading];
        if (this._abridgedOmittedLines === 1) {
            report.push(`  ...${this._abridgedOmittedLines} line omitted...\n`);
        }
        if (this._abridgedOmittedLines > 1) {
            report.push(`  ...${this._abridgedOmittedLines} lines omitted...\n`);
        }
        report.push(...this._abridgedTrailing);
        return report.join('');
    }
    onWriteChunk(chunk) {
        if (chunk.text.length === 0 || chunk.text[chunk.text.length - 1] !== '\n') {
            throw new Error('StdioSummarizer expects chunks that were separated parsed into lines by StderrLineTransform\n' +
                ' Invalid input: ' +
                JSON.stringify(chunk.text));
        }
        if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stderr && !this._abridgedStderr) {
            // The first time we see stderr, switch to capturing stderr
            this._abridgedStderr = true;
            this._abridgedLeading.length = 0;
            this._abridgedTrailing.length = 0;
            this._abridgedOmittedLines = 0;
        }
        else if (this._abridgedStderr && chunk.kind !== ITerminalChunk_1.TerminalChunkKind.Stderr) {
            // If we're capturing stderr, then ignore non-stderr input
            return;
        }
        // Did we capture enough leading lines?
        if (this._abridgedLeading.length < this._leadingLines) {
            this._abridgedLeading.push(chunk.text);
            return;
        }
        this._abridgedTrailing.push(chunk.text);
        // If we captured to many trailing lines, omit the extras
        while (this._abridgedTrailing.length > this._trailingLines) {
            this._abridgedTrailing.shift();
            ++this._abridgedOmittedLines;
        }
    }
}
exports.StdioSummarizer = StdioSummarizer;
//# sourceMappingURL=StdioSummarizer.js.map