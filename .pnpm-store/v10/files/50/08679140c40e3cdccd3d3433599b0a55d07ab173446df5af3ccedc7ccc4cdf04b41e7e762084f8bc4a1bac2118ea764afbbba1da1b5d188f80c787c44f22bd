// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import process from 'node:process';
import { TerminalChunkKind } from './ITerminalChunk';
import { TerminalWritable } from './TerminalWritable';
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
export class StdioWritable extends TerminalWritable {
    onWriteChunk(chunk) {
        if (chunk.kind === TerminalChunkKind.Stdout) {
            process.stdout.write(chunk.text);
        }
        else if (chunk.kind === TerminalChunkKind.Stderr) {
            process.stderr.write(chunk.text);
        }
    }
}
StdioWritable.instance = new StdioWritable();
//# sourceMappingURL=StdioWritable.js.map