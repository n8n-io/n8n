import * as Types from '../typebox';
export declare class ValueCheckUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare namespace ValueCheck {
    function Check<T extends Types.TSchema, R extends Types.TSchema[]>(schema: T, references: [...R], value: any): boolean;
}
