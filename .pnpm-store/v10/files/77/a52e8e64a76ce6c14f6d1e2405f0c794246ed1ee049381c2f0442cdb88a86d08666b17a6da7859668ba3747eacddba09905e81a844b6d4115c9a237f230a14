import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
import type { IExcerptTokenRange, Excerpt } from './Excerpt';
/**
 * Constructor options for {@link (IApiInitializerMixinOptions:interface)}.
 * @public
 */
export interface IApiInitializerMixinOptions extends IApiItemOptions {
    initializerTokenRange?: IExcerptTokenRange;
}
export interface IApiInitializerMixinJson extends IApiItemJson {
    initializerTokenRange?: IExcerptTokenRange;
}
/**
 * The mixin base class for API items that can have an initializer.
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
export interface ApiInitializerMixin extends ApiItem {
    /**
     * An {@link Excerpt} that describes the item's initializer.
     */
    readonly initializerExcerpt?: Excerpt;
    /** @override */
    serializeInto(jsonObject: Partial<IApiInitializerMixinJson>): void;
}
/**
 * Mixin function for {@link (ApiInitializerMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiInitializerMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiInitializerMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiInitializerMixin);
/**
 * Static members for {@link (ApiInitializerMixin:interface)}.
 * @public
 */
export declare namespace ApiInitializerMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiInitializerMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiInitializerMixin;
}
//# sourceMappingURL=ApiInitializerMixin.d.ts.map