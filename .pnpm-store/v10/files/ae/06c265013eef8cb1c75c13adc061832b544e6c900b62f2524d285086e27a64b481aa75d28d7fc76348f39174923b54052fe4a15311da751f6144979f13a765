"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOtlpExportDelegate = void 0;
const core_1 = require("@opentelemetry/core");
const types_1 = require("./types");
const logging_response_handler_1 = require("./logging-response-handler");
const api_1 = require("@opentelemetry/api");
class OTLPExportDelegate {
    _diagLogger;
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    constructor(transport, serializer, responseHandler, promiseQueue, timeout) {
        this._transport = transport;
        this._serializer = serializer;
        this._responseHandler = responseHandler;
        this._promiseQueue = promiseQueue;
        this._timeout = timeout;
        this._diagLogger = api_1.diag.createComponentLogger({
            namespace: 'OTLPExportDelegate',
        });
    }
    export(internalRepresentation, resultCallback) {
        this._diagLogger.debug('items to be sent', internalRepresentation);
        // don't do any work if too many exports are in progress.
        if (this._promiseQueue.hasReachedLimit()) {
            resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Concurrent export limit reached'),
            });
            return;
        }
        const serializedRequest = this._serializer.serializeRequest(internalRepresentation);
        if (serializedRequest == null) {
            resultCallback({
                code: core_1.ExportResultCode.FAILED,
                error: new Error('Nothing to send'),
            });
            return;
        }
        this._promiseQueue.pushPromise(this._transport.send(serializedRequest, this._timeout).then(response => {
            if (response.status === 'success') {
                if (response.data != null) {
                    try {
                        this._responseHandler.handleResponse(this._serializer.deserializeResponse(response.data));
                    }
                    catch (e) {
                        this._diagLogger.warn('Export succeeded but could not deserialize response - is the response specification compliant?', e, response.data);
                    }
                }
                // No matter the response, we can consider the export still successful.
                resultCallback({
                    code: core_1.ExportResultCode.SUCCESS,
                });
                return;
            }
            else if (response.status === 'failure' && response.error) {
                resultCallback({
                    code: core_1.ExportResultCode.FAILED,
                    error: response.error,
                });
                return;
            }
            else if (response.status === 'retryable') {
                resultCallback({
                    code: core_1.ExportResultCode.FAILED,
                    error: response.error ??
                        new types_1.OTLPExporterError('Export failed with retryable status'),
                });
            }
            else {
                resultCallback({
                    code: core_1.ExportResultCode.FAILED,
                    error: new types_1.OTLPExporterError('Export failed with unknown error'),
                });
            }
        }, reason => resultCallback({
            code: core_1.ExportResultCode.FAILED,
            error: reason,
        })));
    }
    forceFlush() {
        return this._promiseQueue.awaitAll();
    }
    async shutdown() {
        this._diagLogger.debug('shutdown started');
        await this.forceFlush();
        this._transport.shutdown();
    }
}
/**
 * Creates a generic delegate for OTLP exports which only contains parts of the OTLP export that are shared across all
 * signals.
 */
function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(components.transport, components.serializer, (0, logging_response_handler_1.createLoggingPartialSuccessResponseHandler)(), components.promiseHandler, settings.timeout);
}
exports.createOtlpExportDelegate = createOtlpExportDelegate;
//# sourceMappingURL=otlp-export-delegate.js.map