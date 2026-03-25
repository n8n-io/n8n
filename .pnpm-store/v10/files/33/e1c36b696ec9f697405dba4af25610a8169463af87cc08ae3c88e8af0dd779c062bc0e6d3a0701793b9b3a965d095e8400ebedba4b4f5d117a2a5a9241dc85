// Type definitions for commander
// Original definitions by: Alan Agius <https://github.com/alan-agius4>, Marcelo Dezem <https://github.com/mdezem>, vvakame <https://github.com/vvakame>, Jules Randolph <https://github.com/sveinburne>

///<reference types="node" />

declare namespace commander {

  interface CommanderError extends Error {
    code: string;
    exitCode: number;
    message: string;
    nestedError?: string;
  }
  type CommanderErrorConstructor = { new (exitCode: number, code: string, message: string): CommanderError };

  interface Option {
    flags: string;
    required: boolean; // A value must be supplied when the option is specified.
    optional: boolean; // A value is optional when the option is specified.
    mandatory: boolean; // The option must have a value after parsing, which usually means it must be specified on command line.
    bool: boolean;
    short?: string;
    long: string;
    description: string;
  }
  type OptionConstructor = { new (flags: string, description?: string): Option };

  interface Command extends NodeJS.EventEmitter {
    [key: string]: any; // options as properties

    args: string[];

    /**
     * Set the program version to `str`. 
     *
     * This method auto-registers the "-V, --version" flag
     * which will print the version number when passed.
     * 
     * You can optionally supply the  flags and description to override the defaults.
     */
    version(str: string, flags?: string, description?: string): Command;

    /**
     * Define a command, implemented using an action handler.
     * 
     * @remarks
     * The command description is supplied using `.description`, not as a parameter to `.command`.
     * 
     * @example
     * ```ts
     *  program
     *    .command('clone <source> [destination]')
     *    .description('clone a repository into a newly created directory')
     *    .action((source, destination) => {
     *      console.log('clone command called');
     *    });
     * ```
     * 
     * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
     * @param opts - configuration options
     * @returns new command
     */
    command(nameAndArgs: string, opts?: CommandOptions): Command;
    /**
     * Define a command, implemented in a separate executable file.
     * 
     * @remarks
     * The command description is supplied as the second parameter to `.command`.
     * 
     * @example
     * ```ts
     *  program
     *    .command('start <service>', 'start named service')
     *    .command('stop [service]', 'stop named serice, or all if no name supplied');
     * ```
     * 
     * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
     * @param description - description of executable command
     * @param opts - configuration options
     * @returns top level command for chaining more command definitions
     */
    command(nameAndArgs: string, description: string, opts?: commander.CommandOptions): Command;

    /**
     * Define argument syntax for the top-level command.
     *
     * @returns Command for chaining
     */
    arguments(desc: string): Command;

    /**
    * Parse expected `args`.
     *
     * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
     *
     * @returns Command for chaining
     */
     parseExpectedArgs(args: string[]): Command;

    /**
     * Register callback to use as replacement for calling process.exit.
     */
    exitOverride(callback?: (err: CommanderError) => never|void): Command;

    /**
     * Register callback `fn` for the command.
     *
     * @example
     *      program
     *        .command('help')
     *        .description('display verbose help')
     *        .action(function() {
     *           // output help here
     *        });
     *
     * @returns Command for chaining
     */
    action(fn: (...args: any[]) => void | Promise<void>): Command;

