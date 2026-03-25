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
exports.JsonFile = exports.JsonSyntax = void 0;
const os = __importStar(require("os"));
const jju = __importStar(require("jju"));
const Text_1 = require("./Text");
const FileSystem_1 = require("./FileSystem");
/**
 * Specifies the variant of JSON syntax to be used.
 *
 * @public
 */
var JsonSyntax;
(function (JsonSyntax) {
    /**
     * Specifies the exact RFC 8259 format as implemented by the `JSON.parse()` system API.
     * This format was designed for machine generated inputs such as an HTTP payload.
     * It is not a recommend choice for human-authored files, because it does not support
     * code comments.
     *
     * @remarks
     *
     * A well-known quote from Douglas Crockford, the inventor of JSON:
     *
     * "I removed comments from JSON because I saw people were using them to hold parsing directives,
     * a practice which would have destroyed interoperability.  I know that the lack of comments makes
     * some people sad, but it shouldn't.  Suppose you are using JSON to keep configuration files,
     * which you would like to annotate.  Go ahead and insert all the comments you like.
     * Then pipe it through JSMin before handing it to your JSON parser."
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc8259 | RFC 8259}
     */
    JsonSyntax["Strict"] = "strict";
    /**
     * `JsonSyntax.JsonWithComments` is the recommended format for human-authored config files.
     * It is a minimal extension to `JsonSyntax.Strict` adding support for code comments
     * using `//` and `/*`.
     *
     * @remarks
     *
     * VS Code calls this format `jsonc`, but it should not be confused with unrelated file formats
     * and libraries that also use the name "JSONC".
     *
     * To fix VS Code syntax highlighting, add this setting:
     * `"files.associations": { "*.json": "jsonc" }`
     *
     * To fix GitHub syntax highlighting, add this to your `.gitattributes`:
     * `*.json linguist-language=JSON-with-Comments`
     */
    JsonSyntax["JsonWithComments"] = "jsonWithComments";
    /**
     * JSON5 is a project that proposes a JSON-like format supplemented with ECMAScript 5.1
     * notations for objects, numbers, comments, and more.
     *
     * @remarks
     * Files using this format should use the `.json5` file extension instead of `.json`.
     *
     * JSON5 has substantial differences from JSON: object keys may be unquoted, trailing commas
     * are allowed, and strings may span multiple lines.  Whereas {@link JsonSyntax.JsonWithComments} can
     * be cheaply converted to standard JSON by stripping comments, parsing JSON5 requires a
     * nontrivial algorithm that may not be easily available in some contexts or programming languages.
     *
     * @see {@link https://json5.org/ | JSON5 project website}
     */
    JsonSyntax["Json5"] = "json5";
})(JsonSyntax || (exports.JsonSyntax = JsonSyntax = {}));
const DEFAULT_ENCODING = 'utf8';
/**
 * Utilities for reading/writing JSON files.
 * @public
 */
