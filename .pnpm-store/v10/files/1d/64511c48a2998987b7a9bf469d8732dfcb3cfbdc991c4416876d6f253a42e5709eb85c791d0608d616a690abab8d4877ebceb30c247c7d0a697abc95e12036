export declare enum SelectorType {
    ENV = "env",
    CONFIG = "shared config entry"
}
/**
 * Returns undefined, if obj[key] is not defined.
 * Returns string value, if the string is defined in obj[key] and it's uppercase matches union value.
 * Throws error for all other cases.
 *
 * @internal
 */
export declare const stringUnionSelector: <U extends object, K extends keyof U>(obj: Record<string, string | undefined>, key: string, union: U, type: SelectorType) => U[K] | undefined;
