import { COLUMN_TYPE } from './types.js';
import type { RuleNamesAndRules } from './types.js';
import { Context } from './context.js';
/**
 * An object containing the column header for each column (as a string or function to generate the string).
 */
export declare const COLUMN_HEADER: {
    [key in COLUMN_TYPE]: string | ((data: {
        ruleNamesAndRules: RuleNamesAndRules;
    }) => string);
};
/**
 * Decide what columns to display for the rules list.
 * Only display columns for which there is at least one rule that has a value for that column.
 */
export declare function getColumns(context: Context, ruleNamesAndRules: RuleNamesAndRules): Record<COLUMN_TYPE, boolean>;
