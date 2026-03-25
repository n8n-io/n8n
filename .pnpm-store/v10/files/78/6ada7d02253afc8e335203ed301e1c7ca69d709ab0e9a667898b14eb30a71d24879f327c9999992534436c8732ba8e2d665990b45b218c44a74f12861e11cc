"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionHelper = void 0;
/**
 * Helper class for generating exceptions with error codes.
 */
class ExceptionHelper {
    /**
     * Generates a typed exception with error code and help link.
     * The message format is: [CODE] - [message] - [helplink]
     * @param ErrorType The constructor of the error type to create
     * @param errorDefinition The error definition containing code, description, and optional help link
     * @param innerException Optional inner exception
     * @param params Optional parameters object for message formatting with key-value pairs
     * @returns A new exception instance with error code and help link, typed as AgentError
     */
    static generateException(ErrorType, errorDefinition, innerException, params) {
        var _a;
        // Format the message with parameters if provided
        let description = errorDefinition.description;
        if (params) {
            Object.keys(params).forEach((key) => {
                description = description.replace(`{${key}}`, params[key]);
            });
        }
        // Use provided helplink or default if not provided
        const helplinkTemplate = (_a = errorDefinition.helplink) !== null && _a !== void 0 ? _a : ExceptionHelper.DEFAULT_HELPLINK;
        // Replace {errorCode} token in helplink with the actual error code
        const helplink = helplinkTemplate.replace('{errorCode}', errorDefinition.code.toString());
        // Format the full message as: [CODE] - [message] - [helplink]
        const message = `[${errorDefinition.code}] - ${description} - ${helplink}`;
        // Create the exception
        const exception = new ErrorType(message);
        // Set error code and help link as custom properties
        exception.code = errorDefinition.code;
        exception.helpLink = helplink;
        // Store inner exception as a custom property if provided
        if (innerException) {
            exception.innerException = innerException;
        }
        return exception;
    }
}
exports.ExceptionHelper = ExceptionHelper;
/**
 * Default help link template for error codes.
 * The {errorCode} token will be replaced with the actual error code.
 */
ExceptionHelper.DEFAULT_HELPLINK = 'https://aka.ms/M365AgentsErrorCodesJS/#{errorCode}';
//# sourceMappingURL=exceptionHelper.js.map