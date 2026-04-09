import { OTLPExporterBase } from '../../OTLPExporterBase';
import { OTLPExporterConfigBase, OTLPExporterError } from '../../types';
import { ISerializer } from '@opentelemetry/otlp-transformer';
/**
 * Collector Metric Exporter abstract base class
 */
export declare abstract class OTLPExporterBrowserBase<ExportItem, ServiceResponse> extends OTLPExporterBase<OTLPExporterConfigBase, ExportItem> {
    private _serializer;
    private _transport;
    /**
     * @param config
     * @param serializer
     * @param contentType
     */
    constructor(config: OTLPExporterConfigBase | undefined, serializer: ISerializer<ExportItem[], ServiceResponse>, contentType: string);
    onInit(): void;
    onShutdown(): void;
    send(objects: ExportItem[], onSuccess: () => void, onError: (error: OTLPExporterError) => void): void;
}
//# sourceMappingURL=OTLPExporterBrowserBase.d.ts.map