// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
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
export class DocMemberSymbol extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            this._leftBracketExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.DocMemberSymbol_LeftBracket,
                content: parameters.leftBracketExcerpt
            });
            if (parameters.spacingAfterLeftBracketExcerpt) {
                this._spacingAfterLeftBracketExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterLeftBracketExcerpt
                });
            }
            this._rightBracketExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.DocMemberSymbol_RightBracket,
                content: parameters.rightBracketExcerpt
            });
        }
        this._symbolReference = parameters.symbolReference;
    }
    /** @override */
    get kind() {
        return DocNodeKind.MemberSymbol;
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
//# sourceMappingURL=DocMemberSymbol.js.map