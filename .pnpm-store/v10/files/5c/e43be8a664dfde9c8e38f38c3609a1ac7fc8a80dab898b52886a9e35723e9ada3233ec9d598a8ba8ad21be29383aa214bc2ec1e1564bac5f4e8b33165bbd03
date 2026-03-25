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
import { DocSection } from './DocSection';
/**
 * Represents a section that is introduced by a TSDoc block tag.
 * For example, an `@example` block.
 */
var DocBlock = /** @class */ (function (_super) {
    __extends(DocBlock, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocBlock(parameters) {
        var _this = _super.call(this, parameters) || this;
        _this._blockTag = parameters.blockTag;
        _this._content = new DocSection({ configuration: _this.configuration });
        return _this;
    }
    Object.defineProperty(DocBlock.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.Block;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocBlock.prototype, "blockTag", {
        /**
         * The TSDoc tag that introduces this section.
         */
        get: function () {
            return this._blockTag;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocBlock.prototype, "content", {
        /**
         * The TSDoc tag that introduces this section.
         */
        get: function () {
            return this._content;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocBlock.prototype.onGetChildNodes = function () {
        return [this.blockTag, this._content];
    };
    return DocBlock;
}(DocNode));
export { DocBlock };
//# sourceMappingURL=DocBlock.js.map