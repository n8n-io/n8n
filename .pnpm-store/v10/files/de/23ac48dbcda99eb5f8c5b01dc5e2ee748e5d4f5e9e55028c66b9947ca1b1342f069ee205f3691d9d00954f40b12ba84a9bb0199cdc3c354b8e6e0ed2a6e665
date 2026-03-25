import { ParserMessage } from './ParserMessage';
import type { TextRange } from './TextRange';
import type { TokenSequence } from './TokenSequence';
import type { DocNode } from '../nodes/DocNode';
import type { DocErrorText } from '../nodes/DocErrorText';
import type { TSDocMessageId } from './TSDocMessageId';
/**
 * Used to report errors and warnings that occurred during parsing.
 */
export declare class ParserMessageLog {
    private _messages;
    /**
     * The unfiltered list of all messages.
     */
    get messages(): ReadonlyArray<ParserMessage>;
    /**
     * Append a message to the log.
     */
    addMessage(parserMessage: ParserMessage): void;
    /**
     * Append a message associated with a TextRange.
     */
    addMessageForTextRange(messageId: TSDocMessageId, messageText: string, textRange: TextRange): void;
    /**
     * Append a message associated with a TokenSequence.
     */
    addMessageForTokenSequence(messageId: TSDocMessageId, messageText: string, tokenSequence: TokenSequence, docNode?: DocNode): void;
    /**
     * Append a message associated with a TokenSequence.
     */
    addMessageForDocErrorText(docErrorText: DocErrorText): void;
}
//# sourceMappingURL=ParserMessageLog.d.ts.map