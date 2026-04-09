"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSDocParser = void 0;
const TextRange_1 = require("./TextRange");
const ParserContext_1 = require("./ParserContext");
const LineExtractor_1 = require("./LineExtractor");
const Tokenizer_1 = require("./Tokenizer");
const NodeParser_1 = require("./NodeParser");
const TSDocConfiguration_1 = require("../configuration/TSDocConfiguration");
const ParagraphSplitter_1 = require("./ParagraphSplitter");
/**
 * The main API for parsing TSDoc comments.
 */
class TSDocParser {
    constructor(configuration) {
        if (configuration) {
            this.configuration = configuration;
        }
        else {
            this.configuration = new TSDocConfiguration_1.TSDocConfiguration();
        }
    }
    parseString(text) {
        return this.parseRange(TextRange_1.TextRange.fromString(text));
    }
    parseRange(range) {
        const parserContext = new ParserContext_1.ParserContext(this.configuration, range);
        if (LineExtractor_1.LineExtractor.extract(parserContext)) {
            parserContext.tokens = Tokenizer_1.Tokenizer.readTokens(parserContext.lines);
            const nodeParser = new NodeParser_1.NodeParser(parserContext);
            nodeParser.parse();
            ParagraphSplitter_1.ParagraphSplitter.splitParagraphs(parserContext.docComment);
        }
        return parserContext;
    }
}
exports.TSDocParser = TSDocParser;
//# sourceMappingURL=TSDocParser.js.map