import { type ITerminalProvider, TerminalProviderSeverity } from './ITerminalProvider';
/**
 * Options to be provided to a {@link ConsoleTerminalProvider}
 *
 * @beta
 */
export interface IConsoleTerminalProviderOptions {
    /**
     * If true, print verbose logging messages.
     */
    verboseEnabled: boolean;
    /**
     * If true, print debug logging messages. Note that "verbose" and "debug" are considered
     * separate message filters; if you want debug to imply verbose, it is up to your
     * application code to enforce that.
     */
    debugEnabled: boolean;
}
/**
 * Terminal provider that prints to STDOUT (for log- and verbose-level messages) and
 * STDERR (for warning- and error-level messages).
 *
 * @beta
 */
export declare class ConsoleTerminalProvider implements ITerminalProvider {
    static readonly supportsColor: boolean;
    /**
     * If true, verbose-level messages should be written to the console.
     */
    verboseEnabled: boolean;
    /**
     * If true, debug-level messages should be written to the console.
     */
    debugEnabled: boolean;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    readonly supportsColor: boolean;
    constructor(options?: Partial<IConsoleTerminalProviderOptions>);
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
}
//# sourceMappingURL=ConsoleTerminalProvider.d.ts.map