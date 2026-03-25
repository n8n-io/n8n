import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiProtectedMixin, type IApiProtectedMixinOptions } from '../mixins/ApiProtectedMixin';
import { ApiStaticMixin, type IApiStaticMixinOptions } from '../mixins/ApiStaticMixin';
import { type IApiDeclaredItemOptions, ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { type IApiParameterListMixinOptions, ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { type IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReturnTypeMixin, type IApiReturnTypeMixinOptions } from '../mixins/ApiReturnTypeMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { type IApiAbstractMixinOptions, ApiAbstractMixin } from '../mixins/ApiAbstractMixin';
import { ApiTypeParameterListMixin, type IApiTypeParameterListMixinOptions } from '../mixins/ApiTypeParameterListMixin';
import { ApiOptionalMixin, type IApiOptionalMixinOptions } from '../mixins/ApiOptionalMixin';
/**
 * Constructor options for {@link ApiMethod}.
 * @public
 */
export interface IApiMethodOptions extends IApiNameMixinOptions, IApiAbstractMixinOptions, IApiOptionalMixinOptions, IApiParameterListMixinOptions, IApiProtectedMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiStaticMixinOptions, IApiTypeParameterListMixinOptions, IApiDeclaredItemOptions {
}
declare const ApiMethod_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiStaticMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiOptionalMixin) & (new (...args: any[]) => ApiAbstractMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethod` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export class Widget {
 *   public render(): void { }
 * }
 * ```
 *
 * Compare with {@link ApiMethodSignature}, which represents a method belonging to an interface.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export declare class ApiMethod extends ApiMethod_base {
    constructor(options: IApiMethodOptions);
    static getContainerKey(name: string, isStatic: boolean, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiMethod.d.ts.map