"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiAbstractMixin = ApiAbstractMixin;
const _isAbstract = Symbol('ApiAbstractMixin._isAbstract');
/**
 * Mixin function for {@link (ApiAbstractMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiAbstractMixin:interface)}
 * functionality.
 *
 * @public
 */
function ApiAbstractMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isAbstract] = options.isAbstract;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.isAbstract = jsonObject.isAbstract || false;
        }
        get isAbstract() {
            return this[_isAbstract];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.isAbstract = this.isAbstract;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiAbstractMixin:interface)}.
 * @public
 */
(function (ApiAbstractMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiAbstractMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isAbstract);
    }
    ApiAbstractMixin.isBaseClassOf = isBaseClassOf;
})(ApiAbstractMixin || (exports.ApiAbstractMixin = ApiAbstractMixin = {}));
//# sourceMappingURL=ApiAbstractMixin.js.map