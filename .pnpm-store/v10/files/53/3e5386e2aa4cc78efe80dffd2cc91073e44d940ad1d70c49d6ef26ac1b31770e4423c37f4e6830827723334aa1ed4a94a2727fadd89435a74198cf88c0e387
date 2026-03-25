import type { ICommandLineFlagDefinition } from './CommandLineDefinition';
import { CommandLineParameterBase, CommandLineParameterKind } from './BaseClasses';
/**
 * The data type returned by {@link CommandLineParameterProvider.defineFlagParameter}.
 * @public
 */
export declare class CommandLineFlagParameter extends CommandLineParameterBase {
    private _value;
    /** {@inheritDoc CommandLineParameter.kind} */
    readonly kind: CommandLineParameterKind.Flag;
    /** @internal */
    constructor(definition: ICommandLineFlagDefinition);
    /**
     * {@inheritDoc CommandLineParameter._setValue}
     * @internal
     */
    _setValue(data: unknown): void;
    /**
     * Returns a boolean indicating whether the parameter was included in the command line.
     *
     * @remarks
     * The return value will be false if the command-line has not been parsed yet,
     * or if the flag was not used.
     */
    get value(): boolean;
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList: string[]): void;
}
//# sourceMappingURL=CommandLineFlagParameter.d.ts.map