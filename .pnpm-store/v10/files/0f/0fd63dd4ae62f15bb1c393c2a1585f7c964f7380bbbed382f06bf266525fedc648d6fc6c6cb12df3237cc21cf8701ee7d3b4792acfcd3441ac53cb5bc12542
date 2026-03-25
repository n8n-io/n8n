import { BEGIN_CONFIG_LIST_MARKER, END_CONFIG_LIST_MARKER, } from './comment-markers.js';
import { markdownTable } from 'markdown-table';
import { configNameToDisplay } from './config-format.js';
import { getEndOfLine, sanitizeMarkdownTable } from './string.js';
const EOL = getEndOfLine();
/**
 * Check potential locations for the config description.
 * These are not official properties.
 * The recommended/allowed way to add a description is still pending the outcome of: https://github.com/eslint/eslint/issues/17842
 * @param config
 * @returns the description if available
 */
function configToDescription(config) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (
    // @ts-expect-error -- description is not an official config property.
    config.description ||
        // @ts-expect-error -- description is not an official config property.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        config.meta?.description ||
        // @ts-expect-error -- description is not an official config property.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        config.meta?.docs?.description);
}
function generateConfigListMarkdown(plugin, configsToRules, pluginPrefix, configEmojis, configFormat, ignoreConfig) {
    /* istanbul ignore next -- configs are sure to exist at this point */
    const configs = Object.values(plugin.configs || {});
    const hasDescription = configs.some((config) => configToDescription(config));
    const listHeaderRow = ['', 'Name'];
    if (hasDescription) {
        listHeaderRow.push('Description');
    }
    const rows = [
        listHeaderRow,
        ...Object.keys(configsToRules)
            .filter((configName) => !ignoreConfig.includes(configName))
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
            .map((configName) => {
            const config = plugin.configs?.[configName];
            /* istanbul ignore next -- config should exist at this point */
            const description = config ? configToDescription(config) : undefined;
            return [
                configEmojis.find((obj) => obj.config === configName)?.emoji || '',
                `\`${configNameToDisplay(configName, configFormat, pluginPrefix)}\``,
                hasDescription ? description || '' : undefined,
            ].filter((col) => col !== undefined);
        }),
    ];
    return markdownTable(sanitizeMarkdownTable(rows), { align: 'l' });
}
export function updateConfigsList(markdown, plugin, configsToRules, pluginPrefix, configEmojis, configFormat, ignoreConfig) {
    const listStartIndex = markdown.indexOf(BEGIN_CONFIG_LIST_MARKER);
    let listEndIndex = markdown.indexOf(END_CONFIG_LIST_MARKER);
    if (listStartIndex === -1 || listEndIndex === -1) {
        // No config list found.
        return markdown;
    }
    if (Object.keys(configsToRules).filter((configName) => !ignoreConfig.includes(configName)).length === 0) {
        // No non-ignored configs found.
        return markdown;
    }
    // Account for length of pre-existing marker.
    listEndIndex += END_CONFIG_LIST_MARKER.length;
    const preList = markdown.slice(0, Math.max(0, listStartIndex));
    const postList = markdown.slice(Math.max(0, listEndIndex));
    // New config list.
    const list = generateConfigListMarkdown(plugin, configsToRules, pluginPrefix, configEmojis, configFormat, ignoreConfig);
    return `${preList}${BEGIN_CONFIG_LIST_MARKER}${EOL}${EOL}${list}${EOL}${EOL}${END_CONFIG_LIST_MARKER}${postList}`;
}
