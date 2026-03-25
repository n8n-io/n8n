export type FlagValue = boolean | string | number | JsonValue;
export type FlagValueType = 'boolean' | 'string' | 'number' | 'object';
export type JsonArray = JsonValue[];
export type JsonObject = {
    [key: string]: JsonValue;
};
export type JsonValue = PrimitiveValue | JsonObject | JsonArray;
export type Metadata = Record<string, string>;
export type PrimitiveValue = null | boolean | string | number;
export type FlagMetadata = Record<string, string | number | boolean>;
export declare const StandardResolutionReasons: {
    readonly STATIC: "STATIC";
    readonly DEFAULT: "DEFAULT";
    readonly TARGETING_MATCH: "TARGETING_MATCH";
    readonly SPLIT: "SPLIT";
    readonly CACHED: "CACHED";
    readonly DISABLED: "DISABLED";
    readonly UNKNOWN: "UNKNOWN";
    readonly STALE: "STALE";
    readonly ERROR: "ERROR";
};
type ErrorCode = 'PROVIDER_NOT_READY' | 'PROVIDER_FATAL' | 'FLAG_NOT_FOUND' | 'PARSE_ERROR' | 'TYPE_MISMATCH' | 'TARGETING_KEY_MISSING' | 'INVALID_CONTEXT' | 'GENERAL';
export interface Logger {
    error(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    info(...args: unknown[]): void;
    debug(...args: unknown[]): void;
}
export type ResolutionReason = keyof typeof StandardResolutionReasons | (string & Record<never, never>);
export type EvaluationContextValue = PrimitiveValue | Date | {
    [key: string]: EvaluationContextValue;
} | EvaluationContextValue[];
export type EvaluationContext = {
    targetingKey?: string;
} & Record<string, EvaluationContextValue>;
export interface ProviderMetadata extends Readonly<Metadata> {
    readonly name: string;
}
export interface ClientMetadata {
    readonly name?: string;
    readonly domain?: string;
    readonly version?: string;
    readonly providerMetadata: ProviderMetadata;
}
export type HookHints = Readonly<Record<string, unknown>>;
export interface HookContext<T extends FlagValue = FlagValue> {
    readonly flagKey: string;
    readonly defaultValue: T;
    readonly flagValueType: FlagValueType;
    readonly context: Readonly<EvaluationContext>;
    readonly clientMetadata: ClientMetadata;
    readonly providerMetadata: ProviderMetadata;
    readonly logger: Logger;
}
export interface BeforeHookContext extends HookContext {
    context: EvaluationContext;
}
export type ResolutionDetails<U> = {
    value: U;
    variant?: string;
    flagMetadata?: FlagMetadata;
    reason?: ResolutionReason;
    errorCode?: ErrorCode;
    errorMessage?: string;
};
export type EvaluationDetails<T extends FlagValue> = {
    flagKey: string;
    flagMetadata: Readonly<FlagMetadata>;
} & ResolutionDetails<T>;
export interface BaseHook<T extends FlagValue = FlagValue, BeforeHookReturn = unknown, HooksReturn = unknown> {
    before?(hookContext: BeforeHookContext, hookHints?: HookHints): BeforeHookReturn;
    after?(hookContext: Readonly<HookContext<T>>, evaluationDetails: EvaluationDetails<T>, hookHints?: HookHints): HooksReturn;
    error?(hookContext: Readonly<HookContext<T>>, error: unknown, hookHints?: HookHints): HooksReturn;
    finally?(hookContext: Readonly<HookContext<T>>, hookHints?: HookHints): HooksReturn;
}
export type OpenFeatureHook = BaseHook<FlagValue, void, void>;
export {};
//# sourceMappingURL=types.d.ts.map
