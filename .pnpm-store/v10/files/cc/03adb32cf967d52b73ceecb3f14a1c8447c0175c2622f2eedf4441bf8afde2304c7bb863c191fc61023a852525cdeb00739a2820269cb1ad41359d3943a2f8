import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
/**
 * Constructor options for {@link (IApiOptionalMixinOptions:interface)}.
 * @public
 */
export interface IApiOptionalMixinOptions extends IApiItemOptions {
    isOptional: boolean;
}
export interface IApiOptionalMixinJson extends IApiItemJson {
    isOptional: boolean;
}
/**
 * The mixin base class for API items that can be marked as optional by appending a `?` to them.
 * For example, a property of an interface can be optional.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export interface ApiOptionalMixin extends ApiItem {
    /**
     * True if this is an optional property.
     * @remarks
     * For example:
     * ```ts
     * interface X {
     *   y: string;   // not optional
     *   z?: string;  // optional
     * }
     * ```
     */
    readonly isOptional: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiOptionalMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiOptionalMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiOptionalMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiOptionalMixin);
/**
 * Optional members for {@link (ApiOptionalMixin:interface)}.
 * @public
 */
export declare namespace ApiOptionalMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiOptionalMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiOptionalMixin;
}
//# sourceMappingURL=ApiOptionalMixin.d.ts.map