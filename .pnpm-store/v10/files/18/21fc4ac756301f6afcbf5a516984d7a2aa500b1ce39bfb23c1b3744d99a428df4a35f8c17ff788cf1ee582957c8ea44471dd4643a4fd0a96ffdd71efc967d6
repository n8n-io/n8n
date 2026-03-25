import type { ICommandLineChoiceListDefinition } from './CommandLineDefinition';
import { CommandLineParameterBase, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.defineChoiceListParameter}.
 * @public
 */
export declare class CommandLineChoiceListParameter<TChoice extends string = string> extends CommandLineParameterBase {
    /** {@inheritDoc ICommandLineChoiceListDefinition.alternatives} */
    readonly alternatives: ReadonlySet<TChoice>;
    private _values;
    /** {@inheritDoc ICommandLineChoiceListDefinition.completions} */
    readonly completions: (() => Promise<ReadonlyArray<TChoice> | ReadonlySet<TChoice>>) | undefined;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.ChoiceList;
    /** @internal */
    constructor(definition: ICommandLineChoiceListDefinition<TChoice>);
    /**
     * {@inheritDoc CommandLineParameter._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * Returns the string arguments for a choice list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values(): ReadonlyArray<TChoice>;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineChoiceListParameter.d.ts.map