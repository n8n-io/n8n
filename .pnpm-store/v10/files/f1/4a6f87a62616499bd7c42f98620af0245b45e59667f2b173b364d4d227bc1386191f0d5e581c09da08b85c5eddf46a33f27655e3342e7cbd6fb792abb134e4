// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { diag } from "@opentelemetry/api";
import { FileSystemPersist } from "./persist/index.js";
import { ExportResultCode } from "@opentelemetry/core";
import { NetworkStatsbeatMetrics } from "../../export/statsbeat/networkStatsbeatMetrics.js";
import { LongIntervalStatsbeatMetrics } from "../../export/statsbeat/longIntervalStatsbeatMetrics.js";
import { MAX_STATSBEAT_FAILURES, isStatsbeatShutdownStatus } from "../../export/statsbeat/types.js";
import { isRetriable } from "../../utils/breezeUtils.js";
import { RetriableRestErrorTypes } from "../../Declarations/Constants.js";
const DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS = 60000;
/**
 * Base sender class
 * @internal
 */
export class BaseSender {
    constructor(options) {
        this.statsbeatFailureCount = 0;
        this.batchSendRetryIntervalMs = DEFAULT_BATCH_SEND_RETRY_INTERVAL_MS;
        this.numConsecutiveRedirects = 0;
        this.disableOfflineStorage = options.exporterOptions.disableOfflineStorage || false;
        this.persister = new FileSystemPersist(options.instrumentationKey, options.exporterOptions);
        if (options.trackStatsbeat) {
            this.networkStatsbeatMetrics = NetworkStatsbeatMetrics.getInstance({
                instrumentationKey: options.instrumentationKey,
                endpointUrl: options.endpointUrl,
                disableOfflineStorage: this.disableOfflineStorage,
            });
            this.longIntervalStatsbeatMetrics = LongIntervalStatsbeatMetrics.getInstance({
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
        diag.info(`Exporting ${envelopes.length} envelope(s)`);
        if (envelopes.length < 1) {
            return { code: ExportResultCode.SUCCESS };
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
                return { code: ExportResultCode.SUCCESS };
            }
            else if (statusCode && isRetriable(statusCode)) {
                // Failed -- persist failed data
                if (statusCode === 429 || statusCode === 439) {
                    if (!this.isStatsbeatSender) {
                        (_b = this.networkStatsbeatMetrics) === null || _b === void 0 ? void 0 : _b.countThrottle(statusCode);
                    }
                    return {
                        code: ExportResultCode.SUCCESS,
                    };
                }
                if (result) {
                    diag.info(result);
                    const breezeResponse = JSON.parse(result);
                    const filteredEnvelopes = [];
                    // If we have a partial success, count the succeeded envelopes
                    if (breezeResponse.itemsAccepted > 0 && statusCode === 206 && !this.isStatsbeatSender) {
                        (_c = this.networkStatsbeatMetrics) === null || _c === void 0 ? void 0 : _c.countSuccess(duration);
                    }
                    // Figure out if we need to either retry or count failures
                    if (breezeResponse.errors) {
                        breezeResponse.errors.forEach((error) => {
                            if (error.statusCode && isRetriable(error.statusCode)) {
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
                        code: ExportResultCode.FAILED,
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
                    code: ExportResultCode.FAILED,
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
                    return { code: ExportResultCode.FAILED, error: redirectError };
                }
            }
            else if (restError.statusCode &&
                isRetriable(restError.statusCode) &&
                !this.isStatsbeatSender) {
                (_h = this.networkStatsbeatMetrics) === null || _h === void 0 ? void 0 : _h.countRetry(restError.statusCode);
                return this.persist(envelopes);
            }
            else if (restError.statusCode === 400 &&
                restError.message.includes("Invalid instrumentation key")) {
                // Invalid instrumentation key, shutdown statsbeat, fail silently
                this.shutdownStatsbeat();
                return { code: ExportResultCode.SUCCESS };
            }
            else if (restError.statusCode &&
                this.isStatsbeatSender &&
                isStatsbeatShutdownStatus(restError.statusCode)) {
                // If the status code is a shutdown status code for statsbeat, shutdown statsbeat and fail silently
                this.incrementStatsbeatFailure();
                return { code: ExportResultCode.SUCCESS };
            }
            if (this.isRetriableRestError(restError)) {
                if (restError.statusCode && !this.isStatsbeatSender) {
                    (_j = this.networkStatsbeatMetrics) === null || _j === void 0 ? void 0 : _j.countRetry(restError.statusCode);
                }
                if (!this.isStatsbeatSender) {
                    diag.error("Retrying due to transient client side error. Error message:", restError.message);
                }
                return this.persist(envelopes);
            }
            if (!this.isStatsbeatSender) {
                (_k = this.networkStatsbeatMetrics) === null || _k === void 0 ? void 0 : _k.countException(restError);
            }
            if (!this.isStatsbeatSender) {
                diag.error("Envelopes could not be exported and are not retriable. Error message:", restError.message);
            }
            return { code: ExportResultCode.FAILED, error: restError };
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
                ? { code: ExportResultCode.SUCCESS }
                : {
                    code: ExportResultCode.FAILED,
                    error: new Error("Failed to persist envelope in disk."),
                };
        }
        catch (ex) {
            if (!this.isStatsbeatSender) {
                (_a = this.networkStatsbeatMetrics) === null || _a === void 0 ? void 0 : _a.countWriteFailure();
            }
            return { code: ExportResultCode.FAILED, error: ex };
        }
    }
    /**
     * Disable collection of statsbeat metrics after max failures
     */
    incrementStatsbeatFailure() {
        this.statsbeatFailureCount++;
        if (this.statsbeatFailureCount > MAX_STATSBEAT_FAILURES) {
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
            diag.warn(`Failed to fetch persisted file`, err);
        }
    }
    isRetriableRestError(error) {
        const restErrorTypes = Object.values(RetriableRestErrorTypes);
        if (error && error.code && restErrorTypes.includes(error.code)) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=baseSender.js.map