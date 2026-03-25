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
import { DocParagraph } from './DocParagraph';
import { DocNodeContainer } from './DocNodeContainer';
/**
 * Represents a general block of rich text.
 */
var DocSection = /** @class */ (function (_super) {
    __extends(DocSection, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocSection(parameters, childNodes) {
        return _super.call(this, parameters, childNodes) || this;
    }
    Object.defineProperty(DocSection.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.Section;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * If the last item in DocSection.nodes is not a DocParagraph, a new paragraph
     * is started.  Either way, the provided docNode will be appended to the paragraph.
     */
    DocSection.prototype.appendNodeInParagraph = function (docNode) {
        var paragraphNode = undefined;
        if (this.nodes.length > 0) {
            var lastNode = this.nodes[this.nodes.length - 1];
            if (lastNode.kind === DocNodeKind.Paragraph) {
                paragraphNode = lastNode;
            }
        }
        if (!paragraphNode) {
            paragraphNode = new DocParagraph({ configuration: this.configuration });
            this.appendNode(paragraphNode);
        }
        paragraphNode.appendNode(docNode);
    };
    DocSection.prototype.appendNodesInParagraph = function (docNodes) {
        for (var _i = 0, docNodes_1 = docNodes; _i < docNodes_1.length; _i++) {
            var docNode = docNodes_1[_i];
            this.appendNodeInParagraph(docNode);
        }
    };
    return DocSection;
}(DocNodeContainer));
export { DocSection };
//# sourceMappingURL=DocSection.js.map