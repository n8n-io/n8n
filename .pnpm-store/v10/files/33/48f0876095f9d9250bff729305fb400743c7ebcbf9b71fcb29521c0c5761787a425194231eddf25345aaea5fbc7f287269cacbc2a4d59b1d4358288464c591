"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpTerminalProvider = void 0;
/**
 * Terminal provider that stores written data in buffers separated by severity.
 * This terminal provider is designed to be used when code that prints to a terminal
 * is being unit tested.
 *
 * @beta
 */
class NoOpTerminalProvider {
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data, severity) {
        // no-op
    }
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter() {
        return '\n';
    }
    /**
     * {@inheritDoc ITerminalProvider.supportsColor}
     */
    get supportsColor() {
        return false;
    }
}
exports.NoOpTerminalProvider = NoOpTerminalProvider;
//# sourceMappingURL=NoOpTerminalProvider.js.map