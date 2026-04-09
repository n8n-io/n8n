// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * The style of escaping to be used with DocEscapedText.
 */
export var EscapeStyle;
(function (EscapeStyle) {
    /**
     * Use a backslash symbol to escape the character.
     */
    EscapeStyle[EscapeStyle["CommonMarkBackslash"] = 0] = "CommonMarkBackslash";
})(EscapeStyle || (EscapeStyle = {}));
/**
 * Represents a text character that should be escaped as a TSDoc symbol.
 * @remarks
 * Note that renders will normally apply appropriate escaping when rendering
 * DocPlainText in a format such as HTML or TSDoc.  The DocEscapedText node
 * forces a specific escaping that may not be the default.
 */
export class DocEscapedText extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._escapeStyle = parameters.escapeStyle;
        this._encodedTextExcerpt = new DocExcerpt({
            configuration: this.configuration,
            excerptKind: ExcerptKind.EscapedText,
            content: parameters.encodedTextExcerpt
        });
        this._decodedText = parameters.decodedText;
    }
    /** @override */
    get kind() {
        return DocNodeKind.EscapedText;
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
//# sourceMappingURL=DocEscapedText.js.map