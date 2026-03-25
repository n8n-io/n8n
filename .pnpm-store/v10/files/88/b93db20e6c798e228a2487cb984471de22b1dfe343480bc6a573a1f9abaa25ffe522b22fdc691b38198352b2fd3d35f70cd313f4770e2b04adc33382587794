//#region src/utils/namespace.d.ts
/**
 * A constructor type that can be used as a base class for branding.
 */
type Constructor = abstract new (...args: any[]) => any;
/**
 * The return type of `Namespace.brand()`: the original base class
 * intersected with a polymorphic `isInstance` type guard.
 */
type BrandedClass<TBase extends Constructor> = TBase & {
  isInstance: IsInstanceFn;
};
/**
 * A static `isInstance` type guard that resolves to the subclass it's
 * called on via the generic `this` parameter.
 *
 * At call sites TypeScript infers `T` from the class, so
 * `StandardError.isInstance(obj)` narrows `obj` to `StandardError`.
 */
type IsInstanceFn = <T extends Constructor>(this: T, obj: unknown) => obj is InstanceType<T>;
/**
 * A namespace object for hierarchical symbol-based branding.
 *
 * Namespaces are internal authoring tools. They are not intended to be
 * part of the public API -- only the branded classes are.
 *
 * @example
 * ```typescript
 * const langchain = createNamespace("langchain");
 * const errorNs = langchain.sub("error");
 *
 * export class LangChainError extends errorNs.brand(Error) {
 *   readonly name = "LangChainError";
 * }
 *
 * export class ModelAbortError extends errorNs.brand(LangChainError, "model-abort") {
 *   readonly name = "ModelAbortError";
 * }
 * ```
 */
interface Namespace {
  /**
   * Brand a base class with this namespace's symbols.
   *
   * Without a marker, creates a namespace-level base class whose
   * `static isInstance` checks for the namespace's own symbol.
   *
   * With a marker, creates a leaf class whose `static isInstance`
   * checks for the marker-specific symbol.
   *
   * @param Base - The base class to extend
   * @param marker - Optional marker for leaf classes
   * @returns A new class extending Base with symbol branding and static isInstance
   */
  brand<TBase extends Constructor>(Base: TBase, marker?: string): BrandedClass<TBase>;
  /**
   * Create a child namespace.
   *
   * @param childPath - The child segment to append to the current path
   * @returns A new Namespace with the extended path
   */
  sub(childPath: string): Namespace;
  /**
   * Check if an object is branded under this namespace (at any level).
   *
   * @param obj - The object to check
   * @returns true if the object carries this namespace's symbol
   */
  isInstance(obj: unknown): boolean;
}
//#endregion
export { Namespace };
//# sourceMappingURL=namespace.d.ts.map