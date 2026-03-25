import * as Types from '../typebox';
export declare class TypeSystemDuplicateTypeKind extends Error {
    constructor(kind: string);
}
export declare class TypeSystemDuplicateFormat extends Error {
    constructor(kind: string);
}
/** Creates user defined types and formats and provides overrides for value checking behaviours */
export declare namespace TypeSystem {
    /** Sets whether TypeBox should assert optional properties using the TypeScript `exactOptionalPropertyTypes` assertion policy. The default is `false` */
    let ExactOptionalPropertyTypes: boolean;
    /** Sets whether arrays should be treated as a kind of objects. The default is `false` */
    let AllowArrayObjects: boolean;
    /** Sets whether `NaN` or `Infinity` should be treated as valid numeric values. The default is `false` */
    let AllowNaN: boolean;
    /** Sets whether `null` should validate for void types. The default is `false` */
    let AllowVoidNull: boolean;
    /** Creates a new type */
    function Type<Type, Options = object>(kind: string, check: (options: Options, value: unknown) => boolean): (options?: Partial<Options>) => Types.TUnsafe<Type>;
    /** Creates a new string format */
    function Format<F extends string>(format: F, check: (value: string) => boolean): F;
    /** @deprecated Use `TypeSystem.Type()` instead. */
    function CreateType<Type, Options = object>(kind: string, check: (options: Options, value: unknown) => boolean): (options?: Partial<Options>) => Types.TUnsafe<Type>;
    /** @deprecated Use `TypeSystem.Format()` instead.  */
    function CreateFormat<F extends string>(format: F, check: (value: string) => boolean): F;
}
