import MarkdownIt = require("..");
import Token = require("../token");

declare namespace StateBlock {
    type ParentType = "blockquote" | "list" | "root" | "paragraph" | "reference";
}

declare class StateBlock {
    constructor(src: string, md: MarkdownIt, env: any, tokens: Token[]);

    src: string;

    /**
     * link to parser instance
     */
    md: MarkdownIt;

    env: any;

    //
    // Internal state vartiables
    //

    tokens: Token[];

    /**
     * line begin offsets for fast jumps
     */
    bMarks: number[];
    /**
     * line end offsets for fast jumps
     */
    eMarks: number[];
    /**
     * offsets of the first non-space characters (tabs not expanded)
     */
    tShift: number[];
    /**
     * indents for each line (tabs expanded)
     */
    sCount: number[];

    /**
     * An amount of virtual spaces (tabs expanded) between beginning
     * of each line (bMarks) and real beginning of that line.
     *
     * It exists only as a hack because blockquotes override bMarks
     * losing information in the process.
     *
     * It's used only when expanding tabs, you can think about it as
     * an initial tab length, e.g. bsCount=21 applied to string `\t123`
     * means first tab should be expanded to 4-21%4 === 3 spaces.
     */
    bsCount: number[];

    // block parser variables

    /**
     * required block content indent (for example, if we are
     * inside a list, it would be positioned after list marker)
     */
    blkIndent: number;
    /**
     * line index in src
     */
    line: number;
    /**
     * lines count
     */
    lineMax: number;
    /**
     * loose/tight mode for lists
     */
    tight: boolean;
    /**
     * indent of the current dd block (-1 if there isn't any)
     */
    ddIndent: number;
    /**
     * indent of the current list block (-1 if there isn't any)
     */
    listIndent: number;

    /**
     * can be 'blockquote', 'list', 'root', 'paragraph' or 'reference'
     * used in lists to determine if they interrupt a paragraph
     */
    parentType: StateBlock.ParentType;

    level: number;

    /**
     * renderer
     */
    result: string;

    /**
     * Push new token to "stream".
     */
    push(type: string, tag: string, nesting: Token.Nesting): Token;

    isEmpty(line: number): boolean;

    skipEmptyLines(from: number): number;

    /**
     * Skip spaces from given position.
     */
    skipSpaces(pos: number): number;

    /**
     * Skip spaces from given position in reverse.
     */
    skipSpacesBack(pos: number, min: number): number;

    /**
     * Skip char codes from given position
     */
    skipChars(pos: number, code: number): number;

    /**
     * Skip char codes reverse from given position - 1
     */
    skipCharsBack(pos: number, code: number, min: number): number;

    /**
     * cut lines range from source.
     */
    getLines(begin: number, end: number, indent: number, keepLastLF: boolean): string;

    Token: typeof Token;
}

export = StateBlock;
