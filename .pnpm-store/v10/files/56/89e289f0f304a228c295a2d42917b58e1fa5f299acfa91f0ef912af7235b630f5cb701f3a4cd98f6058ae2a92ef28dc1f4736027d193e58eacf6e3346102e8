import type { ExportResult } from '@opentelemetry/core';
import type { IExporterTransport } from './exporter-transport';
import type { IExportPromiseHandler } from './bounded-queue-export-promise-handler';
import type { ISerializer } from '@opentelemetry/otlp-transformer';
/**
 * Internally shared export logic for OTLP.
 */
export interface IOtlpExportDelegate<Internal> {
    export(internalRepresentation: Internal, resultCallback: (result: ExportResult) => void): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
/**
 * Creates a generic delegate for OTLP exports which only contains parts of the OTLP export that are shared across all
 * signals.
 */
export declare function createOtlpExportDelegate<Internal, Response>(components: {
    transport: IExporterTransport;
    serializer: ISerializer<Internal, Response>;
    promiseHandler: IExportPromiseHandler;
}, settings: {
    timeout: number;
}): IOtlpExportDelegate<Internal>;
//# sourceMappingURL=otlp-export-delegate.d.ts.map