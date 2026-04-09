"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioWritable = void 0;
const node_process_1 = __importDefault(require("node:process"));
const ITerminalChunk_1 = require("./ITerminalChunk");
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * A {@link TerminalWritable} subclass that writes its output directly to the process `stdout` and `stderr`
 * streams.
 *
 * @remarks
 * This is the standard output target for a process.  You normally do not need to construct
 * this class; the {@link StdioWritable."instance"} singleton can be used instead.
 *
 * @public
 */
class StdioWritable extends TerminalWritable_1.TerminalWritable {
    onWriteChunk(chunk) {
        if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stdout) {
            node_process_1.default.stdout.write(chunk.text);
        }
        else if (chunk.kind === ITerminalChunk_1.TerminalChunkKind.Stderr) {
            node_process_1.default.stderr.write(chunk.text);
        }
    }
}
exports.StdioWritable = StdioWritable;
StdioWritable.instance = new StdioWritable();
//# sourceMappingURL=StdioWritable.js.map