import { ExpressInstrumentationConfig, ExpressRequestInfo } from './types';
import { InstrumentationBase, InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
/** Express instrumentation for OpenTelemetry */
export declare class ExpressInstrumentation extends InstrumentationBase<ExpressInstrumentationConfig> {
    constructor(config?: ExpressInstrumentationConfig);
    init(): InstrumentationNodeModuleDefinition[];
    /**
     * Get the patch for Router.route function
     */
    private _getRoutePatch;
    /**
     * Get the patch for Router.use function
     */
    private _getRouterUsePatch;
    /**
     * Get the patch for Application.use function
     */
    private _getAppUsePatch;
    /** Patch each express layer to create span and propagate context */
    private _applyPatch;
    _getSpanName(info: ExpressRequestInfo, defaultName: string): string;
}
//# sourceMappingURL=instrumentation.d.ts.map