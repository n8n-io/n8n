import { TracerProvider, Tracer as ApiTracer } from '@opentelemetry/api';
import { TracerConfig } from './types';
export declare enum ForceFlushState {
    'resolved' = 0,
    'timeout' = 1,
    'error' = 2,
    'unresolved' = 3
}
/**
 * This class represents a basic tracer provider which platform libraries can extend
 */
export declare class BasicTracerProvider implements TracerProvider {
    private readonly _config;
    private readonly _tracers;
    private readonly _resource;
    private readonly _activeSpanProcessor;
    constructor(config?: TracerConfig);
    getTracer(name: string, version?: string, options?: {
        schemaUrl?: string;
    }): ApiTracer;
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=BasicTracerProvider.d.ts.map