class JsonFile {
    /**
     * Loads a JSON file.
     */
    static load(jsonFilename, options) {
        try {
            const contents = FileSystem_1.FileSystem.readFile(jsonFilename);
            const parseOptions = JsonFile._buildJjuParseOptions(options);
            return jju.parse(contents, parseOptions);
        }
        catch (error) {
            if (FileSystem_1.FileSystem.isNotExistError(error)) {
                throw error;
            }
            else {
                throw new Error(`Error reading "${JsonFile._formatPathForError(jsonFilename)}":` +
                    os.EOL +
                    `  ${error.message}`);
            }
        }
    }
    /**
     * An async version of {@link JsonFile.load}.
     */
    static async loadAsync(jsonFilename, options) {
        try {
            const contents = await FileSystem_1.FileSystem.readFileAsync(jsonFilename);
            const parseOptions = JsonFile._buildJjuParseOptions(options);
            return jju.parse(contents, parseOptions);
        }
        catch (error) {
            if (FileSystem_1.FileSystem.isNotExistError(error)) {
                throw error;
            }
            else {
                throw new Error(`Error reading "${JsonFile._formatPathForError(jsonFilename)}":` +
                    os.EOL +
                    `  ${error.message}`);
            }
        }
    }
    /**
     * Parses a JSON file's contents.
     */
    static parseString(jsonContents, options) {
        const parseOptions = JsonFile._buildJjuParseOptions(options);
        return jju.parse(jsonContents, parseOptions);
    }
    /**
     * Loads a JSON file and validate its schema.
     */
    static loadAndValidate(jsonFilename, jsonSchema, options) {
        const jsonObject = JsonFile.load(jsonFilename, options);
        jsonSchema.validateObject(jsonObject, jsonFilename, options);
        return jsonObject;
    }
    /**
     * An async version of {@link JsonFile.loadAndValidate}.
     */
    static async loadAndValidateAsync(jsonFilename, jsonSchema, options) {
        const jsonObject = await JsonFile.loadAsync(jsonFilename, options);
        jsonSchema.validateObject(jsonObject, jsonFilename, options);
        return jsonObject;
    }
    /**
     * Loads a JSON file and validate its schema, reporting errors using a callback
     * @remarks
     * See JsonSchema.validateObjectWithCallback() for more info.
     */
    static loadAndValidateWithCallback(jsonFilename, jsonSchema, errorCallback, options) {
        const jsonObject = JsonFile.load(jsonFilename, options);
        jsonSchema.validateObjectWithCallback(jsonObject, errorCallback);
        return jsonObject;
    }
    /**
     * An async version of {@link JsonFile.loadAndValidateWithCallback}.
     */
    static async loadAndValidateWithCallbackAsync(jsonFilename, jsonSchema, errorCallback, options) {
        const jsonObject = await JsonFile.loadAsync(jsonFilename, options);
        jsonSchema.validateObjectWithCallback(jsonObject, errorCallback);
        return jsonObject;
    }
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param jsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static stringify(jsonObject, options) {
        return JsonFile.updateString('', jsonObject, options);
    }
    /**
     * Serializes the specified JSON object to a string buffer.
     * @param previousJson - the previous JSON string, which will be updated
     * @param newJsonObject - the object to be serialized
     * @param options - other settings that control serialization
     * @returns a JSON string, with newlines, and indented with two spaces
     */
    static updateString(previousJson, newJsonObject, options = {}) {
        if (!options.ignoreUndefinedValues) {
            // Standard handling of `undefined` in JSON stringification is to discard the key.
            JsonFile.validateNoUndefinedMembers(newJsonObject);
        }
        let explicitMode = undefined;
        switch (options.jsonSyntax) {
            case JsonSyntax.Strict:
                explicitMode = 'json';
                break;
            case JsonSyntax.JsonWithComments:
                explicitMode = 'cjson';
                break;
            case JsonSyntax.Json5:
                explicitMode = 'json5';
                break;
        }
        let stringified;
        if (previousJson !== '') {
            // NOTE: We don't use mode=json here because comments aren't allowed by strict JSON
            stringified = jju.update(previousJson, newJsonObject, {
                mode: explicitMode !== null && explicitMode !== void 0 ? explicitMode : JsonSyntax.Json5,
                indent: 2
            });
        }
        else if (options.prettyFormatting) {
            stringified = jju.stringify(newJsonObject, {
                mode: explicitMode !== null && explicitMode !== void 0 ? explicitMode : 'json',
                indent: 2
            });
            if (options.headerComment !== undefined) {
                stringified = JsonFile._formatJsonHeaderComment(options.headerComment) + stringified;
            }
        }
        else {
            stringified = JSON.stringify(newJsonObject, undefined, 2);
            if (options.headerComment !== undefined) {
                stringified = JsonFile._formatJsonHeaderComment(options.headerComment) + stringified;
            }
        }
        // Add the trailing newline
        stringified = Text_1.Text.ensureTrailingNewline(stringified);
        if (options.newlineConversion) {
            stringified = Text_1.Text.convertTo(stringified, options.newlineConversion);
        }
        return stringified;
    }
    /**
     * Saves the file to disk.  Returns false if nothing was written due to options.onlyIfChanged.
     * @param jsonObject - the object to be saved
     * @param jsonFilename - the file path to write
     * @param options - other settings that control how the file is saved
     * @returns false if ISaveJsonFileOptions.onlyIfChanged didn't save anything; true otherwise
     */
    static save(jsonObject, jsonFilename, options = {}) {
        // Do we need to read the previous file contents?
        let oldBuffer = undefined;
        if (options.updateExistingFile || options.onlyIfChanged) {
            try {
                oldBuffer = FileSystem_1.FileSystem.readFileToBuffer(jsonFilename);
            }
            catch (error) {
                if (!FileSystem_1.FileSystem.isNotExistError(error)) {
                    throw error;
                }
            }
        }
        let jsonToUpdate = '';
        if (options.updateExistingFile && oldBuffer) {
            jsonToUpdate = oldBuffer.toString(DEFAULT_ENCODING);
        }
        const newJson = JsonFile.updateString(jsonToUpdate, jsonObject, options);
        const newBuffer = Buffer.from(newJson, DEFAULT_ENCODING);
        if (options.onlyIfChanged) {
            // Has the file changed?
            if (oldBuffer && Buffer.compare(newBuffer, oldBuffer) === 0) {
                // Nothing has changed, so don't touch the file
                return false;
            }
        }
        FileSystem_1.FileSystem.writeFile(jsonFilename, newBuffer, {
            ensureFolderExists: options.ensureFolderExists
        });
        // TEST CODE: Used to verify that onlyIfChanged isn't broken by a hidden transformation during saving.
        /*
        const oldBuffer2: Buffer = FileSystem.readFileToBuffer(jsonFilename);
        if (Buffer.compare(buffer, oldBuffer2) !== 0) {
          console.log('new:' + buffer.toString('hex'));
          console.log('old:' + oldBuffer2.toString('hex'));
    
          throw new Error('onlyIfChanged logic is broken');
        }
        */
        return true;
    }
    /**
     * An async version of {@link JsonFile.save}.
     */
    static async saveAsync(jsonObject, jsonFilename, options = {}) {
        // Do we need to read the previous file contents?
        let oldBuffer = undefined;
        if (options.updateExistingFile || options.onlyIfChanged) {
            try {
                oldBuffer = await FileSystem_1.FileSystem.readFileToBufferAsync(jsonFilename);
            }
            catch (error) {
                if (!FileSystem_1.FileSystem.isNotExistError(error)) {
                    throw error;
                }
            }
        }
        let jsonToUpdate = '';
        if (options.updateExistingFile && oldBuffer) {
            jsonToUpdate = oldBuffer.toString(DEFAULT_ENCODING);
        }
        const newJson = JsonFile.updateString(jsonToUpdate, jsonObject, options);
        const newBuffer = Buffer.from(newJson, DEFAULT_ENCODING);
        if (options.onlyIfChanged) {
            // Has the file changed?
            if (oldBuffer && Buffer.compare(newBuffer, oldBuffer) === 0) {
                // Nothing has changed, so don't touch the file
                return false;
            }
        }
        await FileSystem_1.FileSystem.writeFileAsync(jsonFilename, newBuffer, {
            ensureFolderExists: options.ensureFolderExists
        });
        // TEST CODE: Used to verify that onlyIfChanged isn't broken by a hidden transformation during saving.
        /*
        const oldBuffer2: Buffer = await FileSystem.readFileToBufferAsync(jsonFilename);
        if (Buffer.compare(buffer, oldBuffer2) !== 0) {
          console.log('new:' + buffer.toString('hex'));
          console.log('old:' + oldBuffer2.toString('hex'));
    
          throw new Error('onlyIfChanged logic is broken');
        }
        */
        return true;
    }
    /**
     * Used to validate a data structure before writing.  Reports an error if there
     * are any undefined members.
     */
    static validateNoUndefinedMembers(jsonObject) {
        return JsonFile._validateNoUndefinedMembers(jsonObject, []);
    }
    // Private implementation of validateNoUndefinedMembers()
    static _validateNoUndefinedMembers(jsonObject, keyPath) {
        if (!jsonObject) {
            return;
        }
        if (typeof jsonObject === 'object') {
            for (const key of Object.keys(jsonObject)) {
                keyPath.push(key);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const value = jsonObject[key];
                if (value === undefined) {
                    const fullPath = JsonFile._formatKeyPath(keyPath);
                    throw new Error(`The value for ${fullPath} is "undefined" and cannot be serialized as JSON`);
                }
                JsonFile._validateNoUndefinedMembers(value, keyPath);
                keyPath.pop();
            }
        }
    }
    // Given this input:    ['items', '4', 'syntax', 'parameters', 'string "with" symbols", 'type']
    // Return this string:  items[4].syntax.parameters["string \"with\" symbols"].type
    static _formatKeyPath(keyPath) {
        let result = '';
        for (const key of keyPath) {
            if (/^[0-9]+$/.test(key)) {
                // It's an integer, so display like this:  parent[123]
                result += `[${key}]`;
            }
            else if (/^[a-z_][a-z_0-9]*$/i.test(key)) {
                // It's an alphanumeric identifier, so display like this:  parent.name
                if (result) {
                    result += '.';
                }
                result += `${key}`;
            }
            else {
                // It's a freeform string, so display like this:  parent["A path: \"C:\\file\""]
                // Convert this:     A path: "C:\file"
                // To this:          A path: \"C:\\file\"
                const escapedKey = key
                    .replace(/[\\]/g, '\\\\') // escape backslashes
                    .replace(/["]/g, '\\'); // escape quotes
                result += `["${escapedKey}"]`;
            }
        }
        return result;
    }
    static _formatJsonHeaderComment(headerComment) {
        if (headerComment === '') {
            return '';
        }
        const lines = headerComment.split('\n');
        const result = [];
        for (const line of lines) {
            if (!/^\s*$/.test(line) && !/^\s*\/\//.test(line)) {
                throw new Error('The headerComment lines must be blank or start with the "//" prefix.\n' +
                    'Invalid line' +
                    JSON.stringify(line));
            }
            result.push(Text_1.Text.replaceAll(line, '\r', ''));
        }
        return lines.join('\n') + '\n';
    }
    static _buildJjuParseOptions(options = {}) {
        const parseOptions = {
            reserved_keys: 'replace'
        };
        switch (options.jsonSyntax) {
            case JsonSyntax.Strict:
                parseOptions.mode = 'json';
                break;
            case JsonSyntax.JsonWithComments:
                parseOptions.mode = 'cjson';
                break;
            case JsonSyntax.Json5:
            default:
                parseOptions.mode = 'json5';
                break;
        }
        return parseOptions;
    }
}
exports.JsonFile = JsonFile;
/**
 * @internal
 */
JsonFile._formatPathForError = (path) => path;
//# sourceMappingURL=JsonFile.js.map