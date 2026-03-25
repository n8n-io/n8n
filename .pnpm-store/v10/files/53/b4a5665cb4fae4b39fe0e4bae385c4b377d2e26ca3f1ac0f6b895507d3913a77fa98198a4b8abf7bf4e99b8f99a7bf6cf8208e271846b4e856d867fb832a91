// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TSDocParser } from '../TSDocParser';
import { DocErrorText, DocPlainText, DocExcerpt } from '../../nodes';
import { TSDocConfiguration } from '../../configuration/TSDocConfiguration';
import { TokenCoverageChecker } from './TokenCoverageChecker';
var TestHelpers = /** @class */ (function () {
    function TestHelpers() {
    }
    /**
     * Pretty print a line with "<" and ">" markers to indicate a text range.
     */
    TestHelpers.formatLineSpan = function (line, range) {
        if (range.pos < line.pos || range.end > line.end) {
            throw new Error('Range must fall within the associated line');
        }
        var paddedSpace = ['', ' ', '  ', '   ', '    '];
        var paddedLArrow = ['', '>', ' >', '  >', '   >'];
        var paddedRArrow = ['', '<', '< ', '<  ', '<   '];
        var buffer = line.buffer;
        var span = '';
        if (line.end > 0) {
            var i = line.pos - 1;
            while (i < range.pos - 1) {
                span += paddedSpace[TestHelpers.getEscaped(buffer[i]).length];
                ++i;
            }
            span += paddedLArrow[TestHelpers.getEscaped(buffer[i]).length];
            ++i;
            while (i < range.end) {
                span += paddedSpace[TestHelpers.getEscaped(buffer[i]).length];
                ++i;
            }
            if (i === line.end) {
                span += '<';
            }
            else {
                span += paddedRArrow[TestHelpers.getEscaped(buffer[i]).length];
                ++i;
                while (i < line.end) {
                    span += paddedSpace[TestHelpers.getEscaped(buffer[i]).length];
                    ++i;
                }
            }
        }
        return span;
    };
    /**
     * Workaround various characters that get ugly escapes in Jest snapshots
     */
    TestHelpers.getEscaped = function (s) {
        return s
            .replace(/\n/g, '[n]')
            .replace(/\r/g, '[r]')
            .replace(/\t/g, '[t]')
            .replace(/\f/g, '[f]')
            .replace(/\\/g, '[b]')
            .replace(/\"/g, '[q]')
            .replace(/`/g, '[c]')
            .replace(/\</g, '[<]')
            .replace(/\>/g, '[>]');
    };
    /**
     * Main harness for tests under `./parser/*`.
     */
    TestHelpers.parseAndMatchNodeParserSnapshot = function (buffer, config) {
        var configuration = config !== null && config !== void 0 ? config : new TSDocConfiguration();
        // For the parser tests, we use lots of custom tags without bothering to define them
        configuration.validation.ignoreUndefinedTags = true;
        var tsdocParser = new TSDocParser(configuration);
        var parserContext = tsdocParser.parseString(buffer);
        expect({
            buffer: TestHelpers.getEscaped(buffer),
            lines: parserContext.lines.map(function (x) { return TestHelpers.getEscaped(x.toString()); }),
            logMessages: parserContext.log.messages.map(function (message) { return message.text; }),
            nodes: TestHelpers.getDocNodeSnapshot(parserContext.docComment),
            gaps: this._getTokenCoverageGapsSnapshot(parserContext)
        }).toMatchSnapshot();
        TestHelpers._getTokenCoverageGapsSnapshot(parserContext);
    };
    /**
     * Main harness for tests under `./details/*`.
     */
    TestHelpers.parseAndMatchDocCommentSnapshot = function (buffer, configuration) {
        var tsdocParser = new TSDocParser(configuration);
        var parserContext = tsdocParser.parseString(buffer);
        var docComment = parserContext.docComment;
        expect({
            s00_lines: parserContext.lines.map(function (x) { return TestHelpers.getEscaped(x.toString()); }),
            s01_gaps: this._getTokenCoverageGapsSnapshot(parserContext),
            s02_summarySection: TestHelpers.getDocNodeSnapshot(docComment.summarySection),
            s03_remarksBlock: TestHelpers.getDocNodeSnapshot(docComment.remarksBlock),
            s04_privateRemarksBlock: TestHelpers.getDocNodeSnapshot(docComment.privateRemarks),
            s05_deprecatedBlock: TestHelpers.getDocNodeSnapshot(docComment.deprecatedBlock),
            s06_paramBlocks: docComment.params.blocks.map(function (x) { return TestHelpers.getDocNodeSnapshot(x); }),
            s07_typeParamBlocks: docComment.typeParams.blocks.map(function (x) { return TestHelpers.getDocNodeSnapshot(x); }),
            s08_returnsBlock: TestHelpers.getDocNodeSnapshot(docComment.returnsBlock),
            s09_customBlocks: docComment.customBlocks.map(function (x) { return TestHelpers.getDocNodeSnapshot(x); }),
            s10_inheritDocTag: TestHelpers.getDocNodeSnapshot(docComment.inheritDocTag),
            s11_modifierTags: docComment.modifierTagSet.nodes.map(function (x) { return TestHelpers.getDocNodeSnapshot(x); }),
            s12_logMessages: parserContext.log.messages.map(function (message) { return message.text; })
        }).toMatchSnapshot();
        return parserContext;
    };
    /**
     * Render a nice Jest snapshot object for a DocNode tree.
     */
    TestHelpers.getDocNodeSnapshot = function (docNode) {
        if (!docNode) {
            return undefined;
        }
        var item = {
            kind: docNode.kind
        };
        if (docNode instanceof DocExcerpt) {
            item.kind += ': ' + docNode.excerptKind;
            item.nodeExcerpt = TestHelpers.getEscaped(docNode.content.toString());
        }
        if (docNode instanceof DocPlainText) {
            var docPlainText = docNode;
            if (docPlainText.textExcerpt === undefined) {
                item.nodePlainText = TestHelpers.getEscaped(docPlainText.text);
            }
        }
        if (docNode instanceof DocErrorText) {
            item.errorMessage = TestHelpers.getEscaped(docNode.errorMessage);
            item.errorLocation = TestHelpers.getEscaped(docNode.errorLocation.toString());
            if (docNode.errorLocation.startIndex > 0) {
                // Show the preceding token to provide some context (e.g. is this the opening quote
                // or closing quote?)
                item.errorLocationPrecedingToken =
                    docNode.errorLocation.parserContext.tokens[docNode.errorLocation.startIndex - 1].toString();
            }
        }
        if (docNode.getChildNodes().length > 0) {
            item.nodes = docNode.getChildNodes().map(function (x) { return TestHelpers.getDocNodeSnapshot(x); });
        }
        return item;
    };
    TestHelpers._getTokenCoverageGapsSnapshot = function (parserContext) {
        var tokenCoverageChecker = new TokenCoverageChecker(parserContext);
        return tokenCoverageChecker.getGaps(parserContext.docComment).map(function (x) { return x.toString(); });
    };
    return TestHelpers;
}());
export { TestHelpers };
//# sourceMappingURL=TestHelpers.js.map