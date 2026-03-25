import { CommandInfo } from '../command';
/**
 * A command parser encapsulates a specific logic for mapping `CommandInfo` objects
 * into another `CommandInfo`.
 *
 * A prime example is turning an abstract `npm:foo` into `npm run foo`, but it could also turn
 * the prefix color of a command brighter, or maybe even prefixing each command with `time(1)`.
 */
export interface CommandParser {
    /**
     * Parses `commandInfo` and returns one or more `CommandInfo`s.
     *
     * Returning multiple `CommandInfo` is used when there are multiple possibilities of commands to
     * run given the original input.
     * An example of this is when the command contains a wildcard and it must be expanded into all
     * viable options so that the consumer can decide which ones to run.
     */
    parse(commandInfo: CommandInfo): CommandInfo | CommandInfo[];
}
