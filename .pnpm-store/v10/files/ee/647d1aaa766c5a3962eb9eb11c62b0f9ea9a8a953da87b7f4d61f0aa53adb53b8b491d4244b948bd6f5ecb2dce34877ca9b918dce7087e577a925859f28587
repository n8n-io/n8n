"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Span = exports.SpanModification = exports.IndentDocCommentScope = void 0;
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const IndentedWriter_1 = require("../generators/IndentedWriter");
var IndentDocCommentState;
(function (IndentDocCommentState) {
    /**
     * `indentDocComment` was not requested for this subtree.
     */
    IndentDocCommentState[IndentDocCommentState["Inactive"] = 0] = "Inactive";
    /**
     * `indentDocComment` was requested and we are looking for the opening `/` `*`
     */
    IndentDocCommentState[IndentDocCommentState["AwaitingOpenDelimiter"] = 1] = "AwaitingOpenDelimiter";
    /**
     * `indentDocComment` was requested and we are looking for the closing `*` `/`
     */
    IndentDocCommentState[IndentDocCommentState["AwaitingCloseDelimiter"] = 2] = "AwaitingCloseDelimiter";
    /**
     * `indentDocComment` was requested and we have finished indenting the comment.
     */
    IndentDocCommentState[IndentDocCommentState["Done"] = 3] = "Done";
})(IndentDocCommentState || (IndentDocCommentState = {}));
/**
 * Choices for SpanModification.indentDocComment.
 */
var IndentDocCommentScope;
(function (IndentDocCommentScope) {
    /**
     * Do not detect and indent comments.
     */
    IndentDocCommentScope[IndentDocCommentScope["None"] = 0] = "None";
    /**
     * Look for one doc comment in the {@link Span.prefix} text only.
     */
    IndentDocCommentScope[IndentDocCommentScope["PrefixOnly"] = 1] = "PrefixOnly";
    /**
     * Look for one doc comment potentially distributed across the Span and its children.
     */
    IndentDocCommentScope[IndentDocCommentScope["SpanAndChildren"] = 2] = "SpanAndChildren";
})(IndentDocCommentScope || (exports.IndentDocCommentScope = IndentDocCommentScope = {}));
/**
 * Specifies various transformations that will be performed by Span.getModifiedText().
 */
