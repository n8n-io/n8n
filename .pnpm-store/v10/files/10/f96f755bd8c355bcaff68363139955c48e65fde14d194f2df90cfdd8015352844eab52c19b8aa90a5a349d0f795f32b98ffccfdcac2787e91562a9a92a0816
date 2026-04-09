"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiInitializerMixin = ApiInitializerMixin;
/* eslint-disable @typescript-eslint/no-redeclare */
const node_core_library_1 = require("@rushstack/node-core-library");
const ApiDeclaredItem_1 = require("../items/ApiDeclaredItem");
const _initializerExcerpt = Symbol('ApiInitializerMixin._initializerExcerpt');
/**
 * Mixin function for {@link (ApiInitializerMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiInitializerMixin:interface)} functionality.
 *
 * @public
 */
function ApiInitializerMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            if (this instanceof ApiDeclaredItem_1.ApiDeclaredItem) {
                if (options.initializerTokenRange) {
                    this[_initializerExcerpt] = this.buildExcerpt(options.initializerTokenRange);
                }
            }
            else {
                throw new node_core_library_1.InternalError('ApiInitializerMixin expects a base class that inherits from ApiDeclaredItem');
            }
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.initializerTokenRange = jsonObject.initializerTokenRange;
        }
        get initializerExcerpt() {
            return this[_initializerExcerpt];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            // Note that JSON does not support the "undefined" value, so we simply omit the field entirely if it is undefined
            if (this.initializerExcerpt) {
                jsonObject.initializerTokenRange = this.initializerExcerpt.tokenRange;
            }
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiInitializerMixin:interface)}.
 * @public
 */
(function (ApiInitializerMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiInitializerMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_initializerExcerpt);
    }
    ApiInitializerMixin.isBaseClassOf = isBaseClassOf;
})(ApiInitializerMixin || (exports.ApiInitializerMixin = ApiInitializerMixin = {}));
//# sourceMappingURL=ApiInitializerMixin.js.map