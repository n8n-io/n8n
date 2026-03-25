"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiCallSignature = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiReturnTypeMixin_1 = require("../mixins/ApiReturnTypeMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
/**
 * Represents a TypeScript function call signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiCallSignature` represents a TypeScript declaration such as `(x: number, y: number): number`
 * in this example:
 *
 * ```ts
 * export interface IChooser {
 *   // A call signature:
 *   (x: number, y: number): number;
 *
 *   // Another overload for this call signature:
 *   (x: string, y: string): string;
 * }
 *
 * function chooseFirst<T>(x: T, y: T): T {
 *   return x;
 * }
 *
 * let chooser: IChooser = chooseFirst;
 * ```
 *
 * @public
 */
class ApiCallSignature extends (0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiReturnTypeMixin_1.ApiReturnTypeMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItem_1.ApiItemKind.CallSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.CallSignature;
    }
    /** @override */
    get containerKey() {
        return ApiCallSignature.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference_1.DeclarationReference.empty().addNavigationStep(DeclarationReference_1.Navigation.Members, '(parent)');
        return parent.withMeaning(DeclarationReference_1.Meaning.CallSignature).withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiCallSignature = ApiCallSignature;
//# sourceMappingURL=ApiCallSignature.js.map