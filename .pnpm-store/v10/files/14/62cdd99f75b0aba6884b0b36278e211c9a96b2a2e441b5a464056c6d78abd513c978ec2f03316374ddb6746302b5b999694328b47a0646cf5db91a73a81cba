"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiOptionalMixin = ApiOptionalMixin;
const _isOptional = Symbol('ApiOptionalMixin._isOptional');
/**
 * Mixin function for {@link (ApiOptionalMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiOptionalMixin:interface)} functionality.
 *
 * @public
 */
function ApiOptionalMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isOptional] = !!options.isOptional;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.isOptional = !!jsonObject.isOptional;
        }
        get isOptional() {
            return this[_isOptional];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.isOptional = this.isOptional;
        }
    }
    return MixedClass;
}
/**
 * Optional members for {@link (ApiOptionalMixin:interface)}.
 * @public
 */
(function (ApiOptionalMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiOptionalMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isOptional);
    }
    ApiOptionalMixin.isBaseClassOf = isBaseClassOf;
})(ApiOptionalMixin || (exports.ApiOptionalMixin = ApiOptionalMixin = {}));
//# sourceMappingURL=ApiOptionalMixin.js.map