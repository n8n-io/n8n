import { TextRewriter, type TextRewriterState } from './TextRewriter';
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
export declare class RemoveColorsTextRewriter extends TextRewriter {
    initialize(): TextRewriterState;
    process(unknownState: TextRewriterState, text: string): string;
    close(unknownState: TextRewriterState): string;
}
//# sourceMappingURL=RemoveColorsTextRewriter.d.ts.map