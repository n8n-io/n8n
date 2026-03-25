import type { ApiItem, IApiItemJson, IApiItemConstructor, IApiItemOptions } from '../items/ApiItem';
import { Parameter } from '../model/Parameter';
import type { IExcerptTokenRange } from './Excerpt';
/**
 * Represents parameter information that is part of {@link IApiParameterListMixinOptions}
 * @public
 */
export interface IApiParameterOptions {
    parameterName: string;
    parameterTypeTokenRange: IExcerptTokenRange;
    isOptional: boolean;
}
/**
 * Constructor options for {@link (ApiParameterListMixin:interface)}.
 * @public
 */
export interface IApiParameterListMixinOptions extends IApiItemOptions {
    overloadIndex: number;
    parameters: IApiParameterOptions[];
}
export interface IApiParameterListJson extends IApiItemJson {
    overloadIndex: number;
    parameters: IApiParameterOptions[];
}
/**
 * The mixin base class for API items that can have function parameters (but not necessarily a return value).
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
export interface ApiParameterListMixin extends ApiItem {
    /**
     * When a function has multiple overloaded declarations, this one-based integer index can be used to uniquely
     * identify them.
     *
     * @remarks
     *
     * Consider this overloaded declaration:
     *
     * ```ts
     * export namespace Versioning {
     *   // TSDoc: Versioning.(addVersions:1)
     *   export function addVersions(x: number, y: number): number;
     *
     *   // TSDoc: Versioning.(addVersions:2)
     *   export function addVersions(x: string, y: string): string;
     *
     *   // (implementation)
     *   export function addVersions(x: number|string, y: number|string): number|string {
     *     // . . .
     *   }
     * }
     * ```
     *
     * In the above example, there are two overloaded declarations.  The overload using numbers will have
     * `overloadIndex = 1`.  The overload using strings will have `overloadIndex = 2`.  The third declaration that
     * accepts all possible inputs is considered part of the implementation, and is not processed by API Extractor.
     */
    readonly overloadIndex: number;
    /**
     * The function parameters.
     */
    readonly parameters: ReadonlyArray<Parameter>;
    serializeInto(jsonObject: Partial<IApiItemJson>): void;
}
/**
 * Mixin function for {@link (ApiParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiParameterListMixin:interface)} functionality.
 *
 * @public
 */
export declare function ApiParameterListMixin<TBaseClass extends IApiItemConstructor>(baseClass: TBaseClass): TBaseClass & (new (...args: any[]) => ApiParameterListMixin);
/**
 * Static members for {@link (ApiParameterListMixin:interface)}.
 * @public
 */
export declare namespace ApiParameterListMixin {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiParameterListMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem: ApiItem): apiItem is ApiParameterListMixin;
}
//# sourceMappingURL=ApiParameterListMixin.d.ts.map