    /**
     * Define option with `flags`, `description` and optional
     * coercion `fn`.
     *
     * The `flags` string should contain both the short and long flags,
     * separated by comma, a pipe or space. The following are all valid
     * all will output this way when `--help` is used.
     *
     *    "-p, --pepper"
     *    "-p|--pepper"
     *    "-p --pepper"
     *
     * @example
     *     // simple boolean defaulting to false
     *     program.option('-p, --pepper', 'add pepper');
     *
     *     --pepper
     *     program.pepper
     *     // => Boolean
     *
     *     // simple boolean defaulting to true
     *     program.option('-C, --no-cheese', 'remove cheese');
     *
     *     program.cheese
     *     // => true
     *
     *     --no-cheese
     *     program.cheese
     *     // => false
     *
     *     // required argument
     *     program.option('-C, --chdir <path>', 'change the working directory');
     *
     *     --chdir /tmp
     *     program.chdir
     *     // => "/tmp"
     *
     *     // optional argument
     *     program.option('-c, --cheese [type]', 'add cheese [marble]');
     *
     * @returns Command for chaining
     */
    option(flags: string, description?: string, fn?: ((arg1: any, arg2: any) => void) | RegExp, defaultValue?: any): Command;
    option(flags: string, description?: string, defaultValue?: any): Command;

    /**
     * Define a required option, which must have a value after parsing. This usually means
     * the option must be specified on the command line. (Otherwise the same as .option().)
     *
     * The `flags` string should contain both the short and long flags, separated by comma, a pipe or space.
     */
    requiredOption(flags: string, description?: string, fn?: ((arg1: any, arg2: any) => void) | RegExp, defaultValue?: any): Command;
    requiredOption(flags: string, description?: string, defaultValue?: any): Command;


    /**
     * Whether to store option values as properties on command object,
     * or store separately (specify false). In both cases the option values can be accessed using .opts().
     *
     * @return Command for chaining
     */
    storeOptionsAsProperties(value?: boolean): Command;

    /**
     * Whether to pass command to action handler,
     * or just the options (specify false).
     * 
     * @return Command for chaining
     */
    passCommandToAction(value?: boolean): Command;

    /**
     * Allow unknown options on the command line.
     *
     * @param [arg] if `true` or omitted, no error will be thrown for unknown options.
     * @returns Command for chaining
     */
    allowUnknownOption(arg?: boolean): Command;

    /**
     * Parse `argv`, setting options and invoking commands when defined.
     *
     * @returns Command for chaining
     */
    parse(argv: string[]): Command;

    /**
     * Parse `argv`, setting options and invoking commands when defined.
     * 
     * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
     *
     * @returns Promise
     */
    parseAsync(argv: string[]): Promise<any>;

    /**
     * Parse options from `argv` returning `argv` void of these options.
     */
    parseOptions(argv: string[]): commander.ParseOptionsResult;

    /**
     * Return an object containing options as key-value pairs
     */
    opts(): { [key: string]: any };

    /**
     * Set the description.
     * 
     * @returns Command for chaining
     */
    description(str: string, argsDescription?: {[argName: string]: string}): Command;
    /**
     * Get the description.
     */
    description(): string;

    /**
     * Set an alias for the command.
     * 
     * @returns Command for chaining
     */
    alias(alias: string): Command;
    /**
     * Get alias for the command.
     */
    alias(): string;

    /**
     * Set the command usage.
     * 
     * @returns Command for chaining
     */
    usage(str: string): Command;
    /**
     * Get the command usage.
     */
    usage(): string;

    /**
     * Set the name of the command.
     * 
     * @returns Command for chaining
     */
    name(str: string): Command;
    /**
     * Get the name of the command.
     */
    name(): string;

    /**
     * Output help information for this command.
     *
     * When listener(s) are available for the helpLongFlag
     * those callbacks are invoked.
     */
    outputHelp(cb?: (str: string) => string): void;

    /**
     * You can pass in flags and a description to override the help
     * flags and help description for your command.
     */
    helpOption(flags?: string, description?: string): Command;

    /** 
     * Output help information and exit.
     */
    help(cb?: (str: string) => string): never;
  }
  type CommandConstructor = { new (name?: string): Command };


    interface CommandOptions {
        noHelp?: boolean;
        isDefault?: boolean;
        executableFile?: string;
    }

    interface ParseOptionsResult {
        args: string[];
        unknown: string[];
    }

    interface CommanderStatic extends Command {
        Command: CommandConstructor;
        Option: OptionConstructor;
        CommanderError:CommanderErrorConstructor;
      }

}

declare const commander: commander.CommanderStatic;
export = commander;
