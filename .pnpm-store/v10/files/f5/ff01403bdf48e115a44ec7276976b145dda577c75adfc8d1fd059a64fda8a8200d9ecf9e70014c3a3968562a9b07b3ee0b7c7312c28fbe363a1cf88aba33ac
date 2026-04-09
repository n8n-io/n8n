// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiProtectedMixin } from '../mixins/ApiProtectedMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
/**
 * Represents a TypeScript class constructor declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiConstructor` represents a declaration using the `constructor` keyword such as in this example:
 *
 * ```ts
 * export class Vector {
 *   public x: number;
 *   public y: number;
 *
 *   // A class constructor:
 *   public constructor(x: number, y: number) {
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 * ```
 *
 * Compare with {@link ApiConstructSignature}, which describes the construct signature for a class constructor.
 *
 * @public
 */
export class ApiConstructor extends ApiParameterListMixin(ApiProtectedMixin(ApiReleaseTagMixin(ApiDeclaredItem))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItemKind.Constructor}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Constructor;
    }
    /** @override */
    get containerKey() {
        return ApiConstructor.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference.empty().addNavigationStep(Navigation.Members, '(parent)');
        return parent.withMeaning(Meaning.Constructor).withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiConstructor.js.map