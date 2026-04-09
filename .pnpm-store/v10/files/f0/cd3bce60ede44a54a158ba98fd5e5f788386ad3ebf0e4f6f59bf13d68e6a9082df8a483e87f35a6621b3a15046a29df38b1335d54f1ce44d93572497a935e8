"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AliasCommandLineAction = void 0;
const argparse = __importStar(require("argparse"));
const CommandLineAction_1 = require("./CommandLineAction");
const BaseClasses_1 = require("../parameters/BaseClasses");
/**
 * Represents a sub-command that is part of the CommandLineParser command line.
 * The sub-command is an alias for another existing action.
 *
 * The alias name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs").
 *
 * @public
 */
class AliasCommandLineAction extends CommandLineAction_1.CommandLineAction {
    constructor(options) {
        const toolFilename = options.toolFilename;
        const targetActionName = options.targetAction.actionName;
        const defaultParametersString = (options.defaultParameters || []).join(' ');
        const summary = `An alias for "${toolFilename} ${targetActionName}${defaultParametersString ? ` ${defaultParametersString}` : ''}".`;
        super({
            actionName: options.aliasName,
            summary,
            documentation: `${summary} For more information on the aliased command, use ` +
                `"${toolFilename} ${targetActionName} --help".`
        });
        this._parameterKeyMap = new Map();
        this.targetAction = options.targetAction;
        this.defaultParameters = options.defaultParameters || [];
    }
    /** @internal */
    _registerDefinedParameters(state) {
        /* override */
        // All parameters are going to be defined by the target action. Re-use the target action parameters
        // for this action.
        for (const parameter of this.targetAction.parameters) {
            const { kind, longName, shortName } = parameter;
            let aliasParameter;
            const nameOptions = {
                parameterLongName: longName,
                parameterShortName: shortName
            };
            switch (kind) {
                case BaseClasses_1.CommandLineParameterKind.Choice:
                    aliasParameter = this.defineChoiceParameter({
                        ...nameOptions,
                        ...parameter,
                        alternatives: [...parameter.alternatives]
                    });
                    break;
                case BaseClasses_1.CommandLineParameterKind.ChoiceList:
                    aliasParameter = this.defineChoiceListParameter({
                        ...nameOptions,
                        ...parameter,
                        alternatives: [...parameter.alternatives]
                    });
                    break;
                case BaseClasses_1.CommandLineParameterKind.Flag:
                    aliasParameter = this.defineFlagParameter({ ...nameOptions, ...parameter });
                    break;
                case BaseClasses_1.CommandLineParameterKind.Integer:
                    aliasParameter = this.defineIntegerParameter({ ...nameOptions, ...parameter });
                    break;
                case BaseClasses_1.CommandLineParameterKind.IntegerList:
                    aliasParameter = this.defineIntegerListParameter({ ...nameOptions, ...parameter });
                    break;
                case BaseClasses_1.CommandLineParameterKind.String:
                    aliasParameter = this.defineStringParameter({ ...nameOptions, ...parameter });
                    break;
                case BaseClasses_1.CommandLineParameterKind.StringList:
                    aliasParameter = this.defineStringListParameter({ ...nameOptions, ...parameter });
                    break;
                default:
                    throw new Error(`Unsupported parameter kind: ${kind}`);
            }
            // We know the parserKey is defined because the underlying _defineParameter method sets it,
            // and all parameters that we have access to have already been defined.
            this._parameterKeyMap.set(aliasParameter._parserKey, parameter._parserKey);
        }
        // We also need to register the remainder parameter if the target action has one. The parser
        // key for this parameter is constant.
        if (this.targetAction.remainder) {
            this.defineCommandLineRemainder(this.targetAction.remainder);
            this._parameterKeyMap.set(argparse.Const.REMAINDER, argparse.Const.REMAINDER);
        }
        // Finally, register the parameters with the parser. We need to make sure that the target action
        // is registered, since we need to re-use its parameters, and ambiguous parameters are discovered
        // during registration. This will no-op if the target action is already registered.
        this.targetAction._registerDefinedParameters(state);
        super._registerDefinedParameters(state);
        // We need to re-map the ambiguous parameters after they are defined by calling
        // super._registerDefinedParameters()
        for (const [ambiguousParameterName, parserKey] of this._ambiguousParameterParserKeysByName) {
            const targetParserKey = this.targetAction._ambiguousParameterParserKeysByName.get(ambiguousParameterName);
            // If we have a mapping for the specified key, then use it. Otherwise, use the key as-is.
            if (targetParserKey) {
                this._parameterKeyMap.set(parserKey, targetParserKey);
            }
        }
    }
    /**
     * {@inheritdoc CommandLineParameterProvider._processParsedData}
     * @internal
     */
    _processParsedData(parserOptions, data) {
        // Re-map the parsed data to the target action's parameters and execute the target action processor.
        const targetData = {
            action: this.targetAction.actionName,
            aliasAction: data.action,
            aliasDocumentation: this.documentation
        };
        for (const [key, value] of Object.entries(data)) {
            // If we have a mapping for the specified key, then use it. Otherwise, use the key as-is.
            // Skip over the action key though, since we've already re-mapped it to "aliasAction"
            if (key === 'action') {
                continue;
            }
            const targetKey = this._parameterKeyMap.get(key);
            targetData[targetKey !== null && targetKey !== void 0 ? targetKey : key] = value;
        }
        this.targetAction._processParsedData(parserOptions, targetData);
    }
    /**
     * Executes the target action.
     */
    async onExecuteAsync() {
        await this.targetAction._executeAsync();
    }
}
exports.AliasCommandLineAction = AliasCommandLineAction;
//# sourceMappingURL=AliasCommandLineAction.js.map