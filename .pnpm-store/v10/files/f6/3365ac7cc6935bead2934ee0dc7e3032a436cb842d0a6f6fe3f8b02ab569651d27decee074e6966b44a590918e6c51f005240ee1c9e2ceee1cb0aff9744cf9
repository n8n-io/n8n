// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocParagraph, DocNodeKind, DocPlainText } from '../nodes';
/**
 * Implementation of DocNodeTransforms.trimSpacesInParagraphNodes()
 */
var TrimSpacesTransform = /** @class */ (function () {
    function TrimSpacesTransform() {
    }
    TrimSpacesTransform.transform = function (docParagraph) {
        var transformedNodes = [];
        // Whether the next nonempty node to be added needs a space before it
        var pendingSpace = false;
        // The DocPlainText node that we're currently accumulating
        var accumulatedTextChunks = [];
        var accumulatedNodes = [];
        // We always trim leading whitespace for a paragraph.  This flag gets set to true
        // as soon as nonempty content is encountered.
        var finishedSkippingLeadingSpaces = false;
        for (var _i = 0, _a = docParagraph.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            switch (node.kind) {
                case DocNodeKind.PlainText:
                    var docPlainText = node;
                    var text = docPlainText.text;
                    var startedWithSpace = /^\s/.test(text);
                    var endedWithSpace = /\s$/.test(text);
                    var collapsedText = text.replace(/\s+/g, ' ').trim();
                    if (startedWithSpace && finishedSkippingLeadingSpaces) {
                        pendingSpace = true;
                    }
                    if (collapsedText.length > 0) {
                        if (pendingSpace) {
                            accumulatedTextChunks.push(' ');
                            pendingSpace = false;
                        }
                        accumulatedTextChunks.push(collapsedText);
                        accumulatedNodes.push(node);
                        finishedSkippingLeadingSpaces = true;
                    }
                    if (endedWithSpace && finishedSkippingLeadingSpaces) {
                        pendingSpace = true;
                    }
                    break;
                case DocNodeKind.SoftBreak:
                    if (finishedSkippingLeadingSpaces) {
                        pendingSpace = true;
                    }
                    accumulatedNodes.push(node);
                    break;
                default:
                    if (pendingSpace) {
                        accumulatedTextChunks.push(' ');
                        pendingSpace = false;
                    }
                    // Push the accumulated text
                    if (accumulatedTextChunks.length > 0) {
                        // TODO: We should probably track the accumulatedNodes somehow, e.g. so we can map them back to the
                        // original excerpts.  But we need a developer scenario before we can design this API.
                        transformedNodes.push(new DocPlainText({
                            configuration: docParagraph.configuration,
                            text: accumulatedTextChunks.join('')
                        }));
                        accumulatedTextChunks.length = 0;
                        accumulatedNodes.length = 0;
                    }
                    transformedNodes.push(node);
                    finishedSkippingLeadingSpaces = true;
            }
        }
        // Push the accumulated text
        if (accumulatedTextChunks.length > 0) {
            transformedNodes.push(new DocPlainText({
                configuration: docParagraph.configuration,
                text: accumulatedTextChunks.join('')
            }));
            accumulatedTextChunks.length = 0;
            accumulatedNodes.length = 0;
        }
        var transformedParagraph = new DocParagraph({
            configuration: docParagraph.configuration
        });
        transformedParagraph.appendNodes(transformedNodes);
        return transformedParagraph;
    };
    return TrimSpacesTransform;
}());
export { TrimSpacesTransform };
//# sourceMappingURL=TrimSpacesTransform.js.map