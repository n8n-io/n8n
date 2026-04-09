// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference, Meaning, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItemKind } from '../items/ApiItem';
import { ApiDeclaredItem } from '../items/ApiDeclaredItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { HeritageType } from './HeritageType';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiTypeParameterListMixin } from '../mixins/ApiTypeParameterListMixin';
import { ApiExportedMixin } from '../mixins/ApiExportedMixin';
import { ApiAbstractMixin } from '../mixins/ApiAbstractMixin';
/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiClass` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export class X { }
 * ```
 *
 * @public
 */
export class ApiClass extends ApiItemContainerMixin(ApiNameMixin(ApiAbstractMixin(ApiTypeParameterListMixin(ApiReleaseTagMixin(ApiExportedMixin(ApiDeclaredItem)))))) {
    constructor(options) {
        super(options);
        this._implementsTypes = [];
        if (options.extendsTokenRange) {
            this.extendsType = new HeritageType(this.buildExcerpt(options.extendsTokenRange));
        }
        else {
            this.extendsType = undefined;
        }
        for (const implementsTokenRange of options.implementsTokenRanges) {
            this._implementsTypes.push(new HeritageType(this.buildExcerpt(implementsTokenRange)));
        }
    }
    static getContainerKey(name) {
        return `${name}|${ApiItemKind.Class}`;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.extendsTokenRange = jsonObject.extendsTokenRange;
        options.implementsTokenRanges = jsonObject.implementsTokenRanges;
    }
    /** @override */
    get kind() {
        return ApiItemKind.Class;
    }
    /** @override */
    get containerKey() {
        return ApiClass.getContainerKey(this.name);
    }
    /**
     * The list of interfaces that this class implements using the `implements` keyword.
     */
    get implementsTypes() {
        return this._implementsTypes;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        // Note that JSON does not support the "undefined" value, so we simply omit the field entirely if it is undefined
        if (this.extendsType) {
            jsonObject.extendsTokenRange = this.extendsType.excerpt.tokenRange;
        }
        jsonObject.implementsTokenRanges = this.implementsTypes.map((x) => x.excerpt.tokenRange);
    }
    /** @beta @override */
    buildCanonicalReference() {
        const nameComponent = DeclarationReference.parseComponent(this.name);
        const navigation = this.isExported ? Navigation.Exports : Navigation.Locals;
        return (this.parent ? this.parent.canonicalReference : DeclarationReference.empty())
            .addNavigationStep(navigation, nameComponent)
            .withMeaning(Meaning.Class);
    }
}
//# sourceMappingURL=ApiClass.js.map