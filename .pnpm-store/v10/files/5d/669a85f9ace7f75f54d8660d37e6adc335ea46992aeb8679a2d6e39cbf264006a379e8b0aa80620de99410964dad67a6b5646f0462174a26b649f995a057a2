"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineParameterWithArgument = exports.CommandLineParameterBase = exports.CommandLineParameterKind = void 0;
/**
 * Identifies the kind of a CommandLineParameter.
 * @public
 */
var CommandLineParameterKind;
(function (CommandLineParameterKind) {
    /** Indicates a CommandLineChoiceParameter */
    CommandLineParameterKind[CommandLineParameterKind["Choice"] = 0] = "Choice";
    /** Indicates a CommandLineFlagParameter */
    CommandLineParameterKind[CommandLineParameterKind["Flag"] = 1] = "Flag";
    /** Indicates a CommandLineIntegerParameter */
    CommandLineParameterKind[CommandLineParameterKind["Integer"] = 2] = "Integer";
    /** Indicates a CommandLineStringParameter */
    CommandLineParameterKind[CommandLineParameterKind["String"] = 3] = "String";
    /** Indicates a CommandLineStringListParameter */
    CommandLineParameterKind[CommandLineParameterKind["StringList"] = 4] = "StringList";
    /** Indicates a CommandLineChoiceListParameter */
    CommandLineParameterKind[CommandLineParameterKind["ChoiceList"] = 5] = "ChoiceList";
    /** Indicates a CommandLineIntegerListParameter */
    CommandLineParameterKind[CommandLineParameterKind["IntegerList"] = 6] = "IntegerList";
})(CommandLineParameterKind || (exports.CommandLineParameterKind = CommandLineParameterKind = {}));
/**
 * Matches kebab-case formatted strings prefixed with double dashes.
 * Example: "--do-something"
 */
const LONG_NAME_REGEXP = /^-(-[a-z0-9]+)+$/;
/**
 * Matches a single upper-case or lower-case letter prefixed with a dash.
 * Example: "-d"
 */
const SHORT_NAME_REGEXP = /^-[a-zA-Z]$/;
/**
 * Matches kebab-case formatted strings
 * Example: "my-scope"
 */
const SCOPE_REGEXP = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/**
 * "Environment variable names used by the utilities in the Shell and Utilities volume of
 * IEEE Std 1003.1-2001 consist solely of uppercase letters, digits, and the '_' (underscore)
 * from the characters defined in Portable Character Set and do not begin with a digit."
 * Example: "THE_SETTING"
 */
const ENVIRONMENT_VARIABLE_NAME_REGEXP = /^[A-Z_][A-Z0-9_]*$/;
/**
 * The base class for the various command-line parameter types.
 * @public
 */
