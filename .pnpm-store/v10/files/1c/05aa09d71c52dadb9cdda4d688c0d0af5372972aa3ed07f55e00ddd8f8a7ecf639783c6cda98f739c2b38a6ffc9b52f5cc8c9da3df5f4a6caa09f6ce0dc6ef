"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileError = void 0;
const Path_1 = require("./Path");
const TypeUuid_1 = require("./TypeUuid");
const uuidFileError = '37a4c772-2dc8-4c66-89ae-262f8cc1f0c1';
const baseFolderEnvVar = 'RUSHSTACK_FILE_ERROR_BASE_FOLDER';
/**
 * An `Error` subclass that should be thrown to report an unexpected state that specifically references
 * a location in a file.
 *
 * @remarks The file path provided to the FileError constructor is expected to exist on disk. FileError
 * should not be used for reporting errors that are not in reference to an existing file.
 *
 * @public
 */
class FileError extends Error {
    /**
     * Constructs a new instance of the {@link FileError} class.
     *
     * @param message - A message describing the error.
     * @param options - Options for the error.
     */
    constructor(message, options) {
        super(message);
        this.absolutePath = options.absolutePath;
        this.projectFolder = options.projectFolder;
        this.line = options.line;
        this.column = options.column;
        // Manually set the prototype, as we can no longer extend built-in classes like Error, Array, Map, etc.
        // https://github.com/microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        //
        // Note: the prototype must also be set on any classes which extend this one
        this.__proto__ = FileError.prototype; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    /**
     * Get the Unix-formatted the error message.
     *
     * @override
     */
    toString() {
        // Default to formatting in 'Unix' format, for consistency.
        return this.getFormattedErrorMessage();
    }
    /**
     * Get the formatted error message.
     *
     * @param options - Options for the error message format.
     */
    getFormattedErrorMessage(options) {
        return Path_1.Path.formatFileLocation({
            format: (options === null || options === void 0 ? void 0 : options.format) || 'Unix',
            baseFolder: this._evaluateBaseFolder(),
            pathToFormat: this.absolutePath,
            message: this.message,
            line: this.line,
            column: this.column
        });
    }
    _evaluateBaseFolder() {
        // Cache the sanitized environment variable. This means that we don't support changing
        // the environment variable mid-execution. This is a reasonable tradeoff for the benefit
        // of being able to cache absolute paths, since that is only able to be determined after
        // running the regex, which is expensive. Since this would be a common execution path for
        // tools like Rush, we should optimize for that.
        if (!FileError._sanitizedEnvironmentVariable && process.env[baseFolderEnvVar]) {
            // Strip leading and trailing quotes, if present.
            FileError._sanitizedEnvironmentVariable = process.env[baseFolderEnvVar].replace(/^("|')|("|')$/g, '');
        }
        if (FileError._environmentVariableIsAbsolutePath) {
            return FileError._sanitizedEnvironmentVariable;
        }
        // undefined environment variable has a mapping to the project folder
        const baseFolderFn = FileError._environmentVariableBasePathFnMap.get(FileError._sanitizedEnvironmentVariable);
        if (baseFolderFn) {
            return baseFolderFn(this);
        }
        const baseFolderTokenRegex = /{([^}]+)}/g;
        const result = baseFolderTokenRegex.exec(FileError._sanitizedEnvironmentVariable);
        if (!result) {
            // No tokens, assume absolute path
            FileError._environmentVariableIsAbsolutePath = true;
            return FileError._sanitizedEnvironmentVariable;
        }
        else if (result.index !== 0) {
            // Currently only support the token being first in the string.
            throw new Error(`The ${baseFolderEnvVar} environment variable contains text before the token "${result[0]}".`);
        }
        else if (result[0].length !== FileError._sanitizedEnvironmentVariable.length) {
            // Currently only support the token being the entire string.
            throw new Error(`The ${baseFolderEnvVar} environment variable contains text after the token "${result[0]}".`);
        }
        else {
            throw new Error(`The ${baseFolderEnvVar} environment variable contains a token "${result[0]}", which is not ` +
                'supported.');
        }
    }
    static [Symbol.hasInstance](instance) {
        return TypeUuid_1.TypeUuid.isInstanceOf(instance, uuidFileError);
    }
}
exports.FileError = FileError;
/** @internal */
FileError._environmentVariableIsAbsolutePath = false;
FileError._environmentVariableBasePathFnMap = new Map([
    [undefined, (fileError) => fileError.projectFolder],
    ['{PROJECT_FOLDER}', (fileError) => fileError.projectFolder],
    ['{ABSOLUTE_PATH}', (fileError) => undefined]
]);
TypeUuid_1.TypeUuid.registerClass(FileError, uuidFileError);
//# sourceMappingURL=FileError.js.map