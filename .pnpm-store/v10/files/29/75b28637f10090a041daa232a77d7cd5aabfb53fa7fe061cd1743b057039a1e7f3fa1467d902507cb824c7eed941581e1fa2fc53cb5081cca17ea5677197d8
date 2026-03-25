import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiPropertyItem, type IApiPropertyItemOptions } from '../items/ApiPropertyItem';
/**
 * Constructor options for {@link ApiPropertySignature}.
 * @public
 */
export interface IApiPropertySignatureOptions extends IApiPropertyItemOptions {
}
/**
 * Represents a TypeScript property declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiPropertySignature` represents a TypeScript declaration such as the `width` and `height` members in this example:
 *
 * ```ts
 * export interface IWidget {
 *   readonly width: number;
 *   height: number;
 * }
 * ```
 *
 * Compare with {@link ApiProperty}, which represents a property belonging to a class.
 * For example, a class property can be `static` but an interface property cannot.
 *
 * @public
 */
export declare class ApiPropertySignature extends ApiPropertyItem {
    constructor(options: IApiPropertySignatureOptions);
    static getContainerKey(name: string): string;
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
//# sourceMappingURL=ApiPropertySignature.d.ts.map