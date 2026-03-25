import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import type { Excerpt, IExcerptTokenRange } from '../mixins/Excerpt';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions, type IApiDeclaredItemJson } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin, type IApiTypeParameterListMixinOptions, type IApiTypeParameterListMixinJson } from '../mixins/ApiTypeParameterListMixin';
import type { DeserializerContext } from './DeserializerContext';
import { type IApiExportedMixinJson, type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiTypeAlias}.
 * @public
 */
export interface IApiTypeAliasOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiTypeParameterListMixinOptions, IApiExportedMixinOptions {
    typeTokenRange: IExcerptTokenRange;
}
export interface IApiTypeAliasJson extends IApiDeclaredItemJson, IApiTypeParameterListMixinJson, IApiExportedMixinJson {
    typeTokenRange: IExcerptTokenRange;
}
declare const ApiTypeAlias_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiTypeParameterListMixin);
/**
 * Represents a TypeScript type alias declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiTypeAlias` represents a definition such as one of these examples:
 *
 * ```ts
 * // A union type:
 * export type Shape = Square | Triangle | Circle;
 *
 * // A generic type alias:
 * export type BoxedValue<T> = { value: T };
 *
 * export type BoxedArray<T> = { array: T[] };
 *
 * // A conditional type alias:
 * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
 *
 * ```
 *
 * @public
 */
export declare class ApiTypeAlias extends ApiTypeAlias_base {
    /**
     * An {@link Excerpt} that describes the type of the alias.
     *
     * @remarks
     * In the example below, the `typeExcerpt` would correspond to the subexpression
     * `T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;`:
     *
     * ```ts
     * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
     * ```
     */
    readonly typeExcerpt: Excerpt;
    constructor(options: IApiTypeAliasOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiTypeAliasOptions>, context: DeserializerContext, jsonObject: IApiTypeAliasJson): void;
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiTypeAliasJson>): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiTypeAlias.d.ts.map