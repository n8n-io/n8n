"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineIntegerListParameter = void 0;
const BaseClasses_1 = require("./BaseClasses");
const EnvironmentVariableParser_1 = require("./EnvironmentVariableParser");
/**
 * The data type returned by {@link CommandLineParameterProvider.defineIntegerListParameter}.
 * @public
 */
class CommandLineIntegerListParameter extends BaseClasses_1.CommandLineParameterWithArgument {
    /** @internal */
    constructor(definition) {
        super(definition);
        this._values = [];
        /** {@inheritDoc CommandLineParameterBase.kind} */
        this.kind = BaseClasses_1.CommandLineParameterKind.IntegerList;
    }
    /**
     * {@inheritDoc CommandLineParameterBase._setValue}
     * @internal
     */
    _setValue(data) {
        // If argparse passed us a value, confirm it is valid
        if (data !== null && data !== undefined) {
            if (!Array.isArray(data)) {
                this.reportInvalidData(data);
            }
            for (const arrayItem of data) {
                if (typeof arrayItem !== 'number') {
                    this.reportInvalidData(data);
                }
            }
            this._values = data;
            return;
        }
        // If an environment variable exists, attempt to parse it as a list
        if (this.environmentVariable !== undefined) {
            const values = EnvironmentVariableParser_1.EnvironmentVariableParser.parseAsList(this.environmentVariable);
            if (values) {
                const parsedValues = [];
                for (const value of values) {
                    const parsed = parseInt(value, 10);
                    if (isNaN(parsed) || value.indexOf('.') >= 0) {
                        throw new Error(`Invalid value "${value}" for the environment variable` +
                            ` ${this.environmentVariable}.  It must be an integer value.`);
                    }
                    parsedValues.push(parsed);
                }
                this._values = parsedValues;
                return;
            }
        }
        // (No default value for integer lists)
        this._values = [];
    }
    /**
     * Returns the integer arguments for an integer list parameter that was parsed from the command line.
     *
     * @remarks
     * The array will be empty if the command-line has not been parsed yet,
     * or if the parameter was omitted and has no default value.
     */
    get values() {
        return this._values;
    }
    /** {@inheritDoc CommandLineParameterBase.appendToArgList} @override */
    appendToArgList(argList) {
        if (this.values.length > 0) {
            for (const value of this.values) {
                argList.push(this.longName);
                argList.push(value.toString());
            }
        }
    }
}
exports.CommandLineIntegerListParameter = CommandLineIntegerListParameter;
//# sourceMappingURL=CommandLineIntegerListParameter.js.map