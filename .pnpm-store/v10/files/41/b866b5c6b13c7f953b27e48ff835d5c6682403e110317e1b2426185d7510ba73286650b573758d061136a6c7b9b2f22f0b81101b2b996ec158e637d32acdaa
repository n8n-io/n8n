import * as types from '../../types';
import { wrap, unwrap, massWrap, massUnwrap } from '../../shimmer';
import { InstrumentationAbstract } from '../../instrumentation';
import { InstrumentationConfig } from '../../types';
/**
 * Base abstract class for instrumenting node plugins
 */
export declare abstract class InstrumentationBase<ConfigType extends InstrumentationConfig = InstrumentationConfig> extends InstrumentationAbstract<ConfigType> implements types.Instrumentation<ConfigType> {
    private _modules;
    private _hooks;
    private _requireInTheMiddleSingleton;
    private _enabled;
    constructor(instrumentationName: string, instrumentationVersion: string, config: ConfigType);
    protected _wrap: typeof wrap;
    protected _unwrap: typeof unwrap;
    protected _massWrap: typeof massWrap;
    protected _massUnwrap: typeof massUnwrap;
    private _warnOnPreloadedModules;
    private _extractPackageVersion;
    private _onRequire;
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
}
//# sourceMappingURL=instrumentation.d.ts.map