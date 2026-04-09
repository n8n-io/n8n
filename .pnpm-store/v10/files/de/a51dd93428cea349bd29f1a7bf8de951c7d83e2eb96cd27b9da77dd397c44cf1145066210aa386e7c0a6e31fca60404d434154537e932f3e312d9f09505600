// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { AnsiEscape } from './AnsiEscape';
import { TerminalWritable } from './TerminalWritable';
/**
 * A {@link TerminalWritable} subclass for use by unit tests.
 *
 * @beta
 */
export class MockWritable extends TerminalWritable {
    constructor() {
        super(...arguments);
        this.chunks = [];
    }
    onWriteChunk(chunk) {
        this.chunks.push(chunk);
    }
    reset() {
        this.chunks.length = 0;
    }
    getAllOutput() {
        return AnsiEscape.formatForTests(this.chunks.map((x) => x.text).join(''));
    }
    getFormattedChunks() {
        return this.chunks.map((x) => ({ ...x, text: AnsiEscape.formatForTests(x.text) }));
    }
}
//# sourceMappingURL=MockWritable.js.map