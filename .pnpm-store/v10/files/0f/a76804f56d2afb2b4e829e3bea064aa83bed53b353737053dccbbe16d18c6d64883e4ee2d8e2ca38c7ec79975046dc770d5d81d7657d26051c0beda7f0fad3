"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSDocParser = void 0;
var TextRange_1 = require("./TextRange");
var ParserContext_1 = require("./ParserContext");
var LineExtractor_1 = require("./LineExtractor");
var Tokenizer_1 = require("./Tokenizer");
var NodeParser_1 = require("./NodeParser");
var TSDocConfiguration_1 = require("../configuration/TSDocConfiguration");
var ParagraphSplitter_1 = require("./ParagraphSplitter");
/**
 * The main API for parsing TSDoc comments.
 */
var TSDocParser = /** @class */ (function () {
    function TSDocParser(configuration) {
        if (configuration) {
            this.configuration = configuration;
        }
        else {
            this.configuration = new TSDocConfiguration_1.TSDocConfiguration();
        }
    }
    TSDocParser.prototype.parseString = function (text) {
        return this.parseRange(TextRange_1.TextRange.fromString(text));
    };
    TSDocParser.prototype.parseRange = function (range) {
        var parserContext = new ParserContext_1.ParserContext(this.configuration, range);
        if (LineExtractor_1.LineExtractor.extract(parserContext)) {
            parserContext.tokens = Tokenizer_1.Tokenizer.readTokens(parserContext.lines);
            var nodeParser = new NodeParser_1.NodeParser(parserContext);
            nodeParser.parse();
            ParagraphSplitter_1.ParagraphSplitter.splitParagraphs(parserContext.docComment);
        }
        return parserContext;
    };
    return TSDocParser;
}());
exports.TSDocParser = TSDocParser;
//# sourceMappingURL=TSDocParser.js.map