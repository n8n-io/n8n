// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TextRange } from './TextRange';
import { DocComment } from '../nodes';
import { ParserMessageLog } from './ParserMessageLog';
/**
 * An internal data structure that tracks all the state being built up by the various
 * parser stages.
 */
export class ParserContext {
    constructor(configuration, sourceRange) {
        /**
         * The text range starting from the opening `/**` and ending with
         * the closing `*\/` delimiter.
         */
        this.commentRange = TextRange.empty;
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
        this.docComment = new DocComment({ configuration: this.configuration });
        this.log = new ParserMessageLog();
    }
}
//# sourceMappingURL=ParserContext.js.map