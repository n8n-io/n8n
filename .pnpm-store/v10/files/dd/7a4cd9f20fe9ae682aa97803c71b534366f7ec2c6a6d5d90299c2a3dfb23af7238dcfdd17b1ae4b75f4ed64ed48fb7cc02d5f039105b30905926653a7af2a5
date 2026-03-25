import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem, type IApiDeclaredItemOptions } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import type { ApiEnumMember } from './ApiEnumMember';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiEnum}.
 * @public
 */
export interface IApiEnumOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}
declare const ApiEnum_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnum` represents an enum declaration such as `FontSizes` in the example below:
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
export declare class ApiEnum extends ApiEnum_base {
    constructor(options: IApiEnumOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get members(): ReadonlyArray<ApiEnumMember>;
    /** @override */
    get containerKey(): string;
    /** @override */
    addMember(member: ApiEnumMember): void;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiEnum.d.ts.map