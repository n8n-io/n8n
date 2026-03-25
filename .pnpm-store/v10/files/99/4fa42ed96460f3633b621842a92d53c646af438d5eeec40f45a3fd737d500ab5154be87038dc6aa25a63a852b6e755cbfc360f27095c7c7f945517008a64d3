"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineChoiceParameter = void 0;
const BaseClasses_1 = require("./BaseClasses");
/**
 * The data type returned by {@link CommandLineParameterProvider.(defineChoiceParameter:1)}.
 * @public
 */
class CommandLineChoiceParameter extends BaseClasses_1.CommandLineParameterBase {
    /** @internal */
    constructor(definition) {
        super(definition);
        this._value = undefined;
        /** {@inheritDoc CommandLineParameter.kind} */
        this.kind = -BaseClasses_1.CommandLineParameterKind.Choice;
        const { alternatives, defaultValue, completions } = definition;
        const alternativesSet = alternatives instanceof Set ? alternatives : new Set(alternatives);
        if (alternativesSet.size < 1) {
            throw new Error(`When defining a choice parameter, the alternatives list must contain at least one value.`);
        }
        if (defaultValue && !alternativesSet.has(defaultValue)) {
            throw new Error(`The specified default value "${defaultValue}"` +
                ` is not one of the available options: ${alternatives.toString()}`);
        }
        this.alternatives = alternativesSet;
        this.defaultValue = defaultValue;
        this.validateDefaultValue(!!this.defaultValue);
        this.completions = completions;
    }
    /**
     * {@inheritDoc CommandLineParameter._setValue}
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
            if (environmentValue !== undefined && environmentValue !== '') {
                if (!this.alternatives.has(environmentValue)) {
                    const choices = '"' + Array.from(this.alternatives).join('", "') + '"';
                    throw new Error(`Invalid value "${environmentValue}" for the environment variable` +
                        ` ${this.environmentVariable}.  Valid choices are: ${choices}`);
                }
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
     * {@inheritDoc CommandLineParameter._getSupplementaryNotes}
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes) {
        // virtual
        super._getSupplementaryNotes(supplementaryNotes);
        if (this.defaultValue !== undefined) {
            supplementaryNotes.push(`The default value is "${this.defaultValue}".`);
        }
    }
    /**
     * Returns the argument value for a choice parameter that was parsed from the command line.
     *
     * @remarks
     * The return value will be `undefined` if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get value() {
        return this._value;
    }
    /** {@inheritDoc CommandLineParameter.appendToArgList} @override */
    appendToArgList(argList) {
        if (this.value !== undefined) {
            argList.push(this.longName);
            argList.push(this.value);
        }
    }
}
exports.CommandLineChoiceParameter = CommandLineChoiceParameter;
//# sourceMappingURL=CommandLineChoiceParameter.js.map