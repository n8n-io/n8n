export declare class TypeSystemDuplicateTypeKind extends Error {
    constructor(kind: string);
}
export declare class TypeSystemDuplicateFormat extends Error {
    constructor(kind: string);
}
/** Creates user defined types and formats and provides overrides for value checking behaviours */
export declare namespace TypeSystem {
    /** Sets whether arrays should be treated as kinds of objects. The default is `false` */
    let AllowArrayObjects: boolean;
    /** Sets whether numeric checks should consider NaN a valid number type. The default is `false` */
    let AllowNaN: boolean;
    /** Creates a custom type */
    function CreateType<Type, Options = object>(kind: string, callback: (options: Options, value: unknown) => boolean): (options?: Partial<Options>) => import("../typebox").TUnsafe<Type>;
    /** Creates a custom string format */
    function CreateFormat(format: string, callback: (value: string) => boolean): (value: string) => boolean;
}
