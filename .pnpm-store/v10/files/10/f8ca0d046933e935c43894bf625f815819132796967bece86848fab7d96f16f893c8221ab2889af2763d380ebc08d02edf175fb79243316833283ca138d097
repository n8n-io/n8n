"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiConstructSignature = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiReturnTypeMixin_1 = require("../mixins/ApiReturnTypeMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
/**
 * Represents a TypeScript construct signature that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructSignature` represents a construct signature using the `new` keyword such as in this example:
 *
 * ```ts
 * export interface IVector {
 *   x: number;
 *   y: number;
 * }
 *
 * export interface IVectorConstructor {
 *   // A construct signature:
 *   new(x: number, y: number): IVector;
 * }
 *
 * export function createVector(vectorConstructor: IVectorConstructor,
 *   x: number, y: number): IVector {
 *   return new vectorConstructor(x, y);
 * }
 *
 * class Vector implements IVector {
 *   public x: number;
 *   public y: number;
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 *
 * let vector: Vector = createVector(Vector, 1, 2);
 * ```
 *
 * Compare with {@link ApiConstructor}, which describes the class constructor itself.
 *
 * @public
 */
class ApiConstructSignature extends (0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiReturnTypeMixin_1.ApiReturnTypeMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItem_1.ApiItemKind.ConstructSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.ConstructSignature;
    }
    /** @override */
    get containerKey() {
        return ApiConstructSignature.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference_1.DeclarationReference.empty().addNavigationStep(DeclarationReference_1.Navigation.Members, '(parent)');
        return parent.withMeaning(DeclarationReference_1.Meaning.ConstructSignature).withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiConstructSignature = ApiConstructSignature;
//# sourceMappingURL=ApiConstructSignature.js.map