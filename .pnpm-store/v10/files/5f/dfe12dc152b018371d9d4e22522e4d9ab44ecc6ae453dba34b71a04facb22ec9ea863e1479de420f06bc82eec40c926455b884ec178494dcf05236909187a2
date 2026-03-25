import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { type IApiDeclaredItemOptions, ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { type IApiParameterListMixinOptions, ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { type IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { type IApiReturnTypeMixinOptions, ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { ApiTypeParameterListMixin, type IApiTypeParameterListMixinOptions } from '../mixins/ApiTypeParameterListMixin';
/**
 * Constructor options for {@link ApiConstructor}.
 * @public
 */
export interface IApiConstructSignatureOptions extends IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiDeclaredItemOptions {
}
declare const ApiConstructSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin);
/**
 * Represents a TypeScript construct signature that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructSignature` represents a construct signature using the `new` keyword such as in this example:
 *
 * ```ts
 * export interface IVector {
 *   x: number;
 *   y: number;
 * }
 *
 * export interface IVectorConstructor {
 *   // A construct signature:
 *   new(x: number, y: number): IVector;
 * }
 *
 * export function createVector(vectorConstructor: IVectorConstructor,
 *   x: number, y: number): IVector {
 *   return new vectorConstructor(x, y);
 * }
 *
 * class Vector implements IVector {
 *   public x: number;
 *   public y: number;
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 *
 * let vector: Vector = createVector(Vector, 1, 2);
 * ```
 *
 * Compare with {@link ApiConstructor}, which describes the class constructor itself.
 *
 * @public
 */
export declare class ApiConstructSignature extends ApiConstructSignature_base {
    constructor(options: IApiConstructSignatureOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiConstructSignature.d.ts.map