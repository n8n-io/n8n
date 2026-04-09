export * from './system.js';
export declare let batchDepth: number;
export declare function startBatch(): void;
export declare function endBatch(): void;
export declare function pauseTracking(): void;
export declare function resumeTracking(): void;
export declare function signal<T>(): {
    (): T | undefined;
    (value: T | undefined): void;
};
export declare function signal<T>(initialValue: T): {
    (): T;
    (value: T): void;
};
export declare function computed<T>(getter: (previousValue?: T) => T): () => T;
export declare function effect<T>(fn: () => T): () => void;
export declare function effectScope<T>(fn: () => T): () => void;
