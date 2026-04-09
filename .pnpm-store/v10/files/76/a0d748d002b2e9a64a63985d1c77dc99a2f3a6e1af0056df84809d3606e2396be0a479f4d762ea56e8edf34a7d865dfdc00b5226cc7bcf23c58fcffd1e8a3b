// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { Text } from '@rushstack/node-core-library';
import { TextRewriter } from './TextRewriter';
/**
 * For use with {@link TextRewriterTransform}, this rewriter converts all newlines to
 * a standard format.
 *
 * @public
 */
export class NormalizeNewlinesTextRewriter extends TextRewriter {
    constructor(options) {
        super();
        this.newlineKind = options.newlineKind;
        this.newline = Text.getNewline(options.newlineKind);
        this.ensureNewlineAtEnd = !!options.ensureNewlineAtEnd;
    }
    initialize() {
        return {
            characterToIgnore: '',
            incompleteLine: false
        };
    }
    process(unknownState, text) {
        const state = unknownState;
        let result = '';
        if (text.length > 0) {
            let i = 0;
            do {
                const c = text[i];
                ++i;
                if (c === state.characterToIgnore) {
                    state.characterToIgnore = '';
                }
                else if (c === '\r') {
                    result += this.newline;
                    state.characterToIgnore = '\n';
                    state.incompleteLine = false;
                }
                else if (c === '\n') {
                    result += this.newline;
                    state.characterToIgnore = '\r';
                    state.incompleteLine = false;
                }
                else {
                    result += c;
                    state.characterToIgnore = '';
                    state.incompleteLine = true;
                }
            } while (i < text.length);
        }
        return result;
    }
    close(unknownState) {
        const state = unknownState;
        state.characterToIgnore = '';
        if (state.incompleteLine) {
            state.incompleteLine = false;
            return this.newline;
        }
        else {
            return '';
        }
    }
}
//# sourceMappingURL=NormalizeNewlinesTextRewriter.js.map