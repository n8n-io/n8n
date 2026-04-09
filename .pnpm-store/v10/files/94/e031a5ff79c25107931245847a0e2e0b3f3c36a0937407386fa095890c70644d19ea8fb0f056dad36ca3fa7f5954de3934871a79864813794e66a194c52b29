"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrimSpacesTransform = void 0;
const nodes_1 = require("../nodes");
/**
 * Implementation of DocNodeTransforms.trimSpacesInParagraphNodes()
 */
class TrimSpacesTransform {
    static transform(docParagraph) {
        const transformedNodes = [];
        // Whether the next nonempty node to be added needs a space before it
        let pendingSpace = false;
        // The DocPlainText node that we're currently accumulating
        const accumulatedTextChunks = [];
        const accumulatedNodes = [];
        // We always trim leading whitespace for a paragraph.  This flag gets set to true
        // as soon as nonempty content is encountered.
        let finishedSkippingLeadingSpaces = false;
        for (const node of docParagraph.nodes) {
            switch (node.kind) {
                case nodes_1.DocNodeKind.PlainText:
                    const docPlainText = node;
                    const text = docPlainText.text;
                    const startedWithSpace = /^\s/.test(text);
                    const endedWithSpace = /\s$/.test(text);
                    const collapsedText = text.replace(/\s+/g, ' ').trim();
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
                case nodes_1.DocNodeKind.SoftBreak:
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
                        transformedNodes.push(new nodes_1.DocPlainText({
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
            transformedNodes.push(new nodes_1.DocPlainText({
                configuration: docParagraph.configuration,
                text: accumulatedTextChunks.join('')
            }));
            accumulatedTextChunks.length = 0;
            accumulatedNodes.length = 0;
        }
        const transformedParagraph = new nodes_1.DocParagraph({
            configuration: docParagraph.configuration
        });
        transformedParagraph.appendNodes(transformedNodes);
        return transformedParagraph;
    }
}
exports.TrimSpacesTransform = TrimSpacesTransform;
//# sourceMappingURL=TrimSpacesTransform.js.map