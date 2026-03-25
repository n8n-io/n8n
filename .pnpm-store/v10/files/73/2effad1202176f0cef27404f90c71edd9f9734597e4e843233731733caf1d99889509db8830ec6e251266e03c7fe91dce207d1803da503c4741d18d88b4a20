import { InstrumentationBase, type InstrumentationConfig, type InstrumentationModuleDefinition } from '@opentelemetry/instrumentation';
import type { LangChainOptions } from '@sentry/core';
type LangChainInstrumentationOptions = InstrumentationConfig & LangChainOptions;
/**
 * Sentry LangChain instrumentation using OpenTelemetry.
 */
export declare class SentryLangChainInstrumentation extends InstrumentationBase<LangChainInstrumentationOptions> {
    constructor(config?: LangChainInstrumentationOptions);
    /**
     * Initializes the instrumentation by defining the modules to be patched.
     * We patch the BaseChatModel class methods to inject callbacks
     *
     * We hook into provider packages (@langchain/anthropic, @langchain/openai, etc.)
     * because @langchain/core is often bundled and not loaded as a separate module
     */
    init(): InstrumentationModuleDefinition | InstrumentationModuleDefinition[];
    /**
     * Core patch logic - patches chat model methods to inject Sentry callbacks
     * This is called when a LangChain provider package is loaded
     */
    private _patch;
    /**
     * Patches chat model methods (invoke, stream, batch) to inject Sentry callbacks
     * Finds a chat model class from the provider package exports and patches its prototype methods
     */
    private _patchRunnableMethods;
}
export {};
//# sourceMappingURL=instrumentation.d.ts.map