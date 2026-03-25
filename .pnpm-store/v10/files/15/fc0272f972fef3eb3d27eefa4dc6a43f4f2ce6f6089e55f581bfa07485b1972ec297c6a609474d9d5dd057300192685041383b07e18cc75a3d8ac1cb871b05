"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextRewriter = void 0;
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
class TextRewriter {
}
exports.TextRewriter = TextRewriter;
//# sourceMappingURL=TextRewriter.js.map