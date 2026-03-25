/** Lexer options (not many so far). */
export declare type Options = {
    /**
     * Enable line and column numbers computation.
     */
    lineNumbers?: boolean;
};
/** Result returned by a lexer function. */
export declare type LexerResult = {
    /** Array of tokens. */
    tokens: Token[];
    /** Final offset. */
    offset: number;
    /**
     * True if whole input string was processed.
     *
     * Check this to see whether some input left untokenized.
     */
    complete: boolean;
};
/**
 * Lexer function.
 *
 * @param str - A string to tokenize.
 * @param offset - Initial offset. Used when composing lexers.
 */
export declare type Lexer = (str: string, offset?: number) => LexerResult;
/** Token object, a result of matching an individual lexing rule. */
export declare type Token = {
    /** Name of the lexer containing the rule produced this token. */
    state: string;
    /** Name of the rule produced this token. */
    name: string;
    /** Text matched by the rule. _(Unless a replace value was used by a RegexRule.)_ */
    text: string;
    /** Start index of the match in the input string. */
    offset: number;
    /**
     * The length of the matched substring.
     *
     * _(Might be different from the text length in case replace value
     * was used in a RegexRule.)_
     */
    len: number;
    /**
     * Line number in the source string (1-based).
     *
     * _(Always zero if not enabled in the lexer options.)_
     */
    line: number;
    /**
     * Column number within the line in the source string (1-based).
     *
     * _(Always zero if line numbers not enabled in the lexer options.)_
     */
    column: number;
};
/**
 * Lexing rule.
 *
 * Base rule looks for exact match by it's name.
 *
 * If the name and the lookup string have to be different
 * then specify `str` property as defined in {@link StringRule}.
 */
export interface Rule {
    /** The name of the rule, also the name of tokens produced by this rule. */
    name: string;
    /**
     * Matched token won't be added to the output array if this set to `true`.
     *
     * (_Think twice before using this._)
     * */
    discard?: boolean;
    /**
     * Switch to another lexer function after this match,
     * concatenate it's results and continue from where it stopped.
     */
    push?: Lexer;
    /**
     * Stop after this match and return.
     *
     * If there is a parent parser - it will continue from this point.
     */
    pop?: boolean;
}
/**
 * String rule - looks for exact string match that
 * can be different from the name of the rule.
 */
export interface StringRule extends Rule {
    /**
     * Specify the exact string to match
     * if it is different from the name of the rule.
     */
    str: string;
}
/**
 * Regex rule - looks for a regular expression match.
 */
export interface RegexRule extends Rule {
    /**
     * Regular expression to match.
     *
     * - Can't have the global flag.
     *
     * - All regular expressions are used as sticky,
     *   you don't have to specify the sticky flag.
     *
     * - Empty matches are considered as non-matches -
     *   no token will be emitted in that case.
     */
    regex: RegExp;
    /**
     * Replacement string can include patterns,
     * the same as [String.prototype.replace()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter).
     *
     * This will only affect the text property of an output token, not it's offset or length.
     *
     * Note: the regex has to be able to match the matched substring when taken out of context
     * in order for replace to work - boundary/neighborhood conditions may prevent this.
     */
    replace?: string;
}
/**
 * Non-empty array of rules.
 *
 * Rules are processed in provided order, first match is taken.
 *
 * Rules can have the same name. For example, you can have
 * separate rules for various keywords and use the same name "keyword".
 */
export declare type Rules = [
    (Rule | StringRule | RegexRule),
    ...(Rule | StringRule | RegexRule)[]
];
/**
 * Create a lexer function.
 *
 * @param rules - Non-empty array of lexing rules.
 *
 * Rules are processed in provided order, first match is taken.
 *
 * Rules can have the same name - you can have separate rules
 * for keywords and use the same name "keyword" for example.
 *
 * @param state - The name of this lexer. Use when composing lexers.
 * Empty string by default.
 *
 * @param options - Lexer options object.
 */
export declare function createLexer(rules: Rules, state?: string, options?: Options): Lexer;
/**
 * Create a lexer function.
 *
 * @param rules - Non-empty array of lexing rules.
 *
 * Rules are processed in provided order, first match is taken.
 *
 * Rules can have the same name - you can have separate rules
 * for keywords and use the same name "keyword" for example.
 *
 * @param options - Lexer options object.
 */
export declare function createLexer(rules: Rules, options?: Options): Lexer;
