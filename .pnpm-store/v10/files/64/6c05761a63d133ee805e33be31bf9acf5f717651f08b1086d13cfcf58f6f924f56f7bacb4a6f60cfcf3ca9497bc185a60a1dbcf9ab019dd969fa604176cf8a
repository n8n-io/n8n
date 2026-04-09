"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineRemainder = void 0;
/**
 * The data type returned by {@link CommandLineParameterProvider.defineCommandLineRemainder}.
 * @public
 */
class CommandLineRemainder {
    /** @internal */
    constructor(definition) {
        this._values = [];
        this.description = definition.description;
    }
    /**
     * Returns any remaining command line arguments after the recognized portion
     * that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet.
     */
    get values() {
        return this._values;
    }
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data) {
        // abstract
        if (!Array.isArray(data) || !data.every((x) => typeof x === 'string')) {
            throw new Error(`Unexpected data object for remainder: ` + JSON.stringify(data));
        }
        this._values.push(...data);
    }
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList) {
        if (this.values.length > 0) {
            for (const value of this.values) {
                argList.push(value);
            }
        }
    }
}
exports.CommandLineRemainder = CommandLineRemainder;
//# sourceMappingURL=CommandLineRemainder.js.map