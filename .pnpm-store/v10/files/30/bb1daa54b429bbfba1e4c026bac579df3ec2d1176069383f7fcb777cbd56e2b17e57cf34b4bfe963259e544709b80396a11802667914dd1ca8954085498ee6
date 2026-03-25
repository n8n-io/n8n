"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscardStdoutTransform = void 0;
const ITerminalChunk_1 = require("./ITerminalChunk");
const TerminalTransform_1 = require("./TerminalTransform");
var State;
(function (State) {
    State[State["Okay"] = 0] = "Okay";
    State[State["StderrFragment"] = 1] = "StderrFragment";
    State[State["InsertLinefeed"] = 2] = "InsertLinefeed";
})(State || (State = {}));
/**
 * `DiscardStdoutTransform` discards `stdout` chunks while fixing up malformed `stderr` lines.
 *
 * @remarks
 * Suppose that a poorly behaved process produces output like this:
 *
 * ```ts
 * process.stdout.write('Starting operation...\n');
 * process.stderr.write('An error occurred');
 * process.stdout.write('\nFinishing up\n');
 * process.stderr.write('The process completed with errors\n');
 * ```
 *
 * When `stdout` and `stderr` are combined on the console, the mistake in the output would not be noticeable:
 * ```
 * Starting operation...
 * An error occurred
 * Finishing up
 * The process completed with errors
 * ```
 *
 * However, if we discard `stdout`, then `stderr` is missing a newline:
 * ```
 * An error occurredThe process completed with errors
 * ```
 *
 * Tooling scripts can introduce these sorts of problems via edge cases that are difficult to find and fix.
 * `DiscardStdoutTransform` can discard the `stdout` stream and fix up `stderr`:
 *
 * ```
 * An error occurred
 * The process completed with errors
 * ```
 *
 * @privateRemarks
 * This class is experimental and marked as `@beta`.  The algorithm may need some fine-tuning, or there may
 * be better solutions to this problem.
 *
 * @beta
 */
class DiscardStdoutTransform extends TerminalTransform_1.TerminalTransform {
    constructor(options) {
        super(options);
        this._state = State.Okay;
    }
    onWriteChunk(chunk) {
        if (chunk.text.indexOf('\r') >= 0) {
            throw new Error('DiscardStdoutTransform expects chunks with normalized newlines');
        }
        if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stdout) {
            if (this._state === State.StderrFragment) {
                if (chunk.text.indexOf('\n') >= 0) {
                    this._state = State.InsertLinefeed;
                }
            }
        }
        else if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stderr) {
            let correctedText;
            if (this._state === State.InsertLinefeed) {
                correctedText = '\n' + chunk.text;
            }
            else {
                correctedText = chunk.text;
            }
            this.destination.writeChunk({ kind: ITerminalChunk_1.TerminalChunkKind.Stderr, text: correctedText });
            if (correctedText.length > 0) {
                if (correctedText[correctedText.length - 1] === '\n') {
                    this._state = State.Okay;
                }
                else {
                    this._state = State.StderrFragment;
                }
            }
        }
        else {
            this.destination.writeChunk(chunk);
        }
    }
}
exports.DiscardStdoutTransform = DiscardStdoutTransform;
//# sourceMappingURL=DiscardStdoutTransform.js.map