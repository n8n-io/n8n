"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiNameMixin = ApiNameMixin;
const _name = Symbol('ApiNameMixin._name');
/**
 * Mixin function for {@link (ApiNameMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiNameMixin:interface)} functionality.
 *
 * @public
 */
function ApiNameMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_name] = options.name;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            options.name = jsonObject.name;
        }
        get name() {
            return this[_name];
        }
        /** @override */
        get displayName() {
            return this[_name];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.name = this.name;
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiNameMixin:interface)}.
 * @public
 */
(function (ApiNameMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiNameMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_name);
    }
    ApiNameMixin.isBaseClassOf = isBaseClassOf;
})(ApiNameMixin || (exports.ApiNameMixin = ApiNameMixin = {}));
//# sourceMappingURL=ApiNameMixin.js.map