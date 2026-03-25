import * as Types from '../typebox';
export declare enum ValueErrorType {
    Array = 0,
    ArrayMinItems = 1,
    ArrayMaxItems = 2,
    ArrayUniqueItems = 3,
    Boolean = 4,
    Date = 5,
    DateExclusiveMinimumTimestamp = 6,
    DateExclusiveMaximumTimestamp = 7,
    DateMinimumTimestamp = 8,
    DateMaximumTimestamp = 9,
    Function = 10,
    Integer = 11,
    IntegerMultipleOf = 12,
    IntegerExclusiveMinimum = 13,
    IntegerExclusiveMaximum = 14,
    IntegerMinimum = 15,
    IntegerMaximum = 16,
    Literal = 17,
    Never = 18,
    Null = 19,
    Number = 20,
    NumberMultipleOf = 21,
    NumberExclusiveMinimum = 22,
    NumberExclusiveMaximum = 23,
    NumberMinumum = 24,
    NumberMaximum = 25,
    Object = 26,
    ObjectMinProperties = 27,
    ObjectMaxProperties = 28,
    ObjectAdditionalProperties = 29,
    ObjectRequiredProperties = 30,
    Promise = 31,
    RecordKeyNumeric = 32,
    RecordKeyString = 33,
    String = 34,
    StringMinLength = 35,
    StringMaxLength = 36,
    StringPattern = 37,
    StringFormatUnknown = 38,
    StringFormat = 39,
    TupleZeroLength = 40,
    TupleLength = 41,
    Undefined = 42,
    Union = 43,
    Uint8Array = 44,
    Uint8ArrayMinByteLength = 45,
    Uint8ArrayMaxByteLength = 46,
    Void = 47,
    Custom = 48
}
export interface ValueError {
    type: ValueErrorType;
    schema: Types.TSchema;
    path: string;
    value: unknown;
    message: string;
}
export declare class ValueErrorsUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
/** Provides functionality to generate a sequence of errors against a TypeBox type.  */
export declare namespace ValueErrors {
    function Errors<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): IterableIterator<ValueError>;
}
