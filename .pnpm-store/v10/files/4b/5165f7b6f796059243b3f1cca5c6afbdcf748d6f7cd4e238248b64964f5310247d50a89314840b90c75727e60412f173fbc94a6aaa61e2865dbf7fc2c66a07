// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Represents a TypeScript type alias declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiTypeAlias` represents a definition such as one of these examples:
 *
 * ```ts
 * // A union type:
 * export type Shape = Square | Triangle | Circle;
 *
 * // A generic type alias:
 * export type BoxedValue<T> = { value: T };
 *
 * export type BoxedArray<T> = { array: T[] };
 *
 * // A conditional type alias:
 * export type Boxed<T> = T extends any[] ? BoxedArray<T[number]> : BoxedValue<T>;
 *
 * ```
 *
 * @public
 */
export class ApiTypeAlias extends ApiTypeParameterListMixin(ApiNameMixin(ApiReleaseTagMixin(ApiExportedMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
        this.typeExcerpt = this.buildExcerpt(options.typeTokenRange);
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.typeTokenRange = jsonObject.typeTokenRange;
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.TypeAlias}`;
    }
    /** @override */
    get kind() {
        return ApiItemKind.TypeAlias;
    }
    /** @override */
    get containerKey() {
        return ApiTypeAlias.getContainerKey(this.name);
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.typeTokenRange = this.typeExcerpt.tokenRange;
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.TypeAlias);
    }
}
//# sourceMappingURL=ApiTypeAlias.js.map