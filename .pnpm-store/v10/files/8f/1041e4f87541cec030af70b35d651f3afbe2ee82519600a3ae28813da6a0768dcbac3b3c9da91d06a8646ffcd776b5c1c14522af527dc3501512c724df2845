import * as Types from '../typebox';
export declare class ValueCreateUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCreateNeverTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCreateIntersectTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCreateTempateLiteralTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCreateDereferenceError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
}
export declare namespace ValueCreate {
    /** Creates a value from the given schema. If the schema specifies a default value, then that value is returned. */
    function Visit(schema: Types.TSchema, references: Types.TSchema[]): unknown;
    function Create<T extends Types.TSchema>(schema: T, references: Types.TSchema[]): Types.Static<T>;
}
