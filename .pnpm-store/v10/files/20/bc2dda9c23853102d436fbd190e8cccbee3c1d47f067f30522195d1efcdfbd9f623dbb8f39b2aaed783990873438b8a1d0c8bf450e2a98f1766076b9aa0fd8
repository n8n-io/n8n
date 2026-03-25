"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiProperty = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiAbstractMixin_1 = require("../mixins/ApiAbstractMixin");
const ApiProtectedMixin_1 = require("../mixins/ApiProtectedMixin");
const ApiStaticMixin_1 = require("../mixins/ApiStaticMixin");
const ApiInitializerMixin_1 = require("../mixins/ApiInitializerMixin");
const ApiPropertyItem_1 = require("../items/ApiPropertyItem");
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
class ApiProperty extends (0, ApiAbstractMixin_1.ApiAbstractMixin)((0, ApiProtectedMixin_1.ApiProtectedMixin)((0, ApiStaticMixin_1.ApiStaticMixin)((0, ApiInitializerMixin_1.ApiInitializerMixin)(ApiPropertyItem_1.ApiPropertyItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, isStatic) {
        if (isStatic) {
            return `${name}|${ApiItem_1.ApiItemKind.Property}|static`;
        }
        else {
            return `${name}|${ApiItem_1.ApiItemKind.Property}|instance`;
        }
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Property;
    }
    /** @override */
    get containerKey() {
        return ApiProperty.getContainerKey(this.name, this.isStatic);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(this.isStatic ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Members, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Member);
    }
}
exports.ApiProperty = ApiProperty;
//# sourceMappingURL=ApiProperty.js.map