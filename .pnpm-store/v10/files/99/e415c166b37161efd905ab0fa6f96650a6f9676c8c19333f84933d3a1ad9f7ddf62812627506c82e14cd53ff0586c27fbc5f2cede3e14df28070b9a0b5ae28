import { Writable, type WritableOptions } from 'node:stream';
import type { ITerminal } from './ITerminal';
import { TerminalProviderSeverity } from './ITerminalProvider';
/**
 * Options for {@link TerminalStreamWritable}.
 *
 * @beta
 */
export interface ITerminalStreamWritableOptions {
    /**
     * The {@link ITerminal} that the Writable will write to.
     */
    terminal: ITerminal;
    /**
     * The severity of the messages that will be written to the {@link ITerminal}.
     */
    severity: TerminalProviderSeverity;
    /**
     * Options for the underlying Writable.
     */
    writableOptions?: WritableOptions;
}
/**
 * A adapter to allow writing to a provided terminal using Writable streams.
 *
 * @beta
 */
export declare class TerminalStreamWritable extends Writable {
    private _writeMethod;
    constructor(options: ITerminalStreamWritableOptions);
    _write(chunk: string | Buffer | Uint8Array, encoding: string, callback: (error?: Error | null) => void): void;
}
//# sourceMappingURL=TerminalStreamWritable.d.ts.map