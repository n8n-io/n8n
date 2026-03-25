type TrimRight<S extends string> = S extends `${infer R} ` ? TrimRight<R> : S;
type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type CamelCase<S extends string> = S extends `${infer W}-${infer Rest}`
  ? CamelCase<`${W}${Capitalize<Rest>}`>
  : S;

// This is a trick to encourage TypeScript to resolve intersections for displaying,
// like { a: number } & { b : string } => { a: number, b: string }
// References:
// - https://github.com/sindresorhus/type-fest/blob/main/source/simplify.d.ts
// - https://effectivetypescript.com/2022/02/25/gentips-4-display/
type Resolve<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

// This is a trick to encourage editor to suggest the known literals while still
// allowing any BaseType value.
// References:
// - https://github.com/microsoft/TypeScript/issues/29729
// - https://github.com/sindresorhus/type-fest/blob/main/source/literal-union.d.ts
// - https://github.com/sindresorhus/type-fest/blob/main/source/primitive.d.ts
type LiteralUnion<LiteralType, BaseType extends string | number> =
  | LiteralType
  | (BaseType & Record<never, never>);

// Side note: not trying to represent arrays as non-empty, keep it simple.
// https://stackoverflow.com/a/56006703/1082434
type InferVariadic<S extends string, ArgT> = S extends `${string}...`
  ? ArgT[]
  : ArgT;

type InferArgumentType<Value extends string, DefaultT, CoerceT, ChoicesT> = [
  CoerceT,
] extends [undefined]
  ?
      | InferVariadic<Value, [ChoicesT] extends [undefined] ? string : ChoicesT>
      | DefaultT
  : [ChoicesT] extends [undefined]
    ? CoerceT | DefaultT
    : CoerceT | DefaultT | ChoicesT;

// Special handling for optional variadic argument, won't be undefined as implementation returns [].
type InferArgumentOptionalType<
  Value extends string,
  DefaultT,
  CoerceT,
  ChoicesT,
> = Value extends `${string}...`
  ? InferArgumentType<
      Value,
      [DefaultT] extends [undefined] ? never : DefaultT,
      CoerceT,
      ChoicesT
    >
  : InferArgumentType<Value, DefaultT, CoerceT, ChoicesT>;

// ArgRequired comes from .argRequired()/.argOptional(), and ArgRequiredFromUsage is implied by usage <required>/[optional]
type ResolveRequired<
  ArgRequired extends boolean | undefined,
  ArgRequiredFromUsage extends boolean,
> = ArgRequired extends undefined ? ArgRequiredFromUsage : ArgRequired;

type InferArgumentTypeResolvedRequired<
  Value extends string,
  DefaultT,
  CoerceT,
  ArgRequired extends boolean,
  ChoicesT,
> = ArgRequired extends true
  ? InferArgumentType<Value, never, CoerceT, ChoicesT>
  : InferArgumentOptionalType<Value, DefaultT, CoerceT, ChoicesT>;

// Resolve whether argument required, and strip []/<> from around value.
type InferArgument<
  S extends string,
  DefaultT = undefined,
  CoerceT = undefined,
  ArgRequired extends boolean | undefined = undefined,
  ChoicesT = undefined,
> = S extends `<${infer Value}>`
  ? InferArgumentTypeResolvedRequired<
      Value,
      DefaultT,
      CoerceT,
      ResolveRequired<ArgRequired, true>,
      ChoicesT
    >
  : S extends `[${infer Value}]`
    ? InferArgumentTypeResolvedRequired<
        Value,
        DefaultT,
        CoerceT,
        ResolveRequired<ArgRequired, false>,
        ChoicesT
      >
    : InferArgumentTypeResolvedRequired<
        S,
        DefaultT,
        CoerceT,
        ResolveRequired<ArgRequired, true>,
        ChoicesT
      >; // the implementation fallback is treat as <required>

type InferArguments<S extends string> = S extends `${infer First} ${infer Rest}`
  ? [InferArgument<First>, ...InferArguments<TrimLeft<Rest>>]
  : [InferArgument<S>];

type InferCommmandArguments<S extends string> =
  S extends `${string} ${infer Args}` ? InferArguments<TrimLeft<Args>> : [];

