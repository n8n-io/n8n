import type { ICommandLineChoiceDefinition } from './CommandLineDefinition';
import { CommandLineParameterBase, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineChoiceParameter:2)}.
 * @public
 */
export interface IRequiredCommandLineChoiceParameter<TChoice extends string = string> extends CommandLineChoiceParameter<TChoice> {
    readonly value: TChoice;
}
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineChoiceParameter:1)}.
 * @public
 */
export declare class CommandLineChoiceParameter<TChoice extends string = string> extends CommandLineParameterBase {
    /** {@inheritDoc ICommandLineChoiceDefinition.alternatives} */
    readonly alternatives: ReadonlySet<TChoice>;
    /** {@inheritDoc ICommandLineStringDefinition.defaultValue} */
    readonly defaultValue: TChoice | undefined;
    private _value;
    /** {@inheritDoc ICommandLineChoiceDefinition.completions} */
    readonly completions: (() => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>) | undefined;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.Choice;
    /** @internal */
    constructor(definition: ICommandLineChoiceDefinition<TChoice>);
    /**
     * {@inheritDoc CommandLineParameter._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * {@inheritDoc CommandLineParameter._getSupplementaryNotes}
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes: string[]): void;
    /**
     * Returns the argument value for a choice parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be `undefined` if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value(): TChoice | undefined;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineChoiceParameter.d.ts.map