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
export class TSDocParser {
    constructor(configuration) {
        if (configuration) {
            this.configuration = configuration;
        }
        else {
            this.configuration = new TSDocConfiguration();
        }
    }
    parseString(text) {
        return this.parseRange(TextRange.fromString(text));
    }
    parseRange(range) {
        const parserContext = new ParserContext(this.configuration, range);
        if (LineExtractor.extract(parserContext)) {
            parserContext.tokens = Tokenizer.readTokens(parserContext.lines);
            const nodeParser = new NodeParser(parserContext);
            nodeParser.parse();
            ParagraphSplitter.splitParagraphs(parserContext.docComment);
        }
        return parserContext;
    }
}
//# sourceMappingURL=TSDocParser.js.map