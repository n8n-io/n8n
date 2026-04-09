// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as path from 'node:path';
import * as semver from 'semver';
import * as ts from 'typescript';
import * as resolve from 'resolve';
import { TSDocConfigFile } from '@microsoft/tsdoc-config';
import { FileSystem, NewlineKind, PackageJsonLookup, Path } from '@rushstack/node-core-library';
import { ExtractorConfig } from './ExtractorConfig';
import { Collector } from '../collector/Collector';
import { DtsRollupGenerator, DtsRollupKind } from '../generators/DtsRollupGenerator';
import { ApiModelGenerator } from '../generators/ApiModelGenerator';
import { ApiReportGenerator } from '../generators/ApiReportGenerator';
import { PackageMetadataManager } from '../analyzer/PackageMetadataManager';
import { ValidationEnhancer } from '../enhancers/ValidationEnhancer';
import { DocCommentEnhancer } from '../enhancers/DocCommentEnhancer';
import { CompilerState } from './CompilerState';
import { MessageRouter } from '../collector/MessageRouter';
import { ConsoleMessageId } from './ConsoleMessageId';
import { SourceMapper } from '../collector/SourceMapper';
/**
 * This object represents the outcome of an invocation of API Extractor.
 *
 * @public
 */
export class ExtractorResult {
    /** @internal */
    constructor(properties) {
        this.compilerState = properties.compilerState;
        this.extractorConfig = properties.extractorConfig;
        this.succeeded = properties.succeeded;
        this.apiReportChanged = properties.apiReportChanged;
        this.errorCount = properties.errorCount;
        this.warningCount = properties.warningCount;
    }
}
/**
 * The starting point for invoking the API Extractor tool.
 * @public
 */