class SpanModification {
    constructor(span) {
        /**
         * If true, all of the child spans will be omitted from the Span.getModifiedText() output.
         * @remarks
         * Also, the modify() operation will not recurse into these spans.
         */
        this.omitChildren = false;
        /**
         * If true, then the Span.separator will be removed from the Span.getModifiedText() output.
         */
        this.omitSeparatorAfter = false;
        /**
         * If true, then Span.getModifiedText() will sort the immediate children according to their Span.sortKey
         * property.  The separators will also be fixed up to ensure correct indentation.  If the Span.sortKey is undefined
         * for some items, those items will not be moved, i.e. their array indexes will be unchanged.
         */
        this.sortChildren = false;
        /**
         * Optionally configures getModifiedText() to search for a "/*" doc comment and indent it.
         * At most one comment is detected.
         *
         * @remarks
         * The indentation can be applied to the `Span.modifier.prefix` only, or it can be applied to the
         * full subtree of nodes (as needed for `ts.SyntaxKind.JSDocComment` trees).  However the enabled
         * scopes must not overlap.
         *
         * This feature is enabled selectively because (1) we do not want to accidentally match `/*` appearing
         * in a string literal or other expression that is not a comment, and (2) parsing comments is relatively
         * expensive.
         */
        this.indentDocComment = IndentDocCommentScope.None;
        this._span = span;
        this.reset();
    }
    /**
     * Allows the Span.prefix text to be changed.
     */
    get prefix() {
        return this._prefix !== undefined ? this._prefix : this._span.prefix;
    }
    set prefix(value) {
        this._prefix = value;
    }
    /**
     * Allows the Span.suffix text to be changed.
     */
    get suffix() {
        return this._suffix !== undefined ? this._suffix : this._span.suffix;
    }
    set suffix(value) {
        this._suffix = value;
    }
    /**
     * Reverts any modifications made to this object.
     */
    reset() {
        this.omitChildren = false;
        this.omitSeparatorAfter = false;
        this.sortChildren = false;
        this.sortKey = undefined;
        this._prefix = undefined;
        this._suffix = undefined;
        if (this._span.kind === ts.SyntaxKind.JSDocComment) {
            this.indentDocComment = IndentDocCommentScope.SpanAndChildren;
        }
    }
    /**
     * Effectively deletes the Span from the tree, by skipping its children, skipping its separator,
     * and setting its prefix/suffix to the empty string.
     */
    skipAll() {
        this.prefix = '';
        this.suffix = '';
        this.omitChildren = true;
        this.omitSeparatorAfter = true;
    }
}
exports.SpanModification = SpanModification;
/**
 * The Span class provides a simple way to rewrite TypeScript source files
 * based on simple syntax transformations, i.e. without having to process deeper aspects
 * of the underlying grammar.  An example transformation might be deleting JSDoc comments
 * from a source file.
 *
 * @remarks
 * TypeScript's abstract syntax tree (AST) is represented using Node objects.
 * The Node text ignores its surrounding whitespace, and does not have an ordering guarantee.
 * For example, a JSDocComment node can be a child of a FunctionDeclaration node, even though
 * the actual comment precedes the function in the input stream.
 *
 * The Span class is a wrapper for a single Node, that provides access to every character
 * in the input stream, such that Span.getText() will exactly reproduce the corresponding
 * full Node.getText() output.
 *
 * A Span is comprised of these parts, which appear in sequential order:
 * - A prefix
 * - A collection of child spans
 * - A suffix
 * - A separator (e.g. whitespace between this span and the next item in the tree)
 *
 * These parts can be modified via Span.modification.  The modification is applied by
 * calling Span.getModifiedText().
 */
