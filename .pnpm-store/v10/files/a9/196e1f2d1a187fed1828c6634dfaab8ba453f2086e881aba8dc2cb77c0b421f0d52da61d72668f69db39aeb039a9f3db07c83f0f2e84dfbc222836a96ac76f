// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { DocNodeKind, DocNode } from './DocNode';
import { StringChecks } from '../parser/StringChecks';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * A member identifier is part of a {@link DocMemberReference}.
 */
var DocMemberIdentifier = /** @class */ (function (_super) {
    __extends(DocMemberIdentifier, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocMemberIdentifier(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.leftQuoteExcerpt) {
                _this._leftQuoteExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.MemberIdentifier_LeftQuote,
                    content: parameters.leftQuoteExcerpt
                });
            }
            _this._identifierExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.MemberIdentifier_Identifier,
                content: parameters.identifierExcerpt
            });
            if (parameters.rightQuoteExcerpt) {
                _this._rightQuoteExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.MemberIdentifier_RightQuote,
                    content: parameters.rightQuoteExcerpt
                });
            }
        }
        else {
            _this._identifier = parameters.identifier;
        }
        return _this;
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
    DocMemberIdentifier.isValidIdentifier = function (identifier) {
        return !StringChecks.explainIfInvalidUnquotedMemberIdentifier(identifier);
    };
    Object.defineProperty(DocMemberIdentifier.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.MemberIdentifier;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberIdentifier.prototype, "identifier", {
        /**
         * The identifier string without any quote encoding.
         *
         * @remarks
         * If the value is not a valid ECMAScript identifier, it will be quoted as a
         * string literal during rendering.
         */
        get: function () {
            if (this._identifier === undefined) {
                this._identifier = this._identifierExcerpt.content.toString();
            }
            return this._identifier;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberIdentifier.prototype, "hasQuotes", {
        /**
         * Returns true if the identifier will be rendered as a quoted string literal
         * instead of as a programming language identifier.  This is required if the
         * `identifier` property is not a valid ECMAScript identifier.
         */
        get: function () {
            if (this._identifierExcerpt) {
                return !!this._leftQuoteExcerpt;
            }
            else {
                return !DocMemberIdentifier.isValidIdentifier(this.identifier);
            }
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocMemberIdentifier.prototype.onGetChildNodes = function () {
        return [this._leftQuoteExcerpt, this._identifierExcerpt, this._rightQuoteExcerpt];
    };
    return DocMemberIdentifier;
}(DocNode));
export { DocMemberIdentifier };
//# sourceMappingURL=DocMemberIdentifier.js.map