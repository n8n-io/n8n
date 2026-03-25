import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
import type { IExcerptTokenRange, Excerpt } from './Excerpt';
/**
 * Constructor options for {@link (ApiReturnTypeMixin:interface)}.
 * @public
 */
export interface IApiReturnTypeMixinOptions extends IApiItemOptions {
    returnTypeTokenRange: IExcerptTokenRange;
}
export interface IApiReturnTypeMixinJson extends IApiItemJson {
    returnTypeTokenRange: IExcerptTokenRange;
}
/**
 * The mixin base class for API items that are functions that return a value.
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
export interface ApiReturnTypeMixin extends ApiItem {
    /**
     * An {@link Excerpt} that describes the type of the function's return value.
     */
    readonly returnTypeExcerpt: Excerpt;
    /** @override */
    serializeInto(jsonObject: Partial<IApiReturnTypeMixinJson>): void;
}
/**
 * Mixin function for {@link (ApiReturnTypeMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReturnTypeMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiReturnTypeMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiReturnTypeMixin);
/**
 * Static members for {@link (ApiReturnTypeMixin:interface)}.
 * @public
 */
export declare namespace ApiReturnTypeMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReturnTypeMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiReturnTypeMixin;
}
//# sourceMappingURL=ApiReturnTypeMixin.d.ts.map