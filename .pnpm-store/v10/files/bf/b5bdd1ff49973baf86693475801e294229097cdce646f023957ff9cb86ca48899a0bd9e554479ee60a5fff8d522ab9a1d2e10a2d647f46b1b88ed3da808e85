import { Token } from './ast';
import type { Source } from './source';
import { TokenKind } from './tokenKind';
/**
 * Given a Source object, creates a Lexer for that source.
 * A Lexer is a stateful stream generator in that every time
 * it is advanced, it returns the next token in the Source. Assuming the
 * source lexes, the final Token emitted by the lexer will be of kind
 * EOF, after which the lexer will repeatedly return the same EOF token
 * whenever called.
 */
export declare class Lexer {
  source: Source;
  /**
   * The previously focused non-ignored token.
   */
  lastToken: Token;
  /**
   * The currently focused non-ignored token.
   */
  token: Token;
  /**
   * The (1-indexed) line containing the current token.
   */
  line: number;
  /**
   * The character offset at which the current line begins.
   */
  lineStart: number;
  constructor(source: Source);
  get [Symbol.toStringTag](): string;
  /**
   * Advances the token stream to the next non-ignored token.
   */
  advance(): Token;
  /**
   * Looks ahead and returns the next non-ignored token, but does not change
   * the state of Lexer.
   */
  lookahead(): Token;
}
/**
 * @internal
 */
export declare function isPunctuatorTokenKind(kind: TokenKind): boolean;
