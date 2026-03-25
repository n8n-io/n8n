"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockWritable = void 0;
const AnsiEscape_1 = require("./AnsiEscape");
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * A {@link TerminalWritable} subclass for use by unit tests.
 *
 * @beta
 */
class MockWritable extends TerminalWritable_1.TerminalWritable {
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
        return AnsiEscape_1.AnsiEscape.formatForTests(this.chunks.map((x) => x.text).join(''));
    }
    getFormattedChunks() {
        return this.chunks.map((x) => (Object.assign(Object.assign({}, x), { text: AnsiEscape_1.AnsiEscape.formatForTests(x.text) })));
    }
}
exports.MockWritable = MockWritable;
//# sourceMappingURL=MockWritable.js.map