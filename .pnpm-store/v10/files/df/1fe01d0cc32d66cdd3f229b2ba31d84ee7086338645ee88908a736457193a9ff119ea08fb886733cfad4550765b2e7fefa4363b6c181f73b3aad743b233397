import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
/**
 * Constructor options for {@link (IApiNameMixinOptions:interface)}.
 * @public
 */
export interface IApiNameMixinOptions extends IApiItemOptions {
    name: string;
}
export interface IApiNameMixinJson extends IApiItemJson {
    name: string;
}
/**
 * The mixin base class for API items that have a name.  For example, a class has a name, but a class constructor
 * does not.
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
export interface ApiNameMixin extends ApiItem {
    /**
     * The exported name of this API item.
     *
     * @remarks
     * Note that due tue type aliasing, the exported name may be different from the locally declared name.
     */
    readonly name: string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiNameMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiNameMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiNameMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiNameMixin);
/**
 * Static members for {@link (ApiNameMixin:interface)}.
 * @public
 */
export declare namespace ApiNameMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiNameMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiNameMixin;
}
//# sourceMappingURL=ApiNameMixin.d.ts.map