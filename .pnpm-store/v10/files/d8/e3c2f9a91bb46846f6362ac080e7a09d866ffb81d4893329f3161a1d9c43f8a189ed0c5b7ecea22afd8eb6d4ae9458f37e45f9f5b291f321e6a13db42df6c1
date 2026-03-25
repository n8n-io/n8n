import { InstrumentationBase, InstrumentationModuleDefinition } from '@opentelemetry/instrumentation';
import { RedisInstrumentationConfig } from './types';
import { TracerProvider } from '@opentelemetry/api';
export declare class RedisInstrumentation extends InstrumentationBase<RedisInstrumentationConfig> {
    private instrumentationV2_V3;
    private instrumentationV4_V5;
    private initialized;
    constructor(config?: RedisInstrumentationConfig);
    setConfig(config?: RedisInstrumentationConfig): void;
    init(): void;
    getModuleDefinitions(): InstrumentationModuleDefinition[];
    setTracerProvider(tracerProvider: TracerProvider): void;
    enable(): void;
    disable(): void;
}
//# sourceMappingURL=redis.d.ts.map