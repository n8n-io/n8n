"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiEnum = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiExportedMixin_1 = require("../mixins/ApiExportedMixin");
/**
 * Represents a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnum` represents an enum declaration such as `FontSizes` in the example below:
 *
 * ```ts
 * export enum FontSizes {
 *   Small = 100,
 *   Medium = 200,
 *   Large = 300
 * }
 * ```
 *
 * @public
 */
class ApiEnum extends (0, ApiItemContainerMixin_1.ApiItemContainerMixin)((0, ApiNameMixin_1.ApiNameMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiExportedMixin_1.ApiExportedMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        return `${name}|${ApiItem_1.ApiItemKind.Enum}`;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Enum;
    }
    /** @override */
    get members() {
        return super.members;
    }
    /** @override */
    get containerKey() {
        return ApiEnum.getContainerKey(this.name);
    }
    /** @override */
    addMember(member) {
        if (member.kind !== ApiItem_1.ApiItemKind.EnumMember) {
            throw new Error('Only ApiEnumMember objects can be added to an ApiEnum');
        }
        super.addMember(member);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference_1.DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? DeclarationReference_1.Navigation.Exports : DeclarationReference_1.Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference_1.DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(DeclarationReference_1.Meaning.Enum);
    }
}
exports.ApiEnum = ApiEnum;
//# sourceMappingURL=ApiEnum.js.map