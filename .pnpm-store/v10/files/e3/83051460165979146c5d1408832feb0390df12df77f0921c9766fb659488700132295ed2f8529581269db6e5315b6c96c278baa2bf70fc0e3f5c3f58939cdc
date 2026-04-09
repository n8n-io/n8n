/**
 * Type that provides auto-suggestions but also any string.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29729#issuecomment-471566609
 */
export declare type LiteralUnion<T extends U, U = string> = T | (U & {
    zz_IGNORE_ME?: never;
});
/**
 * Basically a function that returns a value.
 *
 * For some strange reason this is not the same as `Function`.
 */
export declare type Callable = (...args: any[]) => unknown;
/**
 * Type that represents a single method/function name of the given type.
 */
export declare type MethodOf<ObjectType, Signature extends Callable = Callable> = {
    [Key in keyof ObjectType]: ObjectType[Key] extends Signature ? Key extends string ? Key : never : never;
}[keyof ObjectType];
/**
 * Type that represents all method/function names of the given type.
 */
export declare type MethodsOf<ObjectType, Signature extends Callable = Callable> = ReadonlyArray<MethodOf<ObjectType, Signature>>;