type FlagsToFlag<Flags extends string> =
  Flags extends `${string},${infer LongFlag}`
    ? TrimLeft<LongFlag>
    : Flags extends `${string}|${infer LongFlag}`
      ? TrimLeft<LongFlag>
      : Flags extends `${string} ${infer LongFlag}`
        ? TrimLeft<LongFlag>
        : Flags;

type ConvertFlagToName<Flag extends string> = Flag extends `--no-${infer Name}`
  ? CamelCase<Name>
  : Flag extends `--${infer Name}`
    ? CamelCase<Name>
    : Flag extends `-${infer Name}`
      ? CamelCase<Name>
      : never;

type CombineOptions<Options, O> = keyof O extends keyof Options
  ? {
      [K in keyof Options]: K extends keyof O
        ? Options[K] | O[keyof O]
        : Options[K];
    }
  : Options & O;

type IsAlwaysDefined<
  DefaulT,
  Mandatory extends boolean,
> = Mandatory extends true
  ? true
  : [undefined] extends [DefaulT]
    ? false
    : true;

// Modify PresetT to take into account negated.
type NegatePresetType<
  Flag extends string,
  PresetT,
> = Flag extends `--no-${string}`
  ? undefined extends PresetT
    ? false
    : PresetT
  : undefined extends PresetT
    ? true
    : PresetT;

// Modify DefaultT to take into account negated.
type NegateDefaultType<
  Flag extends string,
  DefaultT,
> = Flag extends `--no-${string}`
  ? [undefined] extends [DefaultT]
    ? true
    : DefaultT
  : [undefined] extends [DefaultT]
    ? never
    : DefaultT; // don't add undefined, will make property optional later

// Modify ValueT to take into account coerce function.
type CoerceValueType<CoerceT, ValueT> = [ValueT] extends [never]
  ? never
  : [CoerceT] extends [undefined]
    ? ValueT
    : CoerceT;

// Modify PresetT to take into account coerce function.
type CoercePresetType<CoerceT, PresetT> = [PresetT] extends [never]
  ? never
  : [CoerceT] extends [undefined]
    ? PresetT
    : undefined extends PresetT
      ? undefined
      : CoerceT;

type BuildOptionProperty<
  Name extends string,
  FullValueT,
  AlwaysDefined extends boolean,
> = AlwaysDefined extends true
  ? { [K in Name]: FullValueT }
  : { [K in Name]?: FullValueT };

type InferOptionsCombine<
  Options,
  Name extends string,
  FullValueT,
  AlwaysDefined extends boolean,
> = Resolve<
  CombineOptions<Options, BuildOptionProperty<Name, FullValueT, AlwaysDefined>>
>;

// Combine the possible types
type InferOptionsNegateCombo<
  Options,
  Flag extends string,
  Name extends string,
  ValueT,
  PresetT,
  DefaultT,
  AlwaysDefined extends boolean,
> = Flag extends `--no-${string}`
  ? Name extends keyof Options
    ? InferOptionsCombine<Options, Name, PresetT, true> // combo does not set default, leave that to positive option
    : InferOptionsCombine<Options, Name, PresetT | DefaultT, true> // lone negated option sets default
  : InferOptionsCombine<
      Options,
      Name,
      ValueT | PresetT | DefaultT,
      AlwaysDefined
    >;

// Recalc values taking into account negated option.
// Fill in appropriate PresetT value if undefined.
type InferOptionTypes<
  Options,
  Flag extends string,
  Value extends string,
  ValueT,
  PresetT,
  DefaultT,
  CoerceT,
  Mandatory extends boolean,
  ChoicesT,
> = InferOptionsNegateCombo<
  Options,
  Flag,
  ConvertFlagToName<Flag>,
  CoerceValueType<
    CoerceT,
    [ChoicesT] extends [undefined]
      ? InferVariadic<Value, ValueT>
      : InferVariadic<Value, ChoicesT>
  >,
  NegatePresetType<Flag, CoercePresetType<CoerceT, PresetT>>,
  NegateDefaultType<Flag, DefaultT>,
  IsAlwaysDefined<DefaultT, Mandatory>
>;

type InferOptionsFlag<
  Options,
  Flags extends string,
  Value extends string,
  ValueT,
  PresetT,
  DefaultT,
  CoerceT,
  Mandatory extends boolean,
  ChoicesT,
> = InferOptionTypes<
  Options,
  FlagsToFlag<Trim<Flags>>,
  Trim<Value>,
  ValueT,
  PresetT,
  DefaultT,
  CoerceT,
  Mandatory,
  ChoicesT
