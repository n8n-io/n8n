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
    'dedupe': AgentCommandValue;
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
type DetectStrategy = 'lockfile' | 'packageManager-field' | 'devEngines-field' | 'install-metadata';
interface DetectOptions {
    /**
     * Current working directory to start looking up for package manager.
     * @default `process.cwd()`
     */
    cwd?: string;
    /**
     * The strategies to use for detecting the package manager. The strategies
     * are executed in the order it's specified for every directory that it iterates
     * upwards from the `cwd`.
     *
     * - `'lockfile'`: Look up for lock files.
     * - `'packageManager-field'`: Look up for the `packageManager` field in package.json.
     * - `'devEngines-field'`: Look up for the `devEngines.packageManager` field in package.json.
     * - `'install-metadata'`: Look up for installation metadata added by package managers.
     *
     * @default ['lockfile', 'packageManager-field', 'devEngines-field']
     */
    strategies?: DetectStrategy[];
    /**
     * Callback when unknown package manager from package.json.
     * @param packageManager - The `packageManager` value from package.json file.
     */
    onUnknown?: (packageManager: string) => DetectResult | null | undefined;
    /**
     * The path to stop traversing up the directory.
     */
    stopDir?: string | ((currentDir: string) => boolean);
    /**
     * Optional custom parser for `package.json` content.
     *
     * If provided, it will be used instead of `JSON.parse` when reading `package.json` files.
     * This can be used to support JSONC, YAML, or other formats.
     *
     * @param content - The content of the file.
     * @param filepath - The absolute path to the file.
     * @returns The parsed object or a Promise resolving to it.
     * @default JSON.parse
     */
    packageJsonParser?: (content: string, filepath: string) => any | Promise<any>;
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

export type { Agent as A, Command as C, DetectStrategy as D, ResolvedCommand as R, AgentName as a, AgentCommandValue as b, AgentCommands as c, DetectOptions as d, DetectResult as e };
