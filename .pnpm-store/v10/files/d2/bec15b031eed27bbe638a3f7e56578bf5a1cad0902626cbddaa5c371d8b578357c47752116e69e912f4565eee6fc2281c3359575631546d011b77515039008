export * from './system.js';
interface WriteableSignal<T> {
    (): T;
    (value: T): void;
}
export declare function startBatch(): void;
export declare function endBatch(): void;
export declare function pauseTracking(): void;
export declare function resumeTracking(): void;
export declare function signal<T>(): WriteableSignal<T | undefined>;
export declare function signal<T>(oldValue: T): WriteableSignal<T>;
export declare function computed<T>(getter: (cachedValue?: T) => T): () => T;
export declare function effect<T>(fn: () => T): () => void;
export declare function effectScope<T>(fn: () => T): () => void;
