import { type Token, TokenKind } from './Token';
import { TokenSequence } from './TokenSequence';
import type { ParserContext } from './ParserContext';
/**
 * Manages a stream of tokens that are read by the parser.
 *
 * @remarks
 * Use TokenReader.readToken() to read a token and advance the stream pointer.
 * Use TokenReader.peekToken() to preview the next token.
 * Use TokenReader.createMarker() and backtrackToMarker() to rewind to an earlier point.
 * Whenever readToken() is called, the token is added to an accumulated TokenSequence
 * that can be extracted by calling extractAccumulatedSequence().
 */
export declare class TokenReader {
    readonly tokens: ReadonlyArray<Token>;
    private readonly _parserContext;
    private _readerStartIndex;
    private _readerEndIndex;
    private _currentIndex;
    private _accumulatedStartIndex;
    constructor(parserContext: ParserContext, embeddedTokenSequence?: TokenSequence);
    /**
     * Extracts and returns the TokenSequence that was accumulated so far by calls to readToken().
     * The next call to readToken() will start a new accumulated sequence.
     */
    extractAccumulatedSequence(): TokenSequence;
    /**
     * Returns true if the accumulated sequence has any tokens yet.  This will be false
     * when the TokenReader starts, and it will be false immediately after a call
     * to extractAccumulatedSequence().  Otherwise, it will become true whenever readToken()
     * is called.
     */
    isAccumulatedSequenceEmpty(): boolean;
    /**
     * Like extractAccumulatedSequence(), but returns undefined if nothing has been
     * accumulated yet.
     */
    tryExtractAccumulatedSequence(): TokenSequence | undefined;
    /**
     * Asserts that isAccumulatedSequenceEmpty() should return false.  If not, an exception
     * is throw indicating a parser bug.
     */
    assertAccumulatedSequenceIsEmpty(): void;
    /**
     * Returns the next token that would be returned by _readToken(), without
     * consuming anything.
     */
    peekToken(): Token;
    /**
     * Returns the TokenKind for the next token that would be returned by _readToken(), without
     * consuming anything.
     */
    peekTokenKind(): TokenKind;
    /**
     * Like peekTokenKind(), but looks ahead two tokens.
     */
    peekTokenAfterKind(): TokenKind;
    /**
     * Like peekTokenKind(), but looks ahead three tokens.
     */
    peekTokenAfterAfterKind(): TokenKind;
    /**
     * Extract the next token from the input stream and return it.
     * The token will also be appended to the accumulated sequence, which can
     * later be accessed via extractAccumulatedSequence().
     */
    readToken(): Token;
    /**
     * Returns the kind of the token immediately before the current token.
     */
    peekPreviousTokenKind(): TokenKind;
    /**
     * Remembers the current position in the stream.
     */
    createMarker(): number;
    /**
     * Rewinds the stream pointer to a previous position in the stream.
     */
    backtrackToMarker(marker: number): void;
}
//# sourceMappingURL=TokenReader.d.ts.map