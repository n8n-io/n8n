export declare class FinalizationRegistryType<T> {
    constructor(finalize: (value: T) => void);
    register(target: object, value: T, token?: object): void;
    unregister(token: object): void;
}
export declare const REGISTRY_FINALIZE_AFTER = 10000;
export declare const REGISTRY_SWEEP_INTERVAL = 10000;
export declare class TimerBasedFinalizationRegistry<T> implements FinalizationRegistryType<T> {
    private readonly finalize;
    private registrations;
    private sweepTimeout;
    constructor(finalize: (value: T) => void);
    register(target: object, value: T, token?: object): void;
    unregister(token: unknown): void;
    sweep: (maxAge?: number) => void;
    finalizeAllImmediately: () => void;
    private scheduleSweep;
}
export declare const UniversalFinalizationRegistry: typeof FinalizationRegistryType;
