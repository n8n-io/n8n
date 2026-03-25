"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPropertySignature = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiPropertyItem_1 = require("../items/ApiPropertyItem");
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
class ApiPropertySignature extends ApiPropertyItem_1.ApiPropertyItem {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        return `${name}|${ApiItem_1.ApiItemKind.PropertySignature}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.PropertySignature;
    }
    /** @override */
    get containerKey() {
        return ApiPropertySignature.getContainerKey(this.name);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(DeclarationReference_1.Navigation.Members, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Member);
    }
}
exports.ApiPropertySignature = ApiPropertySignature;
//# sourceMappingURL=ApiPropertySignature.js.map