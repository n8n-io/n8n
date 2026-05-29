import xss from 'xss';

/**
 * Returns `true` when the value contains no HTML tag markup.
 *
 * Sanitizes with an empty allow-list, but overrides `escapeHtml` to only
 * escape the tag-opening `<` character. Any real tag must start with `<`, so
 * tag-bearing input is still altered and rejected, while a standalone `>`
 * is preserved. This avoids false positives for common, harmless sequences
 * such as the `->` arrows used in workflow names.
 *
 * Use as a zod refine guard for user-supplied names (workflows, data tables,
 * user names, API keys, etc.).
 */
export const xssCheck = (value: string): boolean =>
	value === xss(value, { whiteList: {}, escapeHtml: (html) => html.replace(/</g, '&lt;') });
