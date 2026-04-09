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
        this._destinations = new Set(options.destinations);
    }
    get destinations() {
        return this._destinations;
    }
    /**
     * Adds a destination to the set of destinations. Duplicates are ignored.
     * Only new chunks received after the destination is added will be sent to it.
     * @param destination - The destination to add.
     */
    addDestination(destination) {
        this._destinations.add(destination);
    }
    /**
     * Removes a destination from the set of destinations. It will no longer receive chunks, and will be closed, unless
     * `destination.preventAutoclose` is set to `true`.
     * @param destination - The destination to remove.
     * @param close - If `true` (default), the destination will be closed when removed, unless `destination.preventAutoclose` is set to `true`.
     * @returns `true` if the destination was removed, `false` if it was not found.
     * @remarks
     * If the destination is not found, it will not be closed.
     */
    removeDestination(destination, close = true) {
        if (this._destinations.delete(destination)) {
            if (close && !destination.preventAutoclose) {
                destination.close();
            }
            return true;
        }
        return false;
    }
    onWriteChunk(chunk) {
        for (const destination of this._destinations) {
            destination.writeChunk(chunk);
        }
    }
    onClose() {
        const errors = [];
        // If an exception is thrown, try to ensure that the other destinations get closed properly
        for (const destination of this._destinations) {
            if (!destination.preventAutoclose) {
                try {
                    destination.close();
                }
                catch (error) {
                    errors.push(error);
                }
            }
        }
        this._destinations.clear();
        if (errors.length > 0) {
            throw errors[0];
        }
    }
}
exports.SplitterTransform = SplitterTransform;
//# sourceMappingURL=SplitterTransform.js.map