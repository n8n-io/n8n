import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin, type IApiParameterListMixinOptions } from '../mixins/ApiParameterListMixin';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { type IApiReturnTypeMixinOptions, ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { type IApiTypeParameterListMixinOptions, ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiOptionalMixin, type IApiOptionalMixinOptions } from '../mixins/ApiOptionalMixin';
/** @public */
export interface IApiMethodSignatureOptions extends IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiOptionalMixinOptions, IApiDeclaredItemOptions {
}
declare const ApiMethodSignature_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethodSignature` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export interface IWidget {
 *   render(): void;
 * }
 * ```
 *
 * Compare with {@link ApiMethod}, which represents a method belonging to a class.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export declare class ApiMethodSignature extends ApiMethodSignature_base {
    constructor(options: IApiMethodSignatureOptions);
    static getContainerKey(name: string, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiMethodSignature.d.ts.map