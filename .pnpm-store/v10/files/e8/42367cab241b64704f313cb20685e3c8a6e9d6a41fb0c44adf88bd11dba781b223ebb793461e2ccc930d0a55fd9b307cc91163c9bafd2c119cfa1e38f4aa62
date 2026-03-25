import { type NewlineKind } from '@rushstack/node-core-library';
import { TextRewriter, type TextRewriterState } from './TextRewriter';
/**
 * Constructor options for {@link NormalizeNewlinesTextRewriter}
 *
 * @public
 */
export interface INormalizeNewlinesTextRewriterOptions {
    /**
     * Specifies how newlines should be represented in the output stream.
     */
    newlineKind: NewlineKind;
    /**
     * If `true`, then `NormalizeNewlinesTextRewriter.close()` will append a newline to
     * the output if it ends with an incomplete line.
     *
     * @remarks
     * If the output is an empty string, then a newline will NOT be appended,
     * because writing an empty string does not produce an incomplete line.
     */
    ensureNewlineAtEnd?: boolean;
}
/**
 * For use with {@link TextRewriterTransform}, this rewriter converts all newlines to
 * a standard format.
 *
 * @public
 */
export declare class NormalizeNewlinesTextRewriter extends TextRewriter {
    /** {@inheritDoc INormalizeNewlinesTextRewriterOptions.newlineKind} */
    readonly newlineKind: NewlineKind;
    /**
     * The specific character sequence that will be used when appending newlines.
     */
    readonly newline: string;
    /** {@inheritDoc INormalizeNewlinesTextRewriterOptions.ensureNewlineAtEnd} */
    readonly ensureNewlineAtEnd: boolean;
    constructor(options: INormalizeNewlinesTextRewriterOptions);
    initialize(): TextRewriterState;
    process(unknownState: TextRewriterState, text: string): string;
    close(unknownState: TextRewriterState): string;
}
//# sourceMappingURL=NormalizeNewlinesTextRewriter.d.ts.map