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
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Represents a TypeScript function declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiFunction` represents a TypeScript declaration such as this example:
 *
 * ```ts
 * export function getAverage(x: number, y: number): number {
 *   return (x + y) / 2.0;
 * }
 * ```
 *
 * Functions are exported by an entry point module or by a namespace.  Compare with {@link ApiMethod}, which
 * represents a function that is a member of a class.
 *
 * @public
 */
export class ApiFunction extends ApiNameMixin(ApiTypeParameterListMixin(ApiParameterListMixin(ApiReleaseTagMixin(ApiReturnTypeMixin(ApiExportedMixin(ApiDeclaredItem)))))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name, overloadIndex) {
        return `${name}|${ApiItemKind.Function}|${overloadIndex}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Function;
    }
    /** @override */
    get containerKey() {
        return ApiFunction.getContainerKey(this.name, this.overloadIndex);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Function)
            .withOverloadIndex(this.overloadIndex);
    }
}
//# sourceMappingURL=ApiFunction.js.map