class Span {
    constructor(node) {
        this.node = node;
        this.startIndex = node.kind === ts.SyntaxKind.SourceFile ? node.getFullStart() : node.getStart();
        this.endIndex = node.end;
        this._separatorStartIndex = 0;
        this._separatorEndIndex = 0;
        this.children = [];
        this.modification = new SpanModification(this);
        let previousChildSpan = undefined;
        for (const childNode of this.node.getChildren() || []) {
            const childSpan = new Span(childNode);
            childSpan._parent = this;
            childSpan._previousSibling = previousChildSpan;
            if (previousChildSpan) {
                previousChildSpan._nextSibling = childSpan;
            }
            this.children.push(childSpan);
            // Normalize the bounds so that a child is never outside its parent
            if (childSpan.startIndex < this.startIndex) {
                this.startIndex = childSpan.startIndex;
            }
            if (childSpan.endIndex > this.endIndex) {
                // This has never been observed empirically, but here's how we would handle it
                this.endIndex = childSpan.endIndex;
                throw new node_core_library_1.InternalError('Unexpected AST case');
            }
            if (previousChildSpan) {
                if (previousChildSpan.endIndex < childSpan.startIndex) {
                    // There is some leftover text after previous child -- assign it as the separator for
                    // the preceding span.  If the preceding span has no suffix, then assign it to the
                    // deepest preceding span with no suffix.  This heuristic simplifies the most
                    // common transformations, and otherwise it can be fished out using getLastInnerSeparator().
                    let separatorRecipient = previousChildSpan;
                    while (separatorRecipient.children.length > 0) {
                        const lastChild = separatorRecipient.children[separatorRecipient.children.length - 1];
                        if (lastChild.endIndex !== separatorRecipient.endIndex) {
                            // There is a suffix, so we cannot push the separator any further down, or else
                            // it would get printed before this suffix.
                            break;
                        }
                        separatorRecipient = lastChild;
                    }
                    separatorRecipient._separatorStartIndex = previousChildSpan.endIndex;
                    separatorRecipient._separatorEndIndex = childSpan.startIndex;
                }
            }
            previousChildSpan = childSpan;
        }
    }
    get kind() {
        return this.node.kind;
    }
    /**
     * The parent Span, if any.
     * NOTE: This will be undefined for a root Span, even though the corresponding Node
     * may have a parent in the AST.
     */
    get parent() {
        return this._parent;
    }
    /**
     * If the current object is this.parent.children[i], then previousSibling corresponds
     * to this.parent.children[i-1] if it exists.
     * NOTE: This will be undefined for a root Span, even though the corresponding Node
     * may have a previous sibling in the AST.
     */
    get previousSibling() {
        return this._previousSibling;
    }
    /**
     * If the current object is this.parent.children[i], then previousSibling corresponds
     * to this.parent.children[i+1] if it exists.
     * NOTE: This will be undefined for a root Span, even though the corresponding Node
     * may have a previous sibling in the AST.
     */
    get nextSibling() {
        return this._nextSibling;
    }
    /**
     * The text associated with the underlying Node, up to its first child.
     */
    get prefix() {
        if (this.children.length) {
            // Everything up to the first child
            return this._getSubstring(this.startIndex, this.children[0].startIndex);
        }
        else {
            return this._getSubstring(this.startIndex, this.endIndex);
        }
    }
    /**
     * The text associated with the underlying Node, after its last child.
     * If there are no children, this is always an empty string.
     */
    get suffix() {
        if (this.children.length) {
            // Everything after the last child
            return this._getSubstring(this.children[this.children.length - 1].endIndex, this.endIndex);
        }
        else {
            return '';
        }
    }
    /**
     * Whitespace that appeared after this node, and before the "next" node in the tree.
     * Here we mean "next" according to an inorder traversal, not necessarily a sibling.
     */
    get separator() {
        return this._getSubstring(this._separatorStartIndex, this._separatorEndIndex);
    }
    /**
     * Returns the separator of this Span, or else recursively calls getLastInnerSeparator()
     * on the last child.
     */
    getLastInnerSeparator() {
        if (this.separator) {
            return this.separator;
        }
        if (this.children.length > 0) {
            return this.children[this.children.length - 1].getLastInnerSeparator();
        }
        return '';
    }
    /**
     * Returns the first parent node with the specified  SyntaxKind, or undefined if there is no match.
     */
    findFirstParent(kindToMatch) {
        let current = this;
        while (current) {
            if (current.kind === kindToMatch) {
                return current;
            }
            current = current.parent;
        }
        return undefined;
    }
    /**
     * Recursively invokes the callback on this Span and all its children.  The callback
     * can make changes to Span.modification for each node.
     */
    forEach(callback) {
        callback(this);
        for (const child of this.children) {
            child.forEach(callback);
        }
    }
    /**
     * Returns the original unmodified text represented by this Span.
     */
    getText() {
        let result = '';
        result += this.prefix;
        for (const child of this.children) {
            result += child.getText();
        }
        result += this.suffix;
        result += this.separator;
        return result;
    }
    /**
     * Returns the text represented by this Span, after applying all requested modifications.
     */
    getModifiedText() {
        const writer = new IndentedWriter_1.IndentedWriter();
        writer.trimLeadingSpaces = true;
        this._writeModifiedText({
            writer: writer,
            separatorOverride: undefined,
            indentDocCommentState: IndentDocCommentState.Inactive
        });
        return writer.getText();
    }
    writeModifiedText(output) {
        this._writeModifiedText({
            writer: output,
            separatorOverride: undefined,
            indentDocCommentState: IndentDocCommentState.Inactive
        });
    }
    /**
     * Returns a diagnostic dump of the tree, showing the prefix/suffix/separator for
     * each node.
     */
    getDump(indent = '') {
        let result = indent + ts.SyntaxKind[this.node.kind] + ': ';
        if (this.prefix) {
            result += ' pre=[' + this._getTrimmed(this.prefix) + ']';
        }
        if (this.suffix) {
            result += ' suf=[' + this._getTrimmed(this.suffix) + ']';
        }
        if (this.separator) {
            result += ' sep=[' + this._getTrimmed(this.separator) + ']';
        }
        result += '\n';
        for (const child of this.children) {
            result += child.getDump(indent + '  ');
        }
        return result;
    }
    /**
     * Returns a diagnostic dump of the tree, showing the SpanModification settings for each nodde.
     */
    getModifiedDump(indent = '') {
        let result = indent + ts.SyntaxKind[this.node.kind] + ': ';
        if (this.prefix) {
            result += ' pre=[' + this._getTrimmed(this.modification.prefix) + ']';
        }
        if (this.suffix) {
            result += ' suf=[' + this._getTrimmed(this.modification.suffix) + ']';
        }
        if (this.separator) {
            result += ' sep=[' + this._getTrimmed(this.separator) + ']';
        }
        if (this.modification.indentDocComment !== IndentDocCommentScope.None) {
            result += ' indentDocComment=' + IndentDocCommentScope[this.modification.indentDocComment];
        }
        if (this.modification.omitChildren) {
            result += ' omitChildren';
        }
        if (this.modification.omitSeparatorAfter) {
            result += ' omitSeparatorAfter';
        }
        if (this.modification.sortChildren) {
            result += ' sortChildren';
        }
        if (this.modification.sortKey !== undefined) {
            result += ` sortKey="${this.modification.sortKey}"`;
        }
        result += '\n';
        if (!this.modification.omitChildren) {
            for (const child of this.children) {
                result += child.getModifiedDump(indent + '  ');
            }
        }
        else {
            result += `${indent}  (${this.children.length} children)\n`;
        }
        return result;
    }
    /**
     * Recursive implementation of `getModifiedText()` and `writeModifiedText()`.
     */
    _writeModifiedText(options) {
        // Apply indentation based on "{" and "}"
        if (this.prefix === '{') {
            options.writer.increaseIndent();
        }
        else if (this.prefix === '}') {
            options.writer.decreaseIndent();
        }
        if (this.modification.indentDocComment !== IndentDocCommentScope.None) {
            this._beginIndentDocComment(options);
        }
        this._write(this.modification.prefix, options);
        if (this.modification.indentDocComment === IndentDocCommentScope.PrefixOnly) {
            this._endIndentDocComment(options);
        }
        let sortedSubset;
        if (!this.modification.omitChildren) {
            if (this.modification.sortChildren) {
                // We will only sort the items with a sortKey
                const filtered = this.children.filter((x) => x.modification.sortKey !== undefined);
                // Is there at least one of them?
                if (filtered.length > 1) {
                    sortedSubset = filtered;
                }
            }
        }
        if (sortedSubset) {
            // This is the complicated special case that sorts an arbitrary subset of the child nodes,
            // preserving the surrounding nodes.
            const sortedSubsetCount = sortedSubset.length;
            // Remember the separator for the first and last ones
            const firstSeparator = sortedSubset[0].getLastInnerSeparator();
            const lastSeparator = sortedSubset[sortedSubsetCount - 1].getLastInnerSeparator();
            node_core_library_1.Sort.sortBy(sortedSubset, (x) => x.modification.sortKey);
            const childOptions = { ...options };
            let sortedSubsetIndex = 0;
            for (let index = 0; index < this.children.length; ++index) {
                let current;
                // Is this an item that we sorted?
                if (this.children[index].modification.sortKey === undefined) {
                    // No, take the next item from the original array
                    current = this.children[index];
                    childOptions.separatorOverride = undefined;
                }
                else {
                    // Yes, take the next item from the sortedSubset
                    current = sortedSubset[sortedSubsetIndex++];
                    if (sortedSubsetIndex < sortedSubsetCount) {
                        childOptions.separatorOverride = firstSeparator;
                    }
                    else {
                        childOptions.separatorOverride = lastSeparator;
                    }
                }
                current._writeModifiedText(childOptions);
            }
        }
        else {
            // This is the normal case that does not need to sort children
            const childrenLength = this.children.length;
            if (!this.modification.omitChildren) {
                if (options.separatorOverride !== undefined) {
                    // Special case where the separatorOverride is passed down to the "last inner separator" span
                    for (let i = 0; i < childrenLength; ++i) {
                        const child = this.children[i];
                        if (
                        // Only the last child inherits the separatorOverride, because only it can contain
                        // the "last inner separator" span
                        i < childrenLength - 1 ||
                            // If this.separator is specified, then we will write separatorOverride below, so don't pass it along
                            this.separator) {
                            const childOptions = { ...options };
                            childOptions.separatorOverride = undefined;
                            child._writeModifiedText(childOptions);
                        }
                        else {
                            child._writeModifiedText(options);
                        }
                    }
                }
                else {
                    // The normal simple case
                    for (const child of this.children) {
                        child._writeModifiedText(options);
                    }
                }
            }
            this._write(this.modification.suffix, options);
            if (options.separatorOverride !== undefined) {
                if (this.separator || childrenLength === 0) {
                    this._write(options.separatorOverride, options);
                }
            }
            else {
                if (!this.modification.omitSeparatorAfter) {
                    this._write(this.separator, options);
                }
            }
        }
        if (this.modification.indentDocComment === IndentDocCommentScope.SpanAndChildren) {
            this._endIndentDocComment(options);
        }
    }
    _beginIndentDocComment(options) {
        if (options.indentDocCommentState !== IndentDocCommentState.Inactive) {
            throw new node_core_library_1.InternalError('indentDocComment cannot be nested');
        }
        options.indentDocCommentState = IndentDocCommentState.AwaitingOpenDelimiter;
    }
    _endIndentDocComment(options) {
        if (options.indentDocCommentState === IndentDocCommentState.AwaitingCloseDelimiter) {
            throw new node_core_library_1.InternalError('missing "*/" delimiter for comment block');
        }
        options.indentDocCommentState = IndentDocCommentState.Inactive;
    }
    /**
     * Writes one chunk of `text` to the `options.writer`, applying the `indentDocComment` rewriting.
     */
    _write(text, options) {
        let parsedText = text;
        if (options.indentDocCommentState === IndentDocCommentState.AwaitingOpenDelimiter) {
            let index = parsedText.indexOf('/*');
            if (index >= 0) {
                index += '/*'.length;
                options.writer.write(parsedText.substring(0, index));
                parsedText = parsedText.substring(index);
                options.indentDocCommentState = IndentDocCommentState.AwaitingCloseDelimiter;
                options.writer.increaseIndent(' ');
            }
        }
        if (options.indentDocCommentState === IndentDocCommentState.AwaitingCloseDelimiter) {
            let index = parsedText.indexOf('*/');
            if (index >= 0) {
                index += '*/'.length;
                options.writer.write(parsedText.substring(0, index));
                parsedText = parsedText.substring(index);
                options.indentDocCommentState = IndentDocCommentState.Done;
                options.writer.decreaseIndent();
            }
        }
        options.writer.write(parsedText);
    }
    _getTrimmed(text) {
        return node_core_library_1.Text.truncateWithEllipsis(node_core_library_1.Text.convertToLf(text), 100);
    }
    _getSubstring(startIndex, endIndex) {
        if (startIndex === endIndex) {
            return '';
        }
        return this.node.getSourceFile().text.substring(startIndex, endIndex);
    }
}
exports.Span = Span;
//# sourceMappingURL=Span.js.map