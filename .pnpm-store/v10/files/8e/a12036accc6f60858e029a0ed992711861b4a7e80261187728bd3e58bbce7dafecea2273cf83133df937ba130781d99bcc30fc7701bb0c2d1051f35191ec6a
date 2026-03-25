"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiProtectedMixin = ApiProtectedMixin;
const _isProtected = Symbol('ApiProtectedMixin._isProtected');
/**
 * Mixin function for {@link (ApiProtectedMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiProtectedMixin:interface)} functionality.
 *
 * @public
 */
function ApiProtectedMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isProtected] = options.isProtected;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.isProtected = jsonObject.isProtected;
        }
        get isProtected() {
            return this[_isProtected];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.isProtected = this.isProtected;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiProtectedMixin:interface)}.
 * @public
 */
(function (ApiProtectedMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiProtectedMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isProtected);
    }
    ApiProtectedMixin.isBaseClassOf = isBaseClassOf;
})(ApiProtectedMixin || (exports.ApiProtectedMixin = ApiProtectedMixin = {}));
//# sourceMappingURL=ApiProtectedMixin.js.map