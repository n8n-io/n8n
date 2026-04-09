import type { ICommandLineIntegerListDefinition } from './CommandLineDefinition';
import { CommandLineParameterWithArgument, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.defineIntegerListParameter}.
 * @public
 */
export declare class CommandLineIntegerListParameter extends CommandLineParameterWithArgument {
    private _values;
    /** {@inheritDoc CommandLineParameterBase.kind} */
    readonly kind: CommandLineParameterKind.IntegerList;
    /** @internal */
    constructor(definition: ICommandLineIntegerListDefinition);
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * Returns the integer arguments for an integer list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<number>;
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineIntegerListParameter.d.ts.map