import { COLUMN_TYPE } from './types.js';
import type { ConfigsToRules, Plugin, RuleNamesAndRules } from './types.js';
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
export declare function getColumns(plugin: Plugin, ruleNamesAndRules: RuleNamesAndRules, configsToRules: ConfigsToRules, ruleListColumns: readonly COLUMN_TYPE[], pluginPrefix: string, ignoreConfig: readonly string[]): Record<COLUMN_TYPE, boolean>;
