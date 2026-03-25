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
import { diag } from '@opentelemetry/api';
import { NOOP_LOGGER } from '@opentelemetry/api-logs';
import { defaultResource } from '@opentelemetry/resources';
import { BindOnceFuture, merge } from '@opentelemetry/core';
import { Logger } from './Logger';
import { loadDefaultConfig, reconfigureLimits } from './config';
import { LoggerProviderSharedState } from './internal/LoggerProviderSharedState';
export const DEFAULT_LOGGER_NAME = 'unknown';
export class LoggerProvider {
    _shutdownOnce;
    _sharedState;
    constructor(config = {}) {
        const mergedConfig = merge({}, loadDefaultConfig(), config);
        const resource = config.resource ?? defaultResource();
        this._sharedState = new LoggerProviderSharedState(resource, mergedConfig.forceFlushTimeoutMillis, reconfigureLimits(mergedConfig.logRecordLimits), config?.processors ?? []);
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