"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiIndexSignature = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiReturnTypeMixin_1 = require("../mixins/ApiReturnTypeMixin");
const ApiReadonlyMixin_1 = require("../mixins/ApiReadonlyMixin");
/**
 * Represents a TypeScript index signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiIndexSignature` represents a TypeScript declaration such as `[x: number]: number` in this example:
 *
 * ```ts
 * export interface INumberTable {
 *   // An index signature
 *   [value: number]: number;
 *
 *   // An overloaded index signature
 *   [name: string]: number;
 * }
 * ```
 *
 * @public
 */
class ApiIndexSignature extends (0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiReturnTypeMixin_1.ApiReturnTypeMixin)((0, ApiReadonlyMixin_1.ApiReadonlyMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItem_1.ApiItemKind.IndexSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.IndexSignature;
    }
    /** @override */
    get containerKey() {
        return ApiIndexSignature.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference_1.DeclarationReference.empty().addNavigationStep(DeclarationReference_1.Navigation.Members, '(parent)');
        return parent.withMeaning(DeclarationReference_1.Meaning.IndexSignature).withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiIndexSignature = ApiIndexSignature;
//# sourceMappingURL=ApiIndexSignature.js.map