import { type Context } from '@opentelemetry/api';
import type { ReadableSpan, SpanProcessor, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { PerRequestSpanProcessorConfiguration } from '../configuration';
/**
 * Buffers spans per trace and exports once the request completes.
 * Token is not stored; we export under the saved request Context so that getExportToken()
 * can read the token from the active OpenTelemetry Context at export time.
 */
export declare class PerRequestSpanProcessor implements SpanProcessor {
    private readonly exporter;
    private traces;
    private sweepTimer?;
    private isSweeping;
    private readonly maxBufferedTraces;
    private readonly maxSpansPerTrace;
    private readonly maxConcurrentExports;
    private readonly flushGraceMs;
    private readonly maxTraceAgeMs;
    private inFlightExports;
    private exportWaiters;
    /**
     * Construct a PerRequestSpanProcessor.
     * @param exporter The span exporter to use.
     * @param configProvider Optional configuration provider. Defaults to defaultPerRequestSpanProcessorConfigurationProvider if not specified.
     */
    constructor(exporter: SpanExporter, configProvider?: IConfigurationProvider<PerRequestSpanProcessorConfiguration>);
    onStart(span: ReadableSpan, ctx: Context): void;
    onEnd(span: ReadableSpan): void;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
    private ensureSweepTimer;
    private stopSweepTimerIfIdle;
    private sweep;
    private flushTrace;
    private acquireExportSlot;
    private releaseExportSlot;
}
//# sourceMappingURL=PerRequestSpanProcessor.d.ts.map