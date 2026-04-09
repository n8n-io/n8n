// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { Text, NewlineKind } from '@rushstack/node-core-library';
import { TerminalChunkKind } from './ITerminalChunk';
import { TerminalTransform } from './TerminalTransform';
/**
 * `StderrLineTransform` normalizes lines that mix characters from `stdout` and `stderr`,
 * so that each output line is routed entirely to `stdout` or `stderr`.
 *
 * @remarks
 * IMPORTANT: This transform assumes that its input has been normalized to use `"\n"` newlines.
 *
 * IMPORTANT: This transform does not produce realtime output, because lines are buffered
 * until a newline character is encountered.
 *
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stderr.write('An error occurred, cleaning up');
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.'); // (delay)
 * process.stdout.write('.');
 * process.stdout.write('\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is malformed:
 * ```
 * An error occurred, cleaning upThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 *
 * `StderrLineTransform` normalizes the output so that if a combined line contains any `stderr` characters,
 * then the entire line is routed to `stderr`.  Later, if we discard `stdout`, then the output will
 * preserve the appropriate context:
 *
 * ```
 * An error occurred, cleaning up...
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
export class StderrLineTransform extends TerminalTransform {
    constructor(options) {
        super(options);
        this._accumulatedLine = '';
        this._accumulatedStderr = false;
        this.newline = Text.getNewline(options.newlineKind || NewlineKind.Lf);
    }
    onWriteChunk(chunk) {
        if (chunk.text.indexOf('\r') >= 0) {
            throw new Error('StderrLineTransform expects chunks with normalized newlines');
        }
        // After _newlineNormalizerTransform was applied, we can now assume that all newlines
        // use the "\n" string
        const text = chunk.text;
        let startIndex = 0;
        while (startIndex < text.length) {
            if (chunk.kind === TerminalChunkKind.Stderr) {
                this._accumulatedStderr = true;
            }
            const endIndex = text.indexOf('\n', startIndex);
            if (endIndex < 0) {
                // we did not find \n, so simply append
                this._accumulatedLine += text.substring(startIndex);
                break;
            }
            // append everything up to \n
            this._accumulatedLine += text.substring(startIndex, endIndex);
            this._processAccumulatedLine();
            // skip the \n
            startIndex = endIndex + 1;
        }
    }
    onClose() {
        if (this._accumulatedLine.length > 0) {
            this._processAccumulatedLine();
        }
        this.autocloseDestination();
    }
    _processAccumulatedLine() {
        this._accumulatedLine += this.newline;
        if (this._accumulatedStderr) {
            this.destination.writeChunk({
                kind: TerminalChunkKind.Stderr,
                text: this._accumulatedLine
            });
        }
        else {
            this.destination.writeChunk({
                kind: TerminalChunkKind.Stdout,
                text: this._accumulatedLine
            });
        }
        this._accumulatedLine = '';
        this._accumulatedStderr = false;
    }
}
//# sourceMappingURL=StdioLineTransform.js.map