import type { ContextManager } from '@opentelemetry/api';
import { TextMapPropagator } from '@opentelemetry/api';
import { Instrumentation } from '@opentelemetry/instrumentation';
import { Resource, ResourceDetector } from '@opentelemetry/resources';
import { LogRecordProcessor } from '@opentelemetry/sdk-logs';
import { IMetricReader, ViewOptions } from '@opentelemetry/sdk-metrics';
import { Sampler, SpanExporter, SpanLimits, SpanProcessor, IdGenerator } from '@opentelemetry/sdk-trace-base';
export interface NodeSDKConfiguration {
    autoDetectResources: boolean;
    contextManager: ContextManager;
    textMapPropagator: TextMapPropagator;
    /** @deprecated use logRecordProcessors instead*/
    logRecordProcessor: LogRecordProcessor;
    logRecordProcessors?: LogRecordProcessor[];
    /** @deprecated use metricReaders instead*/
    metricReader: IMetricReader;
    metricReaders?: IMetricReader[];
    views: ViewOptions[];
    instrumentations: (Instrumentation | Instrumentation[])[];
    resource: Resource;
    resourceDetectors: Array<ResourceDetector>;
    sampler: Sampler;
    serviceName?: string;
    /** @deprecated use spanProcessors instead*/
    spanProcessor?: SpanProcessor;
    spanProcessors?: SpanProcessor[];
    traceExporter: SpanExporter;
    spanLimits: SpanLimits;
    idGenerator: IdGenerator;
}
//# sourceMappingURL=types.d.ts.map