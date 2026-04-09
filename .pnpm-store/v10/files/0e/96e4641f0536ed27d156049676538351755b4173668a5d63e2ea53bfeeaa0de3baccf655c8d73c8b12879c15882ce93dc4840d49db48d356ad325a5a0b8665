// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiOptionalMixin } from '../mixins/ApiOptionalMixin';
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethodSignature` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export interface IWidget {
 *   render(): void;
 * }
 * ```
 *
 * Compare with {@link ApiMethod}, which represents a method belonging to a class.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export class ApiMethodSignature extends ApiNameMixin(ApiTypeParameterListMixin(ApiParameterListMixin(ApiReleaseTagMixin(ApiReturnTypeMixin(ApiOptionalMixin(ApiDeclaredItem)))))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, overloadIndex) {
        return `${name}|${ApiItemKind.MethodSignature}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.MethodSignature;
    }
    /** @override */
    get containerKey() {
        return ApiMethodSignature.getContainerKey(this.name, this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(Navigation.Members, nameComponent)
            .withMeaning(Meaning.Member)
            .withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiMethodSignature.js.map