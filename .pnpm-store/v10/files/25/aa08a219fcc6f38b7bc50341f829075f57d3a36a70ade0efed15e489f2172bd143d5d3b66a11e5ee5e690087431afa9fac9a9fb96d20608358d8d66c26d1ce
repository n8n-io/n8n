"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabCompleteAction = void 0;
const string_argv_1 = __importDefault(require("string-argv"));
const BaseClasses_1 = require("../parameters/BaseClasses");
const CommandLineChoiceParameter_1 = require("../parameters/CommandLineChoiceParameter");
const CommandLineAction_1 = require("./CommandLineAction");
const Constants_1 = require("../Constants");
const DEFAULT_WORD_TO_AUTOCOMPLETE = '';
const DEFAULT_POSITION = 0;
class TabCompleteAction extends CommandLineAction_1.CommandLineAction {
    constructor(actions, globalParameters) {
        super({
            actionName: Constants_1.CommandLineConstants.TabCompletionActionName,
            summary: 'Provides tab completion.',
            documentation: 'Provides tab completion.'
        });
        this._actions = new Map();
        for (const action of actions) {
            const parameterNameToParameterInfoMap = new Map();
            for (const parameter of action.parameters) {
                parameterNameToParameterInfoMap.set(parameter.longName, parameter);
                if (parameter.shortName) {
                    parameterNameToParameterInfoMap.set(parameter.shortName, parameter);
                }
            }
            this._actions.set(action.actionName, parameterNameToParameterInfoMap);
        }
        this._globalParameters = new Map();
        for (const parameter of globalParameters) {
            this._globalParameters.set(parameter.longName, parameter);
            if (parameter.shortName) {
                this._globalParameters.set(parameter.shortName, parameter);
            }
        }
        this._wordToCompleteParameter = this.defineStringParameter({
            parameterLongName: '--word',
            argumentName: 'WORD',
            description: `The word to complete.`,
            defaultValue: DEFAULT_WORD_TO_AUTOCOMPLETE
        });
        this._positionParameter = this.defineIntegerParameter({
            parameterLongName: '--position',
            argumentName: 'INDEX',
            description: `The position in the word to be completed.`,
            defaultValue: DEFAULT_POSITION
        });
    }
    async onExecute() {
        const commandLine = this._wordToCompleteParameter.value;
        const caretPosition = this._positionParameter.value || commandLine.length;
        for await (const value of this.getCompletionsAsync(commandLine, caretPosition)) {
            // eslint-disable-next-line no-console
            console.log(value);
        }
    }
    async *getCompletionsAsync(commandLine, caretPosition = commandLine.length) {
        const actions = this._actions;
        if (!commandLine || !caretPosition) {
            yield* this._getAllActions();
            return;
        }
        const tokens = Array.from(this.tokenizeCommandLine(commandLine));
        // offset arguments by the number of global params in the input
        const globalParameterOffset = this._getGlobalParameterOffset(tokens);
        if (tokens.length < 2 + globalParameterOffset) {
            yield* this._getAllActions();
            return;
        }
        const lastToken = tokens[tokens.length - 1];
        const secondLastToken = tokens[tokens.length - 2];
        const lastCharacterIsWhitespace = !commandLine.slice(-1).trim();
        const completePartialWord = caretPosition === commandLine.length && !lastCharacterIsWhitespace;
        if (completePartialWord && tokens.length === 2 + globalParameterOffset) {
            for (const actionName of actions.keys()) {
                if (actionName.indexOf(tokens[1 + globalParameterOffset]) === 0) {
                    yield actionName;
                }
            }
        }
        else {
            for (const actionName of actions.keys()) {
                if (actionName === tokens[1 + globalParameterOffset]) {
                    const parameterNameMap = actions.get(actionName);
                    const parameterNames = Array.from(parameterNameMap.keys());
                    if (completePartialWord) {
                        for (const parameterName of parameterNames) {
                            if (parameterName === secondLastToken) {
                                const values = await this._getParameterValueCompletionsAsync(parameterNameMap.get(parameterName));
                                if (values.size > 0) {
                                    yield* this._completeParameterValues(values, lastToken);
                                    return;
                                }
                            }
                        }
                        yield* this._completeParameterValues(parameterNames, lastToken);
                    }
                    else {
                        for (const parameterName of parameterNames) {
                            if (parameterName === lastToken) {
                                const values = await this._getParameterValueCompletionsAsync(parameterNameMap.get(parameterName));
                                if (values.size > 0) {
                                    yield* values;
                                    return;
                                }
                            }
                        }
                        for (const parameterName of parameterNames) {
                            if (parameterName === lastToken &&
                                parameterNameMap.get(parameterName).kind !== BaseClasses_1.CommandLineParameterKind.Flag) {
                                // The parameter is expecting a value, so don't suggest parameter names again
                                return;
                            }
                        }
                        yield* parameterNames;
                    }
                    break;
                }
            }
        }
    }
    *_getAllActions() {
        yield* this._actions.keys();
        yield* this._globalParameters.keys();
    }
    tokenizeCommandLine(commandLine) {
        return (0, string_argv_1.default)(commandLine);
    }
    async _getParameterValueCompletionsAsync(parameter) {
        var _a;
        let choiceParameterValues;
        if (parameter.kind === BaseClasses_1.CommandLineParameterKind.Choice) {
            choiceParameterValues = parameter.alternatives;
        }
        else if (parameter.kind !== BaseClasses_1.CommandLineParameterKind.Flag) {
            let parameterWithArgumentOrChoices = undefined;
            if (parameter instanceof BaseClasses_1.CommandLineParameterWithArgument ||
                parameter instanceof CommandLineChoiceParameter_1.CommandLineChoiceParameter) {
                parameterWithArgumentOrChoices = parameter;
            }
            const completionValues = await ((_a = parameterWithArgumentOrChoices === null || parameterWithArgumentOrChoices === void 0 ? void 0 : parameterWithArgumentOrChoices.completions) === null || _a === void 0 ? void 0 : _a.call(parameterWithArgumentOrChoices));
            choiceParameterValues = completionValues instanceof Set ? completionValues : new Set(completionValues);
        }
        return choiceParameterValues !== null && choiceParameterValues !== void 0 ? choiceParameterValues : new Set();
    }
    _getGlobalParameterOffset(tokens) {
        const globalParameters = this._globalParameters;
        let count = 0;
        outer: for (let i = 1; i < tokens.length; i++) {
            for (const globalParameter of globalParameters.values()) {
                if (tokens[i] !== globalParameter.longName && tokens[i] !== globalParameter.shortName) {
                    break outer;
                }
            }
            count++;
        }
        return count;
    }
    *_completeParameterValues(choiceParameterValues, lastToken) {
        for (const choiceParameterValue of choiceParameterValues) {
            if (choiceParameterValue.indexOf(lastToken) === 0) {
                yield choiceParameterValue;
            }
        }
    }
}
exports.TabCompleteAction = TabCompleteAction;
//# sourceMappingURL=TabCompletionAction.js.map