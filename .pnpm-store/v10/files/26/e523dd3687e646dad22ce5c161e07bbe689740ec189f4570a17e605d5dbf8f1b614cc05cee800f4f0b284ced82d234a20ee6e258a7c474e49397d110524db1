import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { type IApiDeclaredItemOptions, ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { type IApiParameterListMixinOptions, ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiProtectedMixin, type IApiProtectedMixinOptions } from '../mixins/ApiProtectedMixin';
import { type IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
/**
 * Constructor options for {@link ApiConstructor}.
 * @public
 */
export interface IApiConstructorOptions extends IApiParameterListMixinOptions, IApiProtectedMixinOptions, IApiReleaseTagMixinOptions, IApiDeclaredItemOptions {
}
declare const ApiConstructor_base: typeof ApiDeclaredItem & (new (...args: any[]) => ApiReleaseTagMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiParameterListMixin);
/**
 * Represents a TypeScript class constructor declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructor` represents a declaration using the `constructor` keyword such as in this example:
 *
 * ```ts
 * export class Vector {
 *   public x: number;
 *   public y: number;
 *
 *   // A class constructor:
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 * ```
 *
 * Compare with {@link ApiConstructSignature}, which describes the construct signature for a class constructor.
 *
 * @public
 */
export declare class ApiConstructor extends ApiConstructor_base {
    constructor(options: IApiConstructorOptions);
    static getContainerKey(overloadIndex: number): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiConstructor.d.ts.map