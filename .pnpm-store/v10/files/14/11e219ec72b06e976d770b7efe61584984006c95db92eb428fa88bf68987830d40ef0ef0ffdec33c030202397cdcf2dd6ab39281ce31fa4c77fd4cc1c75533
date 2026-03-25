// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocSection, DocNodeKind, DocParagraph } from '../nodes';
/**
 * The ParagraphSplitter is a secondary stage that runs after the NodeParser has constructed
 * the DocComment.  It splits DocParagraph nodes into multiple paragraphs by looking for
 * paragraph delimiters.  Following CommonMark conventions, paragraphs are delimited by
 * one or more blank lines.  (These lines end with SoftBreak nodes.)  The blank lines are
 * not discarded.  Instead, they are attached to the preceding paragraph.  If the DocParagraph
 * starts with blank lines, they are preserved to avoid creating a paragraph containing only
 * whitespace.
 */
var ParagraphSplitter = /** @class */ (function () {
    function ParagraphSplitter() {
    }
    /**
     * Split all paragraphs belonging to the provided subtree.
     */
    ParagraphSplitter.splitParagraphs = function (node) {
        if (node instanceof DocSection) {
            ParagraphSplitter.splitParagraphsForSection(node);
            // (We don't recurse here, since sections cannot contain subsections)
        }
        else {
            for (var _i = 0, _a = node.getChildNodes(); _i < _a.length; _i++) {
                var childNode = _a[_i];
                ParagraphSplitter.splitParagraphs(childNode);
            }
        }
    };
    /**
     * Split all paragraphs belonging to the provided DocSection.
     */
    ParagraphSplitter.splitParagraphsForSection = function (docSection) {
        var inputNodes = docSection.nodes;
        var outputNodes = [];
        for (var _i = 0, inputNodes_1 = inputNodes; _i < inputNodes_1.length; _i++) {
            var oldNode = inputNodes_1[_i];
            if (oldNode.kind === DocNodeKind.Paragraph) {
                ParagraphSplitter._splitParagraph(oldNode, outputNodes);
            }
            else {
                outputNodes.push(oldNode);
            }
        }
        // Replace the inputNodes with the outputNodes
        docSection.clearNodes();
        docSection.appendNodes(outputNodes);
    };
    ParagraphSplitter._splitParagraph = function (oldParagraph, outputNodes) {
        var inputParagraphNodes = oldParagraph.nodes;
        var currentParagraph = new DocParagraph({ configuration: oldParagraph.configuration });
        outputNodes.push(currentParagraph);
        var SplitterState;
        (function (SplitterState) {
            SplitterState[SplitterState["Start"] = 0] = "Start";
            SplitterState[SplitterState["AwaitingTrailer"] = 1] = "AwaitingTrailer";
            SplitterState[SplitterState["ReadingTrailer"] = 2] = "ReadingTrailer";
        })(SplitterState || (SplitterState = {}));
        var state = SplitterState.Start;
        var currentIndex = 0;
        while (currentIndex < inputParagraphNodes.length) {
            // Scan forwards to the end of the line
            var isBlankLine = true;
            var lineEndIndex = currentIndex; // non-inclusive
            do {
                var node = inputParagraphNodes[lineEndIndex++];
                if (node.kind === DocNodeKind.SoftBreak) {
                    break;
                }
                if (isBlankLine) {
                    if (!this._isWhitespace(node)) {
                        isBlankLine = false;
                    }
                }
            } while (lineEndIndex < inputParagraphNodes.length);
            // At this point, the line and SoftBreak will be in inputParagraphNodes.slice(currentIndex, lineEndIndex)
            switch (state) {
                case SplitterState.Start:
                    // We're skipping any blank lines that start the first paragraph
                    if (!isBlankLine) {
                        state = SplitterState.AwaitingTrailer;
                    }
                    break;
                case SplitterState.AwaitingTrailer:
                    // We already saw some content, so now we're looking for a blank line that starts the trailer
                    // at the end of this paragraph
                    if (isBlankLine) {
                        state = SplitterState.ReadingTrailer;
                    }
                    break;
                case SplitterState.ReadingTrailer:
                    // We already found the trailer, so now we're looking for a non-blank line that will
                    // begin a new paragraph
                    if (!isBlankLine) {
                        // Start a new paragraph
                        currentParagraph = new DocParagraph({ configuration: oldParagraph.configuration });
                        outputNodes.push(currentParagraph);
                        state = SplitterState.AwaitingTrailer;
                    }
                    break;
            }
            // Append the line onto the current paragraph
            for (var i = currentIndex; i < lineEndIndex; ++i) {
                currentParagraph.appendNode(inputParagraphNodes[i]);
            }
            currentIndex = lineEndIndex;
        }
    };
    ParagraphSplitter._isWhitespace = function (node) {
        switch (node.kind) {
            case DocNodeKind.PlainText:
                var docPlainText = node;
                return ParagraphSplitter._whitespaceRegExp.test(docPlainText.text);
            default:
                return false;
        }
    };
    ParagraphSplitter._whitespaceRegExp = /^\s*$/;
    return ParagraphSplitter;
}());
export { ParagraphSplitter };
//# sourceMappingURL=ParagraphSplitter.js.map