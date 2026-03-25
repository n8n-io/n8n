declare const __brand: unique symbol;
export type Unrecognized<T> = T & {
    [__brand]: "unrecognized";
};
export declare function catchUnrecognizedEnum<T>(value: T): Unrecognized<T>;
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type ClosedEnum<T> = T[keyof T];
export type OpenEnum<T> = Prettify<T[keyof T]> | Unrecognized<T[keyof T] extends number ? number : string>;
export {};
//# sourceMappingURL=enums.d.ts.map