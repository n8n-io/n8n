// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as os from 'node:os';
import { CommandLineParser } from '@rushstack/ts-command-line';
import { AlreadyReportedError, InternalError } from '@rushstack/node-core-library';
import { Colorize } from '@rushstack/terminal';
import { RunAction } from './RunAction';
import { InitAction } from './InitAction';
export class ApiExtractorCommandLine extends CommandLineParser {
    constructor() {
        super({
            toolFilename: 'api-extractor',
            toolDescription: 'API Extractor helps you build better TypeScript libraries.  It analyzes the main entry' +
                ' point for your package, collects the inventory of exported declarations, and then generates three kinds' +
                ' of output:  an API report file (.api.md) to facilitate reviews, a declaration rollup (.d.ts) to be' +
                ' published with your NPM package, and a doc model file (.api.json) to be used with a documentation' +
                ' tool such as api-documenter.  For details, please visit the web site.'
        });
        this._populateActions();
        this._debugParameter = this.defineFlagParameter({
            parameterLongName: '--debug',
            parameterShortName: '-d',
            description: 'Show the full call stack if an error occurs while executing the tool'
        });
    }
    async onExecuteAsync() {
        if (this._debugParameter.value) {
            InternalError.breakInDebugger = true;
        }
        process.exitCode = 1;
        try {
            await super.onExecuteAsync();
            process.exitCode = 0;
        }
        catch (error) {
            if (!(error instanceof AlreadyReportedError)) {
                if (this._debugParameter.value) {
                    console.error(os.EOL + error.stack);
                }
                else {
                    console.error(os.EOL + Colorize.red('ERROR: ' + error.message.trim()));
                }
            }
        }
    }
    _populateActions() {
        this.addAction(new InitAction(this));
        this.addAction(new RunAction(this));
    }
}
//# sourceMappingURL=ApiExtractorCommandLine.js.map