import * as Types from '../typebox';
export declare enum ValueErrorType {
    Array = 0,
    ArrayMinItems = 1,
    ArrayMaxItems = 2,
    ArrayUniqueItems = 3,
    BigInt = 4,
    BigIntMultipleOf = 5,
    BigIntExclusiveMinimum = 6,
    BigIntExclusiveMaximum = 7,
    BigIntMinimum = 8,
    BigIntMaximum = 9,
    Boolean = 10,
    Date = 11,
    DateExclusiveMinimumTimestamp = 12,
    DateExclusiveMaximumTimestamp = 13,
    DateMinimumTimestamp = 14,
    DateMaximumTimestamp = 15,
    Function = 16,
    Integer = 17,
    IntegerMultipleOf = 18,
    IntegerExclusiveMinimum = 19,
    IntegerExclusiveMaximum = 20,
    IntegerMinimum = 21,
    IntegerMaximum = 22,
    Intersect = 23,
    IntersectUnevaluatedProperties = 24,
    Literal = 25,
    Never = 26,
    Not = 27,
    Null = 28,
    Number = 29,
    NumberMultipleOf = 30,
    NumberExclusiveMinimum = 31,
    NumberExclusiveMaximum = 32,
    NumberMinumum = 33,
    NumberMaximum = 34,
    Object = 35,
    ObjectMinProperties = 36,
    ObjectMaxProperties = 37,
    ObjectAdditionalProperties = 38,
    ObjectRequiredProperties = 39,
    Promise = 40,
    RecordKeyNumeric = 41,
    RecordKeyString = 42,
    String = 43,
    StringMinLength = 44,
    StringMaxLength = 45,
    StringPattern = 46,
    StringFormatUnknown = 47,
    StringFormat = 48,
    Symbol = 49,
    TupleZeroLength = 50,
    TupleLength = 51,
    Undefined = 52,
    Union = 53,
    Uint8Array = 54,
    Uint8ArrayMinByteLength = 55,
    Uint8ArrayMaxByteLength = 56,
    Void = 57,
    Custom = 58
}
export interface ValueError {
    type: ValueErrorType;
    schema: Types.TSchema;
    path: string;
    value: unknown;
    message: string;
}
export declare class ValueErrorIterator {
    private readonly iterator;
    constructor(iterator: IterableIterator<ValueError>);
    [Symbol.iterator](): IterableIterator<ValueError>;
    /** Returns the first value error or undefined if no errors */
    First(): ValueError | undefined;
}
export declare class ValueErrorsUnknownTypeError extends Error {
    readonly schema: Types.TSchema;
    constructor(schema: Types.TSchema);
}
export declare class ValueErrorsDereferenceError extends Error {
    readonly schema: Types.TRef | Types.TThis;
    constructor(schema: Types.TRef | Types.TThis);
}
/** Provides functionality to generate a sequence of errors against a TypeBox type.  */
export declare namespace ValueErrors {
    function Errors<T extends Types.TSchema>(schema: T, references: Types.TSchema[], value: any): ValueErrorIterator;
}
