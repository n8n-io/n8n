import * as Types from '../typebox';
export declare class ValueConvertUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueConvertDereferenceError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
}
export declare namespace ValueConvert {
    function Visit(schema: Types.TSchema, references: Types.TSchema[], value: any): unknown;
    function Convert<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): unknown;
}
