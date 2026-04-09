"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocCodeSpan = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents CommonMark-style code span, i.e. code surrounded by
 * backtick characters.
 */
class DocCodeSpan extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._openingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.CodeSpan_OpeningDelimiter,
                content: parameters.openingDelimiterExcerpt
            });
            this._codeExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.CodeSpan_Code,
                content: parameters.codeExcerpt
            });
            this._closingDelimiterExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.CodeSpan_ClosingDelimiter,
                content: parameters.closingDelimiterExcerpt
            });
        }
        else {
            this._code = parameters.code;
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.CodeSpan;
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
exports.DocCodeSpan = DocCodeSpan;
//# sourceMappingURL=DocCodeSpan.js.map