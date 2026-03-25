"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClass = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const HeritageType_1 = require("./HeritageType");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
const ApiExportedMixin_1 = require("../mixins/ApiExportedMixin");
const ApiAbstractMixin_1 = require("../mixins/ApiAbstractMixin");
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiClass` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export class X { }
 * ```
 *
 * @public
 */
class ApiClass extends (0, ApiItemContainerMixin_1.ApiItemContainerMixin)((0, ApiNameMixin_1.ApiNameMixin)((0, ApiAbstractMixin_1.ApiAbstractMixin)((0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiExportedMixin_1.ApiExportedMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))))) {
    constructor(options) {
        super(options);
        this._implementsTypes = [];
        if (options.extendsTokenRange) {
            this.extendsType = new HeritageType_1.HeritageType(this.buildExcerpt(options.extendsTokenRange));
        }
        else {
            this.extendsType = undefined;
        }
        for (const implementsTokenRange of options.implementsTokenRanges) {
            this._implementsTypes.push(new HeritageType_1.HeritageType(this.buildExcerpt(implementsTokenRange)));
        }
    }
    static getContainerKey(name) {
        return `${name}|${ApiItem_1.ApiItemKind.Class}`;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.extendsTokenRange = jsonObject.extendsTokenRange;
        options.implementsTokenRanges = jsonObject.implementsTokenRanges;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Class;
    }
    /** @override */
    get containerKey() {
        return ApiClass.getContainerKey(this.name);
    }
    /**
     * The list of interfaces that this class implements using the `implements` keyword.
     */
    get implementsTypes() {
        return this._implementsTypes;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        // Note that JSON does not support the "undefined" value, so we simply omit the field entirely if it is undefined
        if (this.extendsType) {
            jsonObject.extendsTokenRange = this.extendsType.excerpt.tokenRange;
        }
        jsonObject.implementsTokenRanges = this.implementsTypes.map((x) => x.excerpt.tokenRange);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Class);
    }
}
exports.ApiClass = ApiClass;
//# sourceMappingURL=ApiClass.js.map