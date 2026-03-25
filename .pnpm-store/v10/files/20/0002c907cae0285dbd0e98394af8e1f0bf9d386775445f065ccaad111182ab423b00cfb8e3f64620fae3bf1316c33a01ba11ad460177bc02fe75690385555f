import { EMOJI_DEPRECATED, EMOJI_FIXABLE, EMOJI_HAS_SUGGESTIONS, EMOJI_OPTIONS, EMOJI_REQUIRES_TYPE_CHECKING, EMOJI_TYPE, EMOJI_CONFIG_FROM_SEVERITY, } from './emojis.js';
import { findConfigEmoji, getConfigsThatSetARule } from './plugin-configs.js';
import { COLUMN_TYPE, SEVERITY_TYPE, } from './types.js';
import { RULE_TYPE_MESSAGES_LEGEND, RULE_TYPES } from './rule-type.js';
import { configNameToDisplay } from './config-format.js';
import { getEndOfLine } from './string.js';
const EOL = getEndOfLine();
export const SEVERITY_TYPE_TO_WORD = {
    [SEVERITY_TYPE.error]: 'enabled',
    [SEVERITY_TYPE.warn]: 'set to warn',
    [SEVERITY_TYPE.off]: 'disabled',
};
// A few individual legends declared here just so they can be reused in multiple legends.
const LEGEND_FIXABLE = `${EMOJI_FIXABLE} Automatically fixable by the [\`--fix\` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).`;
const LEGEND_HAS_SUGGESTIONS = `${EMOJI_HAS_SUGGESTIONS} Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).`;
/**
 * An object containing the legends for each column (as a string or function to generate the string).
 */
