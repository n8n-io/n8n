import type { Plugin, ConfigsToRules, ConfigEmojis, SEVERITY_TYPE } from './types.js';
export declare function getConfigsThatSetARule(plugin: Plugin, configsToRules: ConfigsToRules, pluginPrefix: string, ignoreConfig: readonly string[], severityType?: SEVERITY_TYPE): string[];
/**
 * Get config names that a given rule belongs to.
 * @param severityType - Include configs that set the rule to this severity. Omit to allow any severity.
 */
export declare function getConfigsForRule(ruleName: string, configsToRules: ConfigsToRules, pluginPrefix: string, severityType?: SEVERITY_TYPE): string[];
/**
 * Find the representation of a config to display.
 * @param configEmojis - known list of configs and corresponding emojis
 * @param configName - name of the config to find an emoji for
 * @param options
 * @param options.fallback - if true and no emoji is found, choose whether to fallback to a badge.
 * @returns the string to display for the config
 */
export declare function findConfigEmoji(configEmojis: ConfigEmojis, configName: string, options?: {
    fallback?: 'badge';
}): string | undefined;
/**
 * Get the emojis for the configs that set a rule to a certain severity.
 */
export declare function getEmojisForConfigsSettingRuleToSeverity(ruleName: string, configsToRulesWithoutIgnored: ConfigsToRules, pluginPrefix: string, configEmojis: ConfigEmojis, severityType: SEVERITY_TYPE): string[];
