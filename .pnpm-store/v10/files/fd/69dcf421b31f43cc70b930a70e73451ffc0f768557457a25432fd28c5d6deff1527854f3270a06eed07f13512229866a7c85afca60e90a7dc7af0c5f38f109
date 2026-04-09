import type { ICommandLineStringDefinition } from './CommandLineDefinition';
import { CommandLineParameterWithArgument, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineStringParameter:2)}.
 * @public
 */
export interface IRequiredCommandLineStringParameter extends CommandLineStringParameter {
    readonly value: string;
}
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineStringParameter:1)}.
 * @public
 */
export declare class CommandLineStringParameter extends CommandLineParameterWithArgument {
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: string | undefined;
    private _value;
    /** {@inheritDoc CommandLineParameterBase.kind} */
    readonly kind: CommandLineParameterKind.String;
    /** @internal */
    constructor(definition: ICommandLineStringDefinition);
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
     * Returns the argument value for a string parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): string | undefined;
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineStringParameter.d.ts.map