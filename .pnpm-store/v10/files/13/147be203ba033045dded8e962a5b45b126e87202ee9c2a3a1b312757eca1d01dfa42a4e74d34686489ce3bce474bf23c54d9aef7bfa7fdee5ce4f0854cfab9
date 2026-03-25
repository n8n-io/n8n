// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/**
 * Represents an error definition for the Agents SDK.
 * Each error definition includes an error code, description, and an optional help link.
 * If helplink is not provided, a default help link will be used.
 */
export interface AgentErrorDefinition {
  /**
   * Error code for the exception
   */
  code: number

  /**
   * Displayed error message
   */
  description: string

  /**
   * Optional help URL link for the error.
   * If not provided, the default help link will be used.
   */
  helplink?: string
}

/**
 * Enhanced error type with additional properties for error code, help link, and inner exception.
 * This interface extends the standard Error type with custom properties added by ExceptionHelper.
 */
export interface AgentError extends Error {
  /**
   * Error code for the exception
   */
  code: number

  /**
   * Help URL link for the error
   */
  helpLink: string

  /**
   * Optional inner exception
   */
  innerException?: Error
}

/**
 * Helper class for generating exceptions with error codes.
 */
export class ExceptionHelper {
  /**
   * Default help link template for error codes.
   * The {errorCode} token will be replaced with the actual error code.
   */
  static readonly DEFAULT_HELPLINK = 'https://aka.ms/M365AgentsErrorCodesJS/#{errorCode}'

  /**
   * Generates a typed exception with error code and help link.
   * The message format is: [CODE] - [message] - [helplink]
   * @param ErrorType The constructor of the error type to create
   * @param errorDefinition The error definition containing code, description, and optional help link
   * @param innerException Optional inner exception
   * @param params Optional parameters object for message formatting with key-value pairs
   * @returns A new exception instance with error code and help link, typed as AgentError
   */
  static generateException<T extends Error> (
    ErrorType: new (message: string, innerException?: Error) => T,
    errorDefinition: AgentErrorDefinition,
    innerException?: Error,
    params?: { [key: string]: string }
  ): T & AgentError {
    // Format the message with parameters if provided
    let description = errorDefinition.description
    if (params) {
      Object.keys(params).forEach((key) => {
        description = description.replace(`{${key}}`, params[key])
      })
    }

    // Use provided helplink or default if not provided
    const helplinkTemplate = errorDefinition.helplink ?? ExceptionHelper.DEFAULT_HELPLINK

    // Replace {errorCode} token in helplink with the actual error code
    const helplink = helplinkTemplate.replace('{errorCode}', errorDefinition.code.toString())

    // Format the full message as: [CODE] - [message] - [helplink]
    const message = `[${errorDefinition.code}] - ${description} - ${helplink}`

    // Create the exception
    const exception = new ErrorType(message) as T & AgentError

    // Set error code and help link as custom properties
    exception.code = errorDefinition.code
    exception.helpLink = helplink

    // Store inner exception as a custom property if provided
    if (innerException) {
      exception.innerException = innerException
    }

    return exception
  }
}
