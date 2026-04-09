/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { diag } from '@opentelemetry/api';
import { NOOP_LOGGER } from '@opentelemetry/api-logs';
import { defaultResource } from '@opentelemetry/resources';
import { BindOnceFuture } from '@opentelemetry/core';
import { Logger } from './Logger';
import { DEFAULT_LOGGER_CONFIGURATOR, LoggerProviderSharedState, } from './internal/LoggerProviderSharedState';
export const DEFAULT_LOGGER_NAME = 'unknown';
export class LoggerProvider {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
        const mergedConfig = {
            resource: config.resource ?? defaultResource(),
            forceFlushTimeoutMillis: config.forceFlushTimeoutMillis ?? 30000,
            logRecordLimits: {
                attributeCountLimit: config.logRecordLimits?.attributeCountLimit ?? 128,
                attributeValueLengthLimit: config.logRecordLimits?.attributeValueLengthLimit ?? Infinity,
            },
            loggerConfigurator: config.loggerConfigurator ?? DEFAULT_LOGGER_CONFIGURATOR,
            processors: config.processors ?? [],
        };
        this._sharedState = new LoggerProviderSharedState(mergedConfig.resource, mergedConfig.forceFlushTimeoutMillis, mergedConfig.logRecordLimits, mergedConfig.processors, mergedConfig.loggerConfigurator);
        this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
    }
    /**
     * Get a logger with the configuration of the LoggerProvider.
     */
    getLogger(name, version, options) {
        if (this._shutdownOnce.isCalled) {
            diag.warn('A shutdown LoggerProvider cannot provide a Logger');
            return NOOP_LOGGER;
        }
        if (!name) {
            diag.warn('Logger requested without instrumentation scope name.');
        }
        const loggerName = name || DEFAULT_LOGGER_NAME;
        const key = `${loggerName}@${version || ''}:${options?.schemaUrl || ''}`;
        if (!this._sharedState.loggers.has(key)) {
            this._sharedState.loggers.set(key, new Logger({ name: loggerName, version, schemaUrl: options?.schemaUrl }, this._sharedState));
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this._sharedState.loggers.get(key);
    }
    /**
     * Notifies all registered LogRecordProcessor to flush any buffered data.
     *
     * Returns a promise which is resolved when all flushes are complete.
     */
    forceFlush() {
        // do not flush after shutdown
        if (this._shutdownOnce.isCalled) {
            diag.warn('invalid attempt to force flush after LoggerProvider shutdown');
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
            diag.warn('shutdown may only be called once per LoggerProvider');
            return this._shutdownOnce.promise;
        }
        return this._shutdownOnce.call();
    }
    _shutdown() {
        return this._sharedState.activeProcessor.shutdown();
    }
}
//# sourceMappingURL=LoggerProvider.js.map