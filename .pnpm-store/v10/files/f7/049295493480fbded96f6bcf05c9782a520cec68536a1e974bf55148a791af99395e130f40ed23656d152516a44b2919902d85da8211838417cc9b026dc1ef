"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineParser = void 0;
const terminal_1 = require("@rushstack/terminal");
const CommandLineParameterProvider_1 = require("./CommandLineParameterProvider");
const CommandLineParserExitError_1 = require("./CommandLineParserExitError");
const TabCompletionAction_1 = require("./TabCompletionAction");
const TypeUuidLite_1 = require("../TypeUuidLite");
/**
 * The "argparse" library is a relatively advanced command-line parser with features such
 * as word-wrapping and intelligible error messages (that are lacking in other similar
 * libraries such as commander, yargs, and nomnom).  Unfortunately, its ruby-inspired API
 * is awkward to use.  The abstract base classes CommandLineParser and CommandLineAction
 * provide a wrapper for "argparse" that makes defining and consuming arguments quick
 * and simple, and enforces that appropriate documentation is provided for each parameter.
 *
 * @public
 */
class CommandLineParser extends CommandLineParameterProvider_1.CommandLineParameterProvider {
    constructor(options) {
        var _a, _b;
        super();
        this._executed = false;
        this._tabCompleteActionWasAdded = false;
        this._options = options;
        this._actions = [];
        this._actionsByName = new Map();
        this._argumentParser = new CommandLineParserExitError_1.CustomArgumentParser({
            addHelp: true,
            prog: this._options.toolFilename,
            description: this._options.toolDescription,
            epilog: terminal_1.Colorize.bold((_a = this._options.toolEpilog) !== null && _a !== void 0 ? _a : `For detailed help about a specific command, use: ${this._options.toolFilename} <command> -h`)
        });
        (_b = this.onDefineParameters) === null || _b === void 0 ? void 0 : _b.call(this);
    }
    /**
     * Returns the list of actions that were defined for this CommandLineParser object.
     */
    get actions() {
        return this._actions;
    }
    /**
     * Defines a new action that can be used with the CommandLineParser instance.
     */
    addAction(action) {
        if (!this._actionsSubParser) {
            this._actionsSubParser = this._argumentParser.addSubparsers({
                metavar: '<command>',
                dest: 'action'
            });
        }
        action._buildParser(this._actionsSubParser);
        this._actions.push(action);
        this._actionsByName.set(action.actionName, action);
    }
    /**
     * Retrieves the action with the specified name.  If no matching action is found,
     * an exception is thrown.
     */
    getAction(actionName) {
        const action = this.tryGetAction(actionName);
        if (!action) {
            throw new Error(`The action "${actionName}" was not defined`);
        }
        return action;
    }
    /**
     * Retrieves the action with the specified name.  If no matching action is found,
     * undefined is returned.
     */
    tryGetAction(actionName) {
        return this._actionsByName.get(actionName);
    }
    /**
     * The program entry point will call this method to begin parsing command-line arguments
     * and executing the corresponding action.
     *
     * @remarks
     * The returned promise will never reject:  If an error occurs, it will be printed
     * to stderr, process.exitCode will be set to 1, and the promise will resolve to false.
     * This simplifies the most common usage scenario where the program entry point doesn't
     * want to be involved with the command-line logic, and will discard the promise without
     * a then() or catch() block.
     *
     * If your caller wants to trap and handle errors, use {@link CommandLineParser.executeWithoutErrorHandlingAsync}
     * instead.
     *
     * @param args - the command-line arguments to be parsed; if omitted, then
     *               the process.argv will be used
     */
    async executeAsync(args) {
        if (this._options.enableTabCompletionAction && !this._tabCompleteActionWasAdded) {
            this.addAction(new TabCompletionAction_1.TabCompleteAction(this.actions, this.parameters));
            this._tabCompleteActionWasAdded = true;
        }
        try {
            await this.executeWithoutErrorHandlingAsync(args);
            return true;
        }
        catch (err) {
            if (err instanceof CommandLineParserExitError_1.CommandLineParserExitError) {
                // executeWithoutErrorHandlingAsync() handles the successful cases,
                // so here we can assume err has a nonzero exit code
                if (err.message) {
                    // eslint-disable-next-line no-console
                    console.error(err.message);
                }
                if (!process.exitCode) {
                    process.exitCode = err.exitCode;
                }
            }
            else if (TypeUuidLite_1.TypeUuid.isInstanceOf(err, TypeUuidLite_1.uuidAlreadyReportedError)) {
                //  AlreadyReportedError
                if (!process.exitCode) {
                    process.exitCode = 1;
                }
            }
            else {
                let message = (err.message || 'An unknown error occurred').trim();
                // If the message doesn't already start with "Error:" then add a prefix
                if (!/^(error|internal error|warning)\b/i.test(message)) {
                    message = 'Error: ' + message;
                }
                // eslint-disable-next-line no-console
                console.error();
                // eslint-disable-next-line no-console
                console.error(terminal_1.Colorize.red(message));
                if (!process.exitCode) {
                    process.exitCode = 1;
                }
            }
            return false;
        }
    }
    /**
     * @deprecated Use {@link CommandLineParser.executeAsync} instead.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async execute(args) {
        return await this.executeAsync(args);
    }
    /**
     * This is similar to {@link CommandLineParser.executeAsync}, except that execution errors
     * simply cause the promise to reject.  It is the caller's responsibility to trap
     */
    async executeWithoutErrorHandlingAsync(args) {
        var _a, _b;
        try {
            if (this._executed) {
                // In the future we could allow the same parser to be invoked multiple times
                // with different arguments.  We'll do that work as soon as someone encounters
                // a real world need for it.
                throw new Error('executeAsync() was already called for this parser instance');
            }
            this._executed = true;
            this._validateDefinitions();
            // Register the parameters before we print help or parse the CLI
            const initialState = {
                parentParameterNames: new Set()
            };
            this._registerDefinedParameters(initialState);
            if (!args) {
                // 0=node.exe, 1=script name
                args = process.argv.slice(2);
            }
            if (this.actions.length > 0) {
                if (args.length === 0) {
                    // Parsers that use actions should print help when 0 args are provided. Allow
                    // actionless parsers to continue on zero args.
                    this._argumentParser.printHelp();
                    return;
                }
                // Alias actions may provide a list of default params to add after the action name.
                // Since we don't know which params are required and which are optional, perform a
                // manual search for the action name to obtain the default params and insert them if
                // any are found. We will guess that the action name is the first arg that doesn't
                // start with a hyphen.
                const actionNameIndex = args.findIndex((x) => !x.startsWith('-'));
                if (actionNameIndex !== undefined) {
                    const actionName = args[actionNameIndex];
                    const action = this.tryGetAction(actionName);
                    const aliasAction = action;
                    if ((_a = aliasAction === null || aliasAction === void 0 ? void 0 : aliasAction.defaultParameters) === null || _a === void 0 ? void 0 : _a.length) {
                        const insertIndex = actionNameIndex + 1;
                        args = args.slice(0, insertIndex).concat(aliasAction.defaultParameters, args.slice(insertIndex));
                    }
                }
            }
            const postParse = () => {
                this._postParse();
                for (const action of this.actions) {
                    action._postParse();
                }
            };
            function patchFormatUsageForArgumentParser(argumentParser) {
                const originalFormatUsage = argumentParser.formatUsage.bind(argumentParser);
                argumentParser.formatUsage = () => {
                    postParse();
                    return originalFormatUsage();
                };
            }
            this._preParse();
            patchFormatUsageForArgumentParser(this._argumentParser);
            for (const action of this.actions) {
                action._preParse();
                patchFormatUsageForArgumentParser(action._getArgumentParser());
            }
            const data = this._argumentParser.parseArgs(args);
            postParse();
            this._processParsedData(this._options, data);
            this.selectedAction = this.tryGetAction(data.action);
            if (this.actions.length > 0 && !this.selectedAction) {
                const actions = this.actions.map((x) => x.actionName);
                throw new Error(`An action must be specified (${actions.join(', ')})`);
            }
            (_b = this.selectedAction) === null || _b === void 0 ? void 0 : _b._processParsedData(this._options, data);
            await this.onExecute();
        }
        catch (err) {
            if (err instanceof CommandLineParserExitError_1.CommandLineParserExitError) {
                if (!err.exitCode) {
                    // non-error exit modeled using exception handling
                    if (err.message) {
                        // eslint-disable-next-line no-console
                        console.log(err.message);
                    }
                    return;
                }
            }
            throw err;
        }
    }
    /**
     * @deprecated Use {@link CommandLineParser.executeWithoutErrorHandlingAsync} instead.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async executeWithoutErrorHandling(args) {
        await this.executeWithoutErrorHandlingAsync(args);
    }
    /** @internal */
    _registerDefinedParameters(state) {
        super._registerDefinedParameters(state);
        const { parentParameterNames } = state;
        const updatedParentParameterNames = new Set([
            ...parentParameterNames,
            ...this._registeredParameterParserKeysByName.keys()
        ]);
        const parentState = {
            ...state,
            parentParameterNames: updatedParentParameterNames
        };
        for (const action of this._actions) {
            action._registerDefinedParameters(parentState);
        }
    }
    _validateDefinitions() {
        if (this.remainder && this.actions.length > 0) {
            // This is apparently not supported by argparse
            throw new Error('defineCommandLineRemainder() cannot be called for a CommandLineParser with actions');
        }
    }
    /**
     * {@inheritDoc CommandLineParameterProvider._getArgumentParser}
     * @internal
     */
    _getArgumentParser() {
        // override
        return this._argumentParser;
    }
    /**
     * This hook allows the subclass to perform additional operations before or after
     * the chosen action is executed.
     */
    async onExecute() {
        if (this.selectedAction) {
            await this.selectedAction._executeAsync();
        }
    }
}
exports.CommandLineParser = CommandLineParser;
//# sourceMappingURL=CommandLineParser.js.map