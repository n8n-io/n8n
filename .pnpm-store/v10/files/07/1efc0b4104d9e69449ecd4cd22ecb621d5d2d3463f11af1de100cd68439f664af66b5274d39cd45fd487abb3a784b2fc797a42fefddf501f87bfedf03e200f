"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Excerpt = exports.ExcerptToken = exports.ExcerptTokenKind = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
/** @public */
var ExcerptTokenKind;
(function (ExcerptTokenKind) {
    /**
     * Generic text without any special properties
     */
    ExcerptTokenKind["Content"] = "Content";
    /**
     * A reference to an API declaration
     */
    ExcerptTokenKind["Reference"] = "Reference";
})(ExcerptTokenKind || (exports.ExcerptTokenKind = ExcerptTokenKind = {}));
/**
 * Represents a fragment of text belonging to an {@link Excerpt} object.
 *
 * @public
 */
class ExcerptToken {
    constructor(kind, text, canonicalReference) {
        this._kind = kind;
        // Standardize the newlines across operating systems. Even though this may deviate from the actual
        // input source file that was parsed, it's useful because the newline gets serialized inside
        // a string literal in .api.json, which cannot be automatically normalized by Git.
        this._text = node_core_library_1.Text.convertToLf(text);
        this._canonicalReference = canonicalReference;
    }
    /**
     * Indicates the kind of token.
     */
    get kind() {
        return this._kind;
    }
    /**
     * The text fragment.
     */
    get text() {
        return this._text;
    }
    /**
     * The hyperlink target for a token whose type is `ExcerptTokenKind.Reference`.  For other token types,
     * this property will be `undefined`.
     */
    get canonicalReference() {
        return this._canonicalReference;
    }
}
exports.ExcerptToken = ExcerptToken;
/**
 * The `Excerpt` class is used by {@link ApiDeclaredItem} to represent a TypeScript code fragment that may be
 * annotated with hyperlinks to declared types (and in the future, source code locations).
 *
 * @remarks
 * API Extractor's .api.json file format stores excerpts compactly as a start/end indexes into an array of tokens.
 * Every `ApiDeclaredItem` has a "main excerpt" corresponding to the full list of tokens.  The declaration may
 * also have have "captured" excerpts that correspond to subranges of tokens.
 *
 * For example, if the main excerpt is:
 *
 * ```
 * function parse(s: string): Vector | undefined;
 * ```
 *
 * ...then this entire signature is the "main excerpt", whereas the function's return type `Vector | undefined` is a
 * captured excerpt.  The `Vector` token might be a hyperlink to that API item.
 *
 * An excerpt may be empty (i.e. a token range containing zero tokens).  For example, if a function's return value
 * is not explicitly declared, then the returnTypeExcerpt will be empty.  By contrast, a class constructor cannot
 * have a return value, so ApiConstructor has no returnTypeExcerpt property at all.
 *
 * @public
 */
class Excerpt {
    constructor(tokens, tokenRange) {
        this.tokens = tokens;
        this.tokenRange = tokenRange;
        if (this.tokenRange.startIndex < 0 ||
            this.tokenRange.endIndex > this.tokens.length ||
            this.tokenRange.startIndex > this.tokenRange.endIndex) {
            throw new Error('Invalid token range');
        }
        this.spannedTokens = this.tokens.slice(this.tokenRange.startIndex, this.tokenRange.endIndex);
    }
    /**
     * The excerpted text, formed by concatenating the text of the `spannedTokens` strings.
     */
    get text() {
        if (this._text === undefined) {
            this._text = this.spannedTokens.map((x) => x.text).join('');
        }
        return this._text;
    }
    /**
     * Returns true if the excerpt is an empty range.
     */
    get isEmpty() {
        return this.tokenRange.startIndex === this.tokenRange.endIndex;
    }
}
exports.Excerpt = Excerpt;
//# sourceMappingURL=Excerpt.js.map