>;

// Split up Usage into Flags and Value
type InferOptions<
  Options,
  Usage extends string,
  DefaultT,
  CoerceT,
  Mandatory extends boolean,
  PresetT = undefined,
  ChoicesT = undefined,
> = Usage extends `${infer Flags} <${infer Value}>`
  ? InferOptionsFlag<
      Options,
      Flags,
      Value,
      string,
      never,
      DefaultT,
      CoerceT,
      Mandatory,
      ChoicesT
    >
  : Usage extends `${infer Flags} [${infer Value}]`
    ? InferOptionsFlag<
        Options,
        Flags,
        Value,
        string,
        PresetT,
        DefaultT,
        CoerceT,
        Mandatory,
        ChoicesT
      >
    : InferOptionsFlag<
        Options,
        Usage,
        '',
        never,
        PresetT,
        DefaultT,
        CoerceT,
        Mandatory,
        ChoicesT
      >;

export type CommandUnknownOpts = Command<unknown[], OptionValues>;

// ----- full copy of normal commander typings from here down, with extra type inference -----

// Using method rather than property for method-signature-style, to document method overloads separately. Allow either.
/* eslint-disable @typescript-eslint/method-signature-style */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class CommanderError extends Error {
  code: string;
  exitCode: number;
  message: string;
  nestedError?: string;

  /**
   * Constructs the CommanderError class
   * @param exitCode - suggested exit code which could be used with process.exit
   * @param code - an id string representing the error
   * @param message - human-readable description of the error
   * @constructor
   */
  constructor(exitCode: number, code: string, message: string);
}

export class InvalidArgumentError extends CommanderError {
  /**
   * Constructs the InvalidArgumentError class
   * @param message - explanation of why argument is invalid
   * @constructor
   */
  constructor(message: string);
}
export { InvalidArgumentError as InvalidOptionArgumentError }; // deprecated old name

export interface ErrorOptions {
  // optional parameter for error()
  /** an id string representing the error */
  code?: string;
  /** suggested exit code which could be used with process.exit */
  exitCode?: number;
}

export class Argument<
  Usage extends string = '',
  DefaultT = undefined,
  CoerceT = undefined,
  ArgRequired extends boolean | undefined = undefined,
  ChoicesT = undefined,
> {
  description: string;
  required: boolean;
  variadic: boolean;
  defaultValue?: any;
  defaultValueDescription?: string;
  argChoices?: string[];

  /**
   * Initialize a new command argument with the given name and description.
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   */
  constructor(arg: Usage, description?: string);

  /**
   * Return argument name.
   */
  name(): string;

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   */
  default<T>(
    value: T,
    description?: string,
  ): Argument<Usage, T, CoerceT, ArgRequired, ChoicesT>;

  /**
   * Set the custom handler for processing CLI command arguments into argument values.
   */
  argParser<T>(
    fn: (value: string, previous: T) => T,
  ): Argument<Usage, DefaultT, T, ArgRequired, undefined>; // setting ChoicesT to undefined because argParser overwrites choices

  /**
   * Only allow argument value to be one of choices.
   */
  choices<T extends readonly string[]>(
    values: T,
  ): Argument<Usage, DefaultT, undefined, ArgRequired, T[number]>; // setting CoerceT to undefined because choices overrides argParser

  /**
   * Make argument required.
   */
  argRequired(): Argument<Usage, DefaultT, CoerceT, true, ChoicesT>;

  /**
   * Make argument optional.
   */
  argOptional(): Argument<Usage, DefaultT, CoerceT, false, ChoicesT>;
}

export class Option<
  Usage extends string = '',
  PresetT = undefined,
  DefaultT = undefined,
  CoerceT = undefined,
  Mandatory extends boolean = false,
  ChoicesT = undefined,
