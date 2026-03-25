import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { type IApiDeclaredItemOptions, ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin, type IApiReleaseTagMixinOptions } from '../mixins/ApiReleaseTagMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
import { type IApiExportedMixinOptions, ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Constructor options for {@link ApiClass}.
 * @public
 */
export interface IApiNamespaceOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions, IApiExportedMixinOptions {
}
declare const ApiNamespace_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiExportedMixin) & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents a TypeScript namespace declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiNamespace` represents a TypeScript declaration such `X` or `Y` in this example:
 *
 * ```ts
 * export namespace X {
 *   export namespace Y {
 *     export interface IWidget {
 *       render(): void;
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export declare class ApiNamespace extends ApiNamespace_base {
    constructor(options: IApiNamespaceOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiNamespace.d.ts.map