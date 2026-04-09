"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiTypeParameterListMixin = ApiTypeParameterListMixin;
/* eslint-disable @typescript-eslint/no-redeclare */
const node_core_library_1 = require("@rushstack/node-core-library");
const TypeParameter_1 = require("../model/TypeParameter");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const _typeParameters = Symbol('ApiTypeParameterListMixin._typeParameters');
/**
 * Mixin function for {@link (ApiTypeParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiTypeParameterListMixin:interface)}
 * functionality.
 *
 * @public
 */
function ApiTypeParameterListMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_typeParameters] = [];
            if (this instanceof ApiDeclaredItem_1.ApiDeclaredItem) {
                if (options.typeParameters) {
                    for (const typeParameterOptions of options.typeParameters) {
                        const defaultTypeExcerpt = this.buildExcerpt(typeParameterOptions.defaultTypeTokenRange);
                        const typeParameter = new TypeParameter_1.TypeParameter({
                            name: typeParameterOptions.typeParameterName,
                            constraintExcerpt: this.buildExcerpt(typeParameterOptions.constraintTokenRange),
                            defaultTypeExcerpt,
                            isOptional: !defaultTypeExcerpt.isEmpty,
                            parent: this
                        });
                        this[_typeParameters].push(typeParameter);
                    }
                }
            }
            else {
                throw new node_core_library_1.InternalError('ApiTypeParameterListMixin expects a base class that inherits from ApiDeclaredItem');
            }
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.typeParameters = jsonObject.typeParameters || [];
        }
        get typeParameters() {
            return this[_typeParameters];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            const typeParameterObjects = [];
            for (const typeParameter of this.typeParameters) {
                typeParameterObjects.push({
                    typeParameterName: typeParameter.name,
                    constraintTokenRange: typeParameter.constraintExcerpt.tokenRange,
                    defaultTypeTokenRange: typeParameter.defaultTypeExcerpt.tokenRange
                });
            }
            if (typeParameterObjects.length > 0) {
                jsonObject.typeParameters = typeParameterObjects;
            }
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiTypeParameterListMixin:interface)}.
 * @public
 */
(function (ApiTypeParameterListMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiParameterListMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_typeParameters);
    }
    ApiTypeParameterListMixin.isBaseClassOf = isBaseClassOf;
})(ApiTypeParameterListMixin || (exports.ApiTypeParameterListMixin = ApiTypeParameterListMixin = {}));
//# sourceMappingURL=ApiTypeParameterListMixin.js.map