> {
  flags: string;
  description: string;

  required: boolean; // A value must be supplied when the option is specified.
  optional: boolean; // A value is optional when the option is specified.
  variadic: boolean;
  mandatory: boolean; // The option must have a value after parsing, which usually means it must be specified on command line.
  short?: string;
  long?: string;
  negate: boolean;
  defaultValue?: any;
  defaultValueDescription?: string;
  presetArg?: unknown;
  envVar?: string;
  parseArg?: <T>(value: string, previous: T) => T;
  hidden: boolean;
  argChoices?: string[];

  constructor(flags: Usage, description?: string);

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   */
  default<T>(
    value: T,
    description?: string,
  ): Option<Usage, PresetT, T, CoerceT, Mandatory, ChoicesT>;

  /**
   * Preset to use when option used without option-argument, especially optional but also boolean and negated.
   * The custom processing (parseArg) is called.
   *
   * @example
   * ```ts
   * new Option('--color').default('GREYSCALE').preset('RGB');
   * new Option('--donate [amount]').preset('20').argParser(parseFloat);
   * ```
   */
  preset<T>(arg: T): Option<Usage, T, DefaultT, CoerceT, Mandatory, ChoicesT>;

  /**
   * Add option name(s) that conflict with this option.
   * An error will be displayed if conflicting options are found during parsing.
   *
   * @example
   * ```ts
   * new Option('--rgb').conflicts('cmyk');
   * new Option('--js').conflicts(['ts', 'jsx']);
   * ```
   */
  conflicts(names: string | string[]): this;

  /**
   * Specify implied option values for when this option is set and the implied options are not.
   *
   * The custom processing (parseArg) is not called on the implied values.
   *
   * @example
   * program
   *   .addOption(new Option('--log', 'write logging information to file'))
   *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
   */
  implies(optionValues: OptionValues): this;

  /**
   * Set environment variable to check for option value.
   *
   * An environment variables is only used if when processed the current option value is
   * undefined, or the source of the current value is 'default' or 'config' or 'env'.
   */
  env(name: string): this;

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   */
  argParser<T>(
    fn: (value: string, previous: T) => T,
  ): Option<Usage, PresetT, DefaultT, T, Mandatory, undefined>; // setting ChoicesT to undefined because argParser overrides choices

  /**
   * Whether the option is mandatory and must have a value after parsing.
   */
  makeOptionMandatory<M extends boolean = true>(
    mandatory?: M,
  ): Option<Usage, PresetT, DefaultT, CoerceT, M, ChoicesT>;

  /**
   * Hide option in help.
   */
  hideHelp(hide?: boolean): this;

  /**
   * Only allow option value to be one of choices.
   */
  choices<T extends readonly string[]>(
    values: T,
  ): Option<Usage, PresetT, DefaultT, undefined, Mandatory, T[number]>; // setting CoerceT to undefined becuase choices overrides argParser

  /**
   * Return option name.
   */
  name(): string;

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   */
  attributeName(): string;

  /**
   * Return whether a boolean option.
   *
   * Options are one of boolean, negated, required argument, or optional argument.
   */
  isBoolean(): boolean;
}

export class Help {
  /** output helpWidth, long lines are wrapped to fit */
  helpWidth?: number;
  sortSubcommands: boolean;
  sortOptions: boolean;
  showGlobalOptions: boolean;

  constructor();

  /** Get the command term to show in the list of subcommands. */
  subcommandTerm(cmd: CommandUnknownOpts): string;
  /** Get the command summary to show in the list of subcommands. */
  subcommandDescription(cmd: CommandUnknownOpts): string;
  /** Get the option term to show in the list of options. */
  optionTerm(option: Option): string;
  /** Get the option description to show in the list of options. */
  optionDescription(option: Option): string;
  /** Get the argument term to show in the list of arguments. */
  argumentTerm(argument: Argument): string;
  /** Get the argument description to show in the list of arguments. */
  argumentDescription(argument: Argument): string;

  /** Get the command usage to be displayed at the top of the built-in help. */
  commandUsage(cmd: CommandUnknownOpts): string;
  /** Get the description for the command. */
  commandDescription(cmd: CommandUnknownOpts): string;

  /** Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one. */
  visibleCommands(cmd: CommandUnknownOpts): CommandUnknownOpts[];
  /** Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one. */
  visibleOptions(cmd: CommandUnknownOpts): Option[];
  /** Get an array of the visible global options. (Not including help.) */
  visibleGlobalOptions(cmd: CommandUnknownOpts): Option[];
  /** Get an array of the arguments which have descriptions. */
  visibleArguments(cmd: CommandUnknownOpts): Argument[];

