"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSender = void 0;
const api_1 = require("@opentelemetry/api");
const index_js_1 = require("./persist/index.js");
const core_1 = require("@opentelemetry/core");
const networkStatsbeatMetrics_js_1 = require("../../export/statsbeat/networkStatsbeatMetrics.js");
const longIntervalStatsbeatMetrics_js_1 = require("../../export/statsbeat/longIntervalStatsbeatMetrics.js");
const types_js_1 = require("../../export/statsbeat/types.js");
const breezeUtils_js_1 = require("../../utils/breezeUtils.js");
const Constants_js_1 = require("../../Declarations/Constants.js");
const DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS = 60000;
/**
 * Base sender class
 * @internal
 */
class BaseSender {
    constructor(options) {
        this.statsbeatFailureCount = 0;
        this.batchSendRetryIntervalMs = DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS;
        this.numConsecutiveRedirects = 0;
        this.disableOfflineStorage = options.exporterOptions.disableOfflineStorage || false;
        this.persister = new index_js_1.FileSystemPersist(options.instrumentationKey, options.exporterOptions);
        if (options.trackStatsbeat) {
            this.networkStatsbeatMetrics = networkStatsbeatMetrics_js_1.NetworkStatsbeatMetrics.getInstance({
                instrumentationKey: options.instrumentationKey,
                endpointUrl: options.endpointUrl,
                disableOfflineStorage: this.disableOfflineStorage,
            });
            this.longIntervalStatsbeatMetrics = longIntervalStatsbeatMetrics_js_1.LongIntervalStatsbeatMetrics.getInstance({
                instrumentationKey: options.instrumentationKey,
                endpointUrl: options.endpointUrl,
                disableOfflineStorage: this.disableOfflineStorage,
            });
        }
        this.retryTimer = null;
        this.isStatsbeatSender = options.isStatsbeatSender || false;
    }
    /**
     * Export envelopes
     */
    async exportEnvelopes(envelopes) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        api_1.diag.info(`Exporting ${envelopes.length} envelope(s)`);
        if (envelopes.length < 1) {
            return { code: core_1.ExportResultCode.SUCCESS };
        }
        try {
            const startTime = new Date().getTime();
            const { result, statusCode } = await this.send(envelopes);
            const endTime = new Date().getTime();
            const duration = endTime - startTime;
            this.numConsecutiveRedirects = 0;
            if (statusCode === 200) {
                // Success -- @todo: start retry timer
                if (!this.retryTimer) {
                    this.retryTimer = setTimeout(() => {
                        this.retryTimer = null;
                        this.sendFirstPersistedFile();
                    }, this.batchSendRetryIntervalMs);
                    this.retryTimer.unref();
                }
                // If we are not exporting statsbeat and statsbeat is not disabled -- count success
                if (!this.isStatsbeatSender) {
                    (_a = this.networkStatsbeatMetrics) === null || _a === void 0 ? void 0 : _a.countSuccess(duration);
                }
                return { code: core_1.ExportResultCode.SUCCESS };
            }
            else if (statusCode && (0, breezeUtils_js_1.isRetriable)(statusCode)) {
                // Failed -- persist failed data
                if (statusCode === 429 || statusCode === 439) {
                    if (!this.isStatsbeatSender) {
                        (_b = this.networkStatsbeatMetrics) === null || _b === void 0 ? void 0 : _b.countThrottle(statusCode);
                    }
                    return {
                        code: core_1.ExportResultCode.SUCCESS,
                    };
                }
                if (result) {
                    api_1.diag.info(result);
                    const breezeResponse = JSON.parse(result);
                    const filteredEnvelopes = [];
                    // If we have a partial success, count the succeeded envelopes
                    if (breezeResponse.itemsAccepted > 0 && statusCode === 206 && !this.isStatsbeatSender) {
                        (_c = this.networkStatsbeatMetrics) === null || _c === void 0 ? void 0 : _c.countSuccess(duration);
                    }
                    // Figure out if we need to either retry or count failures
                    if (breezeResponse.errors) {
                        breezeResponse.errors.forEach((error) => {
                            if (error.statusCode && (0, breezeUtils_js_1.isRetriable)(error.statusCode)) {
                                filteredEnvelopes.push(envelopes[error.index]);
                            }
                        });
                    }
                    if (filteredEnvelopes.length > 0) {
                        if (!this.isStatsbeatSender) {
                            (_d = this.networkStatsbeatMetrics) === null || _d === void 0 ? void 0 : _d.countRetry(statusCode);
                        }
                        // calls resultCallback(ExportResult) based on result of persister.push
                        return await this.persist(filteredEnvelopes);
                    }
                    // Failed -- not retriable
                    if (!this.isStatsbeatSender) {
                        (_e = this.networkStatsbeatMetrics) === null || _e === void 0 ? void 0 : _e.countFailure(duration, statusCode);
                    }
                    return {
                        code: core_1.ExportResultCode.FAILED,
                    };
                }
                else {
                    // calls resultCallback(ExportResult) based on result of persister.push
                    if (!this.isStatsbeatSender) {
                        (_f = this.networkStatsbeatMetrics) === null || _f === void 0 ? void 0 : _f.countRetry(statusCode);
                    }
                    return await this.persist(envelopes);
                }
            }
            else {
                // Failed -- not retriable
                if (this.networkStatsbeatMetrics && !this.isStatsbeatSender) {
                    if (statusCode) {
                        this.networkStatsbeatMetrics.countFailure(duration, statusCode);
                    }
                }
                else {
                    // Handles all other status codes or client exceptions for Statsbeat
                    this.incrementStatsbeatFailure();
                }
                return {
                    code: core_1.ExportResultCode.FAILED,
                };
            }
        }
        catch (error) {
            const restError = error;
            if (restError.statusCode &&
                (restError.statusCode === 307 || // Temporary redirect
                    restError.statusCode === 308)) {
                // Permanent redirect
                this.numConsecutiveRedirects++;
                // To prevent circular redirects
                if (this.numConsecutiveRedirects < 10) {
                    if (restError.response && restError.response.headers) {
                        const location = restError.response.headers.get("location");
                        if (location) {
                            // Update sender URL
                            this.handlePermanentRedirect(location);
                            // Send to redirect endpoint as HTTPs library doesn't handle redirect automatically
                            return this.exportEnvelopes(envelopes);
                        }
                    }
                }
                else {
                    const redirectError = new Error("Circular redirect");
                    if (!this.isStatsbeatSender) {
                        (_g = this.networkStatsbeatMetrics) === null || _g === void 0 ? void 0 : _g.countException(redirectError);
                    }
                    return { code: core_1.ExportResultCode.FAILED, error: redirectError };
                }
            }
            else if (restError.statusCode &&
                (0, breezeUtils_js_1.isRetriable)(restError.statusCode) &&
                !this.isStatsbeatSender) {
                (_h = this.networkStatsbeatMetrics) === null || _h === void 0 ? void 0 : _h.countRetry(restError.statusCode);
                return this.persist(envelopes);
            }
            else if (restError.statusCode === 400 &&
                restError.message.includes("Invalid instrumentation key")) {
                // Invalid instrumentation key, shutdown statsbeat, fail silently
                this.shutdownStatsbeat();
                return { code: core_1.ExportResultCode.SUCCESS };
            }
            else if (restError.statusCode &&
                this.isStatsbeatSender &&
                (0, types_js_1.isStatsbeatShutdownStatus)(restError.statusCode)) {
                // If the status code is a shutdown status code for statsbeat, shutdown statsbeat and fail silently
                this.incrementStatsbeatFailure();
                return { code: core_1.ExportResultCode.SUCCESS };
            }
            if (this.isRetriableRestError(restError)) {
                if (restError.statusCode && !this.isStatsbeatSender) {
                    (_j = this.networkStatsbeatMetrics) === null || _j === void 0 ? void 0 : _j.countRetry(restError.statusCode);
                }
                if (!this.isStatsbeatSender) {
                    api_1.diag.error("Retrying due to transient client side error. Error message:", restError.message);
                }
                return this.persist(envelopes);
            }
            if (!this.isStatsbeatSender) {
                (_k = this.networkStatsbeatMetrics) === null || _k === void 0 ? void 0 : _k.countException(restError);
            }
            if (!this.isStatsbeatSender) {
                api_1.diag.error("Envelopes could not be exported and are not retriable. Error message:", restError.message);
            }
            return { code: core_1.ExportResultCode.FAILED, error: restError };
        }
    }
    /**
     * Persist envelopes to disk
     */
    async persist(envelopes) {
        var _a;
        try {
            const success = await this.persister.push(envelopes);
            return success
                ? { code: core_1.ExportResultCode.SUCCESS }
                : {
                    code: core_1.ExportResultCode.FAILED,
                    error: new Error("Failed to persist envelope in disk."),
                };
        }
        catch (ex) {
            if (!this.isStatsbeatSender) {
                (_a = this.networkStatsbeatMetrics) === null || _a === void 0 ? void 0 : _a.countWriteFailure();
            }
            return { code: core_1.ExportResultCode.FAILED, error: ex };
        }
    }
    /**
     * Disable collection of statsbeat metrics after max failures
     */
    incrementStatsbeatFailure() {
        this.statsbeatFailureCount++;
        if (this.statsbeatFailureCount > types_js_1.MAX_STATSBEAT_FAILURES) {
            this.shutdownStatsbeat();
        }
    }
    /**
     * Shutdown statsbeat metrics
     */
    shutdownStatsbeat() {
        var _a;
        if (this.networkStatsbeatMetrics) {
            this.networkStatsbeatMetrics.shutdown();
        }
        (_a = this.longIntervalStatsbeatMetrics) === null || _a === void 0 ? void 0 : _a.shutdown();
        this.statsbeatFailureCount = 0;
    }
    async sendFirstPersistedFile() {
        var _a;
        try {
            const envelopes = (await this.persister.shift());
            if (envelopes) {
                await this.send(envelopes);
            }
        }
        catch (err) {
            if (!this.isStatsbeatSender) {
                (_a = this.networkStatsbeatMetrics) === null || _a === void 0 ? void 0 : _a.countReadFailure();
            }
            api_1.diag.warn(`Failed to fetch persisted file`, err);
        }
    }
    isRetriableRestError(error) {
        const restErrorTypes = Object.values(Constants_js_1.RetriableRestErrorTypes);
        if (error && error.code && restErrorTypes.includes(error.code)) {
            return true;
        }
        return false;
    }
}
exports.BaseSender = BaseSender;
//# sourceMappingURL=baseSender.js.map