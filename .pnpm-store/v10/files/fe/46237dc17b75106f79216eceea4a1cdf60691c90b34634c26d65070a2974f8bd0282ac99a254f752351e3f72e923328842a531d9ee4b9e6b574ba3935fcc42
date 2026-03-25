/**
 * Type that provides auto-suggestions but also any string.
 *
 * @see https://github.com/microsoft/TypeScript/issues/29729#issuecomment-471566609
 */
export type LiteralUnion<TSuggested extends TBase, TBase = string> = TSuggested | (TBase & {
    zz_IGNORE_ME?: never;
});
/**
 * A function that returns a value.
 *
 * `Function` cannot be used instead because it doesn't accept class declarations.
 * These would fail when invoked since they are invoked without the `new` keyword.
 */
export type Callable = (...args: any[]) => unknown;
/**
 * Type that represents a single method/function name of the given type.
 */
export type MethodOf<TObjectType, TSignature extends Callable = Callable> = {
    [Key in keyof TObjectType]: TObjectType[Key] extends TSignature ? Key extends string ? Key : never : never;
}[keyof TObjectType];
/**
 * Type that represents all method/function names of the given type.
 */
export type MethodsOf<TObjectType, TSignature extends Callable = Callable> = ReadonlyArray<MethodOf<TObjectType, TSignature>>;
