"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerProvider = exports.DEFAULT_LOGGER_NAME = void 0;
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const api_1 = require("@opentelemetry/api");
const api_logs_1 = require("@opentelemetry/api-logs");
const resources_1 = require("@opentelemetry/resources");
const core_1 = require("@opentelemetry/core");
const Logger_1 = require("./Logger");
const config_1 = require("./config");
const MultiLogRecordProcessor_1 = require("./MultiLogRecordProcessor");
const LoggerProviderSharedState_1 = require("./internal/LoggerProviderSharedState");
exports.DEFAULT_LOGGER_NAME = 'unknown';
class LoggerProvider {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
        const mergedConfig = (0, core_1.merge)({}, (0, config_1.loadDefaultConfig)(), config);
        const resource = config.resource ?? (0, resources_1.defaultResource)();
        this._sharedState = new LoggerProviderSharedState_1.LoggerProviderSharedState(resource, mergedConfig.forceFlushTimeoutMillis, (0, config_1.reconfigureLimits)(mergedConfig.logRecordLimits));
        this._shutdownOnce = new core_1.BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
        if (this._shutdownOnce.isCalled) {
            api_1.diag.warn('A shutdown LoggerProvider cannot provide a Logger');
            return api_logs_1.NOOP_LOGGER;
        }
        if (!name) {
            api_1.diag.warn('Logger requested without instrumentation scope name.');
        }
        const loggerName = name || exports.DEFAULT_LOGGER_NAME;
        const key = `${loggerName}@${version || ''}:${options?.schemaUrl || ''}`;
        if (!this._sharedState.loggers.has(key)) {
            this._sharedState.loggers.set(key, new Logger_1.Logger({ name: loggerName, version, schemaUrl: options?.schemaUrl }, this._sharedState));
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._sharedState.loggers.get(key);
    }
    /**
     * Adds a new {@link LogRecordProcessor} to this logger.
     * @param processor the new LogRecordProcessor to be added.
     */
    addLogRecordProcessor(processor) {
        if (this._sharedState.registeredLogRecordProcessors.length === 0) {
            // since we might have enabled by default a batchProcessor, we disable it
            // before adding the new one
            this._sharedState.activeProcessor
                .shutdown()
                .catch(err => api_1.diag.error('Error while trying to shutdown current log record processor', err));
        }
        this._sharedState.registeredLogRecordProcessors.push(processor);
        this._sharedState.activeProcessor = new MultiLogRecordProcessor_1.MultiLogRecordProcessor(this._sharedState.registeredLogRecordProcessors, this._sharedState.forceFlushTimeoutMillis);
    }
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush() {
        // do not flush after shutdown
        if (this._shutdownOnce.isCalled) {
            api_1.diag.warn('invalid attempt to force flush after LoggerProvider shutdown');
            return this._shutdownOnce.promise;
        }
        return this._sharedState.activeProcessor.forceFlush();
    }
    /**
     * Flush all buffered data and shut down the LoggerProvider and all registered
     * LogRecordProcessor.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    shutdown() {
        if (this._shutdownOnce.isCalled) {
            api_1.diag.warn('shutdown may only be called once per LoggerProvider');
            return this._shutdownOnce.promise;
        }
        return this._shutdownOnce.call();
    }
    _shutdown() {
        return this._sharedState.activeProcessor.shutdown();
    }
}
exports.LoggerProvider = LoggerProvider;
//# sourceMappingURL=LoggerProvider.js.map