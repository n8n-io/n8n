import { BlockTextBuilder } from "./lib/block-text-builder";

export type compiledFunction = (str: string) => string;
export type metaData = any;

/**
 * Preprocess options, compile selectors into a decision tree,
 * return a function intended for batch processing.
 */
export function compile(options?: HtmlToTextOptions): compiledFunction;

/**
 * Convert given HTML content to plain text string.
 *
 * @example
 * const { htmlToText } = require('html-to-text');
 * const text = htmlToText('<h1>Hello World</h1>', {
 *   wordwrap: 130
 * });
 * console.log(text); // HELLO WORLD
 */
export function htmlToText(html: string, options?: HtmlToTextOptions, metadata?: metaData): string;
export { htmlToText as convert };

export interface HtmlToTextOptions {
    /**
     * Options for narrowing down to informative parts of HTML document.
     */
    baseElements?: BaseElementsOptions | undefined;
    /**
     * Decode HTML entities found in the input HTML if true.
     * Otherwise preserve in output text.
     */
    decodeEntities?: boolean | undefined;
    /**
     * A dictionary with characters that should be replaced in the output
     * text and corresponding escape sequences.
     */
    encodeCharacters?: Record<string, string> | undefined;
    /**
     * A dictionary with custom formatting functions for specific kinds of elements.
     *
     * Keys are custom string identifiers, values are callbacks.
     */
    formatters?: Record<string, FormatCallback> | undefined;
    /**
     * Options for handling complex documents and limiting the output size.
     */
    limits?: LimitsOptions | undefined;
    /**
     * Describes how to wrap long words.
     */
    longWordSplit?: LongWordSplitOptions | undefined;
    /**
     * By default, any newlines `\n` from the input HTML are dropped.
     *
     * If `true`, these newlines will be preserved in the output.
     */
    preserveNewlines?: boolean | undefined;
    /**
     * Instructions for how to render HTML elements based on matched selectors.
     *
     * Use this to (re)define options for new or already supported tags.
     */
    selectors?: SelectorDefinition[] | undefined;
    /**
     * All characters that are considered whitespace.
     * Default is according to HTML specifications.
     */
    whitespaceCharacters?: string | undefined;
    /**
     * After how many chars a line break should follow in `p` elements.
     *
     * Set to `null` or `false` to disable word-wrapping.
     */
    wordwrap?: number | false | null | undefined;

    /**
     * The following are deprecated options.  See the documentation.
     */

    /**
     * @deprecated Use baseElements.selectors instead.
     */
    baseElement?: string | string[] | undefined;
    /**
     * @deprecated Use baseElements instead.
     */
    returnDomByDefault?: boolean | undefined;
    /**
     * @deprecated Use selectors with `format: 'dataTable'` instead.
     */
    tables?: string[] | boolean | undefined;
    /**
     * @deprecated Use selectors instead.
     */
    tags?: TagDefinitions | undefined;
}

/**
 * Options for narrowing down to informative parts of HTML document.
 */
export interface BaseElementsOptions {
    /**
     * The resulting text output will be composed from the text content of elements
     * matched with these selectors.
     */
    selectors?: string[] | undefined;
    /**
     * When multiple selectors are set, this option specifies
     * whether the selectors order has to be reflected in the output text.
     *
     * `'selectors'` (default) - matches for the first selector will appear first, etc;
     *
     * `'occurrence'` - all bases will appear in the same order as in input HTML.
     */
    orderBy?: "selectors" | "occurrence" | undefined;
    /**
     * Use the entire document if none of provided selectors matched.
     */
    returnDomByDefault?: boolean | undefined;
}

/**
 * Options for handling complex documents and limiting the output size.
 */
export interface LimitsOptions {
    /**
     * ...]
     * A string to put in place of skipped content.
     */
    ellipsis?: string | undefined;
    /**
     * Stop looking for more base elements after reaching this amount.
     *
     * Unlimited if undefined.
     */
    maxBaseElements?: number | undefined;
    /**
     * Maximum number of child nodes of a single node to be added to the
     * output. Unlimited if undefined.
     */
    maxChildNodes?: number | undefined;
    /**
     * Only go to a certain depth starting from `Options.baseElement`.
     *
     * Replace deeper nodes with ellipsis.
     *
     * No depth limit if undefined.
     */
    maxDepth?: number | undefined;
    /**
     * If the input string is longer than this value - it will be truncated
     * and a message will be sent to `stderr`.
     *
     * Ellipsis is not used in this case.
     */
    maxInputLength?: number | undefined;
}

