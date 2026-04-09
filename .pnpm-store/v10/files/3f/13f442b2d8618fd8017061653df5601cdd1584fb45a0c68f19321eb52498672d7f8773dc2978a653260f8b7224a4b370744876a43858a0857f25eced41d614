// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiAbstractMixin } from '../mixins/ApiAbstractMixin';
import { ApiProtectedMixin } from '../mixins/ApiProtectedMixin';
import { ApiStaticMixin } from '../mixins/ApiStaticMixin';
import { ApiInitializerMixin } from '../mixins/ApiInitializerMixin';
import { ApiPropertyItem } from '../items/ApiPropertyItem';
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
export class ApiProperty extends ApiAbstractMixin(ApiProtectedMixin(ApiStaticMixin(ApiInitializerMixin(ApiPropertyItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, isStatic) {
        if (isStatic) {
            return `${name}|${ApiItemKind.Property}|static`;
        }
        else {
            return `${name}|${ApiItemKind.Property}|instance`;
        }
    }
    /** @override */
    get kind() {
        return ApiItemKind.Property;
    }
    /** @override */
    get containerKey() {
        return ApiProperty.getContainerKey(this.name, this.isStatic);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(this.isStatic ? Navigation.Exports : Navigation.Members, nameComponent)
            .withMeaning(Meaning.Member);
    }
}
//# sourceMappingURL=ApiProperty.js.map