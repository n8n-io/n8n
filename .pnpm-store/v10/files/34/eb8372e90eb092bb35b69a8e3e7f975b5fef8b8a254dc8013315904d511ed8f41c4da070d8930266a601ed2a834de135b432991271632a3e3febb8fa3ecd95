import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { type IApiDeclaredItemOptions, ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { type IApiParameterListMixinOptions, ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { type IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { type IApiReturnTypeMixinOptions, ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { type IApiTypeParameterListMixinOptions, ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiFunction}.
 * @public
 */
export interface IApiFunctionOptions extends IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiReturnTypeMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}
declare const ApiFunction_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReturnTypeMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiParameterListMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * Represents a TypeScript function declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiFunction` represents a TypeScript declaration such as this example:
 *
 * ```ts
 * export function getAverage(x: number, y: number): number {
 *   return (x + y) / 2.0;
 * }
 * ```
 *
 * Functions are exported by an entry point module or by a namespace.  Compare with {@link ApiMethod}, which
 * represents a function that is a member of a class.
 *
 * @public
 */
export declare class ApiFunction extends ApiFunction_base {
    constructor(options: IApiFunctionOptions);
    static getContainerKey(name: string, overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiFunction.d.ts.map