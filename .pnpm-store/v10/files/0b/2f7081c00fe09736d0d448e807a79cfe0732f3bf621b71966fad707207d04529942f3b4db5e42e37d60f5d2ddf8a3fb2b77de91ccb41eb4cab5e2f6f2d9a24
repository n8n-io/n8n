import { OutputArgs, OutputFlags, ParserInput, ParserOutput } from '../interfaces/parser';
declare global {
    /**
     * Cache the stdin so that it can be read multiple times.
     *
     * This fixes a bug where the stdin would be read multiple times (because Parser.parse() was called more than once)
     * but only the first read would be successful - all other reads would return null.
     *
     * Storing in global is necessary because we want the cache to be shared across all versions of @oclif/core in
     * in the dependency tree. Storing in a variable would only share the cache within the same version of @oclif/core.
     */
    var oclif: {
        stdinCache?: string;
    };
}
export declare const readStdin: () => Promise<null | string>;
export declare class Parser<T extends ParserInput, TFlags extends OutputFlags<T['flags']>, BFlags extends OutputFlags<T['flags']>, TArgs extends OutputArgs<T['args']>> {
    private readonly input;
    private readonly argv;
    private readonly booleanFlags;
    private readonly context;
    private currentFlag?;
    private readonly flagAliases;
    private readonly raw;
    constructor(input: T);
    parse(): Promise<ParserOutput<TFlags, BFlags, TArgs>>;
    private _args;
    private get _argTokens();
    private _debugInput;
    private _debugOutput;
    private _flags;
    private _setNames;
    private findFlag;
    private findLongFlag;
    private findShortFlag;
    private mapAndValidateFlags;
}
