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
exports.ApiExtractorCommandLine = void 0;
const os = __importStar(require("node:os"));
const ts_command_line_1 = require("@rushstack/ts-command-line");
const node_core_library_1 = require("@rushstack/node-core-library");
const terminal_1 = require("@rushstack/terminal");
const RunAction_1 = require("./RunAction");
const InitAction_1 = require("./InitAction");
class ApiExtractorCommandLine extends ts_command_line_1.CommandLineParser {
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
            node_core_library_1.InternalError.breakInDebugger = true;
        }
        process.exitCode = 1;
        try {
            await super.onExecuteAsync();
            process.exitCode = 0;
        }
        catch (error) {
            if (!(error instanceof node_core_library_1.AlreadyReportedError)) {
                if (this._debugParameter.value) {
                    console.error(os.EOL + error.stack);
                }
                else {
                    console.error(os.EOL + terminal_1.Colorize.red('ERROR: ' + error.message.trim()));
                }
            }
        }
    }
    _populateActions() {
        this.addAction(new InitAction_1.InitAction(this));
        this.addAction(new RunAction_1.RunAction(this));
    }
}
exports.ApiExtractorCommandLine = ApiExtractorCommandLine;
//# sourceMappingURL=ApiExtractorCommandLine.js.map