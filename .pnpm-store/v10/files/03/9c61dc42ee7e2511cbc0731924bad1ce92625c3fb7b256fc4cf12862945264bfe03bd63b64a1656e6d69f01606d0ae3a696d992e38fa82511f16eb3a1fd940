import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { RedisInstrumentationConfig } from '../types';
export declare class RedisInstrumentationV2_V3 extends InstrumentationBase<RedisInstrumentationConfig> {
    static readonly COMPONENT = "redis";
    private _semconvStability;
    constructor(config?: RedisInstrumentationConfig);
    setConfig(config?: RedisInstrumentationConfig): void;
    protected init(): InstrumentationNodeModuleDefinition[];
    /**
     * Patch internal_send_command(...) to trace requests
     */
    private _getPatchInternalSendCommand;
    private _getPatchCreateClient;
    private _getPatchCreateStream;
}
//# sourceMappingURL=instrumentation.d.ts.map