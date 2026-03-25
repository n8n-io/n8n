import { FormatCallback } from "../index";
/**
 * types of options for BlockTextBuilder methods.  These replace previously positional options.
 */

export interface AddInlineOptions {
    noWordTransform?: boolean | undefined;
}
export interface OpenBlockOptions {
    leadingLineBreaks?: number | undefined;
    reservedLineLength?: number | undefined;
    isPre?: boolean | undefined;
}
export type BlockTransformer = (str: string) => string;
export interface CloseBlockOptions {
    trailingLineBreaks?: number | undefined;
    blockTransform?: BlockTransformer | undefined;
}
export interface OpenListOptions {
    maxPrefixLength?: number | undefined;
    prefixAlign?: "left" | "right" | undefined;
    interRowLineBreaks?: number | undefined;
    leadingLineBreaks?: number | undefined;
}

export interface OpenTableCellOptions {
    maxColumnWidth?: number | undefined;
}
export interface CloseTableCellOptions {
    colspan?: number | undefined;
    rowspan?: number | undefined;
}

export interface TablePrinterCell {
    colspan: number;
    rowspan: number;
    text: string;
}

export type TablePrinter = (cells: TablePrinterCell[][]) => string;

export interface CloseTableOptions {
    tableToString: TablePrinter;
    leadingLineBreaks?: number | undefined;
    trailingLineBreaks?: number | undefined;
}

/**
 * Helps to build text from inline and block elements.
 */
export interface BlockTextBuilder {
    /**
     * Put a word-by-word transform function onto the transformations stack.
     *
     * Mainly used for uppercasing. Can be bypassed to add unformatted text such as URLs.
     *
     * Word transformations applied before wrapping.
     */
    pushWordTransform(wordTransform: (str: string) => string): void;
    /**
     * Remove a function from the word transformations stack.
     */
    popWordTransform(): ((str: string) => string) | undefined;
    /**
     * Ignore wordwrap option in followup inline additions and disable automatic wrapping.
     */
    startNoWrap(): void;

    /**
     * Return automatic wrapping to behavior defined by options.
     */
    stopNoWrap(): void;

    /**
     * Add a line break into currently built block.
     */
    addLineBreak(): void;
    /**
     * Allow to break line in case directly following text will not fit.
     */
    addWordBreakOpportunity(): void;
    /**
     * Add a node inline into the currently built block.
     */
    addInline(str: string, addInlineOptions?: AddInlineOptions): void;
    /**
     * Add a string inline into the currently built block.
     *
     * Use this for markup elements that don't have to adhere to text layout rules.
     */
    addLiteral(str: string): void;
    /**
     * Start building a new block.
     */
    openBlock(openBlockOptions?: OpenBlockOptions): void;
    /**
     * Finalize currently built block, add it's content to the parent block.
     *
     * A function to transform the block text before adding to the parent block.
     * This happens after word wrap and should be used in combination with reserved line length
     * in order to keep line lengths correct.
     * Used for whole block markup.
     */
    closeBlock(closeBlockOptions?: CloseBlockOptions): void;
    /**
     * Start building a new list.
     */
    openList(openListOptions?: OpenListOptions): void;
    /**
     * Start building a new list item.
     */
    openListItem({ prefix }: { prefix?: string }): void;
    /**
     * Finalize currently built list item, add it's content to the parent list.
     */
    closeListItem(): void;
    /**
     * Finalize currently built list, add it's content to the parent block.
     */
    closeList({ trailingLineBreaks }: { trailingLineBreaks?: number }): void;
    /**
     * Start building a table.
     */
    openTable(): void;
    /**
     * Start building a table row.
     */
    openTableRow(): void;
    /**
     * Start building a table cell.
     */
    openTableCell(openTableCellOptions?: OpenTableCellOptions): void;
    /**
     * Finalize currently built table cell and add it to parent table row's cells.
     */
    closeTableCell(closeTableCellOptions?: CloseTableCellOptions): void;
    /**
     * Finalize currently built table row and add it to parent table's rows.
     */
    closeTableRow(): void;
    /**
     * Finalize currently built table and add the rendered text to the parent block.
     */
    closeTable(closeTableOptions?: CloseTableOptions): void;
    /**
     * Return the rendered text content of this builder.
     */
    toString(): string;

    /**
     * Speciallized access to formatters, including default ones.  It is recommended to
     * use the css style selectors.  If formatting depends on actual content, this
     * provides access to user and default formatters.  Setting of options is left up
     * to the caller.  See the test driver for sample usage.
     */
    options: {
        formatters: Record<string, FormatCallback>;
    };
}
