import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions, type IApiItemContainerJson } from '../mixins/ApiItemContainerMixin';
import { ApiDeclaredItem, type IApiDeclaredItemOptions, type IApiDeclaredItemJson } from '../items/ApiDeclaredItem';
import { type IApiReleaseTagMixinOptions, ApiReleaseTagMixin, type IApiReleaseTagMixinJson } from '../mixins/ApiReleaseTagMixin';
import type { IExcerptTokenRange } from '../mixins/Excerpt';
import { HeritageType } from './HeritageType';
import { type IApiNameMixinOptions, ApiNameMixin, type IApiNameMixinJson } from '../mixins/ApiNameMixin';
import { type IApiTypeParameterListMixinOptions, type IApiTypeParameterListMixinJson, ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import type { DeserializerContext } from './DeserializerContext';
import { type IApiExportedMixinJson, type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiInterface}.
 * @public
 */
export interface IApiInterfaceOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiTypeParameterListMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
    extendsTokenRanges: IExcerptTokenRange[];
}
export interface IApiInterfaceJson extends IApiItemContainerJson, IApiNameMixinJson, IApiTypeParameterListMixinJson, IApiReleaseTagMixinJson, IApiDeclaredItemJson, IApiExportedMixinJson {
    extendsTokenRanges: IExcerptTokenRange[];
}
declare const ApiInterface_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiInterface` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export interface X extends Y {
 * }
 * ```
 *
 * @public
 */
export declare class ApiInterface extends ApiInterface_base {
    private readonly _extendsTypes;
    constructor(options: IApiInterfaceOptions);
    static getContainerKey(name: string): string;
    /** @override */
    static onDeserializeInto(options: Partial<IApiInterfaceOptions>, context: DeserializerContext, jsonObject: IApiInterfaceJson): void;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The list of base interfaces that this interface inherits from using the `extends` keyword.
     */
    get extendsTypes(): ReadonlyArray<HeritageType>;
    /** @override */
    serializeInto(jsonObject: Partial<IApiInterfaceJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiInterface.d.ts.map