const LEGENDS = {
    [COLUMN_TYPE.CONFIGS_ERROR]: ({ plugin, configsToRules, configEmojis, pluginPrefix, urlConfigs, ignoreConfig, }) => [
        getLegendForConfigColumnOfSeverity({
            plugin,
            configsToRules,
            configEmojis,
            pluginPrefix,
            urlConfigs,
            severityType: SEVERITY_TYPE.error,
            ignoreConfig,
        }),
    ],
    [COLUMN_TYPE.CONFIGS_OFF]: ({ plugin, configsToRules, configEmojis, pluginPrefix, urlConfigs, ignoreConfig, }) => [
        getLegendForConfigColumnOfSeverity({
            plugin,
            configsToRules,
            configEmojis,
            pluginPrefix,
            urlConfigs,
            severityType: SEVERITY_TYPE.off,
            ignoreConfig,
        }),
    ],
    [COLUMN_TYPE.CONFIGS_WARN]: ({ plugin, configsToRules, configEmojis, pluginPrefix, urlConfigs, ignoreConfig, }) => [
        getLegendForConfigColumnOfSeverity({
            plugin,
            configsToRules,
            configEmojis,
            pluginPrefix,
            urlConfigs,
            severityType: SEVERITY_TYPE.warn,
            ignoreConfig,
        }),
    ],
    // Legends are included for each rule type present.
    [COLUMN_TYPE.TYPE]: ({ plugin }) => {
        /* istanbul ignore next -- this shouldn't happen */
        if (!plugin.rules) {
            throw new Error('Should not be attempting to display type column when there are no rules.');
        }
        const rules = plugin.rules;
        const legends = [];
        let hasAnyRuleType = false;
        for (const ruleType of RULE_TYPES) {
            const hasThisRuleType = Object.values(rules).some((rule) => typeof rule === 'object' && rule.meta?.type === ruleType);
            if (hasThisRuleType) {
                if (!hasAnyRuleType) {
                    hasAnyRuleType = true;
                    // Add general rule type emoji first.
                    legends.push(`${EMOJI_TYPE} The type of rule.`);
                }
                legends.push(RULE_TYPE_MESSAGES_LEGEND[ruleType]);
            }
        }
        return legends;
    },
    // Simple strings.
    [COLUMN_TYPE.DEPRECATED]: [`${EMOJI_DEPRECATED} Deprecated.`],
    [COLUMN_TYPE.DESCRIPTION]: undefined,
    [COLUMN_TYPE.FIXABLE]: [LEGEND_FIXABLE],
    [COLUMN_TYPE.FIXABLE_AND_HAS_SUGGESTIONS]: [
        LEGEND_FIXABLE,
        LEGEND_HAS_SUGGESTIONS,
    ],
    [COLUMN_TYPE.HAS_SUGGESTIONS]: [LEGEND_HAS_SUGGESTIONS],
    [COLUMN_TYPE.NAME]: undefined,
    [COLUMN_TYPE.OPTIONS]: [`${EMOJI_OPTIONS} Has configuration options.`],
    [COLUMN_TYPE.REQUIRES_TYPE_CHECKING]: [
        `${EMOJI_REQUIRES_TYPE_CHECKING} Requires [type information](https://typescript-eslint.io/linting/typed-linting).`,
    ],
};
function getLegendForConfigColumnOfSeverity({ plugin, urlConfigs, severityType, }) {
    /* istanbul ignore next -- this shouldn't happen */
    if (!plugin.configs || !plugin.rules) {
        throw new Error('Should not be attempting to display configs column when there are no configs/rules.');
    }
    // Add link to configs documentation if provided.
    const configsLinkOrWord = urlConfigs
        ? `[Configurations](${urlConfigs})`
        : 'Configurations';
    return `${EMOJI_CONFIG_FROM_SEVERITY[severityType]} ${configsLinkOrWord} ${SEVERITY_TYPE_TO_WORD[severityType]} in.`;
}
function getLegendsForIndividualConfigs({ plugin, configsToRules, configEmojis, configFormat, pluginPrefix, urlConfigs, ignoreConfig, }) {
    /* istanbul ignore next -- this shouldn't happen */
    if (!plugin.configs || !plugin.rules) {
        throw new Error('Should not be attempting to display configs column when there are no configs/rules.');
    }
    // Add link to configs documentation if provided.
    const configLinkOrWord = urlConfigs
        ? `[configuration](${urlConfigs})`
        : 'configuration';
    const configNamesThatSetRuleToThisSeverity = getConfigsThatSetARule(plugin, configsToRules, pluginPrefix, ignoreConfig);
    return configNamesThatSetRuleToThisSeverity.flatMap((configName) => {
        const emoji = findConfigEmoji(configEmojis, configName);
        if (!emoji) {
            // No legend for this config as it has no emoji.
            return [];
        }
        return [
            `${emoji} Set in the \`${configNameToDisplay(configName, configFormat, pluginPrefix)}\` ${configLinkOrWord}.`,
        ];
    });
}
export function generateLegend(columns, plugin, configsToRules, configEmojis, configFormat, pluginPrefix, ignoreConfig, urlConfigs) {
    const legends = Object.entries(columns).flatMap(([columnType, enabled]) => {
        if (!enabled) {
            // This column is turned off.
            return [];
        }
        const legendArrayOrFn = LEGENDS[columnType];
        if (!legendArrayOrFn) {
            // No legend specified for this column.
            return [];
        }
        return typeof legendArrayOrFn === 'function'
            ? legendArrayOrFn({
                plugin,
                configsToRules,
                configEmojis,
                configFormat,
                pluginPrefix,
                urlConfigs,
                ignoreConfig,
            })
            : legendArrayOrFn;
    });
    if (legends.some((legend) => legend.includes('Configurations'))) {
        // Add legends for individual configs after the config column legend(s).
        const legendsForIndividualConfigs = getLegendsForIndividualConfigs({
            plugin,
            configsToRules,
            configEmojis,
            configFormat,
            pluginPrefix,
            urlConfigs,
            ignoreConfig,
        });
        const finalConfigHeaderLegendPosition = Math.max(...Object.values(SEVERITY_TYPE_TO_WORD).map((word) => legends.findIndex((legend) => legend.includes(word))));
        legends.splice(finalConfigHeaderLegendPosition + 1, 0, ...legendsForIndividualConfigs);
    }
    return legends.join(`\\${EOL}`); // Back slash ensures these end up displayed on separate lines.
}
