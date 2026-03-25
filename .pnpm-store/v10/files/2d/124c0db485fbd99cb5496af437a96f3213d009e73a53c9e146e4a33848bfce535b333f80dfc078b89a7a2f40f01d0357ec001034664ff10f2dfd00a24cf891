import type { Brand } from '@rushstack/node-core-library';
/**
 * Represents the internal state of a {@link TextRewriter} subclass.
 *
 * @remarks
 * For example, suppose that {@link NormalizeNewlinesTextRewriter} will be used to rewrite
 * the input `"line 1\r\nline 2\r\n"` to become `"line 1\nline 2\n"`.  But suppose that the `"\r\n"`
 * pair is split across two chunks:
 *
 * ```ts
 * const rewriter: NormalizeNewlinesTextRewriter = new NormalizeNewlinesTextRewriter(NewlineKind.Lf);
 * const state: TextRewriterState = rewriter.initialize();
 * let output: string = rewriter.process(state, 'line 1\r');
 * output += rewriter.process(state, '\nline 2\r\n');
 * output += rewriter.close(state);
 *
 * // The final "output" value is: "line 1\nline 2\n"
 * ```
 *
 * The `TextRewriterState` keeps track of this context, so that split `"\r"` and `"\n"` are
 * interpreted as a single newline.
 *
 * @public
 */
export type TextRewriterState = Brand<unknown, 'TextRewriterState'>;
/**
 * The abstract base class for operations that can be applied by {@link TextRewriterTransform}.
 *
 * @remarks
 * The {@link TextRewriterTransform} applies one or more character rewriting operations to its
 * chunk stream.  Since these operations are applied separately to `stderr` and `stdout`, the
 * state is stored in an opaque `TextRewriterState` object.
 *
 * Conceptually, a `TextRewriter` subclass is very similar to a regular expression, with the difference
 * that `RegExp` operates on a text string, whereas `TextRewriter` operates on a stream of characters.
 *
 * The two most common subclasses are {@link NormalizeNewlinesTextRewriter} and {@link RemoveColorsTextRewriter}.
 *
 * A rewriting operation starts with `initialize()`, followed by any number of `process()` calls, and
 * then finishes with `close()`.  For example:
 *
 * ```ts
 * const rewriter: NormalizeNewlinesTextRewriter = new NormalizeNewlinesTextRewriter(NewlineKind.Lf);
 * const state: TextRewriterState = rewriter.initialize();
 * let output: string = rewriter.process(state, 'line 1\r');
 * output += rewriter.process(state, '\nline 2\r\n');
 * output += rewriter.close(state);
 *
 * // The final "output" value is: "line 1\nline 2\n"
 * ```
 *
 * After `close()` has been called, the `TextRewriterState` state should not be reused.
 *
 * @public
 */
export declare abstract class TextRewriter {
    /**
     * Create a new `TextRewriterState` object that can be used to process a stream of characters.
     */
    abstract initialize(): TextRewriterState;
    /**
     * Rewrite the next sequence of characters from the input stream, returning the modified output.
     */
    abstract process(state: TextRewriterState, input: string): string;
    /**
     * Close the `TextRewriterState` object and return any buffered output.
     */
    abstract close(state: TextRewriterState): string;
}
//# sourceMappingURL=TextRewriter.d.ts.map