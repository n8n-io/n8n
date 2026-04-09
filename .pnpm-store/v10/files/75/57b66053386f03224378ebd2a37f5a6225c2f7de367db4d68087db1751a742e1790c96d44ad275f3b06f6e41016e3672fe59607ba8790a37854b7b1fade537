import { mockPlugin } from './mock-plugin.js';
import { getEndOfLine } from './eol.js';
import { getResolvedOptions } from './options.js';
import { getPluginName, loadPlugin } from './package-json.js';
import { getPluginPrefix } from './plugin-prefix.js';
import { resolveConfigsToRules } from './plugin-config-resolution.js';
export async function getContext(path, userOptions, useMockPlugin = false) {
    const endOfLine = await getEndOfLine();
    const plugin = useMockPlugin ? mockPlugin : await loadPlugin(path);
    const pluginPrefix = getPluginPrefix(plugin.meta?.name ?? (await getPluginName(path)));
    const configsToRules = await resolveConfigsToRules(plugin);
    const options = getResolvedOptions(plugin, userOptions);
    return {
        configsToRules,
        endOfLine,
        options,
        path,
        plugin,
        pluginPrefix,
    };
}
