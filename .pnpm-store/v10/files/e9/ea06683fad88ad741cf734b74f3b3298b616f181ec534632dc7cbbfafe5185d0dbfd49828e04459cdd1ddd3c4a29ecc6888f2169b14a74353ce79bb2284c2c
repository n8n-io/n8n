import MarkdownIt = require(".");
import Ruler = require("./ruler");
import StateBlock = require("./rules_block/state_block");
import Token = require("./token");

declare namespace ParserBlock {
    type RuleBlock = (state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean;
}

declare class ParserBlock {
    /**
     * [[Ruler]] instance. Keep configuration of block rules.
     */
    ruler: Ruler<ParserBlock.RuleBlock>;

    /**
     * Generate tokens for input range
     */
    tokenize(state: StateBlock, startLine: number, endLine: number): void;

    /**
     * Process input string and push block tokens into `outTokens`
     */
    parse(str: string, md: MarkdownIt, env: any, outTokens: Token[]): void;

    State: typeof StateBlock;
}

export = ParserBlock;
