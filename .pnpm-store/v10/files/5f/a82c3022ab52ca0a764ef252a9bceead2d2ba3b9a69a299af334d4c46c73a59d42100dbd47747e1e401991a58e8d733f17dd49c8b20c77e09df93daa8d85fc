import { SEVERITY_TYPE_TO_SET } from './types.js';
export function getConfigsThatSetARule(plugin, configsToRules, pluginPrefix, ignoreConfig, severityType) {
    /* istanbul ignore next -- this shouldn't happen */
    if (!plugin.rules) {
        throw new Error('Missing rules in plugin.');
    }
    const ruleNames = Object.keys(plugin.rules);
    return (Object.entries(configsToRules)
        .filter(([configName]) => 
    // Only consider configs that configure at least one of the plugin's rules.
    ruleNames.some((ruleName) => getConfigsForRule(ruleName, configsToRules, pluginPrefix, severityType).includes(configName)))
        // Filter out ignored configs.
        .filter(([configName]) => !ignoreConfig.includes(configName))
        .map(([configName]) => configName)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
}
/**
 * Get config names that a given rule belongs to.
 * @param severityType - Include configs that set the rule to this severity. Omit to allow any severity.
 */
export function getConfigsForRule(ruleName, configsToRules, pluginPrefix, severityType) {
    const severity = severityType
        ? SEVERITY_TYPE_TO_SET[severityType]
        : undefined;
    const configNames = [];
    for (const configName in configsToRules) {
        const rules = configsToRules[configName];
        const value = rules[`${pluginPrefix}/${ruleName}`];
        const isSet = ((typeof value === 'string' || typeof value === 'number') &&
            (!severity || severity.has(value))) ||
            (typeof value === 'object' &&
                Array.isArray(value) &&
                value.length > 0 &&
                (!severity || severity.has(value[0])));
        if (isSet) {
            configNames.push(configName);
        }
    }
    return configNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
/**
 * Find the representation of a config to display.
 * @param configEmojis - known list of configs and corresponding emojis
 * @param configName - name of the config to find an emoji for
 * @param options
 * @param options.fallback - if true and no emoji is found, choose whether to fallback to a badge.
 * @returns the string to display for the config
 */
export function findConfigEmoji(configEmojis, configName, options) {
    let emoji = configEmojis.find((configEmoji) => configEmoji.config === configName)?.emoji;
    if (!emoji) {
        if (options?.fallback === 'badge') {
            emoji = `![badge-${configName}][]`;
        }
        else {
            // No fallback.
            return undefined;
        }
    }
    return emoji;
}
/**
 * Get the emojis for the configs that set a rule to a certain severity.
 */
export function getEmojisForConfigsSettingRuleToSeverity(ruleName, configsToRulesWithoutIgnored, pluginPrefix, configEmojis, severityType) {
    const configsOfThisSeverity = getConfigsForRule(ruleName, configsToRulesWithoutIgnored, pluginPrefix, severityType);
    const emojis = [];
    for (const configName of configsOfThisSeverity) {
        // Find the emoji for each config or otherwise use a badge that can be defined in markdown.
        const emoji = findConfigEmoji(configEmojis, configName, {
            fallback: 'badge',
        });
        /* istanbul ignore next -- this shouldn't happen */
        if (typeof emoji !== 'string') {
            throw new TypeError('Emoji will always be a string thanks to fallback');
        }
        emojis.push(emoji);
    }
    return emojis;
}
