type BitsToBytes = {
    '8': 1;
    '16': 2;
    '32': 4;
    '64': 8;
    '128': 16;
};
export type Size<T extends string> = T extends `${'int' | 'uint' | 'float'}${infer bits}` ? bits extends keyof BitsToBytes ? BitsToBytes[bits] : never : never;
export declare const typeNames: readonly ["int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64", "int128", "uint128", "float32", "float64", "float128"];
export type Typename = (typeof typeNames)[number];
export type Valid = Typename | Capitalize<Typename> | 'char';
export declare const validNames: ("int8" | "uint8" | "int16" | "uint16" | "int32" | "uint32" | "int64" | "uint64" | "int128" | "uint128" | "float32" | "float64" | "float128" | "Int8" | "Uint8" | "Int16" | "Uint16" | "Int32" | "Uint32" | "Int64" | "Uint64" | "Int128" | "Uint128" | "Float32" | "Float64" | "Float128" | "char")[];
export declare const regex: RegExp;
export type Normalize<T extends Valid> = T extends 'char' ? 'uint8' : Uncapitalize<T>;
export declare function normalize<T extends Valid>(type: T): Normalize<T>;
export declare function isType(type: {
    toString(): string;
}): type is Typename;
export declare function isValid(type: {
    toString(): string;
}): type is Valid;
export declare function checkValid(type: {
    toString(): string;
}): asserts type is Valid;
export declare const mask64: bigint;
export {};
