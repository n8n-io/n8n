// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as os from 'node:os';
import * as path from 'node:path';
import { PackageJsonLookup, FileSystem, Path, AlreadyReportedError } from '@rushstack/node-core-library';
import { Colorize } from '@rushstack/terminal';
import { CommandLineAction } from '@rushstack/ts-command-line';
import { Extractor } from '../api/Extractor';
import { ExtractorConfig } from '../api/ExtractorConfig';
export class RunAction extends CommandLineAction {
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
            description: `Use the specified ${ExtractorConfig.FILENAME} file path, rather than guessing its location`
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
        const lookup = new PackageJsonLookup();
        let configFilename;
        let typescriptCompilerFolder = this._typescriptCompilerFolderParameter.value;
        if (typescriptCompilerFolder) {
            typescriptCompilerFolder = path.normalize(typescriptCompilerFolder);
            if (FileSystem.exists(typescriptCompilerFolder)) {
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
            if (!FileSystem.exists(configFilename)) {
                throw new Error('Config file not found: ' + this._configFileParameter.value);
            }
            extractorConfig = ExtractorConfig.loadFileAndPrepare(configFilename);
        }
        else {
            const prepareOptions = ExtractorConfig.tryLoadForFolder({
                startingFolder: '.'
            });
            if (!prepareOptions || !prepareOptions.configObjectFullPath) {
                throw new Error(`Unable to find an ${ExtractorConfig.FILENAME} file`);
            }
            const configObjectShortPath = Path.formatConcisely({
                pathToConvert: prepareOptions.configObjectFullPath,
                baseFolder: process.cwd()
            });
            console.log(`Using configuration from ${configObjectShortPath}`);
            extractorConfig = ExtractorConfig.prepare(prepareOptions);
        }
        const extractorResult = Extractor.invoke(extractorConfig, {
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
                console.log(os.EOL + Colorize.red('API Extractor completed with errors'));
            }
            else {
                console.log(os.EOL + Colorize.yellow('API Extractor completed with warnings'));
            }
            throw new AlreadyReportedError();
        }
    }
}
//# sourceMappingURL=RunAction.js.map