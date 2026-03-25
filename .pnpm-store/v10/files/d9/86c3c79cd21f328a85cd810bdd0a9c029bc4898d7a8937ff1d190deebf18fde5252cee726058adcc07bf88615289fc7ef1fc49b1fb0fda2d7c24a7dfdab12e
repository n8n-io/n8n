export interface NodeHtmlMarkdownOptions {
    /**
     * Use native window DOMParser when available
     * @default false
     */
    preferNativeParser: boolean;
    /**
     * Code block fence
     * @default ```
     */
    codeFence: string;
    /**
     * Bullet marker
     * @default *
     */
    bulletMarker: string;
    /**
     * Style for code block
     * @default fence
     */
    codeBlockStyle: 'indented' | 'fenced';
    /**
     * Emphasis delimiter
     * @default _
     */
    emDelimiter: string;
    /**
     * Strong delimiter
     * @default **
     */
    strongDelimiter: string;
    /**
     * Supplied elements will be ignored (ignores inner text does not parse children)
     */
    readonly ignore?: string[];
    /**
     * Supplied elements will be treated as blocks (surrounded with blank lines)
     */
    readonly blockElements?: string[];
    /**
     * Max consecutive new lines allowed
     * @default 3
     */
    maxConsecutiveNewlines: number;
    /**
     * Line Start Escape pattern
     * (Note: Setting this will override the default escape settings, you might want to use textReplace option instead)
     */
    lineStartEscape: [pattern: RegExp, replacement: string];
    /**
     * Global escape pattern
     * (Note: Setting this will override the default escape settings, you might want to use textReplace option instead)
     */
    globalEscape: [pattern: RegExp, replacement: string];
    /**
     * User-defined text replacement pattern (Replaces matching text retrieved from nodes)
     */
    textReplace?: [pattern: RegExp, replacement: string][];
    /**
     * Keep images with data: URI (Note: These can be up to 1MB each)
     * @example
     * <img src="data:image/gif;base64,R0lGODlhEAAQAMQAAORHHOVSK......0o/">
     * @default false
     */
    keepDataImages?: boolean;
    /**
     * Place URLS at the bottom and format links using link reference definitions
     *
     * @example
     * Click <a href="/url1">here</a>. Or <a href="/url2">here</a>. Or <a href="/url1">this link</a>.
     *
     * Becomes:
     * Click [here][1]. Or [here][2]. Or [this link][1].
     *
     * [1]: /url
     * [2]: /url2
     */
    useLinkReferenceDefinitions?: boolean;
}
