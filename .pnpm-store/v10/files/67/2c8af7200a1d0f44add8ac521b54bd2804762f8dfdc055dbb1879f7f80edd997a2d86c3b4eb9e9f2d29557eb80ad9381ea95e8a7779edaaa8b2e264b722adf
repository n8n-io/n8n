import { c as AgentCommands, b as AgentCommandValue, R as ResolvedCommand, A as Agent, C as Command } from './shared/package-manager-detector.ncFwAKgD.cjs';

declare const COMMANDS: {
    npm: AgentCommands;
    yarn: AgentCommands;
    'yarn@berry': AgentCommands;
    pnpm: AgentCommands;
    'pnpm@6': AgentCommands;
    bun: AgentCommands;
    deno: AgentCommands;
};
/**
 * Resolve the command for the agent merging the command arguments with the provided arguments.
 *
 * For example, to show how to install `@antfu/ni` globally using `pnpm`:
 * ```js
 * import { resolveCommand } from 'package-manager-detector/commands'
 * const { command, args } = resolveCommand('pnpm', 'global', ['@antfu/ni'])
 * console.log(`${command} ${args.join(' ')}`) // 'pnpm add -g @antfu/ni'
 * ```
 *
 * @param agent The agent to use.
 * @param command the command to resolve.
 * @param args The arguments to pass to the command.
 * @returns {ResolvedCommand} The resolved command or `null` if the agent command is not found.
 */
declare function resolveCommand(agent: Agent, command: Command, args: string[]): ResolvedCommand | null;
/**
 * Construct the command from the agent command merging the command arguments with the provided arguments.
 * @param value {AgentCommandValue} The agent command to use.
 * @param args The arguments to pass to the command.
 * @returns {ResolvedCommand} The resolved command or `null` if the command is `null`.
 */
declare function constructCommand(value: AgentCommandValue, args: string[]): ResolvedCommand | null;

export { COMMANDS, constructCommand, resolveCommand };
