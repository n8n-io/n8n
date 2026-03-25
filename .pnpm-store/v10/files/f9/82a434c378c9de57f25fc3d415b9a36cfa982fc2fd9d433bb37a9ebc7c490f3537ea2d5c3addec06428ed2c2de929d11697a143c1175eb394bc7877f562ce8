// Type definitions for commander
// Original definitions by: Alan Agius <https://github.com/alan-agius4>, Marcelo Dezem <https://github.com/mdezem>, vvakame <https://github.com/vvakame>, Jules Randolph <https://github.com/sveinburne>

declare namespace commander {

  interface CommanderError extends Error {
    code: string;
    exitCode: number;
    message: string;
    nestedError?: string;
  }
  type CommanderErrorConstructor = new (exitCode: number, code: string, message: string) => CommanderError;

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
  type OptionConstructor = new (flags: string, description?: string) => Option;

  interface ParseOptions {
    from: 'node' | 'electron' | 'user';
  }

  interface Command {
    [key: string]: any; // options as properties

    args: string[];

    commands: Command[];

    /**
     * Set the program version to `str`.
     *
     * This method auto-registers the "-V, --version" flag
     * which will print the version number when passed.
     *
     * You can optionally supply the  flags and description to override the defaults.
     */
    version(str: string, flags?: string, description?: string): this;

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
    command(nameAndArgs: string, opts?: CommandOptions): ReturnType<this['createCommand']>;
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
     *    .command('stop [service]', 'stop named service, or all if no name supplied');
     * ```
     *
     * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
     * @param description - description of executable command
     * @param opts - configuration options
     * @returns `this` command for chaining
     */
    command(nameAndArgs: string, description: string, opts?: commander.ExecutableCommandOptions): this;

    /**
     * Factory routine to create a new unattached command.
     *
     * See .command() for creating an attached subcommand, which uses this routine to
     * create the command. You can override createCommand to customise subcommands.
     */
    createCommand(name?: string): Command;

    /**
     * Add a prepared subcommand.
     *
     * See .command() for creating an attached subcommand which inherits settings from its parent.
     *
     * @returns `this` command for chaining
     */
    addCommand(cmd: Command, opts?: CommandOptions): this;

    /**
     * Define argument syntax for command.
     *
     * @returns `this` command for chaining
     */
    arguments(desc: string): this;

    /**
     * Override default decision whether to add implicit help command.
     *
     *    addHelpCommand() // force on
     *    addHelpCommand(false); // force off
     *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
     *
     * @returns `this` command for chaining
     */
    addHelpCommand(enableOrNameAndArgs?: string | boolean, description?: string): this;

    /**
     * Register callback to use as replacement for calling process.exit.
     */
    exitOverride(callback?: (err: CommanderError) => never|void): this;

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
     * @returns `this` command for chaining
     */
    action(fn: (...args: any[]) => void | Promise<void>): this;

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
     * @returns `this` command for chaining
     */
    option(flags: string, description?: string, defaultValue?: string | boolean): this;
    option(flags: string, description: string, regexp: RegExp, defaultValue?: string | boolean): this;
    option<T>(flags: string, description: string, fn: (value: string, previous: T) => T, defaultValue?: T): this;

    /**
     * Define a required option, which must have a value after parsing. This usually means
     * the option must be specified on the command line. (Otherwise the same as .option().)
     *
     * The `flags` string should contain both the short and long flags, separated by comma, a pipe or space.
     */
    requiredOption(flags: string, description?: string, defaultValue?: string | boolean): this;
    requiredOption(flags: string, description: string, regexp: RegExp, defaultValue?: string | boolean): this;
    requiredOption<T>(flags: string, description: string, fn: (value: string, previous: T) => T, defaultValue?: T): this;

    /**
     * Whether to store option values as properties on command object,
     * or store separately (specify false). In both cases the option values can be accessed using .opts().
     *
     * @returns `this` command for chaining
     */
    storeOptionsAsProperties(value?: boolean): this;

    /**
     * Whether to pass command to action handler,
     * or just the options (specify false).
     *
     * @returns `this` command for chaining
     */
    passCommandToAction(value?: boolean): this;

    /**
     * Alter parsing of short flags with optional values.
     *
     * @example
     *    // for `.option('-f,--flag [value]'):
     *   .combineFlagAndOptionalValue(true)  // `-f80` is treated like `--flag=80`, this is the default behaviour
     *   .combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
     *
     * @returns `this` command for chaining
     */
    combineFlagAndOptionalValue(arg?: boolean): this;

