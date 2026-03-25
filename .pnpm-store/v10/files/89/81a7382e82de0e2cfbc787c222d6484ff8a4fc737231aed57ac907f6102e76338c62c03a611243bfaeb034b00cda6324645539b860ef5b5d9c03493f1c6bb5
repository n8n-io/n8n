import { COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING, NOTICE_TYPE_DEFAULT_PRESENCE_AND_ORDERING, } from './options.js';
import { COLUMN_TYPE, NOTICE_TYPE } from './types.js';
import { EMOJI_CONFIGS, EMOJI_CONFIG_ERROR, RESERVED_EMOJIS, } from './emojis.js';
/**
 * Parse the options, check for errors, and set defaults.
 */
export function parseConfigEmojiOptions(plugin, configEmoji) {
    const configsSeen = new Set();
    const configsWithDefaultEmojiRemoved = [];
    const configEmojis = configEmoji?.flatMap((configEmojiItem) => {
        const [config, emoji, ...extra] = configEmojiItem;
        // Check for duplicate configs.
        if (configsSeen.has(config)) {
            throw new Error(`Duplicate config name in configEmoji options: ${config}`);
        }
        else {
            configsSeen.add(config);
        }
        if (config && !emoji && Object.keys(EMOJI_CONFIGS).includes(config)) {
            // User wants to remove the default emoji for this config.
            configsWithDefaultEmojiRemoved.push(config);
            return [];
        }
        if (!config || !emoji || extra.length > 0) {
            throw new Error(`Invalid configEmoji option: ${String(configEmojiItem)}. Expected format: config,emoji`);
        }
        if (plugin.configs?.[config] === undefined) {
            throw new Error(`Invalid configEmoji option: ${config} config not found.`);
        }
        if (RESERVED_EMOJIS.includes(emoji)) {
            throw new Error(`Cannot specify reserved emoji ${EMOJI_CONFIG_ERROR}.`);
        }
        return [{ config, emoji }];
    }) || [];
    // Add default emojis for the common configs for which the user hasn't already specified an emoji.
    for (const [config, emoji] of Object.entries(EMOJI_CONFIGS)) {
        if (configsWithDefaultEmojiRemoved.includes(config)) {
            // Skip the default emoji for this config.
            continue;
        }
        if (!configEmojis.some((configEmoji) => configEmoji.config === config)) {
            configEmojis.push({ config, emoji });
        }
    }
    return configEmojis;
}
/**
 * Parse the option, check for errors, and set defaults.
 */
export function parseRuleListColumnsOption(ruleListColumns) {
    const values = [...(ruleListColumns ?? [])];
    const VALUES_OF_TYPE = new Set(Object.values(COLUMN_TYPE).map(String));
    // Check for invalid.
    const invalid = values.find((val) => !VALUES_OF_TYPE.has(val));
    if (invalid) {
        throw new Error(`Invalid ruleListColumns option: ${invalid}`);
    }
    if (values.length !== new Set(values).size) {
        throw new Error('Duplicate value detected in ruleListColumns option.');
    }
    if (values.length === 0) {
        // Use default presence and ordering.
        values.push(...Object.entries(COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
            .filter(([_type, enabled]) => enabled)
            .map(([type]) => type));
    }
    return values;
}
/**
 * Parse the option, check for errors, and set defaults.
 */
export function parseRuleDocNoticesOption(ruleDocNotices) {
    const values = [...(ruleDocNotices ?? [])];
    const VALUES_OF_TYPE = new Set(Object.values(NOTICE_TYPE).map(String));
    // Check for invalid.
    const invalid = values.find((val) => !VALUES_OF_TYPE.has(val));
    if (invalid) {
        throw new Error(`Invalid ruleDocNotices option: ${invalid}`);
    }
    if (values.length !== new Set(values).size) {
        throw new Error('Duplicate value detected in ruleDocNotices option.');
    }
    if (values.length === 0) {
        // Use default presence and ordering.
        values.push(...Object.entries(NOTICE_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
            .filter(([_type, enabled]) => enabled)
            .map(([type]) => type));
    }
    return values;
}
