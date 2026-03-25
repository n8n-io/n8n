"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiReadonlyMixin = ApiReadonlyMixin;
const _isReadonly = Symbol('ApiReadonlyMixin._isReadonly');
/**
 * Mixin function for {@link (ApiReadonlyMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReadonlyMixin:interface)}
 * functionality.
 *
 * @public
 */
function ApiReadonlyMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isReadonly] = options.isReadonly;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.isReadonly = jsonObject.isReadonly || false;
        }
        get isReadonly() {
            return this[_isReadonly];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.isReadonly = this.isReadonly;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiReadonlyMixin:interface)}.
 * @public
 */
(function (ApiReadonlyMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReadonlyMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isReadonly);
    }
    ApiReadonlyMixin.isBaseClassOf = isBaseClassOf;
})(ApiReadonlyMixin || (exports.ApiReadonlyMixin = ApiReadonlyMixin = {}));
//# sourceMappingURL=ApiReadonlyMixin.js.map