  /** Get the longest command term length. */
  longestSubcommandTermLength(cmd: CommandUnknownOpts, helper: Help): number;
  /** Get the longest option term length. */
  longestOptionTermLength(cmd: CommandUnknownOpts, helper: Help): number;
  /** Get the longest global option term length. */
  longestGlobalOptionTermLength(cmd: CommandUnknownOpts, helper: Help): number;
  /** Get the longest argument term length. */
  longestArgumentTermLength(cmd: CommandUnknownOpts, helper: Help): number;
  /** Calculate the pad width from the maximum term length. */
  padWidth(cmd: CommandUnknownOpts, helper: Help): number;

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   */
  wrap(
    str: string,
    width: number,
    indent: number,
    minColumnWidth?: number,
  ): string;

  /** Generate the built-in help text. */
  formatHelp(cmd: CommandUnknownOpts, helper: Help): string;
}
export type HelpConfiguration = Partial<Help>;

export interface ParseOptions {
  from: 'node' | 'electron' | 'user';
}
export interface HelpContext {
  // optional parameter for .help() and .outputHelp()
  error: boolean;
}
export interface AddHelpTextContext {
  // passed to text function used with .addHelpText()
  error: boolean;
  command: Command;
}
export interface OutputConfiguration {
  writeOut?(str: string): void;
  writeErr?(str: string): void;
  getOutHelpWidth?(): number;
  getErrHelpWidth?(): number;
  outputError?(str: string, write: (str: string) => void): void;
}

export type AddHelpTextPosition = 'beforeAll' | 'before' | 'after' | 'afterAll';
export type HookEvent = 'preSubcommand' | 'preAction' | 'postAction';
// The source is a string so author can define their own too.
export type OptionValueSource =
  | LiteralUnion<'default' | 'config' | 'env' | 'cli' | 'implied', string>
  | undefined;

export type OptionValues = Record<string, unknown>;

// eslint unimpressed with `OptionValues = {}`, but not sure what to use instead.
// eslint-disable-next-line @typescript-eslint/ban-types
export class Command<Args extends any[] = [], Opts extends OptionValues = {}> {
  args: string[];
  processedArgs: Args;
  readonly commands: readonly CommandUnknownOpts[];
  readonly options: readonly Option[];
  readonly registeredArguments: readonly Argument[];
  parent: CommandUnknownOpts | null;

  constructor(name?: string);

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
   * Get the program version.
   */
  version(): string | undefined;
  /**
   * Define a command, implemented using an action handler.
   *
   * @remarks
   * The command description is supplied using `.description`, not as a parameter to `.command`.
   *
   * @example
   * ```ts
   * program
   *   .command('clone <source> [destination]')
   *   .description('clone a repository into a newly created directory')
   *   .action((source, destination) => {
   *     console.log('clone command called');
   *   });
   * ```
   *
   * @param nameAndArgs - command name and arguments, args are  `<required>` or `[optional]` and last may also be `variadic...`
   * @param opts - configuration options
   * @returns new command
   */
  command<Usage extends string>(
    nameAndArgs: Usage,
    opts?: CommandOptions,
  ): Command<[...InferCommmandArguments<Usage>]>;
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
  command(
    nameAndArgs: string,
    description: string,
    opts?: ExecutableCommandOptions,
  ): this;

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
  addCommand(cmd: CommandUnknownOpts, opts?: CommandOptions): this;

  /**
   * Factory routine to create a new unattached argument.
   *
   * See .argument() for creating an attached argument, which uses this routine to
   * create the argument. You can override createArgument to return a custom argument.
   */
  createArgument<Usage extends string>(
    name: Usage,
    description?: string,
  ): Argument<Usage>;

  /**
   * Define argument syntax for command.
   *
   * The default is that the argument is required, and you can explicitly
   * indicate this with <> around the name. Put [] around the name for an optional argument.
   *
   * @example
   * ```
   * program.argument('<input-file>');
   * program.argument('[output-file]');
   * ```
   *
   * @returns `this` command for chaining
   */
  argument<S extends string, T>(
    flags: S,
    description: string,
    fn: (value: string, previous: T) => T,
  ): Command<[...Args, InferArgument<S, undefined, T>], Opts>;
  argument<S extends string, T>(
    flags: S,
    description: string,
    fn: (value: string, previous: T) => T,
    defaultValue: T,
  ): Command<[...Args, InferArgument<S, T, T>], Opts>;
  argument<S extends string>(
    usage: S,
    description?: string,
  ): Command<[...Args, InferArgument<S, undefined>], Opts>;
  argument<S extends string, DefaultT>(
    usage: S,
    description: string,
    defaultValue: DefaultT,
  ): Command<[...Args, InferArgument<S, DefaultT>], Opts>;

