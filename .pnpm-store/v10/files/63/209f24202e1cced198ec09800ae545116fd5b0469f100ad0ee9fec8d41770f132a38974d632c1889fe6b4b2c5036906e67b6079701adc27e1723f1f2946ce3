import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
/**
 * Constructor options for {@link (IApiExportedMixinOptions:interface)}.
 * @public
 */
export interface IApiExportedMixinOptions extends IApiItemOptions {
    isExported: boolean;
}
export interface IApiExportedMixinJson extends IApiItemJson {
    isExported: boolean;
}
/**
 * The mixin base class for API items that can be exported.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.  The non-abstract classes (e.g. `ApiClass`, `ApiEnum`, `ApiInterface`, etc.) use
 * TypeScript "mixin" functions (e.g. `ApiDeclaredItem`, `ApiItemContainerMixin`, etc.) to add various
 * features that cannot be represented as a normal inheritance chain (since TypeScript does not allow a child class
 * to extend more than one base class).  The "mixin" is a TypeScript merged declaration with three components:
 * the function that generates a subclass, an interface that describes the members of the subclass, and
 * a namespace containing static members of the class.
 *
 * @public
 */
export interface ApiExportedMixin extends ApiItem {
    /**
     * Whether the declaration is exported from its parent item container (i.e. either an `ApiEntryPoint` or an
     * `ApiNamespace`).
     *
     * @remarks
     * Suppose `index.ts` is your entry point:
     *
     * ```ts
     * // index.ts
     *
     * export class A {}
     * class B {}
     *
     * namespace n {
     *   export class C {}
     *   class D {}
     * }
     *
     * // file.ts
     * export class E {}
     * ```
     *
     * Classes `A` and `C` are both exported, while classes `B`, `D`, and `E` are not. `E` is exported from its
     * local file, but not from its parent item container (i.e. the entry point).
     *
     */
    readonly isExported: boolean;
    /** @override */
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiExportedMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiExportedMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiExportedMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiExportedMixin);
/**
 * Static members for {@link (ApiExportedMixin:interface)}.
 * @public
 */
export declare namespace ApiExportedMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiExportedMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiExportedMixin;
}
//# sourceMappingURL=ApiExportedMixin.d.ts.map