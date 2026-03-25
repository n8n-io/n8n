import { type ITerminalProvider } from './ITerminalProvider';
import type { ITerminal, TerminalWriteParameters } from './ITerminal';
/**
 * This class facilitates writing to a console.
 *
 * @beta
 */
export declare class Terminal implements ITerminal {
    private _providers;
    constructor(provider: ITerminalProvider);
    /**
     * {@inheritdoc ITerminal.registerProvider}
     */
    registerProvider(provider: ITerminalProvider): void;
    /**
     * {@inheritdoc ITerminal.unregisterProvider}
     */
    unregisterProvider(provider: ITerminalProvider): void;
    /**
     * {@inheritdoc ITerminal.write}
     */
    write(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeLine}
     */
    writeLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeWarning}
     */
    writeWarning(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeWarningLine}
     */
    writeWarningLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeError}
     */
    writeError(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeErrorLine}
     */
    writeErrorLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeVerbose}
     */
    writeVerbose(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeVerboseLine}
     */
    writeVerboseLine(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeDebug}
     */
    writeDebug(...messageParts: TerminalWriteParameters): void;
    /**
     * {@inheritdoc ITerminal.writeDebugLine}
     */
    writeDebugLine(...messageParts: TerminalWriteParameters): void;
    private _writeSegmentsToProviders;
    private _serializeLegacyColorableSequence;
    private _normalizeWriteParameters;
}
//# sourceMappingURL=Terminal.d.ts.map