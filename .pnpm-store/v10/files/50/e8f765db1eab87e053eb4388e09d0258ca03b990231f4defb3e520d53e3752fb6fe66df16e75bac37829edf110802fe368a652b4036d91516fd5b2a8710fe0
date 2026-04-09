import type { ICommandLineStringListDefinition } from './CommandLineDefinition';
import { CommandLineParameterWithArgument, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.defineStringListParameter}.
 * @public
 */
export declare class CommandLineStringListParameter extends CommandLineParameterWithArgument {
    private _values;
    /** {@inheritDoc CommandLineParameterBase.kind} */
    readonly kind: CommandLineParameterKind.StringList;
    /** @internal */
    constructor(definition: ICommandLineStringListDefinition);
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * Returns the string arguments for a string list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<string>;
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineStringListParameter.d.ts.map