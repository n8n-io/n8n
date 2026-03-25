"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalTransform = void 0;
const TerminalWritable_1 = require("./TerminalWritable");
/**
 * The abstract base class for {@link TerminalWritable} objects that receive an input,
 * transform it somehow, and then write the output to another `TerminalWritable`.
 *
 * @remarks
 *
 * The `TerminalTransform` and {@link SplitterTransform} base classes formalize the idea
 * of modeling data flow as a directed acyclic graph of reusable transforms, whose
 * final outputs are `TerminalWritable` objects.
 *
 * The design is based loosely on the `WritableStream` and `TransformStream` classes from
 * the system {@link https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts
 * | Streams API}, except that instead of asynchronous byte streams, the `TerminalWritable`
 * system synchronously transmits human readable messages intended to be rendered on a
 * text console or log file.
 *
 * The main feature of the `TerminalTransform` class is its {@link TerminalTransform.destination}
 * property, which tracks the next link in the graph.
 *
 * @public
 */
class TerminalTransform extends TerminalWritable_1.TerminalWritable {
    constructor(options) {
        super();
        this.destination = options.destination;
        this.preventDestinationAutoclose = !!options.preventDestinationAutoclose;
    }
    /** @override */
    onClose() {
        this.autocloseDestination();
    }
    /**
     * The default implementation of {@link TerminalTransform.onClose} calls this
     * method, which closes the {@link TerminalTransform.destination} if appropriate.
     *
     * @remarks
     * The destination will not be closed if its {@link TerminalWritable.preventAutoclose}
     * property is `true`.  The destination will not be closed if
     * {@link ITerminalTransformOptions.preventDestinationAutoclose}
     * is `true`.
     *
     * @sealed
     */
    autocloseDestination() {
        if (!this.preventDestinationAutoclose && !this.destination.preventAutoclose) {
            this.destination.close();
        }
    }
}
exports.TerminalTransform = TerminalTransform;
//# sourceMappingURL=TerminalTransform.js.map