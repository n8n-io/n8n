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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractorConfig = void 0;
const path = __importStar(require("node:path"));
const resolve = __importStar(require("resolve"));
const lodash = require("lodash");
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const tsdoc_1 = require("@microsoft/tsdoc");
const tsdoc_config_1 = require("@microsoft/tsdoc-config");
const rig_package_1 = require("@rushstack/rig-package");
const node_core_library_1 = require("@rushstack/node-core-library");
const PackageMetadataManager_1 = require("../analyzer/PackageMetadataManager");
const MessageRouter_1 = require("../collector/MessageRouter");
const api_extractor_schema_json_1 = __importDefault(require("../schemas/api-extractor.schema.json"));
/** Default {@link IConfigApiReport.reportVariants} */
const defaultApiReportVariants = ['complete'];
/**
 * Default {@link IConfigApiReport.tagsToReport}.
 *
 * @remarks
 * Note that this list is externally documented, and directly affects report output.
 * Also note that the order of tags in this list is significant, as it determines the order of tags in the report.
 * Any changes to this list should be considered breaking.
 */
const defaultTagsToReport = {
    '@sealed': true,
    '@virtual': true,
    '@override': true,
    '@eventProperty': true,
    '@deprecated': true
};
/**
 * The `ExtractorConfig` class loads, validates, interprets, and represents the api-extractor.json config file.
 * @sealed
 * @public
 */
