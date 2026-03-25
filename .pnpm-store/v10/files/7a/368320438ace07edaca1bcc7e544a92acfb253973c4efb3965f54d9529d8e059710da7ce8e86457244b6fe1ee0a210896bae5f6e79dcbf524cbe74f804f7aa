"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiConstructor = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiProtectedMixin_1 = require("../mixins/ApiProtectedMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
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
class ApiConstructor extends (0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiProtectedMixin_1.ApiProtectedMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)(ApiDeclaredItem_1.ApiDeclaredItem))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItem_1.ApiItemKind.Constructor}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Constructor;
    }
    /** @override */
    get containerKey() {
        return ApiConstructor.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference_1.DeclarationReference.empty().addNavigationStep(DeclarationReference_1.Navigation.Members, '(parent)');
        return parent.withMeaning(DeclarationReference_1.Meaning.Constructor).withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiConstructor = ApiConstructor;
//# sourceMappingURL=ApiConstructor.js.map