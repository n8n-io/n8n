declare const __brand: unique symbol;
export type Unrecognized<T> = T & {
    [__brand]: "unrecognized";
};
declare function unrecognized<T>(value: T): Unrecognized<T>;
export declare function startCountingUnrecognized(): {
    /**
     * Ends counting and returns the delta.
     * @param delta - If provided, only this amount is added to the parent counter
     *   (used for nested unions where we only want to record the winning option's count).
     *   If not provided, records all counts since start().
     */
    end: (delta?: number) => number;
};
export { unrecognized };
//# sourceMappingURL=unrecognized.d.ts.map