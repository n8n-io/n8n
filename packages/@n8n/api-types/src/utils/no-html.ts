import xss from 'xss';

/**
 * Returns `true` when the value contains no HTML markup.
 *
 * Used as a zod refine guard for user-supplied names (workflows, data tables,
 * user names, API keys, etc.) to keep persisted strings free of markup.
 */
export const containsNoHtml = (value: string): boolean => value === xss(value, { whiteList: {} });

export const NO_HTML_MESSAGE = 'Name cannot contain HTML';
