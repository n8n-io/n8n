// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
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
export class ApiEnum extends ApiItemContainerMixin(ApiNameMixin(ApiReleaseTagMixin(ApiExportedMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.Enum}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Enum;
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
        if (member.kind !== ApiItemKind.EnumMember) {
            throw new Error('Only ApiEnumMember objects can be added to an ApiEnum');
        }
        super.addMember(member);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Enum);
    }
}
//# sourceMappingURL=ApiEnum.js.map