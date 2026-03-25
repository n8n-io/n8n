import * as Types from '../typebox';
export type TExtends<L extends Types.TSchema, R extends Types.TSchema, T extends Types.TSchema, U extends Types.TSchema> = Types.Static<L> extends Types.Static<R> ? T : U;
export interface TExclude<T extends Types.TUnion, U extends Types.TUnion> extends Types.TUnion<any[]> {
    static: Exclude<Types.Static<T, this['params']>, Types.Static<U, this['params']>>;
}
export interface TExtract<T extends Types.TSchema, U extends Types.TUnion> extends Types.TUnion<any[]> {
    static: Extract<Types.Static<T, this['params']>, Types.Static<U, this['params']>>;
}
/** Conditional type mapping for TypeBox types */
export declare namespace Conditional {
    /** (Experimental) Creates a conditional expression type */
    function Extends<L extends Types.TSchema, R extends Types.TSchema, T extends Types.TSchema, U extends Types.TSchema>(left: L, right: R, ok: T, fail: U): TExtends<L, R, T, U>;
    /** (Experimental) Constructs a type by excluding from UnionType all union members that are assignable to ExcludedMembers. */
    function Exclude<T extends Types.TUnion, U extends Types.TUnion>(unionType: T, excludedMembers: U, options?: Types.SchemaOptions): TExclude<T, U>;
    /** (Experimental) Constructs a type by extracting from Type all union members that are assignable to Union. */
    function Extract<T extends Types.TSchema, U extends Types.TUnion>(type: T, union: U, options?: Types.SchemaOptions): TExtract<T, U>;
}
