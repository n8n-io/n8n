/**
 * Generate a markdown
 * ([GFM](https://docs.github.com/en/github/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables))
 * table.
 *
 * @param {ReadonlyArray<ReadonlyArray<string | null | undefined>>} table
 *   Table data (matrix of strings).
 * @param {Readonly<Options> | null | undefined} [options]
 *   Configuration (optional).
 * @returns {string}
 *   Result.
 */
export function markdownTable(table: ReadonlyArray<ReadonlyArray<string | null | undefined>>, options?: Readonly<Options> | null | undefined): string;
/**
 * Configuration.
 */
export type MarkdownTableOptions = Options;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Whether to align the delimiters (default: `true`);
     * they are aligned by default:
     *
     * ```markdown
     * | Alpha | B     |
     * | ----- | ----- |
     * | C     | Delta |
     * ```
     *
     * Pass `false` to make them staggered:
     *
     * ```markdown
     * | Alpha | B |
     * | - | - |
     * | C | Delta |
     * ```
     */
    alignDelimiters?: boolean | null | undefined;
    /**
     * How to align columns (default: `''`);
     * one style for all columns or styles for their respective columns;
     * each style is either `'l'` (left), `'r'` (right), or `'c'` (center);
     * other values are treated as `''`, which doesn’t place the colon in the
     * alignment row but does align left;
     * *only the lowercased first character is used, so `Right` is fine.*
     */
    align?: ReadonlyArray<string | null | undefined> | string | null | undefined;
    /**
     * Whether to end each row with the delimiter (default: `true`).
     *
     * > 👉 **Note**: please don’t use this: it could create fragile structures
     * > that aren’t understandable to some markdown parsers.
     *
     * When `true`, there are ending delimiters:
     *
     * ```markdown
     * | Alpha | B     |
     * | ----- | ----- |
     * | C     | Delta |
     * ```
     *
     * When `false`, there are no ending delimiters:
     *
     * ```markdown
     * | Alpha | B
     * | ----- | -----
     * | C     | Delta
     * ```
     */
    delimiterEnd?: boolean | null | undefined;
    /**
     * Whether to begin each row with the delimiter (default: `true`).
     *
     * > 👉 **Note**: please don’t use this: it could create fragile structures
     * > that aren’t understandable to some markdown parsers.
     *
     * When `true`, there are starting delimiters:
     *
     * ```markdown
     * | Alpha | B     |
     * | ----- | ----- |
     * | C     | Delta |
     * ```
     *
     * When `false`, there are no starting delimiters:
     *
     * ```markdown
     * Alpha | B     |
     * ----- | ----- |
     * C     | Delta |
     * ```
     */
    delimiterStart?: boolean | null | undefined;
    /**
     * Whether to add a space of padding between delimiters and cells
     * (default: `true`).
     *
     * When `true`, there is padding:
     *
     * ```markdown
     * | Alpha | B     |
     * | ----- | ----- |
     * | C     | Delta |
     * ```
     *
     * When `false`, there is no padding:
     *
     * ```markdown
     * |Alpha|B    |
     * |-----|-----|
     * |C    |Delta|
     * ```
     */
    padding?: boolean | null | undefined;
    /**
     * Function to detect the length of table cell content (optional);
     * this is used when aligning the delimiters (`|`) between table cells;
     * full-width characters and emoji mess up delimiter alignment when viewing
     * the markdown source;
     * to fix this, you can pass this function,
     * which receives the cell content and returns its “visible” size;
     * note that what is and isn’t visible depends on where the text is displayed.
     *
     * Without such a function, the following:
     *
     * ```js
     * markdownTable([
     * ['Alpha', 'Bravo'],
     * ['中文', 'Charlie'],
     * ['👩‍❤️‍👩', 'Delta']
     * ])
     * ```
     *
     * Yields:
     *
     * ```markdown
     * | Alpha | Bravo |
     * | - | - |
     * | 中文 | Charlie |
     * | 👩‍❤️‍👩 | Delta |
     * ```
     *
     * With [`string-width`](https://github.com/sindresorhus/string-width):
     *
     * ```js
     * import stringWidth from 'string-width'
     *
     * markdownTable(
     * [
     * ['Alpha', 'Bravo'],
     * ['中文', 'Charlie'],
     * ['👩‍❤️‍👩', 'Delta']
     * ],
     * {stringLength: stringWidth}
     * )
     * ```
     *
     * Yields:
     *
     * ```markdown
     * | Alpha | Bravo   |
     * | ----- | ------- |
     * | 中文  | Charlie |
     * | 👩‍❤️‍👩    | Delta   |
     * ```
     */
    stringLength?: ((value: string) => number) | null | undefined;
};
//# sourceMappingURL=index.d.ts.map