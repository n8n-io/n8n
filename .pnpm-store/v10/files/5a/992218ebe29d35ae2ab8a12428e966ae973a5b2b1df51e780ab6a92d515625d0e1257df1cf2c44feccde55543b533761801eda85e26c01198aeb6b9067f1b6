"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineIntegerParameter = void 0;
const BaseClasses_1 = require("./BaseClasses");
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineIntegerParameter:1)}.
 * @public
 */
class CommandLineIntegerParameter extends BaseClasses_1.CommandLineParameterWithArgument {
    /** @internal */
    constructor(definition) {
        super(definition);
        this._value = undefined;
        /** {@inheritDoc CommandLineParameter.kind} */
        this.kind = BaseClasses_1.CommandLineParameterKind.Integer;
        this.defaultValue = definition.defaultValue;
        this.validateDefaultValue(!!this.defaultValue);
    }
    /**
     * {@inheritDoc CommandLineParameter._setValue}
     * @internal
     */
    _setValue(data) {
        // abstract
        if (data !== null && data !== undefined) {
            if (typeof data !== 'number') {
                this.reportInvalidData(data);
            }
            this._value = data;
            return;
        }
        if (this.environmentVariable !== undefined) {
            // Try reading the environment variable
            const environmentValue = process.env[this.environmentVariable];
            if (environmentValue !== undefined && environmentValue !== '') {
                const parsed = parseInt(environmentValue, 10);
                if (isNaN(parsed) || environmentValue.indexOf('.') >= 0) {
                    throw new Error(`Invalid value "${environmentValue}" for the environment variable` +
                        ` ${this.environmentVariable}.  It must be an integer value.`);
                }
                this._value = parsed;
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
     * {@inheritDoc CommandLineParameter._getSupplementaryNotes}
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes) {
        // virtual
        super._getSupplementaryNotes(supplementaryNotes);
        if (this.defaultValue !== undefined) {
            supplementaryNotes.push(`The default value is ${this.defaultValue}.`);
        }
    }
    /**
     * Returns the argument value for an integer parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be undefined if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value() {
        return this._value;
    }
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList) {
        if (this.value !== undefined) {
            argList.push(this.longName);
            argList.push(this.value.toString());
        }
    }
}
exports.CommandLineIntegerParameter = CommandLineIntegerParameter;
//# sourceMappingURL=CommandLineIntegerParameter.js.map