import type { NewlineKind } from '@rushstack/node-core-library';
import { type ITerminalChunk } from './ITerminalChunk';
import { TerminalTransform, type ITerminalTransformOptions } from './TerminalTransform';
import type { TextRewriter } from './TextRewriter';
/**
 * Constructor options for {@link TextRewriterTransform}.
 *
 * @public
 */
export interface ITextRewriterTransformOptions extends ITerminalTransformOptions {
    /**
     * A list of rewriters to be applied.  More items may be appended to the list, for example
     * if {@link ITextRewriterTransformOptions.removeColors} is specified.
     *
     * @remarks
     * The final list must contain at least one item.
     */
    textRewriters?: TextRewriter[];
    /**
     * If specified, a {@link RemoveColorsTextRewriter} will be appended to the list of rewriters.
     */
    removeColors?: boolean;
    /**
     * If `normalizeNewlines` or `ensureNewlineAtEnd` is specified, a {@link NormalizeNewlinesTextRewriter}
     * will be appended to the list of rewriters with the specified settings.
     *
     * @remarks
     * See {@link INormalizeNewlinesTextRewriterOptions} for details.
     */
    normalizeNewlines?: NewlineKind;
    /**
     * If `normalizeNewlines` or `ensureNewlineAtEnd` is specified, a {@link NormalizeNewlinesTextRewriter}
     * will be appended to the list of rewriters with the specified settings.
     *
     * @remarks
     * See {@link INormalizeNewlinesTextRewriterOptions} for details.
     */
    ensureNewlineAtEnd?: boolean;
}
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
export declare class TextRewriterTransform extends TerminalTransform {
    private readonly _stderrStates;
    private readonly _stdoutStates;
    readonly textRewriters: ReadonlyArray<TextRewriter>;
    constructor(options: ITextRewriterTransformOptions);
    protected onWriteChunk(chunk: ITerminalChunk): void;
    private _processText;
    private _closeRewriters;
    protected onClose(): void;
}
//# sourceMappingURL=TextRewriterTransform.d.ts.map