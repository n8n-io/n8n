"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiInterface = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const HeritageType_1 = require("./HeritageType");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
const ApiExportedMixin_1 = require("../mixins/ApiExportedMixin");
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiInterface` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export interface X extends Y {
 * }
 * ```
 *
 * @public
 */
class ApiInterface extends (0, ApiItemContainerMixin_1.ApiItemContainerMixin)((0, ApiNameMixin_1.ApiNameMixin)((0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiExportedMixin_1.ApiExportedMixin)(ApiDeclaredItem_1.ApiDeclaredItem))))) {
    constructor(options) {
        super(options);
        this._extendsTypes = [];
        for (const extendsTokenRange of options.extendsTokenRanges) {
            this._extendsTypes.push(new HeritageType_1.HeritageType(this.buildExcerpt(extendsTokenRange)));
        }
    }
    static getContainerKey(name) {
        return `${name}|${ApiItem_1.ApiItemKind.Interface}`;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.extendsTokenRanges = jsonObject.extendsTokenRanges;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Interface;
    }
    /** @override */
    get containerKey() {
        return ApiInterface.getContainerKey(this.name);
    }
    /**
     * The list of base interfaces that this interface inherits from using the `extends` keyword.
     */
    get extendsTypes() {
        return this._extendsTypes;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.extendsTokenRanges = this.extendsTypes.map((x) => x.excerpt.tokenRange);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Interface);
    }
}
exports.ApiInterface = ApiInterface;
//# sourceMappingURL=ApiInterface.js.map