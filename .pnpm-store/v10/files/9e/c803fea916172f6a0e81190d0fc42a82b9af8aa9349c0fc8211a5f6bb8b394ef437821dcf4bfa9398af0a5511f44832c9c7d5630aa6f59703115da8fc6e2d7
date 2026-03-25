"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalStreamWritable = void 0;
const stream_1 = require("stream");
const ITerminalProvider_1 = require("./ITerminalProvider");
/**
 * A adapter to allow writing to a provided terminal using Writable streams.
 *
 * @beta
 */
class TerminalStreamWritable extends stream_1.Writable {
    constructor(options) {
        const { terminal, severity, writableOptions } = options;
        super(writableOptions);
        this._writev = undefined;
        switch (severity) {
            case ITerminalProvider_1.TerminalProviderSeverity.log:
                this._writeMethod = terminal.write.bind(terminal);
                break;
            case ITerminalProvider_1.TerminalProviderSeverity.verbose:
                this._writeMethod = terminal.writeVerbose.bind(terminal);
                break;
            case ITerminalProvider_1.TerminalProviderSeverity.debug:
                this._writeMethod = terminal.writeDebug.bind(terminal);
                break;
            case ITerminalProvider_1.TerminalProviderSeverity.warning:
                this._writeMethod = terminal.writeWarning.bind(terminal);
                break;
            case ITerminalProvider_1.TerminalProviderSeverity.error:
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
exports.TerminalStreamWritable = TerminalStreamWritable;
//# sourceMappingURL=TerminalStreamWritable.js.map