"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocMemberReference = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * A {@link DocDeclarationReference | declaration reference} includes a chain of
 * member references represented using `DocMemberReference` nodes.
 *
 * @remarks
 * For example, `example-library#ui.controls.Button.(render:static)` is a
 * declaration reference that contains three member references:
 * `ui`, `.controls`, and `.Button`, and `.(render:static)`.
 */
class DocMemberReference extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            this._hasDot = !!parameters.dotExcerpt;
            if (parameters.dotExcerpt) {
                this._dotExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberReference_Dot,
                    content: parameters.dotExcerpt
                });
            }
            if (parameters.spacingAfterDotExcerpt) {
                this._spacingAfterDotExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterDotExcerpt
                });
            }
            if (parameters.leftParenthesisExcerpt) {
                this._leftParenthesisExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberReference_LeftParenthesis,
                    content: parameters.leftParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterLeftParenthesisExcerpt) {
                this._spacingAfterLeftParenthesisExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterLeftParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterMemberExcerpt) {
                this._spacingAfterMemberExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterMemberExcerpt
                });
            }
            if (parameters.colonExcerpt) {
                this._colonExcerpt = new DocExcerpt_1.DocExcerpt({
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberReference_Colon,
                    configuration: this.configuration,
                    content: parameters.colonExcerpt
                });
            }
            if (parameters.spacingAfterColonExcerpt) {
                this._spacingAfterColonExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterColonExcerpt
                });
            }
            if (parameters.spacingAfterSelectorExcerpt) {
                this._spacingAfterSelectorExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterSelectorExcerpt
                });
            }
            if (parameters.rightParenthesisExcerpt) {
                this._rightParenthesisExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberReference_RightParenthesis,
                    content: parameters.rightParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterRightParenthesisExcerpt) {
                this._spacingAfterRightParenthesisExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterRightParenthesisExcerpt
                });
            }
        }
        else {
            this._hasDot = parameters.hasDot;
        }
        this._memberIdentifier = parameters.memberIdentifier;
        this._memberSymbol = parameters.memberSymbol;
        this._selector = parameters.selector;
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.MemberReference;
    }
    /**
     * True if this member reference is preceded by a dot (".") token.
     * It should be false only for the first member in the chain.
     */
    get hasDot() {
        return this._hasDot;
    }
    /**
     * The identifier for the referenced member.
     * @remarks
     * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
     */
    get memberIdentifier() {
        return this._memberIdentifier;
    }
    /**
     * The ECMAScript 6 symbol expression, which may be used instead of an identifier
     * to indicate the referenced member.
     * @remarks
     * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
     */
    get memberSymbol() {
        return this._memberSymbol;
    }
    /**
     * A TSDoc selector, which may be optionally when the identifier or symbol is insufficient
     * to unambiguously determine the referenced declaration.
     */
    get selector() {
        return this._selector;
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._dotExcerpt,
            this._spacingAfterDotExcerpt,
            this._leftParenthesisExcerpt,
            this._spacingAfterLeftParenthesisExcerpt,
            this._memberIdentifier,
            this._memberSymbol,
            this._spacingAfterMemberExcerpt,
            this._colonExcerpt,
            this._spacingAfterColonExcerpt,
            this._selector,
            this._spacingAfterSelectorExcerpt,
            this._rightParenthesisExcerpt,
            this._spacingAfterRightParenthesisExcerpt
        ];
    }
}
exports.DocMemberReference = DocMemberReference;
//# sourceMappingURL=DocMemberReference.js.map