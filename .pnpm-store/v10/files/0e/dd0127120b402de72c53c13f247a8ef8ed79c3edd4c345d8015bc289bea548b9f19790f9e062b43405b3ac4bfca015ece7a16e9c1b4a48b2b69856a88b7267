import type { TextRange } from './TextRange';
import type { TokenSequence } from './TokenSequence';
import type { DocNode } from '../nodes/DocNode';
import type { TSDocMessageId } from './TSDocMessageId';
/**
 * Constructor parameters for {@link ParserMessage}.
 */
export interface IParserMessageParameters {
    messageId: TSDocMessageId;
    messageText: string;
    textRange: TextRange;
    tokenSequence?: TokenSequence;
    docNode?: DocNode;
}
/**
 * Represents an error or warning that occurred during parsing.
 */
export declare class ParserMessage {
    /**
     * A string that uniquely identifies the messages reported by the TSDoc parser.
     */
    readonly messageId: TSDocMessageId;
    /**
     * The message text without the default prefix that shows line/column information.
     */
    readonly unformattedText: string;
    readonly textRange: TextRange;
    readonly tokenSequence: TokenSequence | undefined;
    readonly docNode: DocNode | undefined;
    private _text;
    constructor(parameters: IParserMessageParameters);
    /**
     * Generates a line/column prefix.  Example with line=2 and column=5
     * and message="An error occurred":
     * ```
     * "(2,5): An error occurred"
     * ```
     */
    private static _formatMessageText;
    /**
     * The message text.
     */
    get text(): string;
    toString(): string;
}
//# sourceMappingURL=ParserMessage.d.ts.map