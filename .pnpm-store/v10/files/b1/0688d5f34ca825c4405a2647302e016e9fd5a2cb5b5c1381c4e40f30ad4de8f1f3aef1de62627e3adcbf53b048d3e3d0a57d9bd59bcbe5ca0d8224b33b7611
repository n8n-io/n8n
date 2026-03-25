"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusExporter = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const http_1 = require("http");
const PrometheusSerializer_1 = require("./PrometheusSerializer");
/** Node.js v8.x compat */
const url_1 = require("url");
class PrometheusExporter extends sdk_metrics_1.MetricReader {
    static DEFAULT_OPTIONS = {
        host: undefined,
        port: 9464,
        endpoint: '/metrics',
        prefix: '',
        appendTimestamp: false,
        withResourceConstantLabels: undefined,
    };
    _host;
    _port;
    _baseUrl;
    _endpoint;
    _server;
    _prefix;
    _appendTimestamp;
    _serializer;
    _startServerPromise;
    // This will be required when histogram is implemented. Leaving here so it is not forgotten
    // Histogram cannot have a attribute named 'le'
    // private static readonly RESERVED_HISTOGRAM_LABEL = 'le';
    /**
     * Constructor
     * @param config Exporter configuration
     * @param callback Callback to be called after a server was started
     */
    constructor(config = {}, callback = () => { }) {
        super({
            aggregationSelector: _instrumentType => {
                return {
                    type: sdk_metrics_1.AggregationType.DEFAULT,
                };
            },
            aggregationTemporalitySelector: _instrumentType => sdk_metrics_1.AggregationTemporality.CUMULATIVE,
            metricProducers: config.metricProducers,
        });
        this._host =
            config.host ||
                process.env.OTEL_EXPORTER_PROMETHEUS_HOST ||
                PrometheusExporter.DEFAULT_OPTIONS.host;
        this._port =
            config.port ||
                Number(process.env.OTEL_EXPORTER_PROMETHEUS_PORT) ||
                PrometheusExporter.DEFAULT_OPTIONS.port;
        this._prefix = config.prefix || PrometheusExporter.DEFAULT_OPTIONS.prefix;
        this._appendTimestamp =
            typeof config.appendTimestamp === 'boolean'
                ? config.appendTimestamp
                : PrometheusExporter.DEFAULT_OPTIONS.appendTimestamp;
        const _withResourceConstantLabels = config.withResourceConstantLabels ||
            PrometheusExporter.DEFAULT_OPTIONS.withResourceConstantLabels;
        // unref to prevent prometheus exporter from holding the process open on exit
        this._server = (0, http_1.createServer)(this._requestHandler).unref();
        this._serializer = new PrometheusSerializer_1.PrometheusSerializer(this._prefix, this._appendTimestamp, _withResourceConstantLabels);
        this._baseUrl = `http://${this._host}:${this._port}/`;
        this._endpoint = (config.endpoint || PrometheusExporter.DEFAULT_OPTIONS.endpoint).replace(/^([^/])/, '/$1');
        if (config.preventServerStart !== true) {
            this.startServer().then(callback, err => {
                api_1.diag.error(err);
                callback(err);
            });
        }
        else if (callback) {
            // Do not invoke callback immediately to avoid zalgo problem.
            queueMicrotask(callback);
        }
    }
    async onForceFlush() {
        /** do nothing */
    }
    /**
     * Shuts down the export server and clears the registry
     */
    onShutdown() {
        return this.stopServer();
    }
    /**
     * Stops the Prometheus export server
     */
    stopServer() {
        if (!this._server) {
            api_1.diag.debug('Prometheus stopServer() was called but server was never started.');
            return Promise.resolve();
        }
        else {
            return new Promise(resolve => {
                this._server.close(err => {
                    if (!err) {
                        api_1.diag.debug('Prometheus exporter was stopped');
                    }
                    else {
                        if (err.code !==
                            'ERR_SERVER_NOT_RUNNING') {
                            (0, core_1.globalErrorHandler)(err);
                        }
                    }
                    resolve();
                });
            });
        }
    }
    /**
     * Starts the Prometheus export server
     */
    startServer() {
        this._startServerPromise ??= new Promise((resolve, reject) => {
            this._server.once('error', reject);
            this._server.listen({
                port: this._port,
                host: this._host,
            }, () => {
                api_1.diag.debug(`Prometheus exporter server started: ${this._host}:${this._port}/${this._endpoint}`);
                resolve();
            });
        });
        return this._startServerPromise;
    }
    /**
     * Request handler that responds with the current state of metrics
     * @param _request Incoming HTTP request of server instance
     * @param response HTTP response object used to response to request
     */
    getMetricsRequestHandler(_request, response) {
        this._exportMetrics(response);
    }
    /**
     * Request handler used by http library to respond to incoming requests
     * for the current state of metrics by the Prometheus backend.
     *
     * @param request Incoming HTTP request to export server
     * @param response HTTP response object used to respond to request
     */
    _requestHandler = (request, response) => {
        if (request.url != null &&
            new url_1.URL(request.url, this._baseUrl).pathname === this._endpoint) {
            this._exportMetrics(response);
        }
        else {
            this._notFound(response);
        }
    };
    /**
     * Responds to incoming message with current state of all metrics.
     */
    _exportMetrics = (response) => {
        response.statusCode = 200;
        response.setHeader('content-type', 'text/plain');
        this.collect().then(collectionResult => {
            const { resourceMetrics, errors } = collectionResult;
            if (errors.length) {
                api_1.diag.error('PrometheusExporter: metrics collection errors', ...errors);
            }
            response.end(this._serializer.serialize(resourceMetrics));
        }, err => {
            response.end(`# failed to export metrics: ${err}`);
        });
    };
    /**
     * Responds with 404 status code to all requests that do not match the configured endpoint.
     */
    _notFound = (response) => {
        response.statusCode = 404;
        response.end();
    };
}
exports.PrometheusExporter = PrometheusExporter;
//# sourceMappingURL=PrometheusExporter.js.map