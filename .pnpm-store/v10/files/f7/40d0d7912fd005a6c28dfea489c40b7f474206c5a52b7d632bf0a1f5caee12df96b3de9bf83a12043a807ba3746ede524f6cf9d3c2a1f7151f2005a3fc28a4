// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { ApiReadonlyMixin } from '../mixins/ApiReadonlyMixin';
/**
 * Represents a TypeScript index signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiIndexSignature` represents a TypeScript declaration such as `[x: number]: number` in this example:
 *
 * ```ts
 * export interface INumberTable {
 *   // An index signature
 *   [value: number]: number;
 *
 *   // An overloaded index signature
 *   [name: string]: number;
 * }
 * ```
 *
 * @public
 */
export class ApiIndexSignature extends ApiParameterListMixin(ApiReleaseTagMixin(ApiReturnTypeMixin(ApiReadonlyMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItemKind.IndexSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.IndexSignature;
    }
    /** @override */
    get containerKey() {
        return ApiIndexSignature.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference.empty().addNavigationStep(Navigation.Members, '(parent)');
        return parent.withMeaning(Meaning.IndexSignature).withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiIndexSignature.js.map