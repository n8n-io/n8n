"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocEscapedText = exports.EscapeStyle = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * The style of escaping to be used with DocEscapedText.
 */
var EscapeStyle;
(function (EscapeStyle) {
    /**
     * Use a backslash symbol to escape the character.
     */
    EscapeStyle[EscapeStyle["CommonMarkBackslash"] = 0] = "CommonMarkBackslash";
})(EscapeStyle || (exports.EscapeStyle = EscapeStyle = {}));
/**
 * Represents a text character that should be escaped as a TSDoc symbol.
 * @remarks
 * Note that renders will normally apply appropriate escaping when rendering
 * DocPlainText in a format such as HTML or TSDoc.  The DocEscapedText node
 * forces a specific escaping that may not be the default.
 */
class DocEscapedText extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._escapeStyle = parameters.escapeStyle;
        this._encodedTextExcerpt = new DocExcerpt_1.DocExcerpt({
            configuration: this.configuration,
            excerptKind: DocExcerpt_1.ExcerptKind.EscapedText,
            content: parameters.encodedTextExcerpt
        });
        this._decodedText = parameters.decodedText;
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.EscapedText;
    }
    /**
     * The style of escaping to be performed.
     */
    get escapeStyle() {
        return this._escapeStyle;
    }
    /**
     * The text sequence including escapes.
     */
    get encodedText() {
        if (this._encodedText === undefined) {
            this._encodedText = this._encodedTextExcerpt.content.toString();
        }
        return this._encodedText;
    }
    /**
     * The text without escaping.
     */
    get decodedText() {
        return this._decodedText;
    }
    /** @override */
    onGetChildNodes() {
        return [this._encodedTextExcerpt];
    }
}
exports.DocEscapedText = DocEscapedText;
//# sourceMappingURL=DocEscapedText.js.map