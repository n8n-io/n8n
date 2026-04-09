// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiProtectedMixin } from '../mixins/ApiProtectedMixin';
import { ApiStaticMixin } from '../mixins/ApiStaticMixin';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReturnTypeMixin } from '../mixins/ApiReturnTypeMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiAbstractMixin } from '../mixins/ApiAbstractMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiOptionalMixin } from '../mixins/ApiOptionalMixin';
/**
 * Represents a TypeScript member function declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethod` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export class Widget {
 *   public render(): void { }
 * }
 * ```
 *
 * Compare with {@link ApiMethodSignature}, which represents a method belonging to an interface.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export class ApiMethod extends ApiNameMixin(ApiAbstractMixin(ApiOptionalMixin(ApiParameterListMixin(ApiProtectedMixin(ApiReleaseTagMixin(ApiReturnTypeMixin(ApiStaticMixin(ApiTypeParameterListMixin(ApiDeclaredItem))))))))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, isStatic, overloadIndex) {
        if (isStatic) {
            return `${name}|${ApiItemKind.Method}|static|${overloadIndex}`;
        }
        else {
            return `${name}|${ApiItemKind.Method}|instance|${overloadIndex}`;
        }
    }
    /** @override */
    get kind() {
        return ApiItemKind.Method;
    }
    /** @override */
    get containerKey() {
        return ApiMethod.getContainerKey(this.name, this.isStatic, this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(this.isStatic ? Navigation.Exports : Navigation.Members, nameComponent)
            .withMeaning(Meaning.Member)
            .withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiMethod.js.map