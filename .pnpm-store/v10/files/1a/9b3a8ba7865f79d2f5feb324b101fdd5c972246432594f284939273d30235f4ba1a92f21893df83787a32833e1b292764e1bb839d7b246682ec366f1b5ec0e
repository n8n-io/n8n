"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopedCommandLineAction = void 0;
const Constants_1 = require("../Constants");
const CommandLineAction_1 = require("./CommandLineAction");
const CommandLineParser_1 = require("./CommandLineParser");
const CommandLineParserExitError_1 = require("./CommandLineParserExitError");
/**
 * A CommandLineParser used exclusively to parse the scoped command-line parameters
 * for a ScopedCommandLineAction.
 */
class InternalScopedCommandLineParser extends CommandLineParser_1.CommandLineParser {
    get canExecute() {
        return this._canExecute;
    }
    constructor(options) {
        const { actionOptions, unscopedActionParameters, toolFilename, aliasAction, aliasDocumentation } = options;
        const toolCommand = `${toolFilename} ${actionOptions.actionName}`;
        // When coming from an alias command, we want to show the alias command name in the help text
        const toolCommandForLogging = `${toolFilename} ${aliasAction !== null && aliasAction !== void 0 ? aliasAction : actionOptions.actionName}`;
        const scopingArgs = [];
        for (const parameter of unscopedActionParameters) {
            parameter.appendToArgList(scopingArgs);
        }
        const scope = scopingArgs.join(' ');
        // We can run the parser directly because we are not going to use it for any other actions,
        // so construct a special options object to make the "--help" text more useful.
        const scopedCommandLineParserOptions = {
            // Strip the scoping args if coming from an alias command, since they are not applicable
            // to the alias command itself
            toolFilename: `${toolCommandForLogging}${scope && !aliasAction ? ` ${scope} --` : ''}`,
            toolDescription: aliasDocumentation !== null && aliasDocumentation !== void 0 ? aliasDocumentation : actionOptions.documentation,
            toolEpilog: `For more information on available unscoped parameters, use "${toolCommand} --help"`,
            enableTabCompletionAction: false
        };
        super(scopedCommandLineParserOptions);
        this._canExecute = false;
        this._internalOptions = options;
        this._internalOptions.onDefineScopedParameters(this);
    }
    _registerDefinedParameters(state) {
        // Since we are in a separate parser, we need to register the parameters using the state
        // from the parent parser.
        super._registerDefinedParameters(this._internalOptions.registerDefinedParametersState);
    }
    async onExecute() {
        // override
        // Only set if we made it this far, which may not be the case if an error occurred or
        // if '--help' was specified.
        this._canExecute = true;
    }
}
/**
 * Represents a sub-command that is part of the CommandLineParser command-line.
 * Applications should create subclasses of ScopedCommandLineAction corresponding to
 * each action that they want to expose.
 *
 * The action name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs"). A group of related commands
 * can be prefixed with a colon (e.g. "docs:generate", "docs:deploy",
 * "docs:serve", etc).
 *
 * Scoped commands allow for different parameters to be specified for different
 * provided scoping values. For example, the "scoped-action --scope A" command
 * may allow for different scoped arguments to be specified than the "scoped-action
 * --scope B" command.
 *
 * Scoped arguments are specified after the "--" pseudo-argument. For example,
 * "scoped-action --scope A -- --scopedFoo --scopedBar".
 *
 * @public
 */
