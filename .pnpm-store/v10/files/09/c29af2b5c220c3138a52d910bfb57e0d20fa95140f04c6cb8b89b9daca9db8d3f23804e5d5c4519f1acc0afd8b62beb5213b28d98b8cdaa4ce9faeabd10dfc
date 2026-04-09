// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Represents a TypeScript namespace declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiNamespace` represents a TypeScript declaration such `X` or `Y` in this example:
 *
 * ```ts
 * export namespace X {
 *   export namespace Y {
 *     export interface IWidget {
 *       render(): void;
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export class ApiNamespace extends ApiItemContainerMixin(ApiNameMixin(ApiReleaseTagMixin(ApiExportedMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.Namespace}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Namespace;
    }
    /** @override */
    get containerKey() {
        return ApiNamespace.getContainerKey(this.name);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Namespace);
    }
}
//# sourceMappingURL=ApiNamespace.js.map