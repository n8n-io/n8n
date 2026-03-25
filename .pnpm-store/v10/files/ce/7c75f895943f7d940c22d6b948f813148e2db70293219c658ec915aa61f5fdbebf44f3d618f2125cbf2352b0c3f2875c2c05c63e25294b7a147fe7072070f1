import * as Types from '../typebox';
export declare class TypeGuardUnknownTypeError extends Error {
    readonly schema: unknown;
    constructor(schema: unknown);
}
/** Provides functionality to test if values are TypeBox types */
export declare namespace TypeGuard {
    /** Returns true if the given schema is TAny */
    function TAny(schema: unknown): schema is Types.TAny;
    /** Returns true if the given schema is TArray */
    function TArray(schema: unknown): schema is Types.TArray;
    /** Returns true if the given schema is TBoolean */
    function TBoolean(schema: unknown): schema is Types.TBoolean;
    /** Returns true if the given schema is TConstructor */
    function TConstructor(schema: unknown): schema is Types.TConstructor;
    /** Returns true if the given schema is TDate */
    function TDate(schema: unknown): schema is Types.TDate;
    /** Returns true if the given schema is TFunction */
    function TFunction(schema: unknown): schema is Types.TFunction;
    /** Returns true if the given schema is TInteger */
    function TInteger(schema: unknown): schema is Types.TInteger;
    /** Returns true if the given schema is TLiteral */
    function TLiteral(schema: unknown): schema is Types.TLiteral;
    /** Returns true if the given schema is TNever */
    function TNever(schema: unknown): schema is Types.TNever;
    /** Returns true if the given schema is TNull */
    function TNull(schema: unknown): schema is Types.TNull;
    /** Returns true if the given schema is TNumber */
    function TNumber(schema: unknown): schema is Types.TNumber;
    /** Returns true if the given schema is TObject */
    function TObject(schema: unknown): schema is Types.TObject;
    /** Returns true if the given schema is TPromise */
    function TPromise(schema: unknown): schema is Types.TPromise;
    /** Returns true if the given schema is TRecord */
    function TRecord(schema: unknown): schema is Types.TRecord;
    /** Returns true if the given schema is TSelf */
    function TSelf(schema: unknown): schema is Types.TSelf;
    /** Returns true if the given schema is TRef */
    function TRef(schema: unknown): schema is Types.TRef;
    /** Returns true if the given schema is TString */
    function TString(schema: unknown): schema is Types.TString;
    /** Returns true if the given schema is TTuple */
    function TTuple(schema: unknown): schema is Types.TTuple;
    /** Returns true if the given schema is TUndefined */
    function TUndefined(schema: unknown): schema is Types.TUndefined;
    /** Returns true if the given schema is TUnion */
    function TUnion(schema: unknown): schema is Types.TUnion;
    /** Returns true if the given schema is TUint8Array */
    function TUint8Array(schema: unknown): schema is Types.TUint8Array;
    /** Returns true if the given schema is TUnknown */
    function TUnknown(schema: unknown): schema is Types.TUnknown;
    /** Returns true if the given schema is TVoid */
    function TVoid(schema: unknown): schema is Types.TVoid;
    /** Returns true if the given schema is a registered user defined type */
    function TUserDefined(schema: unknown): schema is Types.TSchema;
    /** Returns true if the given schema is TSchema */
    function TSchema(schema: unknown): schema is Types.TSchema;
    /** Asserts if this schema and associated references are valid. */
    function Assert<T extends Types.TSchema>(schema: T, references?: Types.TSchema[]): void;
}
