// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { Writable } from 'node:stream';
import { TerminalProviderSeverity } from './ITerminalProvider';
/**
 * A adapter to allow writing to a provided terminal using Writable streams.
 *
 * @beta
 */
export class TerminalStreamWritable extends Writable {
    constructor(options) {
        const { terminal, severity, writableOptions } = options;
        super(writableOptions);
        this._writev = undefined;
        switch (severity) {
            case TerminalProviderSeverity.log:
                this._writeMethod = terminal.write.bind(terminal);
                break;
            case TerminalProviderSeverity.verbose:
                this._writeMethod = terminal.writeVerbose.bind(terminal);
                break;
            case TerminalProviderSeverity.debug:
                this._writeMethod = terminal.writeDebug.bind(terminal);
                break;
            case TerminalProviderSeverity.warning:
                this._writeMethod = terminal.writeWarning.bind(terminal);
                break;
            case TerminalProviderSeverity.error:
                this._writeMethod = terminal.writeError.bind(terminal);
                break;
            default:
                throw new Error(`Unknown severity: ${severity}`);
        }
    }
    _write(chunk, encoding, 
    // eslint-disable-next-line @rushstack/no-new-null
    callback) {
        try {
            const chunkData = typeof chunk === 'string' ? chunk : Buffer.from(chunk);
            this._writeMethod(chunkData.toString());
        }
        catch (e) {
            callback(e);
            return;
        }
        callback();
    }
}
//# sourceMappingURL=TerminalStreamWritable.js.map