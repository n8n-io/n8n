"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiTypeAlias = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiTypeParameterListMixin_1 = require("../mixins/ApiTypeParameterListMixin");
const ApiExportedMixin_1 = require("../mixins/ApiExportedMixin");
/**
 * Represents a TypeScript type alias declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiTypeAlias` represents a definition such as one of these examples:
 *
 * ```ts
 * // A union type:
 * export type Shape = Square | Triangle | Circle;
 *
 * // A generic type alias:
 * export type BoxedValue<T> = { value: T };
 *
 * export type BoxedArray<T> = { array: T[] };
 *
 * // A conditional type alias:
 * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
 *
 * ```
 *
 * @public
 */
class ApiTypeAlias extends (0, ApiTypeParameterListMixin_1.ApiTypeParameterListMixin)((0, ApiNameMixin_1.ApiNameMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiExportedMixin_1.ApiExportedMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
        this.typeExcerpt = this.buildExcerpt(options.typeTokenRange);
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.typeTokenRange = jsonObject.typeTokenRange;
    }
    static getContainerKey(name) {
        return `${name}|${ApiItem_1.ApiItemKind.TypeAlias}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.TypeAlias;
    }
    /** @override */
    get containerKey() {
        return ApiTypeAlias.getContainerKey(this.name);
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.typeTokenRange = this.typeExcerpt.tokenRange;
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.TypeAlias);
    }
}
exports.ApiTypeAlias = ApiTypeAlias;
//# sourceMappingURL=ApiTypeAlias.js.map