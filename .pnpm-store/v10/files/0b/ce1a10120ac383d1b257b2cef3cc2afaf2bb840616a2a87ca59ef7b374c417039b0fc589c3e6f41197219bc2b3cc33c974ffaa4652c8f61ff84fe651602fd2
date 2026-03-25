"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStaticMixin = ApiStaticMixin;
const _isStatic = Symbol('ApiStaticMixin._isStatic');
/**
 * Mixin function for {@link (ApiStaticMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiStaticMixin:interface)} functionality.
 *
 * @public
 */
function ApiStaticMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isStatic] = options.isStatic;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.isStatic = jsonObject.isStatic;
        }
        get isStatic() {
            return this[_isStatic];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.isStatic = this.isStatic;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiStaticMixin:interface)}.
 * @public
 */
(function (ApiStaticMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiStaticMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isStatic);
    }
    ApiStaticMixin.isBaseClassOf = isBaseClassOf;
})(ApiStaticMixin || (exports.ApiStaticMixin = ApiStaticMixin = {}));
//# sourceMappingURL=ApiStaticMixin.js.map