// Type definitions for argparse 1.0
// Project: https://github.com/nodeca/argparse
// Definitions by: Andrew Schurman <https://github.com/arcticwaters>
//                 Tomasz Łaziuk <https://github.com/tlaziuk>
//                 Sebastian Silbermann <https://github.com/eps1lon>
//                 Kannan Goundan <https://github.com/cakoose>
//                 Halvor Holsten Strand <https://github.com/ondkloss>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.2

export class ArgumentParser extends ArgumentGroup {
    constructor(options?: ArgumentParserOptions);
    addSubparsers(options?: SubparserOptions): SubParser;
    parseArgs(args?: string[], ns?: Namespace | object): any;
    printUsage(): void;
    printHelp(): void;
    formatUsage(): string;
    formatHelp(): string;
    parseKnownArgs(args?: string[], ns?: Namespace | object): any[];
    convertArgLineToArg(argLine: string): string[];
    exit(status: number, message: string): void;
    error(err: string | Error): void;
}

export class Namespace {
    constructor(options: object);
    get<K extends keyof this, D extends any>(key: K, defaultValue?: D): this[K] | D;
    isset(key: keyof this): boolean;
    set<K extends keyof this>(key: K, value: this[K]): this;
    set<K extends string, V extends any>(key: K, value: V): this & Record<K, V>;
    set<K extends object>(obj: K): this & K;
    unset<K extends keyof this, D extends any>(key: K, defaultValue?: D): this[K] | D;
}

export class SubParser {
    addParser(name: string, options?: SubArgumentParserOptions): ArgumentParser;
}

export class ArgumentGroup {
    addArgument(args: string[] | string, options?: ArgumentOptions): void;
    addArgumentGroup(options?: ArgumentGroupOptions): ArgumentGroup;
    addMutuallyExclusiveGroup(options?: { required: boolean }): ArgumentGroup;
    setDefaults(options?: {}): void;
    getDefault(dest: string): any;
}

export interface SubparserOptions {
    title?: string;
    description?: string;
    prog?: string;
    parserClass?: { new (): any };
    action?: string;
    dest?: string;
    help?: string;
    metavar?: string;
}

export interface SubArgumentParserOptions extends ArgumentParserOptions {
    aliases?: string[];
    help?: string;
}

export interface ArgumentParserOptions {
    description?: string;
    epilog?: string;
    addHelp?: boolean;
    argumentDefault?: any;
    parents?: ArgumentParser[];
    prefixChars?: string;
    formatterClass?: { new (): HelpFormatter | ArgumentDefaultsHelpFormatter | RawDescriptionHelpFormatter | RawTextHelpFormatter };
    prog?: string;
    usage?: string;
    version?: string;
    debug?: boolean;
}

export interface ArgumentGroupOptions {
    prefixChars?: string;
    argumentDefault?: any;
    title?: string;
    description?: string;
}

export abstract class Action {
    protected dest: string;
    constructor(options: ActionConstructorOptions);
    abstract call(parser: ArgumentParser, namespace: Namespace, values: string | string[], optionString: string | null): void;
}

// Passed to the Action constructor.  Subclasses are just expected to relay this to
// the super() constructor, so using an "opaque type" pattern is probably fine.
// Someone may want to fill this out in the future.
export type ActionConstructorOptions = number & {_: 'ActionConstructorOptions'};

export class HelpFormatter { }
export class ArgumentDefaultsHelpFormatter { }
export class RawDescriptionHelpFormatter { }
export class RawTextHelpFormatter { }

export interface ArgumentOptions {
    action?: string | { new(options: ActionConstructorOptions): Action };
    optionStrings?: string[];
    dest?: string;
    nargs?: string | number;
    constant?: any;
    defaultValue?: any;
    // type may be a string (primitive) or a Function (constructor)
    type?: string | Function; // tslint:disable-line:ban-types
    choices?: string | string[];
    required?: boolean;
    help?: string;
    metavar?: string | string[];
}

export namespace Const {
    const SUPPRESS: string;
    const OPTIONAL: string;
    const ZERO_OR_MORE: string;
    const ONE_OR_MORE: string;
    const REMAINDER: string;
}
