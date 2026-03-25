import { ExportResult } from '@opentelemetry/core';
import { IOtlpExportDelegate } from './otlp-export-delegate';
export declare class OTLPExporterBase<Internal> {
    private _delegate;
    constructor(_delegate: IOtlpExportDelegate<Internal>);
    /**
     * Export items.
     * @param items
     * @param resultCallback
     */
    export(items: Internal, resultCallback: (result: ExportResult) => void): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=OTLPExporterBase.d.ts.map