import * as Types from '../typebox';
export declare class ValueCheckUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueCheckDereferenceError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
}
export declare namespace ValueCheck {
    function Check<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): boolean;
}
