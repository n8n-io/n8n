import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import { InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { TracerProvider } from '@opentelemetry/api';

declare type Config = PrismaInstrumentationConfig & InstrumentationConfig;

export declare class PrismaInstrumentation extends InstrumentationBase {
    private tracerProvider;
    constructor(config?: Config);
    setTracerProvider(tracerProvider: TracerProvider): void;
    init(): InstrumentationNodeModuleDefinition[];
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
}

declare interface PrismaInstrumentationConfig {
    ignoreSpanTypes?: (string | RegExp)[];
}

export { registerInstrumentations }

export { }
