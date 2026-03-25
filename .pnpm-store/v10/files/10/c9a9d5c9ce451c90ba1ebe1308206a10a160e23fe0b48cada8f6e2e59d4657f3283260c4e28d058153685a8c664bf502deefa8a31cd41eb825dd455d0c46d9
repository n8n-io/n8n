import type { ICommandLineRemainderDefinition } from './CommandLineDefinition';
/**
 * The data type returned by {@link CommandLineParameterProvider.defineCommandLineRemainder}.
 * @public
 */
export declare class CommandLineRemainder {
    private _values;
    /** {@inheritDoc IBaseCommandLineDefinition.description} */
    readonly description: string;
    /** @internal */
    constructor(definition: ICommandLineRemainderDefinition);
    /**
     * Returns any remaining command line arguments after the recognized portion
     * that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet.
     */
    get values(): ReadonlyArray<string>;
    /**
     * {@inheritDoc CommandLineParameter._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineRemainder.d.ts.map