"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiMethod = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiProtectedMixin_1 = require("../mixins/ApiProtectedMixin");
const ApiStaticMixin_1 = require("../mixins/ApiStaticMixin");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiReturnTypeMixin_1 = require("../mixins/ApiReturnTypeMixin");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiAbstractMixin_1 = require("../mixins/ApiAbstractMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
const ApiOptionalMixin_1 = require("../mixins/ApiOptionalMixin");
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethod` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export class Widget {
 *   public render(): void { }
 * }
 * ```
 *
 * Compare with {@link ApiMethodSignature}, which represents a method belonging to an interface.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
class ApiMethod extends (0, ApiNameMixin_1.ApiNameMixin)((0, ApiAbstractMixin_1.ApiAbstractMixin)((0, ApiOptionalMixin_1.ApiOptionalMixin)((0, ApiParameterListMixin_1.ApiParameterListMixin)((0, ApiProtectedMixin_1.ApiProtectedMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiReturnTypeMixin_1.ApiReturnTypeMixin)((0, ApiStaticMixin_1.ApiStaticMixin)((0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)(ApiDeclaredItem_1.ApiDeclaredItem))))))))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, isStatic, overloadIndex) {
        if (isStatic) {
            return `${name}|${ApiItem_1.ApiItemKind.Method}|static|${overloadIndex}`;
        }
        else {
            return `${name}|${ApiItem_1.ApiItemKind.Method}|instance|${overloadIndex}`;
        }
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Method;
    }
    /** @override */
    get containerKey() {
        return ApiMethod.getContainerKey(this.name, this.isStatic, this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(this.isStatic ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Members, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Member)
            .withOverloadIndex(this.overloadIndex);
    }
}
exports.ApiMethod = ApiMethod;
//# sourceMappingURL=ApiMethod.js.map