// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
/**
 * Represents a TypeScript function call signature.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiCallSignature` represents a TypeScript declaration such as `(x: number, y: number): number`
 * in this example:
 *
 * ```ts
 * export interface IChooser {
 *   // A call signature:
 *   (x: number, y: number): number;
 *
 *   // Another overload for this call signature:
 *   (x: string, y: string): string;
 * }
 *
 * function chooseFirst<T>(x: T, y: T): T {
 *   return x;
 * }
 *
 * let chooser: IChooser = chooseFirst;
 * ```
 *
 * @public
 */
export class ApiCallSignature extends ApiTypeParameterListMixin(ApiParameterListMixin(ApiReleaseTagMixin(ApiReturnTypeMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(overloadIndex) {
        return `|${ApiItemKind.CallSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.CallSignature;
    }
    /** @override */
    get containerKey() {
        return ApiCallSignature.getContainerKey(this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const parent = this.parent
            ? this.parent.canonicalReference
            : // .withMeaning() requires some kind of component
                DeclarationReference.empty().addNavigationStep(Navigation.Members, '(parent)');
        return parent.withMeaning(Meaning.CallSignature).withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiCallSignature.js.map