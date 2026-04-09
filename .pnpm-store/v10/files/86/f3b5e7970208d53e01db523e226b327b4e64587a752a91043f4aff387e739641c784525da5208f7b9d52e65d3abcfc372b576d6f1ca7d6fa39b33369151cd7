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
    normalizeSpecialCharacters?: boolean;
}
/**
 * @beta
 */
export interface IStringBufferOutputChunksOptions extends IStringBufferOutputOptions {
    /**
     * If true, the output will be returned as an array of lines prefixed with severity tokens.
     */
    asLines?: boolean;
}
/**
 * @beta
 */
export interface IAllStringBufferOutput {
    log: string;
    warning: string;
    error: string;
    verbose: string;
    debug: string;
}
/**
 * @beta
 */
export type TerminalProviderSeverityName = keyof typeof TerminalProviderSeverity;
/**
 * @beta
 */
export interface IOutputChunk {
    text: string;
    severity: TerminalProviderSeverityName;
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
    private _allOutputChunks;
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    readonly supportsColor: boolean;
    constructor(supportsColor?: boolean);
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(text: string, severity: TerminalProviderSeverity): void;
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter(): string;
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
    /**
     * Get everything that has been written at all severity levels.
     */
    getAllOutput(sparse?: false, options?: IStringBufferOutputOptions): IAllStringBufferOutput;
    getAllOutput(sparse: true, options?: IStringBufferOutputOptions): Partial<IAllStringBufferOutput>;
    /**
     * Get everything that has been written as an array of output chunks, preserving order.
     */
    getAllOutputAsChunks(options?: IStringBufferOutputChunksOptions & {
        asLines?: false;
    }): IOutputChunk[];
    getAllOutputAsChunks(options: IStringBufferOutputChunksOptions & {
        asLines: true;
    }): `[${string}] ${string}`[];
}
//# sourceMappingURL=StringBufferTerminalProvider.d.ts.map