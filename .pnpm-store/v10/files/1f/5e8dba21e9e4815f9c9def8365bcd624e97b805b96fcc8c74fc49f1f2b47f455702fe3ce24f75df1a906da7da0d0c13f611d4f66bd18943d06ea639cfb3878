"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocMemberSymbol = void 0;
var DocNode_1 = require("./DocNode");
var DocExcerpt_1 = require("./DocExcerpt");
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
var DocMemberSymbol = /** @class */ (function (_super) {
    __extends(DocMemberSymbol, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocMemberSymbol(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            _this._leftBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.DocMemberSymbol_LeftBracket,
                content: parameters.leftBracketExcerpt
            });
            if (parameters.spacingAfterLeftBracketExcerpt) {
                _this._spacingAfterLeftBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterLeftBracketExcerpt
                });
            }
            _this._rightBracketExcerpt = new DocExcerpt_1.DocExcerpt({
                configuration: _this.configuration,
                excerptKind: DocExcerpt_1.ExcerptKind.DocMemberSymbol_RightBracket,
                content: parameters.rightBracketExcerpt
            });
        }
        _this._symbolReference = parameters.symbolReference;
        return _this;
    }
    Object.defineProperty(DocMemberSymbol.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.MemberSymbol;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberSymbol.prototype, "symbolReference", {
        /**
         * The declaration reference for the ECMAScript 6 symbol that will act as
         * the identifier for the member.
         */
        get: function () {
            return this._symbolReference;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocMemberSymbol.prototype.onGetChildNodes = function () {
        return [
            this._leftBracketExcerpt,
            this._spacingAfterLeftBracketExcerpt,
            this._symbolReference,
            this._rightBracketExcerpt
        ];
    };
    return DocMemberSymbol;
}(DocNode_1.DocNode));
exports.DocMemberSymbol = DocMemberSymbol;
//# sourceMappingURL=DocMemberSymbol.js.map