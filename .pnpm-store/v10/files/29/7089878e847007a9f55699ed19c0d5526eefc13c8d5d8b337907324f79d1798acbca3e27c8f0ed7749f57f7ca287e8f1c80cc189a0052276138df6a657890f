import type { ITerminalProvider } from './ITerminalProvider';
/**
 * @beta
 */
export interface ITerminalWriteOptions {
    /**
     * If set to true, SGR parameters will not be replaced by the terminal
     * standard (i.e. - red for errors, yellow for warnings).
     */
    doNotOverrideSgrCodes?: boolean;
}
/**
 * @beta
 */
export type TerminalWriteParameters = string[] | [...string[], ITerminalWriteOptions];
/**
 * @beta
 */
export interface ITerminal {
    /**
     * Subscribe a new terminal provider.
     */
    registerProvider(provider: ITerminalProvider): void;
    /**
     * Unsubscribe a terminal provider. If the provider isn't subscribed, this function does nothing.
     */
    unregisterProvider(provider: ITerminalProvider): void;
    /**
     * Write a generic message to the terminal
     */
    write(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a generic message to the terminal, followed by a newline
     */
    writeLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a warning message to the console with yellow text.
     *
     * @remarks
     * The yellow color takes precedence over any other foreground colors set.
     */
    writeWarning(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a warning message to the console with yellow text, followed by a newline.
     *
     * @remarks
     * The yellow color takes precedence over any other foreground colors set.
     */
    writeWarningLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write an error message to the console with red text.
     *
     * @remarks
     * The red color takes precedence over any other foreground colors set.
     */
    writeError(...messageParts: TerminalWriteParameters): void;
    /**
     * Write an error message to the console with red text, followed by a newline.
     *
     * @remarks
     * The red color takes precedence over any other foreground colors set.
     */
    writeErrorLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a verbose-level message.
     */
    writeVerbose(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a verbose-level message followed by a newline.
     */
    writeVerboseLine(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a debug-level message.
     */
    writeDebug(...messageParts: TerminalWriteParameters): void;
    /**
     * Write a debug-level message followed by a newline.
     */
    writeDebugLine(...messageParts: TerminalWriteParameters): void;
}
//# sourceMappingURL=ITerminal.d.ts.map