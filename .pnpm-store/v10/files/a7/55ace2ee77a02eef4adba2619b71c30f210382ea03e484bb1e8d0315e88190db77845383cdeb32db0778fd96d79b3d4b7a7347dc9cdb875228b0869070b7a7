// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TextRange } from './TextRange';
import { ParserContext } from './ParserContext';
import { LineExtractor } from './LineExtractor';
import { Tokenizer } from './Tokenizer';
import { NodeParser } from './NodeParser';
import { TSDocConfiguration } from '../configuration/TSDocConfiguration';
import { ParagraphSplitter } from './ParagraphSplitter';
/**
 * The main API for parsing TSDoc comments.
 */
var TSDocParser = /** @class */ (function () {
    function TSDocParser(configuration) {
        if (configuration) {
            this.configuration = configuration;
        }
        else {
            this.configuration = new TSDocConfiguration();
        }
    }
    TSDocParser.prototype.parseString = function (text) {
        return this.parseRange(TextRange.fromString(text));
    };
    TSDocParser.prototype.parseRange = function (range) {
        var parserContext = new ParserContext(this.configuration, range);
        if (LineExtractor.extract(parserContext)) {
            parserContext.tokens = Tokenizer.readTokens(parserContext.lines);
            var nodeParser = new NodeParser(parserContext);
            nodeParser.parse();
            ParagraphSplitter.splitParagraphs(parserContext.docComment);
        }
        return parserContext;
    };
    return TSDocParser;
}());
export { TSDocParser };
//# sourceMappingURL=TSDocParser.js.map