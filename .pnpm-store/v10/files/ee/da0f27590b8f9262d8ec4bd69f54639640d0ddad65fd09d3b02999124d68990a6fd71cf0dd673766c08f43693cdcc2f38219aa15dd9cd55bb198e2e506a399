import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { RedisInstrumentationConfig } from '../types';
export declare class RedisInstrumentationV4_V5 extends InstrumentationBase<RedisInstrumentationConfig> {
    static readonly COMPONENT = "redis";
    private _semconvStability;
    constructor(config?: RedisInstrumentationConfig);
    setConfig(config?: RedisInstrumentationConfig): void;
    protected init(): InstrumentationNodeModuleDefinition[];
    private _getInstrumentationNodeModuleDefinition;
    private _getPatchExtendWithCommands;
    private _getPatchMultiCommandsExec;
    private _getPatchMultiCommandsAddCommand;
    private _getPatchRedisClientMulti;
    private _getPatchRedisClientSendCommand;
    private _getPatchedClientConnect;
    private _traceClientCommand;
    private _endSpansWithRedisReplies;
    private _endSpanWithResponse;
}
//# sourceMappingURL=instrumentation.d.ts.map