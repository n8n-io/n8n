"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiReleaseTagMixin = ApiReleaseTagMixin;
/* eslint-disable @typescript-eslint/no-redeclare */
const node_core_library_1 = require("@rushstack/node-core-library");
const ReleaseTag_1 = require("../aedoc/ReleaseTag");
const _releaseTag = Symbol('ApiReleaseTagMixin._releaseTag');
/**
 * Mixin function for {@link (ApiReleaseTagMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiReleaseTagMixin:interface)} functionality.
 *
 * @public
 */
function ApiReleaseTagMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_releaseTag] = options.releaseTag;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            const deserializedReleaseTag = node_core_library_1.Enum.tryGetValueByKey(ReleaseTag_1.ReleaseTag, // eslint-disable-line
            jsonObject.releaseTag);
            if (deserializedReleaseTag === undefined) {
                throw new Error(`Failed to deserialize release tag ${JSON.stringify(jsonObject.releaseTag)}`);
            }
            options.releaseTag = deserializedReleaseTag;
        }
        get releaseTag() {
            return this[_releaseTag];
        }
        /** @override */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
            jsonObject.releaseTag = ReleaseTag_1.ReleaseTag[this.releaseTag];
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiReleaseTagMixin:interface)}.
 * @public
 */
(function (ApiReleaseTagMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiReleaseTagMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_releaseTag);
    }
    ApiReleaseTagMixin.isBaseClassOf = isBaseClassOf;
})(ApiReleaseTagMixin || (exports.ApiReleaseTagMixin = ApiReleaseTagMixin = {}));
//# sourceMappingURL=ApiReleaseTagMixin.js.map