import { type ITerminalProvider, TerminalProviderSeverity } from './ITerminalProvider';
/**
 * @beta
 */
export interface IStringBufferOutputOptions {
    /**
     * If set to true, special characters like \\n, \\r, and the \\u001b character
     * in color control tokens will get normalized to [-n-], [-r-], and [-x-] respectively
     *
     * This option defaults to `true`
     */
    normalizeSpecialCharacters: boolean;
}
/**
 * Terminal provider that stores written data in buffers separated by severity.
 * This terminal provider is designed to be used when code that prints to a terminal
 * is being unit tested.
 *
 * @beta
 */
export declare class StringBufferTerminalProvider implements ITerminalProvider {
    private _standardBuffer;
    private _verboseBuffer;
    private _debugBuffer;
    private _warningBuffer;
    private _errorBuffer;
    private _supportsColor;
    constructor(supportsColor?: boolean);
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    get supportsColor(): boolean;
    /**
     * Get everything that has been written at log-level severity.
     */
    getOutput(options?: IStringBufferOutputOptions): string;
    /**
     * @deprecated - use {@link StringBufferTerminalProvider.getVerboseOutput}
     */
    getVerbose(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at verbose-level severity.
     */
    getVerboseOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at debug-level severity.
     */
    getDebugOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at error-level severity.
     */
    getErrorOutput(options?: IStringBufferOutputOptions): string;
    /**
     * Get everything that has been written at warning-level severity.
     */
    getWarningOutput(options?: IStringBufferOutputOptions): string;
    private _normalizeOutput;
}
//# sourceMappingURL=StringBufferTerminalProvider.d.ts.map