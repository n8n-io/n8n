// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiReadonlyMixin } from '../mixins/ApiReadonlyMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiInitializerMixin } from '../mixins/ApiInitializerMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Represents a TypeScript variable declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiVariable` represents an exported `const` or `let` object such as these examples:
 *
 * ```ts
 * // A variable declaration
 * export let verboseLogging: boolean;
 *
 * // A constant variable declaration with an initializer
 * export const canvas: IWidget = createCanvas();
 * ```
 *
 * @public
 */
export class ApiVariable extends ApiNameMixin(ApiReleaseTagMixin(ApiReadonlyMixin(ApiInitializerMixin(ApiExportedMixin(ApiDeclaredItem))))) {
    constructor(options) {
        super(options);
        this.variableTypeExcerpt = this.buildExcerpt(options.variableTypeTokenRange);
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.variableTypeTokenRange = jsonObject.variableTypeTokenRange;
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.Variable}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Variable;
    }
    /** @override */
    get containerKey() {
        return ApiVariable.getContainerKey(this.name);
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.variableTypeTokenRange = this.variableTypeExcerpt.tokenRange;
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Variable);
    }
}
//# sourceMappingURL=ApiVariable.js.map