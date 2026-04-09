"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocMemberIdentifier = void 0;
const DocNode_1 = require("./DocNode");
const StringChecks_1 = require("../parser/StringChecks");
const DocExcerpt_1 = require("./DocExcerpt");
/**
 * A member identifier is part of a {@link DocMemberReference}.
 */
class DocMemberIdentifier extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            if (parameters.leftQuoteExcerpt) {
                this._leftQuoteExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberIdentifier_LeftQuote,
                    content: parameters.leftQuoteExcerpt
                });
            }
            this._identifierExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.MemberIdentifier_Identifier,
                content: parameters.identifierExcerpt
            });
            if (parameters.rightQuoteExcerpt) {
                this._rightQuoteExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.MemberIdentifier_RightQuote,
                    content: parameters.rightQuoteExcerpt
                });
            }
        }
        else {
            this._identifier = parameters.identifier;
        }
    }
    /**
     * Tests whether the input string can be used without quotes as a member identifier in a declaration reference.
     * If not, {@link DocMemberIdentifier.hasQuotes} will be required.
     *
     * @remarks
     * In order to be used without quotes, the string must follow the identifier syntax for ECMAScript / TypeScript,
     * and it must not be one of the reserved words used for system selectors (such as `instance`, `static`,
     * `constructor`, etc).
     */
    static isValidIdentifier(identifier) {
        return !StringChecks_1.StringChecks.explainIfInvalidUnquotedMemberIdentifier(identifier);
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.MemberIdentifier;
    }
    /**
     * The identifier string without any quote encoding.
     *
     * @remarks
     * If the value is not a valid ECMAScript identifier, it will be quoted as a
     * string literal during rendering.
     */
    get identifier() {
        if (this._identifier === undefined) {
            this._identifier = this._identifierExcerpt.content.toString();
        }
        return this._identifier;
    }
    /**
     * Returns true if the identifier will be rendered as a quoted string literal
     * instead of as a programming language identifier.  This is required if the
     * `identifier` property is not a valid ECMAScript identifier.
     */
    get hasQuotes() {
        if (this._identifierExcerpt) {
            return !!this._leftQuoteExcerpt;
        }
        else {
            return !DocMemberIdentifier.isValidIdentifier(this.identifier);
        }
    }
    /** @override */
    onGetChildNodes() {
        return [this._leftQuoteExcerpt, this._identifierExcerpt, this._rightQuoteExcerpt];
    }
}
exports.DocMemberIdentifier = DocMemberIdentifier;
//# sourceMappingURL=DocMemberIdentifier.js.map