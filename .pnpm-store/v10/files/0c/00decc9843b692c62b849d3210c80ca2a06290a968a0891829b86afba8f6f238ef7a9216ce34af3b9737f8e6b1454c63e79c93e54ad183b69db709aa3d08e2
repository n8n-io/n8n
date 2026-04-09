type Agent = 'npm' | 'yarn' | 'yarn@berry' | 'pnpm' | 'pnpm@6' | 'bun' | 'deno';
type AgentName = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'deno';
type AgentCommandValue = (string | number)[] | ((args: string[]) => string[]) | null;
interface AgentCommands {
    'agent': AgentCommandValue;
    'run': AgentCommandValue;
    'install': AgentCommandValue;
    'frozen': AgentCommandValue;
    'global': AgentCommandValue;
    'add': AgentCommandValue;
    'upgrade': AgentCommandValue;
    'upgrade-interactive': AgentCommandValue;
    'execute': AgentCommandValue;
    'execute-local': AgentCommandValue;
    'uninstall': AgentCommandValue;
    'global_uninstall': AgentCommandValue;
}
type Command = keyof AgentCommands;
interface ResolvedCommand {
    /**
     * CLI command.
     */
    command: string;
    /**
     * Arguments for the CLI command, merged with user arguments.
     */
    args: string[];
}
interface DetectOptions {
    /**
     * Current working directory to start looking up for package manager.
     * @default `process.cwd()`
     */
    cwd?: string;
    /**
     * Callback when unknown package manager from package.json.
     * @param packageManager - The `packageManager` value from package.json file.
     */
    onUnknown?: (packageManager: string) => DetectResult | null | undefined;
}
interface DetectResult {
    /**
     * Agent name without the specifier.
     *
     * Can be `npm`, `yarn`, `pnpm`, `bun`, or `deno`.
     */
    name: AgentName;
    /**
     * Agent specifier to resolve the command.
     *
     * May contain '@' to differentiate the version (e.g. 'yarn@berry').
     * Use `name` for the agent name without the specifier.
     */
    agent: Agent;
    /**
     * Specific version of the agent, read from `packageManager` field in package.json.
     */
    version?: string;
}

export type { Agent as A, Command as C, DetectOptions as D, ResolvedCommand as R, AgentName as a, AgentCommandValue as b, AgentCommands as c, DetectResult as d };
