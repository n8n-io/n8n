// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TerminalWritable } from './TerminalWritable';
/**
 * This class enables very basic {@link TerminalWritable.onWriteChunk} operations to be implemented
 * as a callback function, avoiding the need to define a subclass of `TerminalWritable`.
 *
 * @remarks
 * `CallbackWritable` is provided as a convenience for very simple situations. For most cases,
 * it is generally preferable to create a proper subclass.
 *
 * @privateRemarks
 * We intentionally do not expose a callback for {@link TerminalWritable.onClose}; if special
 * close behavior is required, it is better to create a subclass.
 *
 * @public
 */
export class CallbackWritable extends TerminalWritable {
    constructor(options) {
        super();
        this._callback = options.onWriteChunk;
    }
    onWriteChunk(chunk) {
        this._callback(chunk);
    }
}
//# sourceMappingURL=CallbackWritable.js.map