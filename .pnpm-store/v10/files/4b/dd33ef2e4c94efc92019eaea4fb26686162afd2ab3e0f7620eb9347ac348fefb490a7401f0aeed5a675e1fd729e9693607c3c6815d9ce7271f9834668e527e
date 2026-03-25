"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiParameterListMixin = ApiParameterListMixin;
const Parameter_1 = require("../model/Parameter");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const node_core_library_1 = require("@rushstack/node-core-library");
const _overloadIndex = Symbol('ApiParameterListMixin._overloadIndex');
const _parameters = Symbol('ApiParameterListMixin._parameters');
/**
 * Mixin function for {@link (ApiParameterListMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiParameterListMixin:interface)} functionality.
 *
 * @public
 */
function ApiParameterListMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_overloadIndex] = options.overloadIndex;
            this[_parameters] = [];
            if (this instanceof ApiDeclaredItem_1.ApiDeclaredItem) {
                if (options.parameters) {
                    for (const parameterOptions of options.parameters) {
                        const parameter = new Parameter_1.Parameter({
                            name: parameterOptions.parameterName,
                            parameterTypeExcerpt: this.buildExcerpt(parameterOptions.parameterTypeTokenRange),
                            // Prior to ApiJsonSchemaVersion.V_1005 this input will be undefined
                            isOptional: !!parameterOptions.isOptional,
                            parent: this
                        });
                        this[_parameters].push(parameter);
                    }
                }
            }
            else {
                throw new node_core_library_1.InternalError('ApiReturnTypeMixin expects a base class that inherits from ApiDeclaredItem');
            }
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.overloadIndex = jsonObject.overloadIndex;
            options.parameters = jsonObject.parameters || [];
        }
        get overloadIndex() {
            return this[_overloadIndex];
        }
        get parameters() {
            return this[_parameters];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.overloadIndex = this.overloadIndex;
            const parameterObjects = [];
            for (const parameter of this.parameters) {
                parameterObjects.push({
                    parameterName: parameter.name,
                    parameterTypeTokenRange: parameter.parameterTypeExcerpt.tokenRange,
                    isOptional: parameter.isOptional
                });
            }
            jsonObject.parameters = parameterObjects;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiParameterListMixin:interface)}.
 * @public
 */
(function (ApiParameterListMixin) {
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
        return apiItem.hasOwnProperty(_parameters);
    }
    ApiParameterListMixin.isBaseClassOf = isBaseClassOf;
})(ApiParameterListMixin || (exports.ApiParameterListMixin = ApiParameterListMixin = {}));
//# sourceMappingURL=ApiParameterListMixin.js.map