class ExtractorConfig {
    /**
     * Gets the file path for the "complete" (default) report configuration, if one was specified.
     * Otherwise, returns an empty string.
     * @deprecated Use {@link ExtractorConfig.reportConfigs} to access all report configurations.
     */
    get reportFilePath() {
        const completeConfig = this._getCompleteReportConfig();
        return completeConfig === undefined ? '' : path.join(this.reportFolder, completeConfig.fileName);
    }
    /**
     * Gets the temp file path for the "complete" (default) report configuration, if one was specified.
     * Otherwise, returns an empty string.
     * @deprecated Use {@link ExtractorConfig.reportConfigs} to access all report configurations.
     */
    get reportTempFilePath() {
        const completeConfig = this._getCompleteReportConfig();
        return completeConfig === undefined ? '' : path.join(this.reportTempFolder, completeConfig.fileName);
    }
    constructor({ projectFolder, packageJson, packageFolder, mainEntryPointFilePath, bundledPackages, tsconfigFilePath, overrideTsconfig, skipLibCheck, apiReportEnabled, apiReportIncludeForgottenExports, reportConfigs, reportFolder, reportTempFolder, tagsToReport, docModelGenerationOptions, apiJsonFilePath, docModelIncludeForgottenExports, projectFolderUrl, rollupEnabled, untrimmedFilePath, alphaTrimmedFilePath, betaTrimmedFilePath, publicTrimmedFilePath, omitTrimmingComments, tsdocMetadataEnabled, tsdocMetadataFilePath, tsdocConfigFile, tsdocConfiguration, newlineKind, messages, testMode, enumMemberOrder }) {
        this.projectFolder = projectFolder;
        this.packageJson = packageJson;
        this.packageFolder = packageFolder;
        this.mainEntryPointFilePath = mainEntryPointFilePath;
        this.bundledPackages = bundledPackages;
        this.tsconfigFilePath = tsconfigFilePath;
        this.overrideTsconfig = overrideTsconfig;
        this.skipLibCheck = skipLibCheck;
        this.apiReportEnabled = apiReportEnabled;
        this.apiReportIncludeForgottenExports = apiReportIncludeForgottenExports;
        this.reportConfigs = reportConfigs;
        this.reportFolder = reportFolder;
        this.reportTempFolder = reportTempFolder;
        this.tagsToReport = tagsToReport;
        this.docModelGenerationOptions = docModelGenerationOptions;
        this.apiJsonFilePath = apiJsonFilePath;
        this.docModelIncludeForgottenExports = docModelIncludeForgottenExports;
        this.projectFolderUrl = projectFolderUrl;
        this.rollupEnabled = rollupEnabled;
        this.untrimmedFilePath = untrimmedFilePath;
        this.alphaTrimmedFilePath = alphaTrimmedFilePath;
        this.betaTrimmedFilePath = betaTrimmedFilePath;
        this.publicTrimmedFilePath = publicTrimmedFilePath;
        this.omitTrimmingComments = omitTrimmingComments;
        this.tsdocMetadataEnabled = tsdocMetadataEnabled;
        this.tsdocMetadataFilePath = tsdocMetadataFilePath;
        this.tsdocConfigFile = tsdocConfigFile;
        this.tsdocConfiguration = tsdocConfiguration;
        this.newlineKind = newlineKind;
        this.messages = messages;
        this.testMode = testMode;
        this.enumMemberOrder = enumMemberOrder;
    }
    /**
     * Returns a JSON-like string representing the `ExtractorConfig` state, which can be printed to a console
     * for diagnostic purposes.
     *
     * @remarks
     * This is used by the "--diagnostics" command-line option.  The string is not intended to be deserialized;
     * its format may be changed at any time.
     */
    getDiagnosticDump() {
        // Handle the simple JSON-serializable properties using buildJsonDumpObject()
        const result = MessageRouter_1.MessageRouter.buildJsonDumpObject(this, {
            keyNamesToOmit: ['tsdocConfigFile', 'tsdocConfiguration']
        });
        // Implement custom formatting for tsdocConfigFile and tsdocConfiguration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.tsdocConfigFile = {
            filePath: this.tsdocConfigFile.filePath,
            log: this.tsdocConfigFile.log.messages.map((x) => x.toString())
        };
        return JSON.stringify(result, undefined, 2);
    }
    /**
     * Returns a simplified file path for use in error messages.
     * @internal
     */
    _getShortFilePath(absolutePath) {
        if (!path.isAbsolute(absolutePath)) {
            throw new node_core_library_1.InternalError('Expected absolute path: ' + absolutePath);
        }
        if (node_core_library_1.Path.isUnderOrEqual(absolutePath, this.projectFolder)) {
            return node_core_library_1.Path.convertToSlashes(path.relative(this.projectFolder, absolutePath));
        }
        return absolutePath;
    }
    /**
     * Searches for the api-extractor.json config file associated with the specified starting folder,
     * and loads the file if found.  This lookup supports
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig packages}.
     *
     * @remarks
     * The search will first look for a package.json file in a parent folder of the starting folder;
     * if found, that will be used as the base folder instead of the starting folder.  If the config
     * file is not found in `<baseFolder>/api-extractor.json` or `<baseFolder>/config/api-extractor.json`,
     * then `<baseFolder/config/rig.json` will be checked to see whether a
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig package} is referenced; if so then
     * the rig's api-extractor.json file will be used instead.  If a config file is found, it will be loaded
     * and returned with the `IExtractorConfigPrepareOptions` object. Otherwise, `undefined` is returned
     * to indicate that API Extractor does not appear to be configured for the specified folder.
     *
     * @returns An options object that can be passed to {@link ExtractorConfig.prepare}, or `undefined`
     * if not api-extractor.json file was found.
     */
    static tryLoadForFolder(options) {
        const packageJsonLookup = options.packageJsonLookup || new node_core_library_1.PackageJsonLookup();
        const startingFolder = options.startingFolder;
        // Figure out which project we're in and look for the config file at the project root
        const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(startingFolder);
        const packageFolder = packageJsonFullPath
            ? path.dirname(packageJsonFullPath)
            : undefined;
        // If there is no package, then just use the starting folder
        const baseFolder = packageFolder || startingFolder;
        let projectFolderLookupToken = undefined;
        // First try the standard "config" subfolder:
        let configFilename = path.join(baseFolder, 'config', ExtractorConfig.FILENAME);
        if (node_core_library_1.FileSystem.exists(configFilename)) {
            if (node_core_library_1.FileSystem.exists(path.join(baseFolder, ExtractorConfig.FILENAME))) {
                throw new Error(`Found conflicting ${ExtractorConfig.FILENAME} files in "." and "./config" folders`);
            }
        }
        else {
            // Otherwise try the top-level folder
            configFilename = path.join(baseFolder, ExtractorConfig.FILENAME);
            if (!node_core_library_1.FileSystem.exists(configFilename)) {
                // If We didn't find it in <packageFolder>/api-extractor.json or <packageFolder>/config/api-extractor.json
                // then check for a rig package
                if (packageFolder) {
                    let rigConfig;
                    if (options.rigConfig) {
                        // The caller provided an already solved RigConfig.  Double-check that it is for the right project.
                        if (!node_core_library_1.Path.isEqual(options.rigConfig.projectFolderPath, packageFolder)) {
                            throw new Error('The provided ILoadForFolderOptions.rigConfig is for the wrong project folder:\n' +
                                '\nExpected path: ' +
                                packageFolder +
                                '\nProvided path: ' +
                                options.rigConfig.projectFolderOriginalPath);
                        }
                        rigConfig = options.rigConfig;
                    }
                    else {
                        rigConfig = rig_package_1.RigConfig.loadForProjectFolder({
                            projectFolderPath: packageFolder
                        });
                    }
                    if (rigConfig.rigFound) {
                        configFilename = path.join(rigConfig.getResolvedProfileFolder(), ExtractorConfig.FILENAME);
                        // If the "projectFolder" setting isn't specified in api-extractor.json, it defaults to the
                        // "<lookup>" token which will probe for the tsconfig.json nearest to the api-extractor.json path.
                        // But this won't work if api-extractor.json belongs to the rig.  So instead "<lookup>" should be
                        // the "<packageFolder>" that referenced the rig.
                        projectFolderLookupToken = packageFolder;
                    }
                }
                if (!node_core_library_1.FileSystem.exists(configFilename)) {
                    // API Extractor does not seem to be configured for this folder
                    return undefined;
                }
            }
        }
        const configObjectFullPath = path.resolve(configFilename);
        const configObject = ExtractorConfig.loadFile(configObjectFullPath);
        return {
            configObject,
            configObjectFullPath,
            packageJsonFullPath,
            projectFolderLookupToken
        };
    }
    /**
     * Loads the api-extractor.json config file from the specified file path, and prepares an `ExtractorConfig` object.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     *
     * The result is prepared using `ExtractorConfig.prepare()`.
     */
    static loadFileAndPrepare(configJsonFilePath) {
        const configObjectFullPath = path.resolve(configJsonFilePath);
        const configObject = ExtractorConfig.loadFile(configObjectFullPath);
        const packageJsonLookup = new node_core_library_1.PackageJsonLookup();
        const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(configObjectFullPath);
        const extractorConfig = ExtractorConfig.prepare({
            configObject,
            configObjectFullPath,
            packageJsonFullPath
        });
        return extractorConfig;
    }
    /**
     * Performs only the first half of {@link ExtractorConfig.loadFileAndPrepare}, providing an opportunity to
     * modify the object before it is passed to {@link ExtractorConfig.prepare}.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     */
    static loadFile(jsonFilePath) {
        // Set to keep track of config files which have been processed.
        const visitedPaths = new Set();
        let currentConfigFilePath = path.resolve(jsonFilePath);
        let configObject = {};
        // Lodash merges array values by default, which is unintuitive for config files (and makes it impossible for derived configurations to overwrite arrays).
        // For example, given a base config containing an array property with value ["foo", "bar"] and a derived config that specifies ["baz"] for that property, lodash will produce ["baz", "bar"], which is unintuitive.
        // This customizer function ensures that arrays are always overwritten.
        const mergeCustomizer = (objValue, srcValue) => {
            if (Array.isArray(srcValue)) {
                return srcValue;
            }
            // Fall back to default merge behavior.
            return undefined;
        };
        try {
            do {
                // Check if this file was already processed.
                if (visitedPaths.has(currentConfigFilePath)) {
                    throw new Error(`The API Extractor "extends" setting contains a cycle.` +
                        `  This file is included twice: "${currentConfigFilePath}"`);
                }
                visitedPaths.add(currentConfigFilePath);
                const currentConfigFolderPath = path.dirname(currentConfigFilePath);
                // Load the extractor config defined in extends property.
                const baseConfig = node_core_library_1.JsonFile.load(currentConfigFilePath);
                let extendsField = baseConfig.extends || '';
                // Delete the "extends" field so it doesn't get merged
                delete baseConfig.extends;
                if (extendsField) {
                    if (extendsField.match(/^\.\.?[\\/]/)) {
                        // EXAMPLE:  "./subfolder/api-extractor-base.json"
                        extendsField = path.resolve(currentConfigFolderPath, extendsField);
                    }
                    else {
                        // EXAMPLE:  "my-package/api-extractor-base.json"
                        //
                        // Resolve "my-package" from the perspective of the current folder.
                        try {
                            extendsField = resolve.sync(extendsField, {
                                basedir: currentConfigFolderPath
                            });
                        }
                        catch (e) {
                            throw new Error(`Error resolving NodeJS path "${extendsField}": ${e.message}`);
                        }
                    }
                }
                // This step has to be performed in advance, since the currentConfigFolderPath information will be lost
                // after lodash.merge() is performed.
                ExtractorConfig._resolveConfigFileRelativePaths(baseConfig, currentConfigFolderPath);
                // Merge extractorConfig into baseConfig, mutating baseConfig
                lodash.mergeWith(baseConfig, configObject, mergeCustomizer);
                configObject = baseConfig;
                currentConfigFilePath = extendsField;
            } while (currentConfigFilePath);
        }
        catch (e) {
            throw new Error(`Error loading ${currentConfigFilePath}:\n` + e.message);
        }
        // Lastly, apply the defaults
        configObject = lodash.mergeWith(lodash.cloneDeep(ExtractorConfig._defaultConfig), configObject, mergeCustomizer);
        ExtractorConfig.jsonSchema.validateObject(configObject, jsonFilePath);
        // The schema validation should ensure that this object conforms to IConfigFile
        return configObject;
    }
    static _resolveConfigFileRelativePaths(configFile, currentConfigFolderPath) {
        if (configFile.projectFolder) {
            configFile.projectFolder = ExtractorConfig._resolveConfigFileRelativePath('projectFolder', configFile.projectFolder, currentConfigFolderPath);
        }
        if (configFile.mainEntryPointFilePath) {
            configFile.mainEntryPointFilePath = ExtractorConfig._resolveConfigFileRelativePath('mainEntryPointFilePath', configFile.mainEntryPointFilePath, currentConfigFolderPath);
        }
        if (configFile.compiler) {
            if (configFile.compiler.tsconfigFilePath) {
                configFile.compiler.tsconfigFilePath = ExtractorConfig._resolveConfigFileRelativePath('tsconfigFilePath', configFile.compiler.tsconfigFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.apiReport) {
            if (configFile.apiReport.reportFolder) {
                configFile.apiReport.reportFolder = ExtractorConfig._resolveConfigFileRelativePath('reportFolder', configFile.apiReport.reportFolder, currentConfigFolderPath);
            }
            if (configFile.apiReport.reportTempFolder) {
                configFile.apiReport.reportTempFolder = ExtractorConfig._resolveConfigFileRelativePath('reportTempFolder', configFile.apiReport.reportTempFolder, currentConfigFolderPath);
            }
        }
        if (configFile.docModel) {
            if (configFile.docModel.apiJsonFilePath) {
                configFile.docModel.apiJsonFilePath = ExtractorConfig._resolveConfigFileRelativePath('apiJsonFilePath', configFile.docModel.apiJsonFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.dtsRollup) {
            if (configFile.dtsRollup.untrimmedFilePath) {
                configFile.dtsRollup.untrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('untrimmedFilePath', configFile.dtsRollup.untrimmedFilePath, currentConfigFolderPath);
            }
            if (configFile.dtsRollup.alphaTrimmedFilePath) {
                configFile.dtsRollup.alphaTrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('alphaTrimmedFilePath', configFile.dtsRollup.alphaTrimmedFilePath, currentConfigFolderPath);
            }
            if (configFile.dtsRollup.betaTrimmedFilePath) {
                configFile.dtsRollup.betaTrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('betaTrimmedFilePath', configFile.dtsRollup.betaTrimmedFilePath, currentConfigFolderPath);
            }
            if (configFile.dtsRollup.publicTrimmedFilePath) {
                configFile.dtsRollup.publicTrimmedFilePath = ExtractorConfig._resolveConfigFileRelativePath('publicTrimmedFilePath', configFile.dtsRollup.publicTrimmedFilePath, currentConfigFolderPath);
            }
        }
        if (configFile.tsdocMetadata) {
            if (configFile.tsdocMetadata.tsdocMetadataFilePath) {
                configFile.tsdocMetadata.tsdocMetadataFilePath = ExtractorConfig._resolveConfigFileRelativePath('tsdocMetadataFilePath', configFile.tsdocMetadata.tsdocMetadataFilePath, currentConfigFolderPath);
            }
        }
    }
    static _resolveConfigFileRelativePath(fieldName, fieldValue, currentConfigFolderPath) {
        if (!path.isAbsolute(fieldValue)) {
            if (fieldValue.indexOf('<projectFolder>') !== 0) {
                // If the path is not absolute and does not start with "<projectFolder>", then resolve it relative
                // to the folder of the config file that it appears in
                return path.join(currentConfigFolderPath, fieldValue);
            }
        }
        return fieldValue;
    }
    /**
     * Prepares an `ExtractorConfig` object using a configuration that is provided as a runtime object,
     * rather than reading it from disk.  This allows configurations to be constructed programmatically,
     * loaded from an alternate source, and/or customized after loading.
     */
    static prepare(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const filenameForErrors = options.configObjectFullPath || 'the configuration object';
        const configObject = options.configObject;
        if (configObject.extends) {
            throw new Error('The IConfigFile.extends field must be expanded before calling ExtractorConfig.prepare()');
        }
        if (options.configObjectFullPath) {
            if (!path.isAbsolute(options.configObjectFullPath)) {
                throw new Error('The "configObjectFullPath" setting must be an absolute path');
            }
        }
        ExtractorConfig.jsonSchema.validateObject(configObject, filenameForErrors);
        const packageJsonFullPath = options.packageJsonFullPath;
        let packageFolder = undefined;
        let packageJson = undefined;
        if (packageJsonFullPath) {
            if (!/.json$/i.test(packageJsonFullPath)) {
                // Catch common mistakes e.g. where someone passes a folder path instead of a file path
                throw new Error('The "packageJsonFullPath" setting does not have a .json file extension');
            }
            if (!path.isAbsolute(packageJsonFullPath)) {
                throw new Error('The "packageJsonFullPath" setting must be an absolute path');
            }
            if (options.packageJson) {
                packageJson = options.packageJson;
            }
            else {
                const packageJsonLookup = new node_core_library_1.PackageJsonLookup();
                packageJson = packageJsonLookup.loadNodePackageJson(packageJsonFullPath);
            }
            packageFolder = path.dirname(packageJsonFullPath);
        }
        // "tsdocConfigFile" and "tsdocConfiguration" are prepared outside the try-catch block,
        // so that if exceptions are thrown, it will not get the "Error parsing api-extractor.json:" header
        let extractorConfigParameters;
        try {
            if (!configObject.compiler) {
                // A merged configuration should have this
                throw new Error('The "compiler" section is missing');
            }
            if (!configObject.projectFolder) {
                // A merged configuration should have this
                throw new Error('The "projectFolder" setting is missing');
            }
            let projectFolder;
            if (configObject.projectFolder.trim() === '<lookup>') {
                if (options.projectFolderLookupToken) {
                    // Use the manually specified "<lookup>" value
                    projectFolder = options.projectFolderLookupToken;
                    if (!node_core_library_1.FileSystem.exists(options.projectFolderLookupToken)) {
                        throw new Error('The specified "projectFolderLookupToken" path does not exist: ' +
                            options.projectFolderLookupToken);
                    }
                }
                else {
                    if (!options.configObjectFullPath) {
                        throw new Error('The "projectFolder" setting uses the "<lookup>" token, but it cannot be expanded because' +
                            ' the "configObjectFullPath" setting was not specified');
                    }
                    // "The default value for `projectFolder` is the token `<lookup>`, which means the folder is determined
                    // by traversing parent folders, starting from the folder containing api-extractor.json, and stopping
                    // at the first folder that contains a tsconfig.json file.  If a tsconfig.json file cannot be found in
                    // this way, then an error will be reported."
                    let currentFolder = path.dirname(options.configObjectFullPath);
                    for (;;) {
                        const tsconfigPath = path.join(currentFolder, 'tsconfig.json');
                        if (node_core_library_1.FileSystem.exists(tsconfigPath)) {
                            projectFolder = currentFolder;
                            break;
                        }
                        const parentFolder = path.dirname(currentFolder);
                        if (parentFolder === '' || parentFolder === currentFolder) {
                            throw new Error('The "projectFolder" setting uses the "<lookup>" token, but a tsconfig.json file cannot be' +
                                ' found in this folder or any parent folder.');
                        }
                        currentFolder = parentFolder;
                    }
                }
            }
            else {
                ExtractorConfig._rejectAnyTokensInPath(configObject.projectFolder, 'projectFolder');
                if (!node_core_library_1.FileSystem.exists(configObject.projectFolder)) {
                    throw new Error('The specified "projectFolder" path does not exist: ' + configObject.projectFolder);
                }
                projectFolder = configObject.projectFolder;
            }
            const tokenContext = {
                unscopedPackageName: 'unknown-package',
                packageName: 'unknown-package',
                projectFolder: projectFolder
            };
            if (packageJson) {
                tokenContext.packageName = packageJson.name;
                tokenContext.unscopedPackageName = node_core_library_1.PackageName.getUnscopedName(packageJson.name);
            }
            if (!configObject.mainEntryPointFilePath) {
                // A merged configuration should have this
                throw new Error('The "mainEntryPointFilePath" setting is missing');
            }
            const mainEntryPointFilePath = ExtractorConfig._resolvePathWithTokens('mainEntryPointFilePath', configObject.mainEntryPointFilePath, tokenContext);
            if (!ExtractorConfig.hasDtsFileExtension(mainEntryPointFilePath)) {
                throw new Error('The "mainEntryPointFilePath" value is not a declaration file: ' + mainEntryPointFilePath);
            }
            if (!options.ignoreMissingEntryPoint && !node_core_library_1.FileSystem.exists(mainEntryPointFilePath)) {
                throw new Error('The "mainEntryPointFilePath" path does not exist: ' + mainEntryPointFilePath);
            }
            const bundledPackages = configObject.bundledPackages || [];
            // Note: we cannot fully validate package name patterns, as the strings may contain wildcards.
            // We won't know if the entries are valid until we can compare them against the package.json "dependencies" contents.
            const tsconfigFilePath = ExtractorConfig._resolvePathWithTokens('tsconfigFilePath', configObject.compiler.tsconfigFilePath, tokenContext);
            if (configObject.compiler.overrideTsconfig === undefined) {
                if (!tsconfigFilePath) {
                    throw new Error('Either the "tsconfigFilePath" or "overrideTsconfig" setting must be specified');
                }
                if (!node_core_library_1.FileSystem.exists(tsconfigFilePath)) {
                    throw new Error('The file referenced by "tsconfigFilePath" does not exist: ' + tsconfigFilePath);
                }
            }
            if ((_a = configObject.apiReport) === null || _a === void 0 ? void 0 : _a.tagsToReport) {
                _validateTagsToReport(configObject.apiReport.tagsToReport);
            }
            const apiReportEnabled = (_c = (_b = configObject.apiReport) === null || _b === void 0 ? void 0 : _b.enabled) !== null && _c !== void 0 ? _c : false;
            const apiReportIncludeForgottenExports = (_e = (_d = configObject.apiReport) === null || _d === void 0 ? void 0 : _d.includeForgottenExports) !== null && _e !== void 0 ? _e : false;
            let reportFolder = tokenContext.projectFolder;
            let reportTempFolder = tokenContext.projectFolder;
            const reportConfigs = [];
            let tagsToReport = {};
            if (apiReportEnabled) {
                // Undefined case checked above where we assign `apiReportEnabled`
                const apiReportConfig = configObject.apiReport;
                const reportFileNameSuffix = '.api.md';
                let reportFileNameBase;
                if (apiReportConfig.reportFileName) {
                    if (apiReportConfig.reportFileName.indexOf('/') >= 0 ||
                        apiReportConfig.reportFileName.indexOf('\\') >= 0) {
                        throw new Error(`The "reportFileName" setting contains invalid characters: "${apiReportConfig.reportFileName}"`);
                    }
                    if (!apiReportConfig.reportFileName.endsWith(reportFileNameSuffix)) {
                        // `.api.md` extension was not specified. Use provided file name base as is.
                        reportFileNameBase = apiReportConfig.reportFileName;
                    }
                    else {
                        // The system previously asked users to specify their filenames in a form containing the `.api.md` extension.
                        // This guidance has changed, but to maintain backwards compatibility, we will temporarily support input
                        // that ends with the `.api.md` extension specially, by stripping it out.
                        // This should be removed in version 8, possibly replaced with an explicit error to help users
                        // migrate their configs.
                        reportFileNameBase = apiReportConfig.reportFileName.slice(0, -reportFileNameSuffix.length);
                    }
                }
                else {
                    // Default value
                    reportFileNameBase = '<unscopedPackageName>';
                }
                const reportVariantKinds = (_f = apiReportConfig.reportVariants) !== null && _f !== void 0 ? _f : defaultApiReportVariants;
                for (const reportVariantKind of reportVariantKinds) {
                    // Omit the variant kind from the "complete" report file name for simplicity and for backwards compatibility.
                    const fileNameWithTokens = `${reportFileNameBase}${reportVariantKind === 'complete' ? '' : `.${reportVariantKind}`}${reportFileNameSuffix}`;
                    const normalizedFileName = ExtractorConfig._expandStringWithTokens('reportFileName', fileNameWithTokens, tokenContext);
                    reportConfigs.push({
                        fileName: normalizedFileName,
                        variant: reportVariantKind
                    });
                }
                if (apiReportConfig.reportFolder) {
                    reportFolder = ExtractorConfig._resolvePathWithTokens('reportFolder', apiReportConfig.reportFolder, tokenContext);
                }
                if (apiReportConfig.reportTempFolder) {
                    reportTempFolder = ExtractorConfig._resolvePathWithTokens('reportTempFolder', apiReportConfig.reportTempFolder, tokenContext);
                }
                tagsToReport = {
                    ...defaultTagsToReport,
                    ...apiReportConfig.tagsToReport
                };
            }
            let docModelGenerationOptions = undefined;
            let apiJsonFilePath = '';
            let docModelIncludeForgottenExports = false;
            let projectFolderUrl;
            if ((_g = configObject.docModel) === null || _g === void 0 ? void 0 : _g.enabled) {
                apiJsonFilePath = ExtractorConfig._resolvePathWithTokens('apiJsonFilePath', configObject.docModel.apiJsonFilePath, tokenContext);
                docModelIncludeForgottenExports = !!configObject.docModel.includeForgottenExports;
                projectFolderUrl = configObject.docModel.projectFolderUrl;
                const releaseTagsToTrim = new Set();
                const releaseTagsToTrimOption = configObject.docModel.releaseTagsToTrim || ['@internal'];
                for (const releaseTagToTrim of releaseTagsToTrimOption) {
                    let releaseTag;
                    switch (releaseTagToTrim) {
                        case '@internal': {
                            releaseTag = api_extractor_model_1.ReleaseTag.Internal;
                            break;
                        }
                        case '@alpha': {
                            releaseTag = api_extractor_model_1.ReleaseTag.Alpha;
                            break;
                        }
                        case '@beta': {
                            releaseTag = api_extractor_model_1.ReleaseTag.Beta;
                            break;
                        }
                        case '@public': {
                            releaseTag = api_extractor_model_1.ReleaseTag.Public;
                            break;
                        }
                        default: {
                            throw new Error(`The release tag "${releaseTagToTrim}" is not supported`);
                        }
                    }
                    releaseTagsToTrim.add(releaseTag);
                }
                docModelGenerationOptions = {
                    releaseTagsToTrim
                };
            }
            let tsdocMetadataEnabled = false;
            let tsdocMetadataFilePath = '';
            if (configObject.tsdocMetadata) {
                tsdocMetadataEnabled = !!configObject.tsdocMetadata.enabled;
                if (tsdocMetadataEnabled) {
                    tsdocMetadataFilePath = configObject.tsdocMetadata.tsdocMetadataFilePath || '';
                    if (tsdocMetadataFilePath.trim() === '<lookup>') {
                        if (!packageJson) {
                            throw new Error('The "<lookup>" token cannot be used with the "tsdocMetadataFilePath" setting because' +
                                ' the "packageJson" option was not provided');
                        }
                        if (!packageJsonFullPath) {
                            throw new Error('The "<lookup>" token cannot be used with "tsdocMetadataFilePath" because' +
                                'the "packageJsonFullPath" option was not provided');
                        }
                        tsdocMetadataFilePath = PackageMetadataManager_1.PackageMetadataManager.resolveTsdocMetadataPath(path.dirname(packageJsonFullPath), packageJson);
                    }
                    else {
                        tsdocMetadataFilePath = ExtractorConfig._resolvePathWithTokens('tsdocMetadataFilePath', configObject.tsdocMetadata.tsdocMetadataFilePath, tokenContext);
                    }
                    if (!tsdocMetadataFilePath) {
                        throw new Error('The "tsdocMetadata.enabled" setting is enabled,' +
                            ' but "tsdocMetadataFilePath" is not specified');
                    }
                }
            }
            let rollupEnabled = false;
            let untrimmedFilePath = '';
            let betaTrimmedFilePath = '';
            let alphaTrimmedFilePath = '';
            let publicTrimmedFilePath = '';
            let omitTrimmingComments = false;
            if (configObject.dtsRollup) {
                rollupEnabled = !!configObject.dtsRollup.enabled;
                untrimmedFilePath = ExtractorConfig._resolvePathWithTokens('untrimmedFilePath', configObject.dtsRollup.untrimmedFilePath, tokenContext);
                alphaTrimmedFilePath = ExtractorConfig._resolvePathWithTokens('alphaTrimmedFilePath', configObject.dtsRollup.alphaTrimmedFilePath, tokenContext);
                betaTrimmedFilePath = ExtractorConfig._resolvePathWithTokens('betaTrimmedFilePath', configObject.dtsRollup.betaTrimmedFilePath, tokenContext);
                publicTrimmedFilePath = ExtractorConfig._resolvePathWithTokens('publicTrimmedFilePath', configObject.dtsRollup.publicTrimmedFilePath, tokenContext);
                omitTrimmingComments = !!configObject.dtsRollup.omitTrimmingComments;
            }
            let newlineKind;
            switch (configObject.newlineKind) {
                case 'lf':
                    newlineKind = node_core_library_1.NewlineKind.Lf;
                    break;
                case 'os':
                    newlineKind = node_core_library_1.NewlineKind.OsDefault;
                    break;
                default:
                    newlineKind = node_core_library_1.NewlineKind.CrLf;
                    break;
            }
            const enumMemberOrder = (_h = configObject.enumMemberOrder) !== null && _h !== void 0 ? _h : api_extractor_model_1.EnumMemberOrder.ByName;
            extractorConfigParameters = {
                projectFolder: projectFolder,
                packageJson,
                packageFolder,
                mainEntryPointFilePath,
                bundledPackages,
                tsconfigFilePath,
                overrideTsconfig: configObject.compiler.overrideTsconfig,
                skipLibCheck: !!configObject.compiler.skipLibCheck,
                apiReportEnabled,
                reportConfigs,
                reportFolder,
                reportTempFolder,
                apiReportIncludeForgottenExports,
                tagsToReport,
                docModelGenerationOptions,
                apiJsonFilePath,
                docModelIncludeForgottenExports,
                projectFolderUrl,
                rollupEnabled,
                untrimmedFilePath,
                alphaTrimmedFilePath,
                betaTrimmedFilePath,
                publicTrimmedFilePath,
                omitTrimmingComments,
                tsdocMetadataEnabled,
                tsdocMetadataFilePath,
                newlineKind,
                messages: configObject.messages || {},
                testMode: !!configObject.testMode,
                enumMemberOrder
            };
        }
        catch (e) {
            throw new Error(`Error parsing ${filenameForErrors}:\n` + e.message);
        }
        let tsdocConfigFile = options.tsdocConfigFile;
        if (!tsdocConfigFile) {
            // Example: "my-project/tsdoc.json"
            let packageTSDocConfigPath = tsdoc_config_1.TSDocConfigFile.findConfigPathForFolder(extractorConfigParameters.projectFolder);
            if (!packageTSDocConfigPath || !node_core_library_1.FileSystem.exists(packageTSDocConfigPath)) {
                // If the project does not have a tsdoc.json config file, then use API Extractor's base file.
                packageTSDocConfigPath = ExtractorConfig._tsdocBaseFilePath;
                if (!node_core_library_1.FileSystem.exists(packageTSDocConfigPath)) {
                    throw new node_core_library_1.InternalError('Unable to load the built-in TSDoc config file: ' + packageTSDocConfigPath);
                }
            }
            tsdocConfigFile = tsdoc_config_1.TSDocConfigFile.loadFile(packageTSDocConfigPath);
        }
        // IMPORTANT: After calling TSDocConfigFile.loadFile(), we need to check for errors.
        if (tsdocConfigFile.hasErrors) {
            throw new Error(tsdocConfigFile.getErrorSummary());
        }
        const tsdocConfiguration = new tsdoc_1.TSDocConfiguration();
        tsdocConfigFile.configureParser(tsdocConfiguration);
        // IMPORTANT: After calling TSDocConfigFile.configureParser(), we need to check for errors a second time.
        if (tsdocConfigFile.hasErrors) {
            throw new Error(tsdocConfigFile.getErrorSummary());
        }
        return new ExtractorConfig({ ...extractorConfigParameters, tsdocConfigFile, tsdocConfiguration });
    }
    /**
     * Gets the report configuration for the "complete" (default) report configuration, if one was specified.
     */
    _getCompleteReportConfig() {
        return this.reportConfigs.find((x) => x.variant === 'complete');
    }
    static _resolvePathWithTokens(fieldName, value, tokenContext) {
        value = ExtractorConfig._expandStringWithTokens(fieldName, value, tokenContext);
        if (value !== '') {
            value = path.resolve(tokenContext.projectFolder, value);
        }
        return value;
    }
    static _expandStringWithTokens(fieldName, value, tokenContext) {
        value = value ? value.trim() : '';
        if (value !== '') {
            value = node_core_library_1.Text.replaceAll(value, '<unscopedPackageName>', tokenContext.unscopedPackageName);
            value = node_core_library_1.Text.replaceAll(value, '<packageName>', tokenContext.packageName);
            const projectFolderToken = '<projectFolder>';
            if (value.indexOf(projectFolderToken) === 0) {
                // Replace "<projectFolder>" at the start of a string
                value = path.join(tokenContext.projectFolder, value.substr(projectFolderToken.length));
            }
            if (value.indexOf(projectFolderToken) >= 0) {
                // If after all replacements, "<projectFolder>" appears somewhere in the string, report an error
                throw new Error(`The "${fieldName}" value incorrectly uses the "<projectFolder>" token.` +
                    ` It must appear at the start of the string.`);
            }
            if (value.indexOf('<lookup>') >= 0) {
                throw new Error(`The "${fieldName}" value incorrectly uses the "<lookup>" token`);
            }
            ExtractorConfig._rejectAnyTokensInPath(value, fieldName);
        }
        return value;
    }
    /**
     * Returns true if the specified file path has the ".d.ts" file extension.
     */
    static hasDtsFileExtension(filePath) {
        return ExtractorConfig._declarationFileExtensionRegExp.test(filePath);
    }
    /**
     * Given a path string that may have originally contained expandable tokens such as `<projectFolder>"`
     * this reports an error if any token-looking substrings remain after expansion (e.g. `c:\blah\<invalid>\blah`).
     */
    static _rejectAnyTokensInPath(value, fieldName) {
        if (value.indexOf('<') < 0 && value.indexOf('>') < 0) {
            return;
        }
        // Can we determine the name of a token?
        const tokenRegExp = /(\<[^<]*?\>)/;
        const match = tokenRegExp.exec(value);
        if (match) {
            throw new Error(`The "${fieldName}" value contains an unrecognized token "${match[1]}"`);
        }
        throw new Error(`The "${fieldName}" value contains extra token characters ("<" or ">"): ${value}`);
    }
}
exports.ExtractorConfig = ExtractorConfig;
/**
 * The JSON Schema for API Extractor config file (api-extractor.schema.json).
 */
ExtractorConfig.jsonSchema = node_core_library_1.JsonSchema.fromLoadedObject(api_extractor_schema_json_1.default);
/**
 * The config file name "api-extractor.json".
 */
ExtractorConfig.FILENAME = 'api-extractor.json';
/**
 * The full path to `extends/tsdoc-base.json` which contains the standard TSDoc configuration
 * for API Extractor.
 * @internal
 */
ExtractorConfig._tsdocBaseFilePath = path.resolve(__dirname, '../../extends/tsdoc-base.json');
ExtractorConfig._defaultConfig = node_core_library_1.JsonFile.load(path.join(__dirname, '../schemas/api-extractor-defaults.json'));
/** Match all three flavors for type declaration files (.d.ts, .d.mts, .d.cts) */
ExtractorConfig._declarationFileExtensionRegExp = /\.d\.(c|m)?ts$/i;
const releaseTags = new Set(['@public', '@alpha', '@beta', '@internal']);
/**
 * Validate {@link ExtractorConfig.tagsToReport}.
 */
function _validateTagsToReport(tagsToReport) {
    const includedReleaseTags = [];
    const invalidTags = []; // tag name, error
    for (const tag of Object.keys(tagsToReport)) {
        if (releaseTags.has(tag)) {
            // If a release tags is specified, regardless of whether it is enabled, we will throw an error.
            // Release tags must not be specified.
            includedReleaseTags.push(tag);
        }
        // If the tag is invalid, generate an error string from the inner error message.
        try {
            tsdoc_1.TSDocTagDefinition.validateTSDocTagName(tag);
        }
        catch (error) {
            invalidTags.push([tag, error.message]);
        }
    }
    const errorMessages = [];
    for (const includedReleaseTag of includedReleaseTags) {
        errorMessages.push(`${includedReleaseTag}: Release tags are always included in API reports and must not be specified`);
    }
    for (const [invalidTag, innerError] of invalidTags) {
        errorMessages.push(`${invalidTag}: ${innerError}`);
    }
    if (errorMessages.length > 0) {
        const errorMessage = [
            `"tagsToReport" contained one or more invalid tags:`,
            ...errorMessages
        ].join('\n\t- ');
        throw new Error(errorMessage);
    }
}
//# sourceMappingURL=ExtractorConfig.js.map