/**
 * Describes how to wrap long words.
 */
export interface LongWordSplitOptions {
    /**
     * Break long words on the `Options.wordwrap` limit when there are no characters to wrap on.
     */
    forceWrapOnLimit?: boolean | undefined;
    /**
     * An array containing the characters that may be wrapped on.
     */
    wrapCharacters?: string[] | undefined;
}

/**
 * Describes how to handle tags matched by a selector.
 */
export interface SelectorDefinition {
    /**
     * CSS selector. Refer to README for notes on supported selectors etc.
     */
    selector: string;
    /**
     * Identifier of a {@link FormatCallback}, built-in or provided in `Options.formatters` dictionary.
     */
    format?: string | undefined;
    /**
     * Options to customize the formatter for this tag.
     */
    options?: FormatOptions | undefined;
}

/**
 * Describes how to handle a tag.
 */
export interface TagDefinition {
    /**
     * Identifier of a {@link FormatCallback}, built-in or provided in `Options.formatters` dictionary.
     */
    format?: string | undefined;
    /**
     * Options to customize the formatter for this tag.
     */
    options?: FormatOptions | undefined;
}

/**
 * Options specific to different formatters ({@link FormatCallback}).
 * This is an umbrella type definition. Each formatter supports it's own subset of options.
 */
export interface FormatOptions {
    /**
     * Number of line breaks to separate previous block from this one.
     *
     * Note that N+1 line breaks are needed to make N empty lines.
     */
    leadingLineBreaks?: number | undefined;
    /**
     * Number of line breaks to separate this block from the next one.
     *
     * Note that N+1 line breaks are needed to make N empty lines.
     */
    trailingLineBreaks?: number | undefined;
    /**
     * (Only for: `anchor` and `image` formatters.) Server host for link `href` attributes and image `src` attributes
     * relative to the root (the ones that start with `/`).
     *
     * For example, with `baseUrl = 'http://asdf.com'` and `<a href='/dir/subdir'>...</a>`
     * the link in the text will be `http://asdf.com/dir/subdir`.
     *
     * Keep in mind that `baseUrl` should not end with a `/`.
     */
    baseUrl?: string | undefined;
    /**
     * Surround links with these brackets.<br/>Set to `false` or `['', '']` to disable.
     * @default ['[', ']']
     */
    linkBrackets?: [string, string] | false | undefined;
    /**
     * (Only for: `anchor` and `image` formatters.) A function to rewrite link
     * href attributes and image src attributes. Applied before baseUrl.
     */
    pathRewrite?: ((path: string, meta: metaData) => string) | undefined;
    /**
     * (Only for: `anchor` formatter.) By default links are translated in the following way:
     *
     * `<a href='link'>text</a>` => becomes => `text [link]`.
     *
     * If this option is set to `true` and `link` and `text` are the same,
     * `[link]` will be omitted and only `text` will be present.
     */
    hideLinkHrefIfSameAsText?: boolean | undefined;
    /**
     * (Only for: `anchor` formatter.) Ignore all links. Only process internal text of anchor tags.
     */
    ignoreHref?: boolean | undefined;
    /**
     * (Only for: `anchor` formatter.) Ignore anchor links (where `href='#...'`).
     */
    noAnchorUrl?: boolean | undefined;
    /**
     * (Only for: `unorderedList` formatter.) String prefix for each list item.
     */
    itemPrefix?: string | undefined;
    /**
     * (Only for: `heading` formatter.) By default, headings (`<h1>`, `<h2>`, etc) are uppercased.
     *
     * Set this to `false` to leave headings as they are.
     */
    uppercase?: boolean | undefined;
    /**
     * (Only for: `horizontalLine` formatter.) Length of the `<hr/>` line.
     *
     * If numeric value is provided - it is used.
     * Otherwise, if global `wordwrap` number is provided - it is used.
     * If neither is true, then the fallback value of 40 is used.
     */
    length?: number | undefined;
    /**
     * (Only for: `blockquote` formatter.) Trim empty lines from blockquote.
     */
    trimEmptyLines?: boolean | undefined;
    /**
     * (Only for: `table`, `dataTable` formatter.) By default, heading cells (`<th>`) are uppercased.
     *
     * Set this to `false` to leave heading cells as they are.
     */
    uppercaseHeaderCells?: boolean | undefined;
    /**
     * (Only for: `table`, `dataTable` formatter.) Data table cell content will be wrapped to fit this width
     * instead of global `wordwrap` limit.
     *
     * Set to `undefined` in order to fall back to `wordwrap` limit.
     */
    maxColumnWidth?: number | undefined;
    /**
     * (Only for: `table`, `dataTable` formatter.) Number of spaces between data table columns.
     */
    colSpacing?: number | undefined;
    /**
     * (Only for: `table`, `dataTable` formatter.) Number of empty lines between data table rows.
     */
    rowSpacing?: number | undefined;
    /**
     * (Only for: `blockString`, `inlineString` formatters.) A string to be inserted in place of a tag.
     */
    string?: string | undefined;
    /**
     * (Only for: `inlineSurround` formatter.) String prefix to be inserted before inline tag contents.
     */
    prefix?: string | undefined;
    /**
     * (Only for: `inlineSurround` formatter.) String suffix to be inserted after inline tag contents.
     */
    suffix?: string | undefined;
    /**
     * User defined values are supported.
     */
    [key: string]: any;
    /**
     * @deprecated Use linkBrackets instead.
     * (Only for: `anchor` formatter.) Don't print brackets around links.
     */
    noLinkBrackets?: boolean | undefined;
}

