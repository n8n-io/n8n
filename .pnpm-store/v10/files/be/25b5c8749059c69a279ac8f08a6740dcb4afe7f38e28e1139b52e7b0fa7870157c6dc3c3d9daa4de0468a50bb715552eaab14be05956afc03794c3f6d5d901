import type { RunTreeConfig } from "../index.js";
export declare const _wrapClient: <T extends object>(sdk: T, runName: string, options?: Omit<RunTreeConfig, "name">) => T;
type WrapSDKOptions = Partial<RunTreeConfig & {
    /**
     * @deprecated Use `name` instead.
     */
    runName: string;
}>;
/**
 * Wrap an arbitrary SDK, enabling automatic LangSmith tracing.
 * Method signatures are unchanged.
 *
 * Note that this will wrap and trace ALL SDK methods, not just
 * LLM completion methods. If the passed SDK contains other methods,
 * we recommend using the wrapped instance for LLM calls only.
 * @param sdk An arbitrary SDK instance.
 * @param options LangSmith options.
 * @returns
 */
export declare const wrapSDK: <T extends object>(sdk: T, options?: WrapSDKOptions) => T;
export {};
