// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TerminalChunkKind } from './ITerminalChunk';
import { TerminalTransform } from './TerminalTransform';
import { RemoveColorsTextRewriter } from './RemoveColorsTextRewriter';
import { NormalizeNewlinesTextRewriter } from './NormalizeNewlinesTextRewriter';
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
export class TextRewriterTransform extends TerminalTransform {
    constructor(options) {
        super(options);
        const textRewriters = options.textRewriters || [];
        if (options.removeColors) {
            textRewriters.push(new RemoveColorsTextRewriter());
        }
        if (options.normalizeNewlines) {
            textRewriters.push(new NormalizeNewlinesTextRewriter({
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
        if (chunk.kind === TerminalChunkKind.Stderr) {
            this._processText(chunk, this._stderrStates);
        }
        else if (chunk.kind === TerminalChunkKind.Stdout) {
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
        this._closeRewriters(this._stderrStates, TerminalChunkKind.Stderr);
        this._closeRewriters(this._stdoutStates, TerminalChunkKind.Stdout);
        this.autocloseDestination();
    }
}
//# sourceMappingURL=TextRewriterTransform.js.map