/**
 * Simplified definition of [htmlparser2](https://github.com/fb55/htmlparser2) Node type.
 *
 * Makes no distinction between elements (tags) and data nodes (good enough for now).
 */
export interface DomNode {
    /**
     * Type of node - "text", "tag", "comment", "script", etc.
     */
    type: string;
    /**
     * Content of a data node.
     */
    data?: string | undefined;
    /**
     * Tag name.
     */
    name?: string | undefined;
    /**
     * Tag attributes dictionary.
     */
    attribs?: any;
    /**
     * Child nodes.
     * Not optional for typescript use.
     */
    children: DomNode[];
    /**
     * Parent node.
     */
    parent?: DomNode | undefined;
}

/**
 * A function to stringify a DOM node.
 */
export type FormatCallback = (
    elem: DomNode,
    walk: RecursiveCallback,
    builder: BlockTextBuilder,
    formatOptions: FormatOptions,
) => void;

/**
 * A function to process child nodes.
 * Passed into a {@link FormatCallback} as an argument.
 */
export type RecursiveCallback = (nodes: DomNode[], builder: BlockTextBuilder) => void;

/**
 * Type of object passed to tags in the options.
 */
export interface TagDefinitions {
    ""?: TagDefinition | undefined;
    a?: TagDefinition | undefined;
    article?: TagDefinition | undefined;
    aside?: TagDefinition | undefined;
    blockquote?: TagDefinition | undefined;
    br?: TagDefinition | undefined;
    div?: TagDefinition | undefined;
    footer?: TagDefinition | undefined;
    form?: TagDefinition | undefined;
    h1?: TagDefinition | undefined;
    h2?: TagDefinition | undefined;
    h3?: TagDefinition | undefined;
    h4?: TagDefinition | undefined;
    h5?: TagDefinition | undefined;
    h6?: TagDefinition | undefined;
    header?: TagDefinition | undefined;
    hr?: TagDefinition | undefined;
    img?: TagDefinition | undefined;
    main?: TagDefinition | undefined;
    nav?: TagDefinition | undefined;
    ol?: TagDefinition | undefined;
    p?: TagDefinition | undefined;
    pre?: TagDefinition | undefined;
    table?: TagDefinition | undefined;
    ul?: TagDefinition | undefined;
    wbr?: TagDefinition | undefined;
}
