// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { HeritageType } from './HeritageType';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiInterface` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export interface X extends Y {
 * }
 * ```
 *
 * @public
 */
export class ApiInterface extends ApiItemContainerMixin(ApiNameMixin(ApiTypeParameterListMixin(ApiReleaseTagMixin(ApiExportedMixin(ApiDeclaredItem))))) {
    constructor(options) {
        super(options);
        this._extendsTypes = [];
        for (const extendsTokenRange of options.extendsTokenRanges) {
            this._extendsTypes.push(new HeritageType(this.buildExcerpt(extendsTokenRange)));
        }
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.Interface}`;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.extendsTokenRanges = jsonObject.extendsTokenRanges;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Interface;
    }
    /** @override */
    get containerKey() {
        return ApiInterface.getContainerKey(this.name);
    }
    /**
     * The list of base interfaces that this interface inherits from using the `extends` keyword.
     */
    get extendsTypes() {
        return this._extendsTypes;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.extendsTokenRanges = this.extendsTypes.map((x) => x.excerpt.tokenRange);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Interface);
    }
}
//# sourceMappingURL=ApiInterface.js.map