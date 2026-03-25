export type NoInfer<A extends any> = [A][A extends any ? 0 : never];
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export declare function memo<TDeps extends ReadonlyArray<any>, TResult>(getDeps: () => [...TDeps], fn: (...args: NoInfer<[...TDeps]>) => TResult, opts: {
    key: false | string;
    debug?: () => boolean;
    onChange?: (result: TResult) => void;
    initialDeps?: TDeps;
}): {
    (): TResult;
    updateDeps(newDeps: [...TDeps]): void;
};
export declare function notUndefined<T>(value: T | undefined, msg?: string): T;
export declare const approxEqual: (a: number, b: number) => boolean;
export declare const debounce: (targetWindow: Window & typeof globalThis, fn: Function, ms: number) => (this: any, ...args: Array<any>) => void;