  /**
   * Define argument syntax for command, adding a prepared argument.
   *
   * @returns `this` command for chaining
   */
  addArgument<
    Usage extends string,
    DefaultT,
    CoerceT,
    ArgRequired extends boolean | undefined,
    ChoicesT,
  >(
    arg: Argument<Usage, DefaultT, CoerceT, ArgRequired, ChoicesT>,
  ): Command<
    [...Args, InferArgument<Usage, DefaultT, CoerceT, ArgRequired, ChoicesT>],
    Opts
  >;

  /**
   * Define argument syntax for command, adding multiple at once (without descriptions).
   *
   * See also .argument().
   *
   * @example
   * ```
   * program.arguments('<cmd> [env]');
   * ```
   *
   * @returns `this` command for chaining
   */
  arguments<Names extends string>(
    args: Names,
  ): Command<[...Args, ...InferArguments<Names>], Opts>;

  /**
   * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
   *
   * @example
   * ```ts
   * program.helpCommand('help [cmd]');
   * program.helpCommand('help [cmd]', 'show help');
   * program.helpCommand(false); // suppress default help command
   * program.helpCommand(true); // add help command even if no subcommands
   * ```
   */
  helpCommand(nameAndArgs: string, description?: string): this;
  helpCommand(enable: boolean): this;

  /**
   * Add prepared custom help command.
   */
  addHelpCommand(cmd: Command): this;
  /** @deprecated since v12, instead use helpCommand */
  addHelpCommand(nameAndArgs: string, description?: string): this;
  /** @deprecated since v12, instead use helpCommand */
  addHelpCommand(enable?: boolean): this;

  /**
   * Add hook for life cycle event.
   */
  hook(
    event: HookEvent,
    listener: (
      thisCommand: this,
      actionCommand: CommandUnknownOpts,
    ) => void | Promise<void>,
  ): this;

  /**
   * Register callback to use as replacement for calling process.exit.
   */
  exitOverride(callback?: (err: CommanderError) => never | void): this;

  /**
   * Display error message and exit (or call exitOverride).
   */
  error(message: string, errorOptions?: ErrorOptions): never;

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   */
  createHelp(): Help;

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   */
  configureHelp(configuration: HelpConfiguration): this;
  /** Get configuration */
  configureHelp(): HelpConfiguration;

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   * ```
   * // functions to change where being written, stdout and stderr
   * writeOut(str)
   * writeErr(str)
   * // matching functions to specify width for wrapping help
   * getOutHelpWidth()
   * getErrHelpWidth()
   * // functions based on what is being written out
   * outputError(str, write) // used for displaying errors, and not used for displaying help
   * ```
   */
  configureOutput(configuration: OutputConfiguration): this;
  /** Get configuration */
  configureOutput(): OutputConfiguration;

  /**
   * Copy settings that are useful to have in common across root command and subcommands.
   *
   * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
   */
  copyInheritedSettings(sourceCommand: CommandUnknownOpts): this;

  /**
   * Display the help or a custom message after an error occurs.
   */
  showHelpAfterError(displayHelp?: boolean | string): this;

  /**
   * Display suggestion of similar commands for unknown commands, or options for unknown options.
   */
  showSuggestionAfterError(displaySuggestion?: boolean): this;

  /**
   * Register callback `fn` for the command.
   *
   * @example
   * ```
   * program
   *   .command('serve')
   *   .description('start service')
   *   .action(function() {
   *     // do work here
   *   });
   * ```
   *
   * @returns `this` command for chaining
   */
  action(
    fn: (this: this, ...args: [...Args, Opts, this]) => void | Promise<void>,
  ): this;

