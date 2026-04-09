"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixProxyTerminalProvider = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
/**
 * Wraps an existing {@link ITerminalProvider} that prefixes each line of output with a specified
 * prefix string.
 *
 * @beta
 */
class PrefixProxyTerminalProvider {
    constructor(options) {
        const { terminalProvider } = options;
        this._parentTerminalProvider = terminalProvider;
        if (options.prefix !== undefined) {
            const { prefix } = options;
            this._getPrefix = () => prefix;
        }
        else {
            const { getPrefix } = options;
            this._getPrefix = getPrefix;
        }
        this._isOnNewline = true;
        this._newlineRegex = new RegExp(`${node_core_library_1.Text.escapeRegExp(terminalProvider.eolCharacter)}|\\n`, 'g');
    }
    /** @override */
    get supportsColor() {
        return this._parentTerminalProvider.supportsColor;
    }
    /** @override */
    get eolCharacter() {
        return this._parentTerminalProvider.eolCharacter;
    }
    /** @override */
    write(data, severity) {
        // We need to track newlines to ensure that the prefix is added to each line
        let currentIndex = 0;
        let newlineMatch;
        while ((newlineMatch = this._newlineRegex.exec(data))) {
            // Extract the line, add the prefix, and write it out with the newline
            const newlineIndex = newlineMatch.index;
            const newIndex = newlineIndex + newlineMatch[0].length;
            const prefix = this._isOnNewline ? this._getPrefix() : '';
            const dataToWrite = `${prefix}${data.substring(currentIndex, newIndex)}`;
            this._parentTerminalProvider.write(dataToWrite, severity);
            // Update the currentIndex to start the search from the char after the newline
            currentIndex = newIndex;
            this._isOnNewline = true;
        }
        // The remaining data is not postfixed by a newline, so write out the data and set _isNewline to false
        const remainingData = data.substring(currentIndex);
        if (remainingData.length) {
            const prefix = this._isOnNewline ? this._getPrefix() : '';
            this._parentTerminalProvider.write(`${prefix}${remainingData}`, severity);
            this._isOnNewline = false;
        }
    }
}
exports.PrefixProxyTerminalProvider = PrefixProxyTerminalProvider;
//# sourceMappingURL=PrefixProxyTerminalProvider.js.map