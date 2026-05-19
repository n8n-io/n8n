import xss from 'xss';

/**
 * Returns `true` when the value is preserved by `xss({ whiteList: {} })`,
 * i.e. contains no HTML-significant characters.
 *
 * Use as a zod refine guard for user-supplied names (workflows, data tables,
 * user names, API keys, etc.).
 */
export const xssCheck = (value: string): boolean => value === xss(value, { whiteList: {} });
