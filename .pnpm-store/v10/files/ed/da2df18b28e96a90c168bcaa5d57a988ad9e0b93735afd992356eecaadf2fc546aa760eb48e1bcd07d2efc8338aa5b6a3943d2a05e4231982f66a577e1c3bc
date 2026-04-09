// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents CommonMark-style code span, i.e. code surrounded by
 * backtick characters.
 */
export class DocCodeSpan extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.CodeSpan_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._codeExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.CodeSpan_Code,
                content: parameters.codeExcerpt
            });
            this._closingDelimiterExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.CodeSpan_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            this._code = parameters.code;
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.CodeSpan;
    }
    /**
     * The text that should be rendered as code, excluding the backtick delimiters.
     */
    get code() {
        if (this._code === undefined) {
            this._code = this._codeExcerpt.content.toString();
        }
        return this._code;
    }
    /** @override */
    onGetChildNodes() {
        return [this._openingDelimiterExcerpt, this._codeExcerpt, this._closingDelimiterExcerpt];
    }
}
//# sourceMappingURL=DocCodeSpan.js.map