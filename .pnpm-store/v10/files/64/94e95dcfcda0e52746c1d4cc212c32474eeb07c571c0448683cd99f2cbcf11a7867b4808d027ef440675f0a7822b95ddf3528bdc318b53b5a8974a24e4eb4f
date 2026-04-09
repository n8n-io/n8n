// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents a span of comment text that is considered by the parser
 * to contain no special symbols or meaning.
 *
 * @remarks
 * The text content must not contain newline characters.
 * Use DocSoftBreak to represent manual line splitting.
 */
export class DocPlainText extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            this._textExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.PlainText,
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
        return DocNodeKind.PlainText;
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
// TODO: We should also prohibit "\r", but this requires updating LineExtractor
// to interpret a lone "\r" as a newline
DocPlainText._newlineCharacterRegExp = /[\n]/;
//# sourceMappingURL=DocPlainText.js.map