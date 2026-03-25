"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determinePriority = void 0;
/**
 * This function is responsible for locating the correct plugin to use for a named command id
 * It searches the {Config} registered commands to match either the raw command id or the command alias
 * It is possible that more than one command will be found. This is due the ability of two distinct plugins to
 * create the same command or command alias.
 *
 * In the case of more than one found command, the function will select the command based on the order in which
 * the plugin is included in the package.json `oclif.plugins` list. The command that occurs first in the list
 * is selected as the command to run.
 *
 * Commands can also be present from either an install or a link. When a command is one of these and a core plugin
 * is present, this function defers to the core plugin.
 *
 * If there is not a core plugin command present, this function will return the first
 * plugin as discovered (will not change the order)
 *
 * @param commands commands to determine the priority of
 * @returns command instance {Command.Loadable} or undefined
 */
function determinePriority(plugins, commands) {
    const commandPlugins = commands.sort((a, b) => {
        const pluginAliasA = a.pluginAlias ?? 'A-Cannot-Find-This';
        const pluginAliasB = b.pluginAlias ?? 'B-Cannot-Find-This';
        const aIndex = plugins.indexOf(pluginAliasA);
        const bIndex = plugins.indexOf(pluginAliasB);
        // When both plugin types are 'core' plugins sort based on index
        if (a.pluginType === 'core' && b.pluginType === 'core') {
            // If b appears first in the pjson.plugins sort it first
            return aIndex - bIndex;
        }
        // if b is a core plugin and a is not sort b first
        if (b.pluginType === 'core' && a.pluginType !== 'core') {
            return 1;
        }
        // if a is a core plugin and b is not sort a first
        if (a.pluginType === 'core' && b.pluginType !== 'core') {
            return -1;
        }
        // if a is a jit plugin and b is not sort b first
        if (a.pluginType === 'jit' && b.pluginType !== 'jit') {
            return 1;
        }
        // if b is a jit plugin and a is not sort a first
        if (b.pluginType === 'jit' && a.pluginType !== 'jit') {
            return -1;
        }
        // neither plugin is core, so do not change the order
        return 0;
    });
    return commandPlugins[0];
}
exports.determinePriority = determinePriority;
