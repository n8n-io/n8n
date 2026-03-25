/// <reference types="node" />
import { MetricReader } from '@opentelemetry/sdk-metrics';
import { IncomingMessage, ServerResponse } from 'http';
import { ExporterConfig } from './export/types';
export declare class PrometheusExporter extends MetricReader {
    static readonly DEFAULT_OPTIONS: {
        host: undefined;
        port: number;
        endpoint: string;
        prefix: string;
        appendTimestamp: boolean;
        withResourceConstantLabels: undefined;
    };
    private readonly _host?;
    private readonly _port;
    private readonly _baseUrl;
    private readonly _endpoint;
    private readonly _server;
    private readonly _prefix?;
    private readonly _appendTimestamp;
    private _serializer;
    private _startServerPromise;
    /**
     * Constructor
     * @param config Exporter configuration
     * @param callback Callback to be called after a server was started
     */
    constructor(config?: ExporterConfig, callback?: (error: Error | void) => void);
    onForceFlush(): Promise<void>;
    /**
     * Shuts down the export server and clears the registry
     */
    onShutdown(): Promise<void>;
    /**
     * Stops the Prometheus export server
     */
    stopServer(): Promise<void>;
    /**
     * Starts the Prometheus export server
     */
    startServer(): Promise<void>;
    /**
     * Request handler that responds with the current state of metrics
     * @param _request Incoming HTTP request of server instance
     * @param response HTTP response object used to response to request
     */
    getMetricsRequestHandler(_request: IncomingMessage, response: ServerResponse): void;
    /**
     * Request handler used by http library to respond to incoming requests
     * for the current state of metrics by the Prometheus backend.
     *
     * @param request Incoming HTTP request to export server
     * @param response HTTP response object used to respond to request
     */
    private _requestHandler;
    /**
     * Responds to incoming message with current state of all metrics.
     */
    private _exportMetrics;
    /**
     * Responds with 404 status code to all requests that do not match the configured endpoint.
     */
    private _notFound;
}
//# sourceMappingURL=PrometheusExporter.d.ts.map