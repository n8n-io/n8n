"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMethodSignature = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiReturnTypeMixin_1 = require("../mixins/ApiReturnTypeMixin");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
const ApiOptionalMixin_1 = require("../mixins/ApiOptionalMixin");
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethodSignature` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export interface IWidget {
 *   render(): void;
 * }
 * ```
 *
 * Compare with {@link ApiMethod}, which represents a method belonging to a class.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
class ApiMethodSignature extends (0, ApiNameMixin_1.ApiNameMixin)((0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiReturnTypeMixin_1.ApiReturnTypeMixin)((0, ApiOptionalMixin_1.ApiOptionalMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, overloadIndex) {
        return `${name}|${ApiItem_1.ApiItemKind.MethodSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.MethodSignature;
    }
    /** @override */
    get containerKey() {
        return ApiMethodSignature.getContainerKey(this.name, this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(DeclarationReference_1.Navigation.Members, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Member)
            .withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiMethodSignature = ApiMethodSignature;
//# sourceMappingURL=ApiMethodSignature.js.map