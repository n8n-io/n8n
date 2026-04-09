"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLineAction = void 0;
const CommandLineParameterProvider_1 = require("./CommandLineParameterProvider");
const CommandLineParserExitError_1 = require("./CommandLineParserExitError");
const escapeSprintf_1 = require("../escapeSprintf");
/**
 * Example: "do-something"
 */
const ACTION_NAME_REGEXP = /^[a-z][a-z0-9]*([-:][a-z0-9]+)*$/;
/**
 * Represents a sub-command that is part of the CommandLineParser command line.
 * Applications should create subclasses of CommandLineAction corresponding to
 * each action that they want to expose.
 *
 * The action name should be comprised of lower case words separated by hyphens
 * or colons. The name should include an English verb (e.g. "deploy"). Use a
 * hyphen to separate words (e.g. "upload-docs"). A group of related commands
 * can be prefixed with a colon (e.g. "docs:generate", "docs:deploy",
 * "docs:serve", etc).
 *
 * @public
 */
class CommandLineAction extends CommandLineParameterProvider_1.CommandLineParameterProvider {
    constructor(options) {
        super();
        if (!ACTION_NAME_REGEXP.test(options.actionName)) {
            throw new Error(`Invalid action name "${options.actionName}". ` +
                `The name must be comprised of lower-case words optionally separated by hyphens or colons.`);
        }
        this.actionName = options.actionName;
        this.summary = options.summary;
        this.documentation = options.documentation;
        this._argumentParser = undefined;
    }
    /**
     * This is called internally by CommandLineParser.addAction()
     * @internal
     */
    _buildParser(actionsSubParser) {
        this._argumentParser = actionsSubParser.addParser(this.actionName, {
            help: (0, escapeSprintf_1.escapeSprintf)(this.summary),
            description: (0, escapeSprintf_1.escapeSprintf)(this.documentation)
        });
        // Monkey-patch the error handling for the action parser
        this._argumentParser.exit = (status, message) => {
            throw new CommandLineParserExitError_1.CommandLineParserExitError(status, message);
        };
        const originalArgumentParserErrorFn = this._argumentParser.error.bind(this._argumentParser);
        this._argumentParser.error = (err) => {
            // Ensure the ParserExitError bubbles up to the top without any special processing
            if (err instanceof CommandLineParserExitError_1.CommandLineParserExitError) {
                throw err;
            }
            originalArgumentParserErrorFn(err);
        };
    }
    /**
     * Invoked by CommandLineParser.onExecute().
     * @internal
     */
    async _executeAsync() {
        await this.onExecuteAsync();
    }
    /**
     * {@inheritDoc CommandLineParameterProvider._getArgumentParser}
     * @internal
     */
    _getArgumentParser() {
        if (!this._argumentParser) {
            // We will improve this in the future
            throw new Error('The CommandLineAction must be added to a CommandLineParser before it can be used');
        }
        return this._argumentParser;
    }
}
exports.CommandLineAction = CommandLineAction;
//# sourceMappingURL=CommandLineAction.js.map