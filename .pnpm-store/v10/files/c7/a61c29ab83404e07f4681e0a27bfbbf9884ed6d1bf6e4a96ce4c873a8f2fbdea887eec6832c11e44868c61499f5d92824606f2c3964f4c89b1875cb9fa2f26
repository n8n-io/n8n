import { ExportResult } from '@opentelemetry/core';
import { SpanExporter, ReadableSpan } from '@opentelemetry/sdk-trace-base';
import * as zipkinTypes from './types';
/**
 * Zipkin Exporter
 */
export declare class ZipkinExporter implements SpanExporter {
    private readonly DEFAULT_SERVICE_NAME;
    private readonly _statusCodeTagName;
    private readonly _statusDescriptionTagName;
    private _urlStr;
    private _send;
    private _getHeaders;
    private _serviceName?;
    private _isShutdown;
    private _sendingPromises;
    constructor(config?: zipkinTypes.ExporterConfig);
    /**
     * Export spans.
     */
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void;
    /**
     * Shutdown exporter. Noop operation in this exporter.
     */
    shutdown(): Promise<void>;
    /**
     * Exports any pending spans in exporter
     */
    forceFlush(): Promise<void>;
    /**
     * if user defines getExportRequestHeaders in config then this will be called
     * every time before send, otherwise it will be replaced with noop in
     * constructor
     * @default noop
     */
    private _beforeSend;
    /**
     * Transform spans and sends to Zipkin service.
     */
    private _sendSpans;
}
//# sourceMappingURL=zipkin.d.ts.map