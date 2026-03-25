export declare const SUMMARY_ENV_VAR = "GITHUB_STEP_SUMMARY";
export declare const SUMMARY_DOCS_URL = "https://docs.github.com/actions/using-workflows/workflow-commands-for-github-actions#adding-a-job-summary";
export type SummaryTableRow = (SummaryTableCell | string)[];
export interface SummaryTableCell {
    /**
     * Cell content
     */
    data: string;
    /**
     * Render cell as header
     * (optional) default: false
     */
    header?: boolean;
    /**
     * Number of columns the cell extends
     * (optional) default: '1'
     */
    colspan?: string;
    /**
     * Number of rows the cell extends
     * (optional) default: '1'
     */
    rowspan?: string;
}
export interface SummaryImageOptions {
    /**
     * The width of the image in pixels. Must be an integer without a unit.
     * (optional)
     */
    width?: string;
    /**
     * The height of the image in pixels. Must be an integer without a unit.
     * (optional)
     */
    height?: string;
}
export interface SummaryWriteOptions {
    /**
     * Replace all existing content in summary file with buffer contents
     * (optional) default: false
     */
    overwrite?: boolean;
}
declare class Summary {
    private _buffer;
    private _filePath?;
    constructor();
    /**
     * Finds the summary file path from the environment, rejects if env var is not found or file does not exist
     * Also checks r/w permissions.
     *
     * @returns step summary file path
     */
    private filePath;
    /**
     * Wraps content in an HTML tag, adding any HTML attributes
     *
     * @param {string} tag HTML tag to wrap
     * @param {string | null} content content within the tag
     * @param {[attribute: string]: string} attrs key-value list of HTML attributes to add
     *
     * @returns {string} content wrapped in HTML element
     */
    private wrap;
    /**
     * Writes text in the buffer to the summary buffer file and empties buffer. Will append by default.
     *
     * @param {SummaryWriteOptions} [options] (optional) options for write operation
     *
     * @returns {Promise<Summary>} summary instance
     */
    write(options?: SummaryWriteOptions): Promise<Summary>;
    /**
     * Clears the summary buffer and wipes the summary file
     *
     * @returns {Summary} summary instance
     */
    clear(): Promise<Summary>;
    /**
     * Returns the current summary buffer as a string
     *
     * @returns {string} string of summary buffer
     */
    stringify(): string;
    /**
     * If the summary buffer is empty
     *
     * @returns {boolen} true if the buffer is empty
     */
    isEmptyBuffer(): boolean;
    /**
     * Resets the summary buffer without writing to summary file
     *
     * @returns {Summary} summary instance
     */
    emptyBuffer(): Summary;
    /**
     * Adds raw text to the summary buffer
     *
     * @param {string} text content to add
     * @param {boolean} [addEOL=false] (optional) append an EOL to the raw text (default: false)
     *
     * @returns {Summary} summary instance
     */
    addRaw(text: string, addEOL?: boolean): Summary;
    /**
     * Adds the operating system-specific end-of-line marker to the buffer
     *
     * @returns {Summary} summary instance
     */
    addEOL(): Summary;
    /**
     * Adds an HTML codeblock to the summary buffer
     *
     * @param {string} code content to render within fenced code block
     * @param {string} lang (optional) language to syntax highlight code
     *
     * @returns {Summary} summary instance
     */
    addCodeBlock(code: string, lang?: string): Summary;
    /**
     * Adds an HTML list to the summary buffer
     *
     * @param {string[]} items list of items to render
     * @param {boolean} [ordered=false] (optional) if the rendered list should be ordered or not (default: false)
     *
     * @returns {Summary} summary instance
     */
    addList(items: string[], ordered?: boolean): Summary;
    /**
     * Adds an HTML table to the summary buffer
     *
     * @param {SummaryTableCell[]} rows table rows
     *
     * @returns {Summary} summary instance
     */
    addTable(rows: SummaryTableRow[]): Summary;
    /**
     * Adds a collapsable HTML details element to the summary buffer
     *
     * @param {string} label text for the closed state
     * @param {string} content collapsable content
     *
     * @returns {Summary} summary instance
     */
    addDetails(label: string, content: string): Summary;
    /**
     * Adds an HTML image tag to the summary buffer
     *
     * @param {string} src path to the image you to embed
     * @param {string} alt text description of the image
     * @param {SummaryImageOptions} options (optional) addition image attributes
     *
     * @returns {Summary} summary instance
     */
    addImage(src: string, alt: string, options?: SummaryImageOptions): Summary;
    /**
     * Adds an HTML section heading element
     *
     * @param {string} text heading text
     * @param {number | string} [level=1] (optional) the heading level, default: 1
     *
     * @returns {Summary} summary instance
     */
    addHeading(text: string, level?: number | string): Summary;
    /**
     * Adds an HTML thematic break (<hr>) to the summary buffer
     *
     * @returns {Summary} summary instance
     */
    addSeparator(): Summary;
    /**
     * Adds an HTML line break (<br>) to the summary buffer
     *
     * @returns {Summary} summary instance
     */
    addBreak(): Summary;
    /**
     * Adds an HTML blockquote to the summary buffer
     *
     * @param {string} text quote text
     * @param {string} cite (optional) citation url
     *
     * @returns {Summary} summary instance
     */
    addQuote(text: string, cite?: string): Summary;
    /**
     * Adds an HTML anchor tag to the summary buffer
     *
     * @param {string} text link text/content
     * @param {string} href hyperlink
     *
     * @returns {Summary} summary instance
     */
    addLink(text: string, href: string): Summary;
}
/**
 * @deprecated use `core.summary`
 */
export declare const markdownSummary: Summary;
export declare const summary: Summary;
export {};