  /**
   * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
   * option-argument is indicated by `<>` and an optional option-argument by `[]`.
   *
   * See the README for more details, and see also addOption() and requiredOption().
   *
   * @example
   *
   * ```js
   * program
   *     .option('-p, --pepper', 'add pepper')
   *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
   *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
   *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
   * ```
   *
   * @returns `this` command for chaining
   */
  option<S extends string>(
    usage: S,
    description?: string,
  ): Command<Args, InferOptions<Opts, S, undefined, undefined, false>>;
  option<S extends string, DefaultT extends string | boolean | string[] | []>(
    usage: S,
    description?: string,
    defaultValue?: DefaultT,
  ): Command<Args, InferOptions<Opts, S, DefaultT, undefined, false>>;
  option<S extends string, T>(
    usage: S,
    description: string,
    parseArg: (value: string, previous: T) => T,
  ): Command<Args, InferOptions<Opts, S, undefined, T, false>>;
  option<S extends string, T>(
    usage: S,
    description: string,
    parseArg: (value: string, previous: T) => T,
    defaultValue?: T,
  ): Command<Args, InferOptions<Opts, S, T, T, false>>;

  /**
   * Define a required option, which must have a value after parsing. This usually means
   * the option must be specified on the command line. (Otherwise the same as .option().)
   *
   * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
   */
  requiredOption<S extends string>(
    usage: S,
    description?: string,
  ): Command<Args, InferOptions<Opts, S, undefined, undefined, true>>;
  requiredOption<
    S extends string,
    DefaultT extends string | boolean | string[],
  >(
    usage: S,
    description?: string,
    defaultValue?: DefaultT,
  ): Command<Args, InferOptions<Opts, S, DefaultT, undefined, true>>;
  requiredOption<S extends string, T>(
    usage: S,
    description: string,
    parseArg: (value: string, previous: T) => T,
  ): Command<Args, InferOptions<Opts, S, undefined, T, true>>;
  requiredOption<S extends string, T, D extends T>(
    usage: S,
    description: string,
    parseArg: (value: string, previous: T) => T,
    defaultValue?: D,
  ): Command<Args, InferOptions<Opts, S, D, T, true>>;

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   */

  createOption<Usage extends string>(
    flags: Usage,
    description?: string,
  ): Option<Usage>;

  /**
   * Add a prepared Option.
   *
   * See .option() and .requiredOption() for creating and attaching an option in a single call.
   */
  addOption<
    Usage extends string,
    PresetT,
    DefaultT,
    CoerceT,
    Mandatory extends boolean,
    ChoicesT,
  >(
    option: Option<Usage, PresetT, DefaultT, CoerceT, Mandatory, ChoicesT>,
  ): Command<
    Args,
    InferOptions<Opts, Usage, DefaultT, CoerceT, Mandatory, PresetT, ChoicesT>
  >;

  /**
   * Whether to store option values as properties on command object,
   * or store separately (specify false). In both cases the option values can be accessed using .opts().
   *
   * @returns `this` command for chaining
   */
  storeOptionsAsProperties<T extends OptionValues>(): this & T;
  storeOptionsAsProperties<T extends OptionValues>(
    storeAsProperties: true,
  ): this & T;
  storeOptionsAsProperties(storeAsProperties?: boolean): this;

  /**
   * Retrieve option value.
   */
  getOptionValue<K extends keyof Opts>(key: K): Opts[K];
  getOptionValue(key: string): unknown;

  /**
   * Store option value.
   */
  setOptionValue<K extends keyof Opts>(key: K, value: unknown): this;
  setOptionValue(key: string, value: unknown): this;

  /**
   * Store option value and where the value came from.
   */
  setOptionValueWithSource<K extends keyof Opts>(
    key: K,
    value: unknown,
    source: OptionValueSource,
  ): this;
  setOptionValueWithSource(
    key: string,
    value: unknown,
    source: OptionValueSource,
  ): this;

  /**
   * Get source of option value.
   */
  getOptionValueSource<K extends keyof Opts>(
    key: K,
  ): OptionValueSource | undefined;
  getOptionValueSource(key: string): OptionValueSource | undefined;

  /**
   * Get source of option value. See also .optsWithGlobals().
   */
  getOptionValueSourceWithGlobals<K extends keyof Opts>(
    key: K,
  ): OptionValueSource | undefined;
  getOptionValueSourceWithGlobals(key: string): OptionValueSource | undefined;

  /**
   * Alter parsing of short flags with optional values.
   *
   * @example
   * ```
   * // for `.option('-f,--flag [value]'):
   * .combineFlagAndOptionalValue(true)  // `-f80` is treated like `--flag=80`, this is the default behaviour
   * .combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   * ```
   *
   * @returns `this` command for chaining
   */
  combineFlagAndOptionalValue(combine?: boolean): this;

