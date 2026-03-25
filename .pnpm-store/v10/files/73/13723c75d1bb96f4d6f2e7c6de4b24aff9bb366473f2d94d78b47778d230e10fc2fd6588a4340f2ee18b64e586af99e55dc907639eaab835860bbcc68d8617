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
exports.DocParagraph = void 0;
var DocNode_1 = require("./DocNode");
var DocNodeContainer_1 = require("./DocNodeContainer");
/**
 * Represents a paragraph of text, similar to a `<p>` element in HTML.
 * Like CommonMark, the TSDoc syntax uses blank lines to delineate paragraphs
 * instead of explicitly notating them.
 */
var DocParagraph = /** @class */ (function (_super) {
    __extends(DocParagraph, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocParagraph(parameters, childNodes) {
        return _super.call(this, parameters, childNodes) || this;
    }
    Object.defineProperty(DocParagraph.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.Paragraph;
        },
        enumerable: false,
        configurable: true
    });
    return DocParagraph;
}(DocNodeContainer_1.DocNodeContainer));
exports.DocParagraph = DocParagraph;
//# sourceMappingURL=DocParagraph.js.map