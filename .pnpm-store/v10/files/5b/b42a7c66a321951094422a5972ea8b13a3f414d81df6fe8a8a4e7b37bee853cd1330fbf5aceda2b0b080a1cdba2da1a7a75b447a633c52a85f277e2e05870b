import type { ICommandLineIntegerDefinition } from './CommandLineDefinition';
import { CommandLineParameterWithArgument, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineIntegerParameter:2)}.
 * @public
 */
export interface IRequiredCommandLineIntegerParameter extends CommandLineIntegerParameter {
    readonly value: number;
}
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineIntegerParameter:1)}.
 * @public
 */
export declare class CommandLineIntegerParameter extends CommandLineParameterWithArgument {
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: number | undefined;
    private _value;
    /** {@inheritDoc CommandLineParameterBase.kind} */
    readonly kind: CommandLineParameterKind.Integer;
    /** @internal */
    constructor(definition: ICommandLineIntegerDefinition);
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * {@inheritDoc CommandLineParameterBase._getSupplementaryNotes}
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes: string[]): void;
    /**
     * Returns the argument value for an integer parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): number | undefined;
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineIntegerParameter.d.ts.map