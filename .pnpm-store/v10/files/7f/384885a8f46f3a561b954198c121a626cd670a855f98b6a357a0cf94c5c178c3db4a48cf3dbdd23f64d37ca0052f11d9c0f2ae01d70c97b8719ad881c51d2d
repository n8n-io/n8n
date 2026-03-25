// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The base class from which all request policies derive.
 */
export class BaseRequestPolicy {
    /**
     * The main method to implement that manipulates a request/response.
     */
    constructor(
    /**
     * The next policy in the pipeline. Each policy is responsible for executing the next one if the request is to continue through the pipeline.
     */
    _nextPolicy, 
    /**
     * The options that can be passed to a given request policy.
     */
    _options) {
        this._nextPolicy = _nextPolicy;
        this._options = _options;
    }
    /**
     * Get whether or not a log with the provided log level should be logged.
     * @param logLevel - The log level of the log that will be logged.
     * @returns Whether or not a log with the provided log level should be logged.
     */
    shouldLog(logLevel) {
        return this._options.shouldLog(logLevel);
    }
    /**
     * Attempt to log the provided message to the provided logger. If no logger was provided or if
     * the log level does not meat the logger's threshold, then nothing will be logged.
     * @param logLevel - The log level of this log.
     * @param message - The message of this log.
     */
    log(logLevel, message) {
        this._options.log(logLevel, message);
    }
}
//# sourceMappingURL=RequestPolicy.js.map