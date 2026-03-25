/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export interface TeenyStatisticsOptions {
    /**
     * A positive number representing when to issue a warning about the number
     * of concurrent requests using teeny-request.
     * Set to 0 to disable this warning.
     * Corresponds to the TEENY_REQUEST_WARN_CONCURRENT_REQUESTS environment
     * variable.
     */
    concurrentRequests?: number;
}
type TeenyStatisticsConfig = Required<TeenyStatisticsOptions>;
/**
 * TeenyStatisticsCounters is distinct from TeenyStatisticsOptions:
 * Used when dumping current counters and other internal metrics.
 */
export interface TeenyStatisticsCounters {
    concurrentRequests: number;
}
/**
 * @class TeenyStatisticsWarning
 * @extends Error
 * @description While an error, is used for emitting warnings when
 *   meeting certain configured thresholds.
 * @see process.emitWarning
 */
export declare class TeenyStatisticsWarning extends Error {
    static readonly CONCURRENT_REQUESTS = "ConcurrentRequestsExceededWarning";
    threshold: number;
    type: string;
    value: number;
    /**
     * @param {string} message
     */
    constructor(message: string);
}
/**
 * @class TeenyStatistics
 * @description Maintain various statistics internal to teeny-request. Tracking
 *   is not automatic and must be instrumented within teeny-request.
 */
export declare class TeenyStatistics {
    /**
     * @description A default threshold representing when to warn about excessive
     *   in-flight/concurrent requests.
     * @type {number}
     * @static
     * @readonly
     * @default 5000
     */
    static readonly DEFAULT_WARN_CONCURRENT_REQUESTS = 5000;
    /**
     * @type {TeenyStatisticsConfig}
     * @private
     */
    private _options;
    /**
     * @type {number}
     * @private
     * @default 0
     */
    private _concurrentRequests;
    /**
     * @type {boolean}
     * @private
     * @default false
     */
    private _didConcurrentRequestWarn;
    /**
     * @param {TeenyStatisticsOptions} [opts]
     */
    constructor(opts?: TeenyStatisticsOptions);
    /**
     * Returns a copy of the current options.
     * @return {TeenyStatisticsOptions}
     */
    getOptions(): TeenyStatisticsOptions;
    /**
     * Change configured statistics options. This will not preserve unspecified
     *   options that were previously specified, i.e. this is a reset of options.
     * @param {TeenyStatisticsOptions} [opts]
     * @returns {TeenyStatisticsConfig} The previous options.
     * @see _prepareOptions
     */
    setOptions(opts?: TeenyStatisticsOptions): TeenyStatisticsConfig;
    /**
     * @readonly
     * @return {TeenyStatisticsCounters}
     */
    get counters(): TeenyStatisticsCounters;
    /**
     * @description Should call this right before making a request.
     */
    requestStarting(): void;
    /**
     * @description When using `requestStarting`, call this after the request
     *   has finished.
     */
    requestFinished(): void;
    /**
     * Configuration Precedence:
     *   1. Dependency inversion via defined option.
     *   2. Global numeric environment variable.
     *   3. Built-in default.
     * This will not preserve unspecified options previously specified.
     * @param {TeenyStatisticsOptions} [opts]
     * @returns {TeenyStatisticsOptions}
     * @private
     */
    private static _prepareOptions;
}
export {};
