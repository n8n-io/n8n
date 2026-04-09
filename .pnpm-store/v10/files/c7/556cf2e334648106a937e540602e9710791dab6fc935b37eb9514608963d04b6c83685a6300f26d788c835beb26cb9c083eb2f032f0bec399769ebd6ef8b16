"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocPlainText = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a span of comment text that is considered by the parser
 * to contain no special symbols or meaning.
 *
 * @remarks
 * The text content must not contain newline characters.
 * Use DocSoftBreak to represent manual line splitting.
 */
class DocPlainText extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._textExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.PlainText,
                content: parameters.textExcerpt
            });
        }
        else {
            if (DocPlainText._newlineCharacterRegExp.test(parameters.text)) {
                // Use DocSoftBreak to represent manual line splitting
                throw new Error('The DocPlainText content must not contain newline characters');
            }
            this._text = parameters.text;
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.PlainText;
    }
    /**
     * The text content.
     */
    get text() {
        if (this._text === undefined) {
            this._text = this._textExcerpt.content.toString();
        }
        return this._text;
    }
    get textExcerpt() {
        if (this._textExcerpt) {
            return this._textExcerpt.content;
        }
        else {
            return undefined;
        }
    }
    /** @override */
    onGetChildNodes() {
        return [this._textExcerpt];
    }
}
exports.DocPlainText = DocPlainText;
// TODO: We should also prohibit "\r", but this requires updating LineExtractor
// to interpret a lone "\r" as a newline
DocPlainText._newlineCharacterRegExp = /[\n]/;
//# sourceMappingURL=DocPlainText.js.map