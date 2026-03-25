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
 * Represents a TSDoc block tag such as `@param` or `@public`.
 */
var DocBlockTag = /** @class */ (function (_super) {
    __extends(DocBlockTag, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocBlockTag(parameters) {
        var _this = _super.call(this, parameters) || this;
        StringChecks.validateTSDocTagName(parameters.tagName);
        _this._tagName = parameters.tagName;
        _this._tagNameWithUpperCase = parameters.tagName.toUpperCase();
        if (DocNode.isParsedParameters(parameters)) {
            _this._tagNameExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.BlockTag,
                content: parameters.tagNameExcerpt
            });
        }
        return _this;
    }
    Object.defineProperty(DocBlockTag.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.BlockTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocBlockTag.prototype, "tagName", {
        /**
         * The TSDoc tag name.  TSDoc tag names start with an at-sign (`@`) followed
         * by ASCII letters using "camelCase" capitalization.
         */
        get: function () {
            return this._tagName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocBlockTag.prototype, "tagNameWithUpperCase", {
        /**
         * The TSDoc tag name in all capitals, which is used for performing
         * case-insensitive comparisons or lookups.
         */
        get: function () {
            return this._tagNameWithUpperCase;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocBlockTag.prototype.onGetChildNodes = function () {
        return [this._tagNameExcerpt];
    };
    DocBlockTag.prototype.getTokenSequence = function () {
        if (!this._tagNameExcerpt) {
            throw new Error('DocBlockTag.getTokenSequence() failed because this object did not originate from a parsed input');
        }
        return this._tagNameExcerpt.content;
    };
    return DocBlockTag;
}(DocNode));
export { DocBlockTag };
//# sourceMappingURL=DocBlockTag.js.map