// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiInitializerMixin } from '../mixins/ApiInitializerMixin';
/**
 * Options for customizing the sort order of {@link ApiEnum} members.
 *
 * @privateRemarks
 * This enum is currently only used by the `@microsoft/api-extractor` package; it is declared here
 * because we anticipate that if more options are added in the future, their sorting will be implemented
 * by the `@microsoft/api-extractor-model` package.
 *
 * See https://github.com/microsoft/rushstack/issues/918 for details.
 *
 * @public
 */
export var EnumMemberOrder;
(function (EnumMemberOrder) {
    /**
     * `ApiEnumMember` items are sorted according to their {@link ApiItem.getSortKey}.  The order is
     * basically alphabetical by identifier name, but otherwise unspecified to allow for cosmetic improvements.
     *
     * This is the default behavior.
     */
    EnumMemberOrder["ByName"] = "by-name";
    /**
     * `ApiEnumMember` items preserve the original order of the declarations in the source file.
     * (This disables the automatic sorting that is normally applied based on {@link ApiItem.getSortKey}.)
     */
    EnumMemberOrder["Preserve"] = "preserve";
})(EnumMemberOrder || (EnumMemberOrder = {}));
/**
 * Represents a member of a TypeScript enum declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEnumMember` represents an enum member such as `Small = 100` in the example below:
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
export class ApiEnumMember extends ApiNameMixin(ApiReleaseTagMixin(ApiInitializerMixin(ApiDeclaredItem))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        // No prefix needed, because ApiEnumMember is the only possible member of an ApiEnum
        return name;
    }
    /** @override */
    get kind() {
        return ApiItemKind.EnumMember;
    }
    /** @override */
    get containerKey() {
        return ApiEnumMember.getContainerKey(this.name);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(Navigation.Exports, nameComponent)
            .withMeaning(Meaning.Member);
    }
}
//# sourceMappingURL=ApiEnumMember.js.map