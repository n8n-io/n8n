/**
 * Returns the width of a single character in terminal columns.
 * @param ucs - The Unicode code point of the character
 * @returns The width of the character in terminal columns:
 *          - 0 for null character
 *          - -1 for control characters
 *          - 0 for non-spacing characters
 *          - 1 for normal characters
 *          - 2 for wide characters (East Asian)
 */
declare function wcwidth(ucs: number): number;

/**
 * Returns the width of a string in terminal columns.
 * @param pwcs - The string to measure
 * @returns The width of the string in terminal columns, or -1 if the string contains control characters
 */
declare function wcswidth(pwcs: string): number;

export { wcwidth, wcswidth };
