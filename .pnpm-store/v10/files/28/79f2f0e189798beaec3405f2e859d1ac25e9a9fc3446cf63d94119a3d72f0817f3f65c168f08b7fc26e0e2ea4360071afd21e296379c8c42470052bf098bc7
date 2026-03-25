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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSDocConfigFile = void 0;
const tsdoc_1 = require("@microsoft/tsdoc");
const fs = __importStar(require("fs"));
const resolve = __importStar(require("resolve"));
const path = __importStar(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const jju = __importStar(require("jju"));
const ajv = new ajv_1.default({ verbose: true });
function initializeSchemaValidator() {
    const jsonSchemaPath = resolve.sync('@microsoft/tsdoc/schemas/tsdoc.schema.json', {
        basedir: __dirname
    });
    const jsonSchemaContent = fs.readFileSync(jsonSchemaPath).toString();
    const jsonSchema = jju.parse(jsonSchemaContent, { mode: 'cjson' });
    return ajv.compile(jsonSchema);
}
// Warning: AJV has a fairly strange API.  Each time this function is called, the function  object's
// properties get overwritten with the results of the latest validation.  Thus we need to be careful
// to read the properties before a subsequent call may occur.
const tsdocSchemaValidator = initializeSchemaValidator();
/**
 * Represents an individual `tsdoc.json` file.
 *
 * @public
 */
class TSDocConfigFile {
    constructor() {
        this.log = new tsdoc_1.ParserMessageLog();
        this._extendsFiles = [];
        this._filePath = '';
        this._fileNotFound = false;
        this._hasErrors = false;
        this._fileMTime = 0;
        this._tsdocSchema = '';
        this._extendsPaths = [];
        this._noStandardTags = undefined;
        this._tagDefinitions = [];
        this._tagDefinitionNames = new Set();
        this._supportForTags = new Map();
    }
    /**
     * Other config files that this file extends from.
     */
    get extendsFiles() {
        return this._extendsFiles;
    }
    /**
     * The full path of the file that was attempted to load, or an empty string if the configuration was
     * loaded from a source that is not a file.
     */
    get filePath() {
        return this._filePath;
    }
    /**
     * If true, then the TSDocConfigFile object contains an empty state, because the `tsdoc.json` file
     * was not found by the loader.
     *
     * @remarks
     * A missing "tsdoc.json" file is not considered an error.  It simply means that the defaults will be used.
     */
    get fileNotFound() {
        return this._fileNotFound;
    }
    /**
     * If true, then at least one error was encountered while loading this file or one of its "extends" files.
     *
     * @remarks
     * You can use {@link TSDocConfigFile.getErrorSummary} to report these errors.
     *
     * The individual messages can be retrieved from the {@link TSDocConfigFile.log} property of each `TSDocConfigFile`
     * object (including the {@link TSDocConfigFile.extendsFiles} tree).
     */
    get hasErrors() {
        return this._hasErrors;
    }
    /**
     * The `$schema` field from the `tsdoc.json` file.
     */
    get tsdocSchema() {
        return this._tsdocSchema;
    }
    /**
     * The `extends` field from the `tsdoc.json` file.  For the parsed file contents,
     * use the `extendsFiles` property instead.
     */
    get extendsPaths() {
        return this._extendsPaths;
    }
    /**
     * By default, the config file loader will predefine all of the standardized TSDoc tags.  To disable this and
     * start with a completely empty configuration, set `noStandardTags` to true.
     *
     * @remarks
     * If a config file uses `"extends"` to include settings from base config files, then its setting will
     * override any settings from the base config files.  If `"noStandardTags"` is not specified, then this
     * property will be `undefined`.  The config files are applied in the order they are processed (a depth-first
     * traversal of the `"extends"` references), and files processed later can override earlier files.
     * If no config file specifies `noStandardTags` then the default value is `false`.
     */
    get noStandardTags() {
        return this._noStandardTags;
    }
    set noStandardTags(value) {
        this._noStandardTags = value;
    }
    get tagDefinitions() {
        return this._tagDefinitions;
    }
    get supportForTags() {
        return this._supportForTags;
    }
    get supportedHtmlElements() {
        return this._supportedHtmlElements && Array.from(this._supportedHtmlElements);
    }
    get reportUnsupportedHtmlElements() {
        return this._reportUnsupportedHtmlElements;
    }
    set reportUnsupportedHtmlElements(value) {
        this._reportUnsupportedHtmlElements = value;
    }
    /**
     * Removes all items from the `tagDefinitions` array.
     */
    clearTagDefinitions() {
        this._tagDefinitions.length = 0;
        this._tagDefinitionNames.clear();
    }
    /**
     * Adds a new item to the `tagDefinitions` array.
     */
    addTagDefinition(parameters) {
        // This validates the tag name
        const tagDefinition = new tsdoc_1.TSDocTagDefinition(parameters);
        if (this._tagDefinitionNames.has(tagDefinition.tagNameWithUpperCase)) {
            throw new Error(`A tag definition was already added with the tag name "${parameters.tagName}"`);
        }
        this._tagDefinitionNames.add(tagDefinition.tagName);
        this._tagDefinitions.push(tagDefinition);
    }
    // Similar to addTagDefinition() but reports errors using _reportError()
    _addTagDefinitionForLoad(parameters) {
        let tagDefinition;
        try {
            // This validates the tag name
            tagDefinition = new tsdoc_1.TSDocTagDefinition(parameters);
        }
        catch (error) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileInvalidTagName,
                messageText: error.message,
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        if (this._tagDefinitionNames.has(tagDefinition.tagNameWithUpperCase)) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileDuplicateTagName,
                messageText: `The "tagDefinitions" field specifies more than one tag with the name "${parameters.tagName}"`,
                textRange: tsdoc_1.TextRange.empty
            });
        }
        this._tagDefinitionNames.add(tagDefinition.tagNameWithUpperCase);
        this._tagDefinitions.push(tagDefinition);
    }
    /**
     * Adds a new item to the `supportedHtmlElements` array.
     */
    addSupportedHtmlElement(htmlElement) {
        if (!this._supportedHtmlElements) {
            this._supportedHtmlElements = new Set();
        }
        this._supportedHtmlElements.add(htmlElement);
    }
    /**
     * Removes the explicit list of allowed html elements.
     */
    clearSupportedHtmlElements() {
        this._supportedHtmlElements = undefined;
    }
    /**
     * Removes all entries from the "supportForTags" map.
     */
    clearSupportForTags() {
        this._supportForTags.clear();
    }
    /**
     * Sets an entry in the "supportForTags" map.
     */
    setSupportForTag(tagName, supported) {
        tsdoc_1.TSDocTagDefinition.validateTSDocTagName(tagName);
        this._supportForTags.set(tagName, supported);
    }
    /**
     * This can be used for cache eviction.  It returns true if the modification timestamp has changed for
     * any of the files that were read when loading this `TSDocConfigFile`, which indicates that the file should be
     * reloaded.  It does not consider cases where `TSDocConfigFile.fileNotFound` was `true`.
     *
     * @remarks
     * This can be used for cache eviction.  An example eviction strategy might be like this:
     *
     * - call `checkForModifiedFiles()` once per second, and reload the configuration if it returns true
     *
     * - otherwise, reload the configuration when it is more than 10 seconds old (to handle less common cases such
     *   as creation of a missing file, or creation of a file at an earlier location in the search path).
     */
    checkForModifiedFiles() {
        if (this._checkForModifiedFile()) {
            return true;
        }
        for (const extendsFile of this.extendsFiles) {
            if (extendsFile.checkForModifiedFiles()) {
                return true;
            }
        }
        return false;
    }
    /**
     * Checks the last modification time for `TSDocConfigFile.filePath` and returns `true` if it has changed
     * since the file was loaded.  If the file is missing, this returns `false`.  If the timestamp cannot be read,
     * then this returns `true`.
     */
    _checkForModifiedFile() {
        if (this._fileNotFound || !this._filePath) {
            return false;
        }
        try {
            const mtimeMs = fs.statSync(this._filePath).mtimeMs;
            return mtimeMs !== this._fileMTime;
        }
        catch (error) {
            return true;
        }
    }
    _reportError(parserMessageParameters) {
        this.log.addMessage(new tsdoc_1.ParserMessage(parserMessageParameters));
        this._hasErrors = true;
    }
    _loadJsonObject(configJson) {
        if (configJson.$schema !== TSDocConfigFile.CURRENT_SCHEMA_URL) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileUnsupportedSchema,
                messageText: `Unsupported JSON "$schema" value; expecting "${TSDocConfigFile.CURRENT_SCHEMA_URL}"`,
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        const success = tsdocSchemaValidator(configJson);
        if (!success) {
            const description = ajv.errorsText(tsdocSchemaValidator.errors);
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileSchemaError,
                messageText: 'Error loading config file: ' + description,
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        this._tsdocSchema = configJson.$schema;
        if (configJson.extends) {
            this._extendsPaths.push(...configJson.extends);
        }
        this.noStandardTags = configJson.noStandardTags;
        for (const jsonTagDefinition of configJson.tagDefinitions || []) {
            let syntaxKind;
            switch (jsonTagDefinition.syntaxKind) {
                case 'inline':
                    syntaxKind = tsdoc_1.TSDocTagSyntaxKind.InlineTag;
                    break;
                case 'block':
                    syntaxKind = tsdoc_1.TSDocTagSyntaxKind.BlockTag;
                    break;
                case 'modifier':
                    syntaxKind = tsdoc_1.TSDocTagSyntaxKind.ModifierTag;
                    break;
                default:
                    // The JSON schema should have caught this error
                    throw new Error('Unexpected tag kind');
            }
            this._addTagDefinitionForLoad({
                tagName: jsonTagDefinition.tagName,
                syntaxKind: syntaxKind,
                allowMultiple: jsonTagDefinition.allowMultiple
            });
        }
        if (configJson.supportedHtmlElements) {
            this._supportedHtmlElements = new Set();
            for (const htmlElement of configJson.supportedHtmlElements) {
                this.addSupportedHtmlElement(htmlElement);
            }
        }
        this._reportUnsupportedHtmlElements = configJson.reportUnsupportedHtmlElements;
        if (configJson.supportForTags) {
            for (const tagName of Object.keys(configJson.supportForTags)) {
                const supported = configJson.supportForTags[tagName];
                this._supportForTags.set(tagName, supported);
            }
        }
    }
    _loadWithExtends(configFilePath, referencingConfigFile, alreadyVisitedPaths) {
        // In case an exception is thrown, start by assuming that the file was not found; we'll revise
        // this later upon success
        this._fileNotFound = true;
        if (!configFilePath) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileNotFound,
                messageText: 'File not found',
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        this._filePath = path.resolve(configFilePath);
        if (!fs.existsSync(this._filePath)) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileNotFound,
                messageText: 'File not found',
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        const configJsonContent = fs.readFileSync(this._filePath).toString();
        this._fileMTime = fs.statSync(this._filePath).mtimeMs;
        this._fileNotFound = false;
        const hashKey = fs.realpathSync(this._filePath);
        if (referencingConfigFile && alreadyVisitedPaths.has(hashKey)) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigFileCyclicExtends,
                messageText: `Circular reference encountered for "extends" field of "${referencingConfigFile.filePath}"`,
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        alreadyVisitedPaths.add(hashKey);
        let configJson;
        try {
            configJson = jju.parse(configJsonContent, { mode: 'cjson' });
        }
        catch (e) {
            this._reportError({
                messageId: tsdoc_1.TSDocMessageId.ConfigInvalidJson,
                messageText: 'Error parsing JSON input: ' + e.message,
                textRange: tsdoc_1.TextRange.empty
            });
            return;
        }
        this._loadJsonObject(configJson);
        const configFileFolder = path.dirname(this.filePath);
        for (const extendsField of this.extendsPaths) {
            let resolvedExtendsPath;
            try {
                resolvedExtendsPath = resolve.sync(extendsField, { basedir: configFileFolder });
            }
            catch (e) {
                this._reportError({
                    messageId: tsdoc_1.TSDocMessageId.ConfigFileUnresolvedExtends,
                    messageText: `Unable to resolve "extends" reference to "${extendsField}": ` + e.message,
                    textRange: tsdoc_1.TextRange.empty
                });
                return;
            }
            const baseConfigFile = new TSDocConfigFile();
            baseConfigFile._loadWithExtends(resolvedExtendsPath, this, alreadyVisitedPaths);
            if (baseConfigFile.fileNotFound) {
                this._reportError({
                    messageId: tsdoc_1.TSDocMessageId.ConfigFileUnresolvedExtends,
                    messageText: `Unable to resolve "extends" reference to "${extendsField}"`,
                    textRange: tsdoc_1.TextRange.empty
                });
            }
            this._extendsFiles.push(baseConfigFile);
            if (baseConfigFile.hasErrors) {
                this._hasErrors = true;
            }
        }
    }
    /**
     * For the given folder, look for the relevant tsdoc.json file (if any), and return its path.
     *
     * @param folderPath - the path to a folder where the search should start
     * @returns the (possibly relative) path to tsdoc.json, or an empty string if not found
     */
    static findConfigPathForFolder(folderPath) {
        if (folderPath) {
            let foundFolder = folderPath;
            for (;;) {
                const tsconfigJsonPath = path.join(foundFolder, 'tsconfig.json');
                if (fs.existsSync(tsconfigJsonPath)) {
                    // Stop when we reach a folder containing tsconfig.json
                    return path.join(foundFolder, TSDocConfigFile.FILENAME);
                }
                const packageJsonPath = path.join(foundFolder, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    // Stop when we reach a folder containing package.json; this avoids crawling out of the current package
                    return path.join(foundFolder, TSDocConfigFile.FILENAME);
                }
                const previousFolder = foundFolder;
                foundFolder = path.dirname(foundFolder);
                if (!foundFolder || foundFolder === previousFolder) {
                    // Give up if we reach the filesystem root directory
                    break;
                }
            }
        }
        return '';
    }
    /**
     * Calls `TSDocConfigFile.findConfigPathForFolder()` to find the relevant tsdoc.json config file, if one exists.
     * Then calls `TSDocConfigFile.findConfigPathForFolder()` to return the loaded result.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     *
     * @param folderPath - the path to a folder where the search should start
     */
    static loadForFolder(folderPath) {
        const rootConfigPath = TSDocConfigFile.findConfigPathForFolder(folderPath);
        return TSDocConfigFile.loadFile(rootConfigPath);
    }
    /**
     * Loads the specified tsdoc.json and any base files that it refers to using the "extends" option.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     *
     * @param tsdocJsonFilePath - the path to the tsdoc.json config file
     */
    static loadFile(tsdocJsonFilePath) {
        const configFile = new TSDocConfigFile();
        const alreadyVisitedPaths = new Set();
        configFile._loadWithExtends(tsdocJsonFilePath, undefined, alreadyVisitedPaths);
        return configFile;
    }
    /**
     * Loads the object state from a JSON-serializable object as produced by {@link TSDocConfigFile.saveToObject}.
     *
     * @remarks
     * The serialized object has the same structure as `tsdoc.json`; however the `"extends"` field is not allowed.
     *
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     */
    static loadFromObject(jsonObject) {
        const configFile = new TSDocConfigFile();
        configFile._loadJsonObject(jsonObject);
        if (configFile.extendsPaths.length > 0) {
            throw new Error('The "extends" field cannot be used with TSDocConfigFile.loadFromObject()');
        }
        return configFile;
    }
    /**
     * Initializes a TSDocConfigFile object using the state from the provided `TSDocConfiguration` object.
     *
     * @remarks
     * This API does not report loading errors by throwing exceptions.  Instead, the caller is expected to check
     * for errors using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log},
     * or {@link TSDocConfigFile.getErrorSummary}.
     */
    static loadFromParser(configuration) {
        const configFile = new TSDocConfigFile();
        // The standard tags will be mixed together with custom definitions,
        // so set noStandardTags=true to avoid defining them twice.
        configFile.noStandardTags = true;
        for (const tagDefinition of configuration.tagDefinitions) {
            configFile.addTagDefinition({
                syntaxKind: tagDefinition.syntaxKind,
                tagName: tagDefinition.tagName,
                allowMultiple: tagDefinition.allowMultiple
            });
        }
        for (const tagDefinition of configuration.supportedTagDefinitions) {
            configFile.setSupportForTag(tagDefinition.tagName, true);
        }
        for (const htmlElement of configuration.supportedHtmlElements) {
            configFile.addSupportedHtmlElement(htmlElement);
        }
        configFile.reportUnsupportedHtmlElements = configuration.validation.reportUnsupportedHtmlElements;
        return configFile;
    }
    /**
     * Writes the config file content to a JSON file with the specified file path.
     */
    saveFile(jsonFilePath) {
        const jsonObject = this.saveToObject();
        const jsonContent = JSON.stringify(jsonObject, undefined, 2);
        fs.writeFileSync(jsonFilePath, jsonContent);
    }
    /**
     * Writes the object state into a JSON-serializable object.
     */
    saveToObject() {
        const configJson = {
            $schema: TSDocConfigFile.CURRENT_SCHEMA_URL
        };
        if (this.noStandardTags !== undefined) {
            configJson.noStandardTags = this.noStandardTags;
        }
        if (this.tagDefinitions.length > 0) {
            configJson.tagDefinitions = [];
            for (const tagDefinition of this.tagDefinitions) {
                configJson.tagDefinitions.push(TSDocConfigFile._serializeTagDefinition(tagDefinition));
            }
        }
        if (this.supportForTags.size > 0) {
            configJson.supportForTags = {};
            this.supportForTags.forEach((supported, tagName) => {
                configJson.supportForTags[tagName] = supported;
            });
        }
        if (this.supportedHtmlElements) {
            configJson.supportedHtmlElements = [...this.supportedHtmlElements];
        }
        if (this._reportUnsupportedHtmlElements !== undefined) {
            configJson.reportUnsupportedHtmlElements = this._reportUnsupportedHtmlElements;
        }
        return configJson;
    }
    static _serializeTagDefinition(tagDefinition) {
        let syntaxKind;
        switch (tagDefinition.syntaxKind) {
            case tsdoc_1.TSDocTagSyntaxKind.InlineTag:
                syntaxKind = 'inline';
                break;
            case tsdoc_1.TSDocTagSyntaxKind.BlockTag:
                syntaxKind = 'block';
                break;
            case tsdoc_1.TSDocTagSyntaxKind.ModifierTag:
                syntaxKind = 'modifier';
                break;
            default:
                throw new Error('Unimplemented TSDocTagSyntaxKind');
        }
        const tagConfigJson = {
            tagName: tagDefinition.tagName,
            syntaxKind
        };
        if (tagDefinition.allowMultiple) {
            tagConfigJson.allowMultiple = true;
        }
        return tagConfigJson;
    }
    /**
     * Returns a report of any errors that occurred while attempting to load this file or any files
     * referenced via the "extends" field.
     *
     * @remarks
     * Use {@link TSDocConfigFile.hasErrors} to determine whether any errors occurred.
     */
    getErrorSummary() {
        if (!this._hasErrors) {
            return 'No errors.';
        }
        let result = '';
        if (this.log.messages.length > 0) {
            const errorNoun = this.log.messages.length > 1 ? 'Errors' : 'Error';
            if (this.filePath) {
                result += `${errorNoun} encountered for ${this.filePath}:\n`;
            }
            else {
                result += `${errorNoun} encountered when loading TSDoc configuration:\n`;
            }
            for (const message of this.log.messages) {
                result += `  ${message.text}\n`;
            }
        }
        for (const extendsFile of this.extendsFiles) {
            if (extendsFile.hasErrors) {
                if (result !== '') {
                    result += '\n';
                }
                result += extendsFile.getErrorSummary();
            }
        }
        return result;
    }
    /**
     * Applies the settings from this config file to a TSDoc parser configuration.
     * Any `extendsFile` settings will also applied.
     *
     * @remarks
     * Additional validation is performed during this operation.  The caller is expected to check for errors
     * using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log}, or {@link TSDocConfigFile.getErrorSummary}.
     */
    configureParser(configuration) {
        if (this._getNoStandardTagsWithExtends()) {
            // Do not define standard tags
            configuration.clear(true);
        }
        else {
            // Define standard tags (the default behavior)
            configuration.clear(false);
        }
        this.updateParser(configuration);
    }
    /**
     * This is the same as {@link configureParser}, but it preserves any previous state.
     *
     * @remarks
     * Additional validation is performed during this operation.  The caller is expected to check for errors
     * using {@link TSDocConfigFile.hasErrors}, {@link TSDocConfigFile.log}, or {@link TSDocConfigFile.getErrorSummary}.
     */
    updateParser(configuration) {
        // First apply the base config files
        for (const extendsFile of this.extendsFiles) {
            extendsFile.updateParser(configuration);
        }
        // Then apply this one
        for (const tagDefinition of this.tagDefinitions) {
            configuration.addTagDefinition(tagDefinition);
        }
        this.supportForTags.forEach((supported, tagName) => {
            const tagDefinition = configuration.tryGetTagDefinition(tagName);
            if (tagDefinition) {
                // Note that setSupportForTag() automatically enables configuration.validation.reportUnsupportedTags
                configuration.setSupportForTag(tagDefinition, supported);
            }
            else {
                // Note that this validation may depend partially on the preexisting state of the TSDocConfiguration
                // object, so it cannot be performed during the TSConfigFile.loadFile() stage.
                this._reportError({
                    messageId: tsdoc_1.TSDocMessageId.ConfigFileUndefinedTag,
                    messageText: `The "supportForTags" field refers to an undefined tag ${JSON.stringify(tagName)}.`,
                    textRange: tsdoc_1.TextRange.empty
                });
            }
        });
        if (this.supportedHtmlElements) {
            configuration.setSupportedHtmlElements([...this.supportedHtmlElements]);
        }
        if (this._reportUnsupportedHtmlElements === false) {
            configuration.validation.reportUnsupportedHtmlElements = false;
        }
        else if (this._reportUnsupportedHtmlElements === true) {
            configuration.validation.reportUnsupportedHtmlElements = true;
        }
    }
    _getNoStandardTagsWithExtends() {
        if (this.noStandardTags !== undefined) {
            return this.noStandardTags;
        }
        // This config file does not specify "noStandardTags", so consider any base files referenced using "extends"
        let result = undefined;
        for (const extendsFile of this.extendsFiles) {
            const extendedValue = extendsFile._getNoStandardTagsWithExtends();
            if (extendedValue !== undefined) {
                result = extendedValue;
            }
        }
        if (result === undefined) {
            // If no config file specifies noStandardTags, then it defaults to false
            result = false;
        }
        return result;
    }
}
exports.TSDocConfigFile = TSDocConfigFile;
TSDocConfigFile.FILENAME = 'tsdoc.json';
TSDocConfigFile.CURRENT_SCHEMA_URL = 'https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json';
//# sourceMappingURL=TSDocConfigFile.js.map