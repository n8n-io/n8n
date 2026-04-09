"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserContext = void 0;
const TextRange_1 = require("./TextRange");
const nodes_1 = require("../nodes");
const ParserMessageLog_1 = require("./ParserMessageLog");
/**
 * An internal data structure that tracks all the state being built up by the various
 * parser stages.
 */
class ParserContext {
    constructor(configuration, sourceRange) {
        /**
         * The text range starting from the opening `/**` and ending with
         * the closing `*\/` delimiter.
         */
        this.commentRange = TextRange_1.TextRange.empty;
        /**
         * The text ranges corresponding to the lines of content inside the comment.
         */
        this.lines = [];
        /**
         * A complete list of all tokens that were extracted from the input lines.
         */
        this.tokens = [];
        this.configuration = configuration;
        this.sourceRange = sourceRange;
        this.docComment = new nodes_1.DocComment({ configuration: this.configuration });
        this.log = new ParserMessageLog_1.ParserMessageLog();
    }
}
exports.ParserContext = ParserContext;
//# sourceMappingURL=ParserContext.js.map