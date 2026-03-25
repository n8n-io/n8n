import MarkdownIt = require(".");
import Ruler = require("./ruler");
import Token = require("./token");
import StateInline = require("./rules_inline/state_inline");

declare namespace ParserInline {
    type RuleInline = (state: StateInline, silent: boolean) => boolean;
    type RuleInline2 = (state: StateInline) => boolean;
}

declare class ParserInline {
    /**
     * [[Ruler]] instance. Keep configuration of inline rules.
     */
    ruler: Ruler<ParserInline.RuleInline>;

    /**
     * [[Ruler]] instance. Second ruler used for post-processing
     * (e.g. in emphasis-like rules).
     */
    ruler2: Ruler<ParserInline.RuleInline2>;

    /**
     * Skip single token by running all rules in validation mode;
     * returns `true` if any rule reported success
     */
    skipToken(state: StateInline): void;

    /**
     * Generate tokens for input range
     */
    tokenize(state: StateInline): void;

    /**
     * Process input string and push inline tokens into `outTokens`
     */
    parse(str: string, md: MarkdownIt, env: any, outTokens: Token[]): void;

    State: typeof StateInline;
}

export = ParserInline;