class CommandLineParameterBase {
    /** @internal */
    constructor(definition) {
        this.longName = definition.parameterLongName;
        this._shortNameValue = definition.parameterShortName;
        this.parameterGroup = definition.parameterGroup;
        this.parameterScope = definition.parameterScope;
        this.description = definition.description;
        this.required = !!definition.required;
        this.environmentVariable = definition.environmentVariable;
        this.undocumentedSynonyms = definition.undocumentedSynonyms;
        this.allowNonStandardEnvironmentVariableNames = definition.allowNonStandardEnvironmentVariableNames;
        if (!LONG_NAME_REGEXP.test(this.longName)) {
            throw new Error(`Invalid name: "${this.longName}". The parameter long name must be` +
                ` lower-case and use dash delimiters (e.g. "--do-a-thing")`);
        }
        if (this.shortName) {
            if (!SHORT_NAME_REGEXP.test(this.shortName)) {
                throw new Error(`Invalid name: "${this.shortName}". The parameter short name must be` +
                    ` a dash followed by a single upper-case or lower-case letter (e.g. "-a")`);
            }
        }
        if (this.parameterScope) {
            if (!SCOPE_REGEXP.test(this.parameterScope)) {
                throw new Error(`Invalid scope: "${this.parameterScope}". The parameter scope name must be` +
                    ` lower-case and use dash delimiters (e.g. "my-scope")`);
            }
            // Parameter long name is guaranteed to start with '--' since this is validated above
            const unprefixedLongName = this.longName.slice(2);
            this.scopedLongName = `--${this.parameterScope}:${unprefixedLongName}`;
        }
        if (this.environmentVariable) {
            if (!this.allowNonStandardEnvironmentVariableNames &&
                !ENVIRONMENT_VARIABLE_NAME_REGEXP.test(this.environmentVariable)) {
                throw new Error(`Invalid environment variable name: "${this.environmentVariable}". The name must` +
                    ` consist only of upper-case letters, numbers, and underscores. It may not start with a number.`);
            }
        }
        if (this.undocumentedSynonyms && this.undocumentedSynonyms.length > 0) {
            for (const undocumentedSynonym of this.undocumentedSynonyms) {
                if (this.longName === undocumentedSynonym) {
                    throw new Error(`Invalid name: "${undocumentedSynonym}". Undocumented synonyms must not be the same` +
                        ` as the the long name.`);
                }
                else if (!LONG_NAME_REGEXP.test(undocumentedSynonym)) {
                    throw new Error(`Invalid name: "${undocumentedSynonym}". All undocumented synonyms name must be lower-case and ` +
                        'use dash delimiters (e.g. "--do-a-thing")');
                }
            }
        }
    }
    /** {@inheritDoc IBaseCommandLineDefinition.parameterShortName} */
    get shortName() {
        return this._shortNameValue;
    }
    /**
     * Returns additional text used by the help formatter.
     * @internal
     */
    _getSupplementaryNotes(supplementaryNotes) {
        // virtual
        if (this.environmentVariable !== undefined) {
            supplementaryNotes.push('This parameter may alternatively be specified via the ' +
                this.environmentVariable +
                ' environment variable.');
        }
    }
    /**
     * Internal usage only.  Used to report unexpected output from the argparse library.
     */
    reportInvalidData(data) {
        throw new Error(`Unexpected data object for parameter "${this.longName}": ` + JSON.stringify(data));
    }
    validateDefaultValue(hasDefaultValue) {
        if (this.required && hasDefaultValue) {
            // If a parameter is "required", then the user understands that they always need to
            // specify a value for this parameter (either via the command line or via an environment variable).
            // It would be confusing to allow a default value that sometimes allows the "required" parameter
            // to be omitted.  If you sometimes don't have a suitable default value, then the better approach
            // is to throw a custom error explaining why the parameter is required in that case.
            throw new Error(`A default value cannot be specified for "${this.longName}" because it is a "required" parameter`);
        }
    }
}
exports.CommandLineParameterBase = CommandLineParameterBase;
/**
 * The common base class for parameters types that receive an argument.
 *
 * @remarks
 * An argument is an accompanying command-line token, such as "123" in the
 * example "--max-count 123".
 * @public
 */
class CommandLineParameterWithArgument extends CommandLineParameterBase {
    /** @internal */
    constructor(definition) {
        super(definition);
        if (definition.argumentName === '') {
            throw new Error('The argument name cannot be an empty string. (For the default name, specify undefined.)');
        }
        if (definition.argumentName.toUpperCase() !== definition.argumentName) {
            throw new Error(`Invalid name: "${definition.argumentName}". The argument name must be all upper case.`);
        }
        const match = definition.argumentName.match(CommandLineParameterWithArgument._invalidArgumentNameRegExp);
        if (match) {
            throw new Error(`The argument name "${definition.argumentName}" contains an invalid character "${match[0]}".` +
                ` Only upper-case letters, numbers, and underscores are allowed.`);
        }
        this.argumentName = definition.argumentName;
        this.getCompletionsAsync = definition.getCompletionsAsync;
    }
}
exports.CommandLineParameterWithArgument = CommandLineParameterWithArgument;
// Matches the first character that *isn't* part of a valid upper-case argument name such as "URL_2"
CommandLineParameterWithArgument._invalidArgumentNameRegExp = /[^A-Z_0-9]/;
//# sourceMappingURL=BaseClasses.js.map