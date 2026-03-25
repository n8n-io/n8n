"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeenyStatistics = exports.TeenyStatisticsWarning = void 0;
/**
 * @class TeenyStatisticsWarning
 * @extends Error
 * @description While an error, is used for emitting warnings when
 *   meeting certain configured thresholds.
 * @see process.emitWarning
 */
class TeenyStatisticsWarning extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message);
        this.threshold = 0;
        this.type = '';
        this.value = 0;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.TeenyStatisticsWarning = TeenyStatisticsWarning;
TeenyStatisticsWarning.CONCURRENT_REQUESTS = 'ConcurrentRequestsExceededWarning';
/**
 * @class TeenyStatistics
 * @description Maintain various statistics internal to teeny-request. Tracking
 *   is not automatic and must be instrumented within teeny-request.
 */
class TeenyStatistics {
    /**
     * @param {TeenyStatisticsOptions} [opts]
     */
    constructor(opts) {
        /**
         * @type {number}
         * @private
         * @default 0
         */
        this._concurrentRequests = 0;
        /**
         * @type {boolean}
         * @private
         * @default false
         */
        this._didConcurrentRequestWarn = false;
        this._options = TeenyStatistics._prepareOptions(opts);
    }
    /**
     * Returns a copy of the current options.
     * @return {TeenyStatisticsOptions}
     */
    getOptions() {
        return Object.assign({}, this._options);
    }
    /**
     * Change configured statistics options. This will not preserve unspecified
     *   options that were previously specified, i.e. this is a reset of options.
     * @param {TeenyStatisticsOptions} [opts]
     * @returns {TeenyStatisticsConfig} The previous options.
     * @see _prepareOptions
     */
    setOptions(opts) {
        const oldOpts = this._options;
        this._options = TeenyStatistics._prepareOptions(opts);
        return oldOpts;
    }
    /**
     * @readonly
     * @return {TeenyStatisticsCounters}
     */
    get counters() {
        return {
            concurrentRequests: this._concurrentRequests,
        };
    }
    /**
     * @description Should call this right before making a request.
     */
    requestStarting() {
        this._concurrentRequests++;
        if (this._options.concurrentRequests > 0 &&
            this._concurrentRequests >= this._options.concurrentRequests &&
            !this._didConcurrentRequestWarn) {
            this._didConcurrentRequestWarn = true;
            const warning = new TeenyStatisticsWarning('Possible excessive concurrent requests detected. ' +
                this._concurrentRequests +
                ' requests in-flight, which exceeds the configured threshold of ' +
                this._options.concurrentRequests +
                '. Use the TEENY_REQUEST_WARN_CONCURRENT_REQUESTS environment ' +
                'variable or the concurrentRequests option of teeny-request to ' +
                'increase or disable (0) this warning.');
            warning.type = TeenyStatisticsWarning.CONCURRENT_REQUESTS;
            warning.value = this._concurrentRequests;
            warning.threshold = this._options.concurrentRequests;
            process.emitWarning(warning);
        }
    }
    /**
     * @description When using `requestStarting`, call this after the request
     *   has finished.
     */
    requestFinished() {
        // TODO negative?
        this._concurrentRequests--;
    }
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
    static _prepareOptions({ concurrentRequests: diConcurrentRequests, } = {}) {
        let concurrentRequests = this.DEFAULT_WARN_CONCURRENT_REQUESTS;
        const envConcurrentRequests = Number(process.env.TEENY_REQUEST_WARN_CONCURRENT_REQUESTS);
        if (diConcurrentRequests !== undefined) {
            concurrentRequests = diConcurrentRequests;
        }
        else if (!Number.isNaN(envConcurrentRequests)) {
            concurrentRequests = envConcurrentRequests;
        }
        return { concurrentRequests };
    }
}
exports.TeenyStatistics = TeenyStatistics;
/**
 * @description A default threshold representing when to warn about excessive
 *   in-flight/concurrent requests.
 * @type {number}
 * @static
 * @readonly
 * @default 5000
 */
TeenyStatistics.DEFAULT_WARN_CONCURRENT_REQUESTS = 5000;
//# sourceMappingURL=TeenyStatistics.js.map