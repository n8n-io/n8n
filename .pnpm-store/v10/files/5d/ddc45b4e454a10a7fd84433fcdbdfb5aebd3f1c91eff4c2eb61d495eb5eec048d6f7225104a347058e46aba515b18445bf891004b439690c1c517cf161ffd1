import type { ParserContext } from './ParserContext';
import type { Token } from './Token';
import { TextRange } from './TextRange';
/**
 * Constructor parameters for {@link TokenSequence}
 */
export interface ITokenSequenceParameters {
    parserContext: ParserContext;
    startIndex: number;
    endIndex: number;
}
/**
 * Represents a sequence of tokens extracted from `ParserContext.tokens`.
 * This sequence is defined by a starting index and ending index into that array.
 */
export declare class TokenSequence {
    /**
     * The associated parser context that the tokens come from.
     */
    readonly parserContext: ParserContext;
    private _startIndex;
    private _endIndex;
    constructor(parameters: ITokenSequenceParameters);
    /**
     * Constructs a TokenSequence object with no tokens.
     */
    static createEmpty(parserContext: ParserContext): TokenSequence;
    /**
     * The starting index into the associated `ParserContext.tokens` list.
     */
    get startIndex(): number;
    /**
     * The (non-inclusive) ending index into the associated `ParserContext.tokens` list.
     */
    get endIndex(): number;
    get tokens(): ReadonlyArray<Token>;
    /**
     * Constructs a TokenSequence that corresponds to a different range of tokens,
     * e.g. a subrange.
     */
    getNewSequence(startIndex: number, endIndex: number): TokenSequence;
    /**
     * Returns a TextRange that includes all tokens in the sequence (including any additional
     * characters between doc comment lines).
     */
    getContainingTextRange(): TextRange;
    isEmpty(): boolean;
    /**
     * Returns the concatenated text of all the tokens.
     */
    toString(): string;
    private _validateBounds;
}
//# sourceMappingURL=TokenSequence.d.ts.map