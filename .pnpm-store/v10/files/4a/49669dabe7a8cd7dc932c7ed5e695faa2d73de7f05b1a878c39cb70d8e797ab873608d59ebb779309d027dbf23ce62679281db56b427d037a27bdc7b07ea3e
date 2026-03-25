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
import { DocNodeKind } from './DocNode';
import { DocInlineTagBase } from './DocInlineTagBase';
/**
 * Represents an `{@inheritDoc}` tag.
 */
var DocInheritDocTag = /** @class */ (function (_super) {
    __extends(DocInheritDocTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocInheritDocTag(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (_this.tagNameWithUpperCase !== '@INHERITDOC') {
            throw new Error('DocInheritDocTag requires the tag name to be "{@inheritDoc}"');
        }
        _this._declarationReference = parameters.declarationReference;
        return _this;
    }
    Object.defineProperty(DocInheritDocTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.InheritDocTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocInheritDocTag.prototype, "declarationReference", {
        /**
         * The declaration that the documentation will be inherited from.
         * If omitted, the documentation will be inherited from the parent class.
         */
        get: function () {
            return this._declarationReference;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocInheritDocTag.prototype.getChildNodesForContent = function () {
        // abstract
        return [this._declarationReference];
    };
    return DocInheritDocTag;
}(DocInlineTagBase));
export { DocInheritDocTag };
//# sourceMappingURL=DocInheritDocTag.js.map