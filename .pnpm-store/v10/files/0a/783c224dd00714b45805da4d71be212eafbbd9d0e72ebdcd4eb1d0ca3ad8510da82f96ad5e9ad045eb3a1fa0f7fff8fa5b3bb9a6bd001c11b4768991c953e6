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
exports.RunAction = void 0;
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const node_core_library_1 = require("@rushstack/node-core-library");
const terminal_1 = require("@rushstack/terminal");
const ts_command_line_1 = require("@rushstack/ts-command-line");
const Extractor_1 = require("../api/Extractor");
const ExtractorConfig_1 = require("../api/ExtractorConfig");
class RunAction extends ts_command_line_1.CommandLineAction {
    constructor(parser) {
        super({
            actionName: 'run',
            summary: 'Invoke API Extractor on a project',
            documentation: 'Invoke API Extractor on a project'
        });
        this._configFileParameter = this.defineStringParameter({
            parameterLongName: '--config',
            parameterShortName: '-c',
            argumentName: 'FILE',
            description: `Use the specified ${ExtractorConfig_1.ExtractorConfig.FILENAME} file path, rather than guessing its location`
        });
        this._localFlag = this.defineFlagParameter({
            parameterLongName: '--local',
            parameterShortName: '-l',
            description: 'Indicates that API Extractor is running as part of a local build,' +
                " e.g. on a developer's machine. This disables certain validation that would" +
                ' normally be performed for a ship/production build. For example, the *.api.md' +
                ' report file is automatically copied in a local build.'
        });
        this._verboseFlag = this.defineFlagParameter({
            parameterLongName: '--verbose',
            parameterShortName: '-v',
            description: 'Show additional informational messages in the output.'
        });
        this._diagnosticsParameter = this.defineFlagParameter({
            parameterLongName: '--diagnostics',
            description: 'Show diagnostic messages used for troubleshooting problems with API Extractor.' +
                '  This flag also enables the "--verbose" flag.'
        });
        this._typescriptCompilerFolderParameter = this.defineStringParameter({
            parameterLongName: '--typescript-compiler-folder',
            argumentName: 'PATH',
            description: 'API Extractor uses its own TypeScript compiler engine to analyze your project.  If your project' +
                ' is built with a significantly different TypeScript version, sometimes API Extractor may report compilation' +
                ' errors due to differences in the system typings (e.g. lib.dom.d.ts).  You can use the' +
                ' "--typescriptCompilerFolder" option to specify the folder path where you installed the TypeScript package,' +
                " and API Extractor's compiler will use those system typings instead."
        });
        this._printApiReportDiffFlag = this.defineFlagParameter({
            parameterLongName: '--print-api-report-diff',
            description: 'If provided, then any differences between the actual and expected API reports will be ' +
                'printed on the console. Note that the diff is not printed if the expected API report file has not been ' +
                'created yet.'
        });
    }
    async onExecuteAsync() {
        const lookup = new node_core_library_1.PackageJsonLookup();
        let configFilename;
        let typescriptCompilerFolder = this._typescriptCompilerFolderParameter.value;
        if (typescriptCompilerFolder) {
            typescriptCompilerFolder = path.normalize(typescriptCompilerFolder);
            if (node_core_library_1.FileSystem.exists(typescriptCompilerFolder)) {
                typescriptCompilerFolder = lookup.tryGetPackageFolderFor(typescriptCompilerFolder);
                const typescriptCompilerPackageJson = typescriptCompilerFolder
                    ? lookup.tryLoadPackageJsonFor(typescriptCompilerFolder)
                    : undefined;
                if (!typescriptCompilerPackageJson) {
                    throw new Error(`The path specified in the ${this._typescriptCompilerFolderParameter.longName} parameter is not a package.`);
                }
                else if (typescriptCompilerPackageJson.name !== 'typescript') {
                    throw new Error(`The path specified in the ${this._typescriptCompilerFolderParameter.longName} parameter is not a TypeScript` +
                        ' compiler package.');
                }
            }
            else {
                throw new Error(`The path specified in the ${this._typescriptCompilerFolderParameter.longName} parameter does not exist.`);
            }
        }
        let extractorConfig;
        if (this._configFileParameter.value) {
            configFilename = path.normalize(this._configFileParameter.value);
            if (!node_core_library_1.FileSystem.exists(configFilename)) {
                throw new Error('Config file not found: ' + this._configFileParameter.value);
            }
            extractorConfig = ExtractorConfig_1.ExtractorConfig.loadFileAndPrepare(configFilename);
        }
        else {
            const prepareOptions = ExtractorConfig_1.ExtractorConfig.tryLoadForFolder({
                startingFolder: '.'
            });
            if (!prepareOptions || !prepareOptions.configObjectFullPath) {
                throw new Error(`Unable to find an ${ExtractorConfig_1.ExtractorConfig.FILENAME} file`);
            }
            const configObjectShortPath = node_core_library_1.Path.formatConcisely({
                pathToConvert: prepareOptions.configObjectFullPath,
                baseFolder: process.cwd()
            });
            console.log(`Using configuration from ${configObjectShortPath}`);
            extractorConfig = ExtractorConfig_1.ExtractorConfig.prepare(prepareOptions);
        }
        const extractorResult = Extractor_1.Extractor.invoke(extractorConfig, {
            localBuild: this._localFlag.value,
            showVerboseMessages: this._verboseFlag.value,
            showDiagnostics: this._diagnosticsParameter.value,
            typescriptCompilerFolder: typescriptCompilerFolder,
            printApiReportDiff: this._printApiReportDiffFlag.value
        });
        if (extractorResult.succeeded) {
            console.log(os.EOL + 'API Extractor completed successfully');
        }
        else {
            if (extractorResult.errorCount > 0) {
                console.log(os.EOL + terminal_1.Colorize.red('API Extractor completed with errors'));
            }
            else {
                console.log(os.EOL + terminal_1.Colorize.yellow('API Extractor completed with warnings'));
            }
            throw new node_core_library_1.AlreadyReportedError();
        }
    }
}
exports.RunAction = RunAction;
//# sourceMappingURL=RunAction.js.map