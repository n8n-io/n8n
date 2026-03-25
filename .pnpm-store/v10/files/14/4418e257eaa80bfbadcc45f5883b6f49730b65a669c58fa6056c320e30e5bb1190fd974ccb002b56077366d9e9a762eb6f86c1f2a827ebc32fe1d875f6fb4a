import { Command } from '../command';
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
export declare function determinePriority(plugins: string[], commands: Command.Loadable[]): Command.Loadable;
