import { EMOJI_DEPRECATED, EMOJI_FIXABLE, EMOJI_HAS_SUGGESTIONS, EMOJI_REQUIRES_TYPE_CHECKING, EMOJI_TYPE, EMOJI_CONFIG_FROM_SEVERITY, EMOJI_OPTIONS, } from './emojis.js';
import { RULE_TYPES } from './rule-type.js';
import { COLUMN_TYPE, SEVERITY_TYPE } from './types.js';
import { getConfigsThatSetARule } from './plugin-configs.js';
import { hasOptions } from './rule-options.js';
/**
 * An object containing the column header for each column (as a string or function to generate the string).
 */
export const COLUMN_HEADER = {
    [COLUMN_TYPE.NAME]: ({ ruleNamesAndRules }) => {
        const ruleNames = ruleNamesAndRules.map(([name]) => name);
        const longestRuleNameLength = Math.max(...ruleNames.map(({ length }) => length));
        const ruleDescriptions = ruleNamesAndRules.map(([, rule]) => rule.meta?.docs?.description);
        const longestRuleDescriptionLength = Math.max(...ruleDescriptions.map((description) => description ? description.length : 0));
        const title = 'Name';
        // Add nbsp spaces to prevent rule names from wrapping to multiple lines.
        // Generally only needed when long descriptions are present causing the name column to wrap.
        const spaces = ruleNames.length > 0 &&
            longestRuleDescriptionLength >= 60 &&
            longestRuleNameLength > title.length
            ? ' '.repeat(longestRuleNameLength - title.length) // U+00A0 nbsp character.
            : '';
        return `${title}${spaces}`;
    },
    // Simple strings.
    [COLUMN_TYPE.CONFIGS_ERROR]: EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.error],
    [COLUMN_TYPE.CONFIGS_OFF]: EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.off],
    [COLUMN_TYPE.CONFIGS_WARN]: EMOJI_CONFIG_FROM_SEVERITY[SEVERITY_TYPE.warn],
    [COLUMN_TYPE.DEPRECATED]: EMOJI_DEPRECATED,
    [COLUMN_TYPE.DESCRIPTION]: 'Description',
    [COLUMN_TYPE.FIXABLE]: EMOJI_FIXABLE,
    [COLUMN_TYPE.FIXABLE_AND_HAS_SUGGESTIONS]: `${EMOJI_FIXABLE}${EMOJI_HAS_SUGGESTIONS}`,
    [COLUMN_TYPE.HAS_SUGGESTIONS]: EMOJI_HAS_SUGGESTIONS,
    [COLUMN_TYPE.OPTIONS]: EMOJI_OPTIONS,
    [COLUMN_TYPE.REQUIRES_TYPE_CHECKING]: EMOJI_REQUIRES_TYPE_CHECKING,
    [COLUMN_TYPE.TYPE]: EMOJI_TYPE,
};
/**
 * Decide what columns to display for the rules list.
 * Only display columns for which there is at least one rule that has a value for that column.
 */
export function getColumns(plugin, ruleNamesAndRules, configsToRules, ruleListColumns, pluginPrefix, ignoreConfig) {
    const columns = {
        // Alphabetical order.
        [COLUMN_TYPE.CONFIGS_ERROR]: getConfigsThatSetARule(plugin, configsToRules, pluginPrefix, ignoreConfig, SEVERITY_TYPE.error).length > 0,
        [COLUMN_TYPE.CONFIGS_OFF]: getConfigsThatSetARule(plugin, configsToRules, pluginPrefix, ignoreConfig, SEVERITY_TYPE.off).length > 0,
        [COLUMN_TYPE.CONFIGS_WARN]: getConfigsThatSetARule(plugin, configsToRules, pluginPrefix, ignoreConfig, SEVERITY_TYPE.warn).length > 0,
        [COLUMN_TYPE.DEPRECATED]: ruleNamesAndRules.some(([, rule]) => rule.meta?.deprecated),
        [COLUMN_TYPE.DESCRIPTION]: ruleNamesAndRules.some(([, rule]) => rule.meta?.docs?.description),
        [COLUMN_TYPE.FIXABLE]: ruleNamesAndRules.some(([, rule]) => rule.meta?.fixable),
        [COLUMN_TYPE.FIXABLE_AND_HAS_SUGGESTIONS]: ruleNamesAndRules.some(([, rule]) => rule.meta?.fixable || rule.meta?.hasSuggestions),
        [COLUMN_TYPE.HAS_SUGGESTIONS]: ruleNamesAndRules.some(([, rule]) => rule.meta?.hasSuggestions),
        [COLUMN_TYPE.NAME]: true,
        [COLUMN_TYPE.OPTIONS]: ruleNamesAndRules.some(([, rule]) => hasOptions(rule.meta?.schema)),
        [COLUMN_TYPE.REQUIRES_TYPE_CHECKING]: ruleNamesAndRules.some(
        // @ts-expect-error -- TODO: requiresTypeChecking type not present
        ([, rule]) => rule.meta?.docs?.requiresTypeChecking),
        // Show type column only if we found at least one rule with a standard type.
        [COLUMN_TYPE.TYPE]: ruleNamesAndRules.some(([, rule]) => rule.meta?.type && RULE_TYPES.includes(rule.meta?.type)),
    };
    // Recreate object using the ordering and presence of columns specified in ruleListColumns.
    return Object.fromEntries(ruleListColumns.map((type) => [type, columns[type]]));
}
