// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiPropertyItem } from '../items/ApiPropertyItem';
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
export class ApiPropertySignature extends ApiPropertyItem {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.PropertySignature}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.PropertySignature;
    }
    /** @override */
    get containerKey() {
        return ApiPropertySignature.getContainerKey(this.name);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(Navigation.Members, nameComponent)
            .withMeaning(Meaning.Member);
    }
}
//# sourceMappingURL=ApiPropertySignature.js.map