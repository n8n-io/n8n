"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiReturnTypeMixin = ApiReturnTypeMixin;
/* eslint-disable @typescript-eslint/no-redeclare */
const node_core_library_1 = require("@rushstack/node-core-library");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const _returnTypeExcerpt = Symbol('ApiReturnTypeMixin._returnTypeExcerpt');
/**
 * Mixin function for {@link (ApiReturnTypeMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReturnTypeMixin:interface)} functionality.
 *
 * @public
 */
function ApiReturnTypeMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            if (this instanceof ApiDeclaredItem_1.ApiDeclaredItem) {
                this[_returnTypeExcerpt] = this.buildExcerpt(options.returnTypeTokenRange);
            }
            else {
                throw new node_core_library_1.InternalError('ApiReturnTypeMixin expects a base class that inherits from ApiDeclaredItem');
            }
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.returnTypeTokenRange = jsonObject.returnTypeTokenRange;
        }
        get returnTypeExcerpt() {
            return this[_returnTypeExcerpt];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.returnTypeTokenRange = this.returnTypeExcerpt.tokenRange;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiReturnTypeMixin:interface)}.
 * @public
 */
(function (ApiReturnTypeMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReturnTypeMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_returnTypeExcerpt);
    }
    ApiReturnTypeMixin.isBaseClassOf = isBaseClassOf;
})(ApiReturnTypeMixin || (exports.ApiReturnTypeMixin = ApiReturnTypeMixin = {}));
//# sourceMappingURL=ApiReturnTypeMixin.js.map