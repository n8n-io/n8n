import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
import type { IExcerptTokenRange } from './Excerpt';
import { TypeParameter } from '../model/TypeParameter';
/**
 * Represents parameter information that is part of {@link IApiTypeParameterListMixinOptions}
 * @public
 */
export interface IApiTypeParameterOptions {
    typeParameterName: string;
    constraintTokenRange: IExcerptTokenRange;
    defaultTypeTokenRange: IExcerptTokenRange;
}
/**
 * Constructor options for {@link (ApiTypeParameterListMixin:interface)}.
 * @public
 */
export interface IApiTypeParameterListMixinOptions extends IApiItemOptions {
    typeParameters: IApiTypeParameterOptions[];
}
export interface IApiTypeParameterListMixinJson extends IApiItemJson {
    typeParameters: IApiTypeParameterOptions[];
}
/**
 * The mixin base class for API items that can have type parameters.
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
export interface ApiTypeParameterListMixin extends ApiItem {
    /**
     * The type parameters.
     */
    readonly typeParameters: ReadonlyArray<TypeParameter>;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiTypeParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiTypeParameterListMixin:interface)}
 * functionality.
 *
 * @public
 */
export declare function ApiTypeParameterListMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiTypeParameterListMixin);
/**
 * Static members for {@link (ApiTypeParameterListMixin:interface)}.
 * @public
 */
export declare namespace ApiTypeParameterListMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiParameterListMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiTypeParameterListMixin;
}
//# sourceMappingURL=ApiTypeParameterListMixin.d.ts.map