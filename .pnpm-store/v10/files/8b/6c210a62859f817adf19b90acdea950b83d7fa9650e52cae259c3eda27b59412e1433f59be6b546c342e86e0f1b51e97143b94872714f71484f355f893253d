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
import { DocNode, DocNodeKind } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * A {@link DocDeclarationReference | declaration reference} includes a chain of
 * member references represented using `DocMemberReference` nodes.
 *
 * @remarks
 * For example, `example-library#ui.controls.Button.(render:static)` is a
 * declaration reference that contains three member references:
 * `ui`, `.controls`, and `.Button`, and `.(render:static)`.
 */
var DocMemberReference = /** @class */ (function (_super) {
    __extends(DocMemberReference, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocMemberReference(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            _this._hasDot = !!parameters.dotExcerpt;
            if (parameters.dotExcerpt) {
                _this._dotExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.MemberReference_Dot,
                    content: parameters.dotExcerpt
                });
            }
            if (parameters.spacingAfterDotExcerpt) {
                _this._spacingAfterDotExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterDotExcerpt
                });
            }
            if (parameters.leftParenthesisExcerpt) {
                _this._leftParenthesisExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.MemberReference_LeftParenthesis,
                    content: parameters.leftParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterLeftParenthesisExcerpt) {
                _this._spacingAfterLeftParenthesisExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterLeftParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterMemberExcerpt) {
                _this._spacingAfterMemberExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterMemberExcerpt
                });
            }
            if (parameters.colonExcerpt) {
                _this._colonExcerpt = new DocExcerpt({
                    excerptKind: ExcerptKind.MemberReference_Colon,
                    configuration: _this.configuration,
                    content: parameters.colonExcerpt
                });
            }
            if (parameters.spacingAfterColonExcerpt) {
                _this._spacingAfterColonExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterColonExcerpt
                });
            }
            if (parameters.spacingAfterSelectorExcerpt) {
                _this._spacingAfterSelectorExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterSelectorExcerpt
                });
            }
            if (parameters.rightParenthesisExcerpt) {
                _this._rightParenthesisExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.MemberReference_RightParenthesis,
                    content: parameters.rightParenthesisExcerpt
                });
            }
            if (parameters.spacingAfterRightParenthesisExcerpt) {
                _this._spacingAfterRightParenthesisExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterRightParenthesisExcerpt
                });
            }
        }
        else {
            _this._hasDot = parameters.hasDot;
        }
        _this._memberIdentifier = parameters.memberIdentifier;
        _this._memberSymbol = parameters.memberSymbol;
        _this._selector = parameters.selector;
        return _this;
    }
    Object.defineProperty(DocMemberReference.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.MemberReference;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberReference.prototype, "hasDot", {
        /**
         * True if this member reference is preceded by a dot (".") token.
         * It should be false only for the first member in the chain.
         */
        get: function () {
            return this._hasDot;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberReference.prototype, "memberIdentifier", {
        /**
         * The identifier for the referenced member.
         * @remarks
         * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
         */
        get: function () {
            return this._memberIdentifier;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberReference.prototype, "memberSymbol", {
        /**
         * The ECMAScript 6 symbol expression, which may be used instead of an identifier
         * to indicate the referenced member.
         * @remarks
         * Either `memberIdentifier` or `memberSymbol` may be specified, but not both.
         */
        get: function () {
            return this._memberSymbol;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberReference.prototype, "selector", {
        /**
         * A TSDoc selector, which may be optionally when the identifier or symbol is insufficient
         * to unambiguously determine the referenced declaration.
         */
        get: function () {
            return this._selector;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocMemberReference.prototype.onGetChildNodes = function () {
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
    };
    return DocMemberReference;
}(DocNode));
export { DocMemberReference };
//# sourceMappingURL=DocMemberReference.js.map