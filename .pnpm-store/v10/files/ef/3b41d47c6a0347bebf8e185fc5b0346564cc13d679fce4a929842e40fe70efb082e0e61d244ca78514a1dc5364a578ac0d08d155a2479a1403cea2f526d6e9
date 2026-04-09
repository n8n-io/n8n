"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerProviderSharedState = exports.DEFAULT_LOGGER_CONFIGURATOR = void 0;
const api_logs_1 = require("@opentelemetry/api-logs");
const NoopLogRecordProcessor_1 = require("../export/NoopLogRecordProcessor");
const MultiLogRecordProcessor_1 = require("../MultiLogRecordProcessor");
const utils_1 = require("./utils");
const DEFAULT_LOGGER_CONFIG = {
    disabled: false,
    minimumSeverity: api_logs_1.SeverityNumber.UNSPECIFIED,
    traceBased: false,
};
/**
 * Default LoggerConfigurator that returns the default config for all loggers
 */
const DEFAULT_LOGGER_CONFIGURATOR = () => ({
    ...DEFAULT_LOGGER_CONFIG,
});
exports.DEFAULT_LOGGER_CONFIGURATOR = DEFAULT_LOGGER_CONFIGURATOR;
class LoggerProviderSharedState {
    loggers = new Map();
    activeProcessor;
    registeredLogRecordProcessors = [];
    resource;
    forceFlushTimeoutMillis;
    logRecordLimits;
    processors;
    _loggerConfigurator;
    _loggerConfigs = new Map();
    constructor(resource, forceFlushTimeoutMillis, logRecordLimits, processors, loggerConfigurator) {
        this.resource = resource;
        this.forceFlushTimeoutMillis = forceFlushTimeoutMillis;
        this.logRecordLimits = logRecordLimits;
        this.processors = processors;
        if (processors.length > 0) {
            this.registeredLogRecordProcessors = processors;
            this.activeProcessor = new MultiLogRecordProcessor_1.MultiLogRecordProcessor(this.registeredLogRecordProcessors, this.forceFlushTimeoutMillis);
        }
        else {
            this.activeProcessor = new NoopLogRecordProcessor_1.NoopLogRecordProcessor();
        }
        this._loggerConfigurator =
            loggerConfigurator ?? exports.DEFAULT_LOGGER_CONFIGURATOR;
    }
    /**
     * Get the LoggerConfig for a given instrumentation scope.
     * Uses the LoggerConfigurator function to compute the config on first access
     * and caches the result.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    getLoggerConfig(instrumentationScope) {
        const key = (0, utils_1.getInstrumentationScopeKey)(instrumentationScope);
        // Return cached config if available
        let config = this._loggerConfigs.get(key);
        if (config) {
            return config;
        }
        // Compute config using the configurator
        // The configurator always returns a complete config
        config = this._loggerConfigurator(instrumentationScope);
        // Cache the result
        this._loggerConfigs.set(key, config);
        return config;
    }
}
exports.LoggerProviderSharedState = LoggerProviderSharedState;
//# sourceMappingURL=LoggerProviderSharedState.js.map