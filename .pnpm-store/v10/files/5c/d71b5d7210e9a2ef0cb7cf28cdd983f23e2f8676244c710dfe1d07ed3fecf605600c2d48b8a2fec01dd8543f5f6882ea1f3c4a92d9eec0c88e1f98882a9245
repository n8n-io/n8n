import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions, type IApiDeclaredItemJson } from '../items/ApiDeclaredItem';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import type { IExcerptTokenRange } from '../mixins/Excerpt';
import { HeritageType } from './HeritageType';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin, type IApiTypeParameterListMixinOptions, type IApiTypeParameterListMixinJson } from '../mixins/ApiTypeParameterListMixin';
import type { DeserializerContext } from './DeserializerContext';
import { type IApiExportedMixinJson, type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
import { ApiAbstractMixin, type IApiAbstractMixinJson, type IApiAbstractMixinOptions } from '../mixins/ApiAbstractMixin';
/**
 * Constructor options for {@link ApiClass}.
 * @public
 */
export interface IApiClassOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiAbstractMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiTypeParameterListMixinOptions, IApiExportedMixinOptions {
    extendsTokenRange: IExcerptTokenRange | undefined;
    implementsTokenRanges: IExcerptTokenRange[];
}
export interface IApiClassJson extends IApiDeclaredItemJson, IApiAbstractMixinJson, IApiTypeParameterListMixinJson, IApiExportedMixinJson {
    extendsTokenRange?: IExcerptTokenRange;
    implementsTokenRanges: IExcerptTokenRange[];
}
declare const ApiClass_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiTypeParameterListMixin) & (new (...args: any[]) => ApiAbstractMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiClass` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export class X { }
 * ```
 *
 * @public
 */
export declare class ApiClass extends ApiClass_base {
    /**
     * The base class that this class inherits from (using the `extends` keyword), or undefined if there is no base class.
     */
    readonly extendsType: HeritageType | undefined;
    private readonly _implementsTypes;
    constructor(options: IApiClassOptions);
    static getContainerKey(name: string): string;
    /** @override */
    static onDeserializeInto(options: Partial<IApiClassOptions>, context: DeserializerContext, jsonObject: IApiClassJson): void;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The list of interfaces that this class implements using the `implements` keyword.
     */
    get implementsTypes(): ReadonlyArray<HeritageType>;
    /** @override */
    serializeInto(jsonObject: Partial<IApiClassJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiClass.d.ts.map