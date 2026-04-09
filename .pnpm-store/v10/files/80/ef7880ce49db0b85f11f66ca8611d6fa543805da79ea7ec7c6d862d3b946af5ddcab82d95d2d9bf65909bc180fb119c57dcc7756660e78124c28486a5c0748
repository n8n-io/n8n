"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocMemberSymbol = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * Represents a reference to an ECMAScript 6 symbol that is used
 * to identify a member declaration.
 *
 * @example
 *
 * In the declaration reference `{@link MyClass.([MySymbols.example]:instance)}`,
 * the member symbol `[MySymbols.example]` might be used to reference a property
 * of the class.
 */
class DocMemberSymbol extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._leftBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.DocMemberSymbol_LeftBracket,
                content: parameters.leftBracketExcerpt
            });
            if (parameters.spacingAfterLeftBracketExcerpt) {
                this._spacingAfterLeftBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterLeftBracketExcerpt
                });
            }
            this._rightBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.DocMemberSymbol_RightBracket,
                content: parameters.rightBracketExcerpt
            });
        }
        this._symbolReference = parameters.symbolReference;
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.MemberSymbol;
    }
    /**
     * The declaration reference for the ECMAScript 6 symbol that will act as
     * the identifier for the member.
     */
    get symbolReference() {
        return this._symbolReference;
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._leftBracketExcerpt,
            this._spacingAfterLeftBracketExcerpt,
            this._symbolReference,
            this._rightBracketExcerpt
        ];
    }
}
exports.DocMemberSymbol = DocMemberSymbol;
//# sourceMappingURL=DocMemberSymbol.js.map