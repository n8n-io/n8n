import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiAbstractMixin, type IApiAbstractMixinOptions } from '../mixins/ApiAbstractMixin';
import { ApiProtectedMixin, type IApiProtectedMixinOptions } from '../mixins/ApiProtectedMixin';
import { ApiStaticMixin, type IApiStaticMixinOptions } from '../mixins/ApiStaticMixin';
import { ApiInitializerMixin, type IApiInitializerMixinOptions } from '../mixins/ApiInitializerMixin';
import { ApiPropertyItem, type IApiPropertyItemOptions } from '../items/ApiPropertyItem';
/**
 * Constructor options for {@link ApiProperty}.
 * @public
 */
export interface IApiPropertyOptions extends IApiPropertyItemOptions, IApiAbstractMixinOptions, IApiProtectedMixinOptions, IApiStaticMixinOptions, IApiInitializerMixinOptions {
}
declare const ApiProperty_base: typeof ApiPropertyItem & (new (...args: any[]) => ApiInitializerMixin) & (new (...args: any[]) => ApiStaticMixin) & (new (...args: any[]) => ApiProtectedMixin) & (new (...args: any[]) => ApiAbstractMixin);
/**
 * Represents a TypeScript property declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiProperty` represents a TypeScript declaration such as the `width` and `height` members in this example:
 *
 * ```ts
 * export class Widget {
 *   public width: number = 100;
 *
 *   public get height(): number {
 *     if (this.isSquashed()) {
 *       return 0;
 *     } else {
 *       return this.clientArea.height;
 *     }
 *   }
 * }
 * ```
 *
 * Note that member variables are also considered to be properties.
 *
 * If the property has both a getter function and setter function, they will be represented by a single `ApiProperty`
 * and must have a single documentation comment.
 *
 * Compare with {@link ApiPropertySignature}, which represents a property belonging to an interface.
 * For example, a class property can be `static` but an interface property cannot.
 *
 * @public
 */
export declare class ApiProperty extends ApiProperty_base {
    constructor(options: IApiPropertyOptions);
    static getContainerKey(name: string, isStatic: boolean): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiProperty.d.ts.map