import { Config } from './config';
import { PrettyPrintableError } from './errors';
import { LoadOptions } from './interfaces/config';
import { CommandError } from './interfaces/errors';
import { ArgInput, ArgOutput, ArgProps, BooleanFlagProps, Deprecation, FlagInput, FlagOutput, Arg as IArg, Flag as IFlag, Input, OptionFlagProps, ParserOutput } from './interfaces/parser';
import { Plugin } from './interfaces/plugin';
/**
 * An abstract class which acts as the base for each command
 * in your project.
 */
export declare abstract class Command {
    argv: string[];
    config: Config;
    private static readonly _base;
    /** An array of aliases for this command. */
    static aliases: string[];
    /** An order-dependent object of arguments for the command */
    static args: ArgInput;
    static baseFlags: FlagInput;
    /**
     * Emit deprecation warning when a command alias is used
     */
    static deprecateAliases?: boolean;
    static deprecationOptions?: Deprecation;
    /**
     * A full description of how to use the command.
     *
     * If no summary, the first line of the description will be used as the summary.
     */
    static description: string | undefined;
    static enableJsonFlag: boolean;
    /**
     * An array of examples to show at the end of the command's help.
     *
     * IF only a string is provided, it will try to look for a line that starts
     * with the cmd.bin as the example command and the rest as the description.
     * If found, the command will be formatted appropriately.
     *
     * ```
     * EXAMPLES:
     *   A description of a particular use case.
     *
     *     $ <%= config.bin => command flags
     * ```
     */
    static examples: Command.Example[];
    /** A hash of flags for the command */
    static flags: FlagInput;
    static hasDynamicHelp: boolean;
    static help: string | undefined;
    /** Hide the command from help */
    static hidden: boolean;
    /** An array of aliases for this command that are hidden from help. */
    static hiddenAliases: string[];
    /** A command ID, used mostly in error or verbose reporting. */
    static id: string;
    static plugin: Plugin | undefined;
    static readonly pluginAlias?: string;
    static readonly pluginName?: string;
    static readonly pluginType?: string;
    /** Mark the command as a given state (e.g. beta or deprecated) in help */
    static state?: 'beta' | 'deprecated' | string;
    /** When set to false, allows a variable amount of arguments */
    static strict: boolean;
    /**
     * The tweet-sized description for your class, used in a parent-commands
     * sub-command listing and as the header for the command help.
     */
    static summary?: string;
    /**
     * An override string (or strings) for the default usage documentation.
     */
    static usage: string | string[] | undefined;
    protected debug: (...args: any[]) => void;
    id: string | undefined;
    constructor(argv: string[], config: Config);
    /**
     * instantiate and run the command
     *
     * @param {Command.Class} this - the command class
     * @param {string[]} argv argv
     * @param {LoadOptions} opts options
     * @returns {Promise<unknown>} result
     */
    static run<T extends Command>(this: new (argv: string[], config: Config) => T, argv?: string[], opts?: LoadOptions): Promise<ReturnType<T['run']>>;
    protected get ctor(): typeof Command;
    protected _run<T>(): Promise<T>;
    protected catch(err: CommandError): Promise<any>;
    error(input: Error | string, options: {
        code?: string;
        exit: false;
    } & PrettyPrintableError): void;
    error(input: Error | string, options?: {
        code?: string;
        exit?: number;
    } & PrettyPrintableError): never;
    exit(code?: number): never;
    protected finally(_: Error | undefined): Promise<any>;
    protected init(): Promise<any>;
    /**
     * Determine if the command is being run with the --json flag in a command that supports it.
     *
     * @returns {boolean} true if the command supports json and the --json flag is present
     */
    jsonEnabled(): boolean;
    log(message?: string, ...args: any[]): void;
    protected logJson(json: unknown): void;
    logToStderr(message?: string, ...args: any[]): void;
    protected parse<F extends FlagOutput, B extends FlagOutput, A extends ArgOutput>(options?: Input<F, B, A>, argv?: string[]): Promise<ParserOutput<F, B, A>>;
    /**
     * actual command run code goes here
     */
    abstract run(): Promise<any>;
    protected toErrorJson(err: unknown): any;
    protected toSuccessJson(result: unknown): any;
    warn(input: Error | string): Error | string;
    protected warnIfCommandDeprecated(): void;
    protected warnIfFlagDeprecated(flags: Record<string, unknown>): void;
    private removeEnvVar;
}
export declare namespace Command {
    /**
     * The Command class exported by a command file.
     */
    type Class = typeof Command & {
        id: string;
        run(argv?: string[], config?: LoadOptions): Promise<any>;
    };
    /**
     * A cached command that's had a `load` method attached to it.
     *
     * The `Plugin` class loads the commands from the manifest (if it exists) or requires and caches
     * the commands directly from the commands directory inside the plugin. At this point the plugin
     * is working with `Command.Cached`. It then appends a `load` method to each one. If the a command
     * is executed then the `load` method is used to require the command class.
     */
    type Loadable = Cached & {
        load(): Promise<Command.Class>;
    };
    /**
     * A cached version of the command. This is created by the cachedCommand utility and
     * stored in the oclif.manifest.json.
     */
    type Cached = {
        [key: string]: unknown;
        aliasPermutations?: string[] | undefined;
        aliases: string[];
        args: {
            [name: string]: Arg.Cached;
        };
        deprecateAliases?: boolean | undefined;
        deprecationOptions?: Deprecation | undefined;
        description?: string | undefined;
        examples?: Example[] | undefined;
        flags: {
            [name: string]: Flag.Cached;
        };
        hasDynamicHelp?: boolean;
        hidden: boolean;
        hiddenAliases: string[];
        id: string;
        isESM?: boolean | undefined;
        permutations?: string[] | undefined;
        pluginAlias?: string | undefined;
        pluginName?: string | undefined;
        pluginType?: string | undefined;
        relativePath?: string[] | undefined;
        state?: 'beta' | 'deprecated' | string | undefined;
        strict?: boolean | undefined;
        summary?: string | undefined;
        type?: string | undefined;
        usage?: string | string[] | undefined;
    };
    type Flag = IFlag<any>;
    namespace Flag {
        type Cached = Omit<Flag, 'input' | 'parse'> & (BooleanFlagProps | OptionFlagProps) & {
            hasDynamicHelp?: boolean | undefined;
        };
        type Any = Cached | Flag;
    }
    type Arg = IArg<any>;
    namespace Arg {
        type Cached = Omit<Arg, 'input' | 'parse'> & ArgProps;
        type Any = Arg | Cached;
    }
    type Example = {
        command: string;
        description: string;
    } | string;
}