  /**
   * Allow unknown options on the command line.
   *
   * @returns `this` command for chaining
   */
  allowUnknownOption(allowUnknown?: boolean): this;

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @returns `this` command for chaining
   */
  allowExcessArguments(allowExcess?: boolean): this;

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   *
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @returns `this` command for chaining
   */
  enablePositionalOptions(positional?: boolean): this;

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   *
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @returns `this` command for chaining
   */
  passThroughOptions(passThrough?: boolean): this;

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * ```
   * program.parse(process.argv);
   * program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   * ```
   *
   * @returns `this` command for chaining
   */
  parse(argv?: readonly string[], options?: ParseOptions): this;

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * @example
   * ```
   * program.parseAsync(process.argv);
   * program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
   * program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   * ```
   *
   * @returns Promise
   */
  parseAsync(argv?: readonly string[], options?: ParseOptions): Promise<this>;

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   *     argv => operands, unknown
   *     --known kkk op => [op], []
   *     op --known kkk => [op], []
   *     sub --unknown uuu op => [sub], [--unknown uuu op]
   *     sub -- --unknown uuu op => [sub --unknown uuu op], []
   */
  parseOptions(argv: string[]): ParseOptionsResult;

  /**
   * Return an object containing local option values as key-value pairs
   */
  opts(): Opts;

  /**
   * Return an object containing merged local and global option values as key-value pairs.
   */
  optsWithGlobals<T extends OptionValues>(): T;

  /**
   * Set the description.
   *
   * @returns `this` command for chaining
   */

  description(str: string): this;
  /** @deprecated since v8, instead use .argument to add command argument with description */
  description(str: string, argsDescription: Record<string, string>): this;
  /**
   * Get the description.
   */
  description(): string;

  /**
   * Set the summary. Used when listed as subcommand of parent.
   *
   * @returns `this` command for chaining
   */

  summary(str: string): this;
  /**
   * Get the summary.
   */
  summary(): string;

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
  aliases(aliases: readonly string[]): this;
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
   * Set the name of the command from script filename, such as process.argv[1],
   * or require.main.filename, or __filename.
   *
   * (Used internally and public although not documented in README.)
   *
   * @example
   * ```ts
   * program.nameFromFilename(require.main.filename);
   * ```
   *
   * @returns `this` command for chaining
   */
  nameFromFilename(filename: string): this;

  /**
   * Set the directory for searching for executable subcommands of this command.
   *
   * @example
   * ```ts
   * program.executableDir(__dirname);
   * // or
   * program.executableDir('subcommands');
   * ```
   *
   * @returns `this` command for chaining
   */
  executableDir(path: string): this;
  /**
   * Get the executable search directory.
   */
  executableDir(): string | null;

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   */
  outputHelp(context?: HelpContext): void;
  /** @deprecated since v7 */
  outputHelp(cb?: (str: string) => string): void;

  /**
   * Return command help documentation.
   */
  helpInformation(context?: HelpContext): string;

  /**
   * You can pass in flags and a description to override the help
   * flags and help description for your command. Pass in false
   * to disable the built-in help option.
   */
  helpOption(flags?: string | boolean, description?: string): this;

  /**
   * Supply your own option to use for the built-in help option.
   * This is an alternative to using helpOption() to customise the flags and description etc.
   */
  addHelpOption(option: Option): this;

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   */
  help(context?: HelpContext): never;
  /** @deprecated since v7 */
  help(cb?: (str: string) => string): never;

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   */
  addHelpText(position: AddHelpTextPosition, text: string): this;
  addHelpText(
    position: AddHelpTextPosition,
    text: (context: AddHelpTextContext) => string,
  ): this;

  /**
   * Add a listener (callback) for when events occur. (Implemented using EventEmitter.)
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this;
}

export interface CommandOptions {
  hidden?: boolean;
  isDefault?: boolean;
  /** @deprecated since v7, replaced by hidden */
  noHelp?: boolean;
}
export interface ExecutableCommandOptions extends CommandOptions {
  executableFile?: string;
}

export interface ParseOptionsResult {
  operands: string[];
  unknown: string[];
}

export function createCommand(name?: string): Command;
export function createOption<Usage extends string>(
  flags: Usage,
  description?: string,
): Option<Usage>;
export function createArgument<Usage extends string>(
  name: Usage,
  description?: string,
): Argument<Usage>;

export const program: Command;