    /**
     * Allow unknown options on the command line.
     *
     * @param [arg] if `true` or omitted, no error will be thrown for unknown options.
     * @returns `this` command for chaining
     */
    allowUnknownOption(arg?: boolean): this;

    /**
     * Parse `argv`, setting options and invoking commands when defined.
     *
     * The default expectation is that the arguments are from node and have the application as argv[0]
     * and the script being run in argv[1], with user parameters after that.
     *
     * Examples:
     *
     *      program.parse(process.argv);
     *      program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
     *      program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
     *
     * @returns `this` command for chaining
     */
    parse(argv?: string[], options?: ParseOptions): this;

    /**
     * Parse `argv`, setting options and invoking commands when defined.
     *
     * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
     *
     * The default expectation is that the arguments are from node and have the application as argv[0]
     * and the script being run in argv[1], with user parameters after that.
     *
     * Examples:
     *
     *      program.parseAsync(process.argv);
     *      program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
     *      program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
     *
     * @returns Promise
     */
    parseAsync(argv?: string[], options?: ParseOptions): Promise<this>;

    /**
     * Parse options from `argv` removing known options,
     * and return argv split into operands and unknown arguments.
     *
     * @example
     *    argv => operands, unknown
     *    --known kkk op => [op], []
     *    op --known kkk => [op], []
     *    sub --unknown uuu op => [sub], [--unknown uuu op]
     *    sub -- --unknown uuu op => [sub --unknown uuu op], []
     */
    parseOptions(argv: string[]): commander.ParseOptionsResult;

    /**
     * Return an object containing options as key-value pairs
     */
    opts(): { [key: string]: any };

    /**
     * Set the description.
     *
     * @returns `this` command for chaining
     */
    description(str: string, argsDescription?: {[argName: string]: string}): this;
    /**
     * Get the description.
     */
    description(): string;

    /**
     * Set an alias for the command.
     *
     * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
     *
     * @returns `this` command for chaining
     */
    alias(alias: string): this;
    /**
     * Get alias for the command.
     */
    alias(): string;

    /**
     * Set aliases for the command.
     *
     * Only the first alias is shown in the auto-generated help.
     *
     * @returns `this` command for chaining
     */
    aliases(aliases: string[]): this;
    /**
     * Get aliases for the command.
     */
    aliases(): string[];

    /**
     * Set the command usage.
     *
     * @returns `this` command for chaining
     */
    usage(str: string): this;
    /**
     * Get the command usage.
     */
    usage(): string;

    /**
     * Set the name of the command.
     *
     * @returns `this` command for chaining
     */
    name(str: string): this;
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
     * Return command help documentation.
     */
    helpInformation(): string;

    /**
     * You can pass in flags and a description to override the help
     * flags and help description for your command. Pass in false
     * to disable the built-in help option.
     */
    helpOption(flags?: string | boolean, description?: string): this;

    /**
     * Output help information and exit.
     */
    help(cb?: (str: string) => string): never;

    /**
     * Add a listener (callback) for when events occur. (Implemented using EventEmitter.)
     *
     * @example
     *     program
     *       .on('--help', () -> {
     *         console.log('See web site for more information.');
     *     });
     */
    on(event: string | symbol, listener: (...args: any[]) => void): this;
  }
  type CommandConstructor = new (name?: string) => Command;

  interface CommandOptions {
    noHelp?: boolean; // old name for hidden
    hidden?: boolean;
    isDefault?: boolean;
  }
  interface ExecutableCommandOptions extends CommandOptions {
    executableFile?: string;
  }

  interface ParseOptionsResult {
    operands: string[];
    unknown: string[];
  }

  interface CommanderStatic extends Command {
    program: Command;
    Command: CommandConstructor;
    Option: OptionConstructor;
    CommanderError: CommanderErrorConstructor;
  }

}

// Declaring namespace AND global
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare const commander: commander.CommanderStatic;
export = commander;
