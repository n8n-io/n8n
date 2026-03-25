"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextRewriterTransform = void 0;
const ITerminalChunk_1 = require("./ITerminalChunk");
const TerminalTransform_1 = require("./TerminalTransform");
const RemoveColorsTextRewriter_1 = require("./RemoveColorsTextRewriter");
const NormalizeNewlinesTextRewriter_1 = require("./NormalizeNewlinesTextRewriter");
/**
 * A {@link TerminalTransform} subclass that performs one or more {@link TextRewriter} operations.
 * The most common operations are {@link NormalizeNewlinesTextRewriter} and {@link RemoveColorsTextRewriter}.
 *
 * @remarks
 * The `TextRewriter` operations are applied separately to the `stderr` and `stdout` streams.
 * If multiple {@link ITextRewriterTransformOptions.textRewriters} are configured, they are applied
 * in the order that they appear in the array.
 *
 * @public
 */
class TextRewriterTransform extends TerminalTransform_1.TerminalTransform {
    constructor(options) {
        super(options);
        const textRewriters = options.textRewriters || [];
        if (options.removeColors) {
            textRewriters.push(new RemoveColorsTextRewriter_1.RemoveColorsTextRewriter());
        }
        if (options.normalizeNewlines) {
            textRewriters.push(new NormalizeNewlinesTextRewriter_1.NormalizeNewlinesTextRewriter({
                newlineKind: options.normalizeNewlines,
                ensureNewlineAtEnd: options.ensureNewlineAtEnd
            }));
        }
        if (textRewriters.length === 0) {
            throw new Error('TextRewriterTransform requires at least one matcher');
        }
        this.textRewriters = textRewriters;
        this._stderrStates = this.textRewriters.map((x) => x.initialize());
        this._stdoutStates = this.textRewriters.map((x) => x.initialize());
    }
    onWriteChunk(chunk) {
        if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stderr) {
            this._processText(chunk, this._stderrStates);
        }
        else if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stdout) {
            this._processText(chunk, this._stdoutStates);
        }
        else {
            this.destination.writeChunk(chunk);
        }
    }
    _processText(chunk, states) {
        let text = chunk.text;
        for (let i = 0; i < states.length; ++i) {
            if (text.length > 0) {
                text = this.textRewriters[i].process(states[i], text);
            }
        }
        if (text.length > 0) {
            // If possible, avoid allocating a new chunk
            if (text === chunk.text) {
                this.destination.writeChunk(chunk);
            }
            else {
                this.destination.writeChunk({
                    text: text,
                    kind: chunk.kind
                });
            }
        }
    }
    _closeRewriters(states, chunkKind) {
        let text = '';
        for (let i = 0; i < states.length; ++i) {
            if (text.length > 0) {
                text = this.textRewriters[i].process(states[i], text);
            }
            text += this.textRewriters[i].close(states[i]);
        }
        if (text.length > 0) {
            this.destination.writeChunk({
                text: text,
                kind: chunkKind
            });
        }
    }
    onClose() {
        this._closeRewriters(this._stderrStates, ITerminalChunk_1.TerminalChunkKind.Stderr);
        this._closeRewriters(this._stdoutStates, ITerminalChunk_1.TerminalChunkKind.Stdout);
        this.autocloseDestination();
    }
}
exports.TextRewriterTransform = TextRewriterTransform;
//# sourceMappingURL=TextRewriterTransform.js.map