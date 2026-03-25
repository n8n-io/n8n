import type * as tsdoc from '@microsoft/tsdoc';
import type { Excerpt } from '../mixins/Excerpt';
import type { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
/**
 * Constructor options for {@link TypeParameter}.
 * @public
 */
export interface ITypeParameterOptions {
    name: string;
    constraintExcerpt: Excerpt;
    defaultTypeExcerpt: Excerpt;
    isOptional: boolean;
    parent: ApiTypeParameterListMixin;
}
/**
 * Represents a named type parameter for a generic declaration.
 *
 * @remarks
 *
 * `TypeParameter` represents a TypeScript declaration such as `T` in this example:
 *
 * ```ts
 * interface IIdentifier {
 *     getCode(): string;
 * }
 *
 * class BarCode implements IIdentifier {
 *     private _value: number;
 *     public getCode(): string { return this._value.toString(); }
 * }
 *
 * class Book<TIdentifier extends IIdentifier = BarCode> {
 *     public identifier: TIdentifier;
 * }
 * ```
 *
 * `TypeParameter` objects belong to the {@link (ApiTypeParameterListMixin:interface).typeParameters} collection.
 *
 * @public
 */
export declare class TypeParameter {
    /**
     * An {@link Excerpt} that describes the base constraint of the type parameter.
     *
     * @remarks
     * In the example below, the `constraintExcerpt` would correspond to the `IIdentifier` subexpression:
     *
     * ```ts
     * class Book<TIdentifier extends IIdentifier = BarCode> {
     *     public identifier: TIdentifier;
     * }
     * ```
     */
    readonly constraintExcerpt: Excerpt;
    /**
     * An {@link Excerpt} that describes the default type of the type parameter.
     *
     * @remarks
     * In the example below, the `defaultTypeExcerpt` would correspond to the `BarCode` subexpression:
     *
     * ```ts
     * class Book<TIdentifier extends IIdentifier = BarCode> {
     *     public identifier: TIdentifier;
     * }
     * ```
     */
    readonly defaultTypeExcerpt: Excerpt;
    /**
     * The parameter name.
     */
    name: string;
    /**
     * Whether the type parameter is optional. True IFF there exists a `defaultTypeExcerpt`.
     */
    isOptional: boolean;
    private _parent;
    constructor(options: ITypeParameterOptions);
    /**
     * Returns the `@typeParam` documentation for this parameter, if present.
     */
    get tsdocTypeParamBlock(): tsdoc.DocParamBlock | undefined;
}
//# sourceMappingURL=TypeParameter.d.ts.map