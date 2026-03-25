"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentVariableParser = void 0;
/**
 * Some parameter types can receive their values from an environment variable instead of
 * a command line argument. This class provides some utility methods for parsing environment
 * variable values.
 * @internal
 */
class EnvironmentVariableParser {
    static parseAsList(envVarName) {
        const environmentValue = process.env[envVarName];
        if (environmentValue !== undefined) {
            // NOTE: If the environment variable is defined as an empty string,
            // here we will accept the empty string as our value.  (For number/flag we don't do that.)
            if (environmentValue.trimLeft()[0] === '[') {
                // Specifying multiple items in an environment variable is a somewhat rare case.  But environment
                // variables are actually a pretty reliable way for a tool to avoid shell escaping problems
                // when spawning another tool.  For this case, we need a reliable way to pass an array of strings
                // that could contain any character.  For example, if we simply used ";" as the list delimiter,
                // then what to do if a string contains that character?  We'd need to design an escaping mechanism.
                // Since JSON is simple and standard and can escape every possible string, it's a better option
                // than a custom delimiter.
                try {
                    const parsedJson = JSON.parse(environmentValue);
                    if (!Array.isArray(parsedJson) ||
                        !parsedJson.every((x) => typeof x === 'string' || typeof x === 'boolean' || typeof x === 'number')) {
                        throw new Error(`The ${environmentValue} environment variable value must be a JSON ` +
                            ` array containing only strings, numbers, and booleans.`);
                    }
                    return parsedJson.map((x) => x.toString());
                }
                catch (ex) {
                    throw new Error(`The ${environmentValue} environment variable value looks like a JSON array` +
                        ` but failed to parse: ` +
                        ex.message);
                }
            }
            else {
                // As a shorthand, a single value may be specified without JSON encoding, as long as it does not
                // start with the "[" character.
                return [environmentValue];
            }
        }
        return undefined;
    }
}
exports.EnvironmentVariableParser = EnvironmentVariableParser;
//# sourceMappingURL=EnvironmentVariableParser.js.map