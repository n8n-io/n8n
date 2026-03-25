"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitterTransform = void 0;
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * Use this instead of {@link TerminalTransform} if you need to output `ITerminalChunk`
 * data to more than one destination.
 *
 * @remarks
 *
 * Splitting streams complicates the pipeline topology and can make debugging more difficult.
 * For this reason, it is modeled as an explicit `SplitterTransform` node, rather than
 * as a built-in feature of `TerminalTransform`.
 *
 * @public
 */
class SplitterTransform extends TerminalWritable_1.TerminalWritable {
    constructor(options) {
        super();
        this.destinations = [...options.destinations];
    }
    onWriteChunk(chunk) {
        for (const destination of this.destinations) {
            destination.writeChunk(chunk);
        }
    }
    onClose() {
        const errors = [];
        // If an exception is thrown, try to ensure that the other destinations get closed properly
        for (const destination of this.destinations) {
            if (!destination.preventAutoclose) {
                try {
                    destination.close();
                }
                catch (error) {
                    errors.push(error);
                }
            }
        }
        if (errors.length > 0) {
            throw errors[0];
        }
    }
}
exports.SplitterTransform = SplitterTransform;
//# sourceMappingURL=SplitterTransform.js.map