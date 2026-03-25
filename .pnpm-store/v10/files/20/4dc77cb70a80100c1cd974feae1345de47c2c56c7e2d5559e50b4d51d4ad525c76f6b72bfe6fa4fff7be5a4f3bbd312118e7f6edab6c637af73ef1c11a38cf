import type { ITerminalProvider, TerminalProviderSeverity } from './ITerminalProvider';
/**
 * @beta
 */
export interface IPrefixProxyTerminalProviderOptionsBase {
    /**
     * The {@link ITerminalProvider} that will be wrapped.
     */
    terminalProvider: ITerminalProvider;
}
/**
 * Options for {@link PrefixProxyTerminalProvider}, with a static prefix.
 *
 * @beta
 */
export interface IStaticPrefixProxyTerminalProviderOptions extends IPrefixProxyTerminalProviderOptionsBase {
    /**
     * The prefix that should be added to each line of output.
     */
    prefix: string;
}
/**
 * Options for {@link PrefixProxyTerminalProvider}.
 *
 * @beta
 */
export interface IDynamicPrefixProxyTerminalProviderOptions extends IPrefixProxyTerminalProviderOptionsBase {
    /**
     * A function that returns the prefix that should be added to each line of output. This is useful
     * for prefixing each line with a timestamp.
     */
    getPrefix: () => string;
}
/**
 * @beta
 */
export type IPrefixProxyTerminalProviderOptions = IStaticPrefixProxyTerminalProviderOptions | IDynamicPrefixProxyTerminalProviderOptions;
/**
 * Wraps an existing {@link ITerminalProvider} that prefixes each line of output with a specified
 * prefix string.
 *
 * @beta
 */
export declare class PrefixProxyTerminalProvider implements ITerminalProvider {
    private readonly _parentTerminalProvider;
    private readonly _getPrefix;
    private readonly _newlineRegex;
    private _isOnNewline;
    constructor(options: IPrefixProxyTerminalProviderOptions);
    /** @override */
    get supportsColor(): boolean;
    /** @override */
    get eolCharacter(): string;
    /** @override */
    write(data: string, severity: TerminalProviderSeverity): void;
}
//# sourceMappingURL=PrefixProxyTerminalProvider.d.ts.map