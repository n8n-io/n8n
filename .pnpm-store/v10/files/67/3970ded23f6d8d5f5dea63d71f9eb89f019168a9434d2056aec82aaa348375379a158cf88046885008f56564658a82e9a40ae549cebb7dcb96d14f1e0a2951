"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineStringParameter = void 0;
const BaseClasses_1 = require("./BaseClasses");
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineStringParameter:1)}.
 * @public
 */
class CommandLineStringParameter extends BaseClasses_1.CommandLineParameterWithArgument {
    /** @internal */
    constructor(definition) {
        super(definition);
        this._value = undefined;
        /** {@inheritDoc CommandLineParameterBase.kind} */
        this.kind = BaseClasses_1.CommandLineParameterKind.String;
        this.defaultValue = definition.defaultValue;
        this.validateDefaultValue(!!this.defaultValue);
    }
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data) {
        // abstract
        if (data !== null && data !== undefined) {
            if (typeof data !== 'string') {
                this.reportInvalidData(data);
            }
            this._value = data;
            return;
        }
        if (this.environmentVariable !== undefined) {
            // Try reading the environment variable
            const environmentValue = process.env[this.environmentVariable];
            if (environmentValue !== undefined) {
                // NOTE: If the environment variable is defined as an empty string,
                // here we will accept the empty string as our value.  (For number/flag we don't do that.)
                this._value = environmentValue;
                return;
            }
        }
        if (this.defaultValue !== undefined) {
            this._value = this.defaultValue;
            return;
        }
        this._value = undefined;
    }
    /**
     * {@inheritDoc CommandLineParameterBase._getSupplementaryNotes}
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes) {
        // virtual
        super._getSupplementaryNotes(supplementaryNotes);
        if (this.defaultValue !== undefined) {
            if (this.defaultValue.length < 160) {
                supplementaryNotes.push(`The default value is ${JSON.stringify(this.defaultValue)}.`);
            }
        }
    }
    /**
     * Returns the argument value for a string parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value() {
        return this._value;
    }
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList) {
        if (this.value !== undefined) {
            argList.push(this.longName);
            argList.push(this.value);
        }
    }
}
exports.CommandLineStringParameter = CommandLineStringParameter;
//# sourceMappingURL=CommandLineStringParameter.js.map