class ScopedCommandLineAction extends CommandLineAction_1.CommandLineAction {
    constructor(options) {
        var _a;
        super(options);
        this._options = options;
        this._scopingParameters = [];
        // Consume the remainder of the command-line, which will later be passed the scoped parser.
        // This will also prevent developers from calling this.defineCommandLineRemainder(...) since
        // we will have already defined it.
        this.defineCommandLineRemainder({
            description: 'Scoped parameters.  Must be prefixed with "--", ex. "-- --scopedParameter ' +
                'foo --scopedFlag".  For more information on available scoped parameters, use "-- --help".'
        });
        (_a = this.onDefineUnscopedParameters) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    /**
     * {@inheritDoc CommandLineParameterProvider.parameters}
     *
     * @internalremarks
     * TODO: Replace this type with `CommandLineParameter` in the next major bump.
     */
    get parameters() {
        if (this._scopedCommandLineParser) {
            return [...super.parameters, ...this._scopedCommandLineParser.parameters];
        }
        else {
            return super.parameters;
        }
    }
    /**
     * {@inheritdoc CommandLineParameterProvider._processParsedData}
     * @internal
     */
    _processParsedData(parserOptions, data) {
        // override
        super._processParsedData(parserOptions, data);
        // This should never happen because the super method should throw if parameters haven't been registered,
        // but guard against this just in-case.
        if (this._subparserState === undefined) {
            throw new Error('Parameters have not been registered');
        }
        this._unscopedParserOptions = parserOptions;
        // Generate the scoped parser using the parent parser information. We can only create this after we
        // have parsed the data, since the parameter values are used during construction.
        this._scopedCommandLineParser = new InternalScopedCommandLineParser({
            ...parserOptions,
            actionOptions: this._options,
            aliasAction: data.aliasAction,
            aliasDocumentation: data.aliasDocumentation,
            unscopedActionParameters: this.parameters,
            registerDefinedParametersState: this._subparserState,
            onDefineScopedParameters: this.onDefineScopedParameters.bind(this)
        });
    }
    /**
     * {@inheritdoc CommandLineAction._executeAsync}
     * @internal
     */
    async _executeAsync() {
        // override
        if (!this._unscopedParserOptions || !this._scopedCommandLineParser) {
            throw new Error('The CommandLineAction parameters must be processed before execution.');
        }
        if (!this.remainder) {
            throw new Error('CommandLineAction.onDefineParameters must be called before execution.');
        }
        // The '--' argument is required to separate the action parameters from the scoped parameters,
        // so it needs to be trimmed. If remainder values are provided but no '--' is found, then throw.
        const scopedArgs = [];
        if (this.remainder.values.length) {
            if (this.remainder.values[0] !== '--') {
                throw new CommandLineParserExitError_1.CommandLineParserExitError(
                // argparse sets exit code 2 for invalid arguments
                2, 
                // model the message off of the built-in "unrecognized arguments" message
                `${this.renderUsageText()}\n${this._unscopedParserOptions.toolFilename} ${this.actionName}: ` +
                    `error: Unrecognized arguments: ${this.remainder.values[0]}.\n`);
            }
            for (const scopedArg of this.remainder.values.slice(1)) {
                scopedArgs.push(scopedArg);
            }
        }
        // Call the scoped parser using only the scoped args to handle parsing
        await this._scopedCommandLineParser.executeWithoutErrorHandlingAsync(scopedArgs);
        // Only call execute if the parser reached the execute stage. This may not be true if
        // the parser exited early due to a specified '--help' parameter.
        if (this._scopedCommandLineParser.canExecute) {
            await super._executeAsync();
        }
        return;
    }
    /** @internal */
    _registerDefinedParameters(state) {
        if (!this._scopingParameters.length) {
            throw new Error('No scoping parameters defined. At least one scoping parameter must be defined. ' +
                'Scoping parameters are defined by setting the parameterGroupName to ' +
                'ScopedCommandLineAction.ScopingParameterGroupName.');
        }
        super._registerDefinedParameters(state);
        const { parentParameterNames } = state;
        const updatedParentParameterNames = new Set([
            ...parentParameterNames,
            ...this._registeredParameterParserKeysByName.keys()
        ]);
        this._subparserState = {
            ...state,
            parentParameterNames: updatedParentParameterNames
        };
    }
    /**
     * Retrieves the scoped CommandLineParser, which is populated after the ScopedCommandLineAction is executed.
     * @internal
     */
    _getScopedCommandLineParser() {
        if (!this._scopedCommandLineParser) {
            throw new Error('The scoped CommandLineParser is only populated after the action is executed.');
        }
        return this._scopedCommandLineParser;
    }
    /** @internal */
    _defineParameter(parameter) {
        super._defineParameter(parameter);
        if (parameter.parameterGroup === ScopedCommandLineAction.ScopingParameterGroup) {
            this._scopingParameters.push(parameter);
        }
    }
}
exports.ScopedCommandLineAction = ScopedCommandLineAction;
/**
 * The required group name to apply to all scoping parameters. At least one parameter
 * must be defined with this group name.
 */
ScopedCommandLineAction.ScopingParameterGroup = Constants_1.SCOPING_PARAMETER_GROUP;
//# sourceMappingURL=ScopedCommandLineAction.js.map