export class Extractor {
    /**
     * Returns the version number of the API Extractor NPM package.
     */
    static get version() {
        return Extractor._getPackageJson().version;
    }
    /**
     * Returns the package name of the API Extractor NPM package.
     */
    static get packageName() {
        return Extractor._getPackageJson().name;
    }
    static _getPackageJson() {
        return PackageJsonLookup.loadOwnPackageJson(__dirname);
    }
    /**
     * Load the api-extractor.json config file from the specified path, and then invoke API Extractor.
     */
    static loadConfigAndInvoke(configFilePath, options) {
        const extractorConfig = ExtractorConfig.loadFileAndPrepare(configFilePath);
        return Extractor.invoke(extractorConfig, options);
    }
    /**
     * Invoke API Extractor using an already prepared `ExtractorConfig` object.
     */
    static invoke(extractorConfig, options) {
        const { packageFolder, messages, tsdocConfiguration, tsdocConfigFile: { filePath: tsdocConfigFilePath, fileNotFound: tsdocConfigFileNotFound }, apiJsonFilePath, newlineKind, reportTempFolder, reportFolder, apiReportEnabled, reportConfigs, testMode, rollupEnabled, publicTrimmedFilePath, alphaTrimmedFilePath, betaTrimmedFilePath, untrimmedFilePath, tsdocMetadataEnabled, tsdocMetadataFilePath } = extractorConfig;
        const { localBuild = false, compilerState = CompilerState.create(extractorConfig, options), messageCallback, showVerboseMessages = false, showDiagnostics = false, printApiReportDiff = false } = options !== null && options !== void 0 ? options : {};
        const sourceMapper = new SourceMapper();
        const messageRouter = new MessageRouter({
            workingPackageFolder: packageFolder,
            messageCallback,
            messagesConfig: messages || {},
            showVerboseMessages,
            showDiagnostics,
            tsdocConfiguration,
            sourceMapper
        });
        if (tsdocConfigFilePath && !tsdocConfigFileNotFound) {
            if (!Path.isEqual(tsdocConfigFilePath, ExtractorConfig._tsdocBaseFilePath)) {
                messageRouter.logVerbose(ConsoleMessageId.UsingCustomTSDocConfig, `Using custom TSDoc config from ${tsdocConfigFilePath}`);
            }
        }
        this._checkCompilerCompatibility(extractorConfig, messageRouter);
        if (messageRouter.showDiagnostics) {
            messageRouter.logDiagnostic('');
            messageRouter.logDiagnosticHeader('Final prepared ExtractorConfig');
            messageRouter.logDiagnostic(extractorConfig.getDiagnosticDump());
            messageRouter.logDiagnosticFooter();
            messageRouter.logDiagnosticHeader('Compiler options');
            const serializedCompilerOptions = MessageRouter.buildJsonDumpObject(compilerState.program.getCompilerOptions());
            messageRouter.logDiagnostic(JSON.stringify(serializedCompilerOptions, undefined, 2));
            messageRouter.logDiagnosticFooter();
            messageRouter.logDiagnosticHeader('TSDoc configuration');
            // Convert the TSDocConfiguration into a tsdoc.json representation
            const combinedConfigFile = TSDocConfigFile.loadFromParser(tsdocConfiguration);
            const serializedTSDocConfig = MessageRouter.buildJsonDumpObject(combinedConfigFile.saveToObject());
            messageRouter.logDiagnostic(JSON.stringify(serializedTSDocConfig, undefined, 2));
            messageRouter.logDiagnosticFooter();
        }
        const collector = new Collector({
            program: compilerState.program,
            messageRouter,
            extractorConfig,
            sourceMapper
        });
        collector.analyze();
        DocCommentEnhancer.analyze(collector);
        ValidationEnhancer.analyze(collector);
        const modelBuilder = new ApiModelGenerator(collector, extractorConfig);
        const apiPackage = modelBuilder.buildApiPackage();
        if (messageRouter.showDiagnostics) {
            messageRouter.logDiagnostic(''); // skip a line after any diagnostic messages
        }
        if (modelBuilder.docModelEnabled) {
            messageRouter.logVerbose(ConsoleMessageId.WritingDocModelFile, `Writing: ${apiJsonFilePath}`);
            apiPackage.saveToJsonFile(apiJsonFilePath, {
                toolPackage: Extractor.packageName,
                toolVersion: Extractor.version,
                newlineConversion: newlineKind,
                ensureFolderExists: true,
                testMode
            });
        }
        function writeApiReport(reportConfig) {
            return Extractor._writeApiReport(collector, extractorConfig, messageRouter, reportTempFolder, reportFolder, reportConfig, localBuild, printApiReportDiff);
        }
        let anyReportChanged = false;
        if (apiReportEnabled) {
            for (const reportConfig of reportConfigs) {
                anyReportChanged = writeApiReport(reportConfig) || anyReportChanged;
            }
        }
        if (rollupEnabled) {
            Extractor._generateRollupDtsFile(collector, publicTrimmedFilePath, DtsRollupKind.PublicRelease, newlineKind);
            Extractor._generateRollupDtsFile(collector, alphaTrimmedFilePath, DtsRollupKind.AlphaRelease, newlineKind);
            Extractor._generateRollupDtsFile(collector, betaTrimmedFilePath, DtsRollupKind.BetaRelease, newlineKind);
            Extractor._generateRollupDtsFile(collector, untrimmedFilePath, DtsRollupKind.InternalRelease, newlineKind);
        }
        if (tsdocMetadataEnabled) {
            // Write the tsdoc-metadata.json file for this project
            PackageMetadataManager.writeTsdocMetadataFile(tsdocMetadataFilePath, newlineKind);
        }
        // Show all the messages that we collected during analysis
        messageRouter.handleRemainingNonConsoleMessages();
        // Determine success
        let succeeded;
        if (localBuild) {
            // For a local build, fail if there were errors (but ignore warnings)
            succeeded = messageRouter.errorCount === 0;
        }
        else {
            // For a production build, fail if there were any errors or warnings
            succeeded = messageRouter.errorCount + messageRouter.warningCount === 0;
        }
        return new ExtractorResult({
            compilerState,
            extractorConfig,
            succeeded,
            apiReportChanged: anyReportChanged,
            errorCount: messageRouter.errorCount,
            warningCount: messageRouter.warningCount
        });
    }
    /**
     * Generates the API report at the specified release level, writes it to the specified file path, and compares
     * the output to the existing report (if one exists).
     *
     * @param reportTempDirectoryPath - The path to the directory under which the temp report file will be written prior
     * to comparison with an existing report.
     * @param reportDirectoryPath - The path to the directory under which the existing report file is located, and to
     * which the new report will be written post-comparison.
     * @param reportConfig - API report configuration, including its file name and {@link ApiReportVariant}.
     * @param printApiReportDiff - {@link IExtractorInvokeOptions.printApiReportDiff}
     *
     * @returns Whether or not the newly generated report differs from the existing report (if one exists).
     */
    static _writeApiReport(collector, extractorConfig, messageRouter, reportTempDirectoryPath, reportDirectoryPath, reportConfig, localBuild, printApiReportDiff) {
        let apiReportChanged = false;
        const actualApiReportPath = path.resolve(reportTempDirectoryPath, reportConfig.fileName);
        const actualApiReportShortPath = extractorConfig._getShortFilePath(actualApiReportPath);
        const expectedApiReportPath = path.resolve(reportDirectoryPath, reportConfig.fileName);
        const expectedApiReportShortPath = extractorConfig._getShortFilePath(expectedApiReportPath);
        collector.messageRouter.logVerbose(ConsoleMessageId.WritingApiReport, `Generating ${reportConfig.variant} API report: ${expectedApiReportPath}`);
        const actualApiReportContent = ApiReportGenerator.generateReviewFileContent(collector, reportConfig.variant);
        // Write the actual file
        FileSystem.writeFile(actualApiReportPath, actualApiReportContent, {
            ensureFolderExists: true,
            convertLineEndings: extractorConfig.newlineKind
        });
        // Compare it against the expected file
        if (FileSystem.exists(expectedApiReportPath)) {
            const expectedApiReportContent = FileSystem.readFile(expectedApiReportPath, {
                convertLineEndings: NewlineKind.Lf
            });
            if (!ApiReportGenerator.areEquivalentApiFileContents(actualApiReportContent, expectedApiReportContent)) {
                apiReportChanged = true;
                if (!localBuild) {
                    // For a production build, issue a warning that will break the CI build.
                    messageRouter.logWarning(ConsoleMessageId.ApiReportNotCopied, 'You have changed the API signature for this project.' +
                        ` Please copy the file "${actualApiReportShortPath}" to "${expectedApiReportShortPath}",` +
                        ` or perform a local build (which does this automatically).` +
                        ` See the Git repo documentation for more info.`);
                }
                else {
                    // For a local build, just copy the file automatically.
                    messageRouter.logWarning(ConsoleMessageId.ApiReportCopied, `You have changed the API signature for this project. Updating ${expectedApiReportShortPath}`);
                    FileSystem.writeFile(expectedApiReportPath, actualApiReportContent, {
                        ensureFolderExists: true,
                        convertLineEndings: extractorConfig.newlineKind
                    });
                }
                if (messageRouter.showVerboseMessages || printApiReportDiff) {
                    const Diff = require('diff');
                    const patch = Diff.structuredPatch(expectedApiReportShortPath, actualApiReportShortPath, expectedApiReportContent, actualApiReportContent);
                    const logFunction = printApiReportDiff
                        ? messageRouter.logWarning.bind(messageRouter)
                        : messageRouter.logVerbose.bind(messageRouter);
                    logFunction(ConsoleMessageId.ApiReportDiff, 'Changes to the API report:\n\n' + Diff.formatPatch(patch));
                }
            }
            else {
                messageRouter.logVerbose(ConsoleMessageId.ApiReportUnchanged, `The API report is up to date: ${actualApiReportShortPath}`);
            }
        }
        else {
            // The target file does not exist, so we are setting up the API review file for the first time.
            //
            // NOTE: People sometimes make a mistake where they move a project and forget to update the "reportFolder"
            // setting, which causes a new file to silently get written to the wrong place.  This can be confusing.
            // Thus we treat the initial creation of the file specially.
            apiReportChanged = true;
            if (!localBuild) {
                // For a production build, issue a warning that will break the CI build.
                messageRouter.logWarning(ConsoleMessageId.ApiReportNotCopied, 'The API report file is missing.' +
                    ` Please copy the file "${actualApiReportShortPath}" to "${expectedApiReportShortPath}",` +
                    ` or perform a local build (which does this automatically).` +
                    ` See the Git repo documentation for more info.`);
            }
            else {
                const expectedApiReportFolder = path.dirname(expectedApiReportPath);
                if (!FileSystem.exists(expectedApiReportFolder)) {
                    messageRouter.logError(ConsoleMessageId.ApiReportFolderMissing, 'Unable to create the API report file. Please make sure the target folder exists:\n' +
                        expectedApiReportFolder);
                }
                else {
                    FileSystem.writeFile(expectedApiReportPath, actualApiReportContent, {
                        convertLineEndings: extractorConfig.newlineKind
                    });
                    messageRouter.logWarning(ConsoleMessageId.ApiReportCreated, 'The API report file was missing, so a new file was created. Please add this file to Git:\n' +
                        expectedApiReportPath);
                }
            }
        }
        return apiReportChanged;
    }
    static _checkCompilerCompatibility(extractorConfig, messageRouter) {
        messageRouter.logInfo(ConsoleMessageId.Preamble, `Analysis will use the bundled TypeScript version ${ts.version}`);
        try {
            const typescriptPath = resolve.sync('typescript', {
                basedir: extractorConfig.projectFolder,
                preserveSymlinks: false
            });
            const packageJsonLookup = new PackageJsonLookup();
            const packageJson = packageJsonLookup.tryLoadNodePackageJsonFor(typescriptPath);
            if (packageJson && packageJson.version && semver.valid(packageJson.version)) {
                // Consider a newer MINOR release to be incompatible
                const ourMajor = semver.major(ts.version);
                const ourMinor = semver.minor(ts.version);
                const theirMajor = semver.major(packageJson.version);
                const theirMinor = semver.minor(packageJson.version);
                if (theirMajor > ourMajor || (theirMajor === ourMajor && theirMinor > ourMinor)) {
                    messageRouter.logInfo(ConsoleMessageId.CompilerVersionNotice, `*** The target project appears to use TypeScript ${packageJson.version} which is newer than the` +
                        ` bundled compiler engine; consider upgrading API Extractor.`);
                }
            }
        }
        catch (e) {
            // The compiler detection heuristic is not expected to work in many configurations
        }
    }
    static _generateRollupDtsFile(collector, outputPath, dtsKind, newlineKind) {
        if (outputPath !== '') {
            collector.messageRouter.logVerbose(ConsoleMessageId.WritingDtsRollup, `Writing package typings: ${outputPath}`);
            DtsRollupGenerator.writeTypingsFile(collector, outputPath, dtsKind, newlineKind);
        }
    }
}
//# sourceMappingURL=Extractor.js.map