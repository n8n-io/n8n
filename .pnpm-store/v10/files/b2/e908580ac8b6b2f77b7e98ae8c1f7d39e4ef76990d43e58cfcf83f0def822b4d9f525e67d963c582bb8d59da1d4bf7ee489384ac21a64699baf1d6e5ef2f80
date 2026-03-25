import { TextRange } from './TextRange';
import type { Token } from './Token';
import { DocComment } from '../nodes';
import type { TSDocConfiguration } from '../configuration/TSDocConfiguration';
import { ParserMessageLog } from './ParserMessageLog';
/**
 * An internal data structure that tracks all the state being built up by the various
 * parser stages.
 */
export declare class ParserContext {
    /**
     * The configuration that was provided for the TSDocParser.
     */
    readonly configuration: TSDocConfiguration;
    /**
     * The `sourceRange` indicates the start and end of the original input that was parsed.
     */
    readonly sourceRange: TextRange;
    /**
     * The text range starting from the opening `/**` and ending with
     * the closing `*\/` delimiter.
     */
    commentRange: TextRange;
    /**
     * The text ranges corresponding to the lines of content inside the comment.
     */
    lines: TextRange[];
    /**
     * A complete list of all tokens that were extracted from the input lines.
     */
    tokens: Token[];
    /**
     * The parsed doc comment object.  This is the primary output of the parser.
     */
    readonly docComment: DocComment;
    /**
     * A queryable log that reports warnings and error messages that occurred during parsing.
     */
    readonly log: ParserMessageLog;
    constructor(configuration: TSDocConfiguration, sourceRange: TextRange);
}
//# sourceMappingURL=ParserContext.d.ts.map