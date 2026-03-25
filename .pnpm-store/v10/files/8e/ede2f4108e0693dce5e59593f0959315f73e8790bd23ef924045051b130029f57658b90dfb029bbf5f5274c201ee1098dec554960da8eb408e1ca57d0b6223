import MarkdownIt = require("..");
import Token = require("../token");

declare namespace StateInline {
    interface Scanned {
        can_open: boolean;
        can_close: boolean;
        length: number;
    }

    interface Delimiter {
        marker: number;
        length: number;
        token: number;
        end: number;
        open: boolean;
        close: boolean;
    }

    interface TokenMata {
        delimiters: Delimiter[];
    }
}

declare class StateInline {
    constructor(src: string, md: MarkdownIt, env: any, outTokens: Token[]);

    src: string;
    env: any;
    md: MarkdownIt;
    tokens: Token[];
    tokens_meta: Array<StateInline.TokenMata | null>;

    pos: number;
    posMax: number;
    level: number;
    pending: string;
    pendingLevel: number;

    /**
     * Stores { start: end } pairs. Useful for backtrack
     * optimization of pairs parse (emphasis, strikes).
     */
    cache: any;

    /**
     * List of emphasis-like delimiters for current tag
     */
    delimiters: StateInline.Delimiter[];

    // Stack of delimiter lists for upper level tags
    // _prev_delimiters: StateInline.Delimiter[][];

    /**
     * Flush pending text
     */
    pushPending(): Token;

    /**
     * Push new token to "stream".
     * If pending text exists - flush it as text token
     */
    push(type: string, tag: string, nesting: Token.Nesting): Token;

    /**
     * Scan a sequence of emphasis-like markers, and determine whether
     * it can start an emphasis sequence or end an emphasis sequence.
     *
     * @param start position to scan from (it should point at a valid marker);
     * @param canSplitWord determine if these markers can be found inside a word
     */
    scanDelims(start: number, canSplitWord: boolean): StateInline.Scanned;

    Token: typeof Token;
}

export = StateInline;
