import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiInitializerMixin, type IApiInitializerMixinOptions } from '../mixins/ApiInitializerMixin';
/**
 * Constructor options for {@link ApiEnumMember}.
 * @public
 */
export interface IApiEnumMemberOptions extends IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiInitializerMixinOptions {
}
/**
 * Options for customizing the sort order of {@link ApiEnum} members.
 *
 * @privateRemarks
 * This enum is currently only used by the `@microsoft/api-extractor` package; it is declared here
 * because we anticipate that if more options are added in the future, their sorting will be implemented
 * by the `@microsoft/api-extractor-model` package.
 *
 * See https://github.com/microsoft/rushstack/issues/918 for details.
 *
 * @public
 */
export declare enum EnumMemberOrder {
    /**
     * `ApiEnumMember` items are sorted according to their {@link ApiItem.getSortKey}.  The order is
     * basically alphabetical by identifier name, but otherwise unspecified to allow for cosmetic improvements.
     *
     * This is the default behavior.
     */
    ByName = "by-name",
    /**
     * `ApiEnumMember` items preserve the original order of the declarations in the source file.
     * (This disables the automatic sorting that is normally applied based on {@link ApiItem.getSortKey}.)
     */
    Preserve = "preserve"
}
declare const ApiEnumMember_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin);
/**
 * Represents a member of a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnumMember` represents an enum member such as `Small = 100` in the example below:
 *
 * ```ts
 * export enum FontSizes {
 *   Small = 100,
 *   Medium = 200,
 *   Large = 300
 * }
 * ```
 *
 * @public
 */
export declare class ApiEnumMember extends ApiEnumMember_base {
    constructor(options: IApiEnumMemberOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiEnumMember.d.ts.map