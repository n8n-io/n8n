import { TextRange } from './TextRange';
import { Token, TokenKind } from './Token';
export declare class Tokenizer {
    private static readonly _commonMarkPunctuationCharacters;
    private static readonly _wordCharacters;
    private static _charCodeMap;
    private static _punctuationTokens;
    /**
     * Given a list of input lines, this returns an array of extracted tokens.
     * The last token will always be TokenKind.EndOfInput.
     */
    static readTokens(lines: TextRange[]): Token[];
    /**
     * Returns true if the token is a CommonMark punctuation character.
     * These are basically all the ASCII punctuation characters.
     */
    static isPunctuation(tokenKind: TokenKind): boolean;
    private static _pushTokensForLine;
    /**
     * Returns true if the token can be comprised of multiple characters
     */
    private static _isMultiCharacterToken;
    private static _ensureInitialized;
}
//# sourceMappingURL=Tokenizer.d.ts.map