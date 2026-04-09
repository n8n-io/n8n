// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/* eslint-disable @typescript-eslint/no-redeclare */
import { DeclarationReference, Navigation } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
const _isExported = Symbol('ApiExportedMixin._isExported');
/**
 * Mixin function for {@link (ApiExportedMixin:interface)}.
 *
 * @param baseClass - The base class to be extended
 * @returns A child class that extends baseClass, adding the {@link (ApiExportedMixin:interface)} functionality.
 *
 * @public
 */
export function ApiExportedMixin(baseClass
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    class MixedClass extends baseClass {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args) {
            super(...args);
            const options = args[0];
            this[_isExported] = options.isExported;
        }
        /** @override */
        static onDeserializeInto(options, context, jsonObject) {
            baseClass.onDeserializeInto(options, context, jsonObject);
            const declarationReference = DeclarationReference.parse(jsonObject.canonicalReference);
            options.isExported = declarationReference.navigation === Navigation.Exports;
        }
        get isExported() {
            return this[_isExported];
        }
        /**
         * The `isExported` property is intentionally not serialized because the information is already present
         * in the item's `canonicalReference`.
         * @override
         */
        serializeInto(jsonObject) {
            super.serializeInto(jsonObject);
        }
    }
    return MixedClass;
}
/**
 * Static members for {@link (ApiExportedMixin:interface)}.
 * @public
 */
(function (ApiExportedMixin) {
    /**
     * A type guard that tests whether the specified `ApiItem` subclass extends the `ApiExportedMixin` mixin.
     *
     * @remarks
     *
     * The JavaScript `instanceof` operator cannot be used to test for mixin inheritance, because each invocation of
     * the mixin function produces a different subclass.  (This could be mitigated by `Symbol.hasInstance`, however
     * the TypeScript type system cannot invoke a runtime test.)
     */
    function isBaseClassOf(apiItem) {
        return apiItem.hasOwnProperty(_isExported);
    }
    ApiExportedMixin.isBaseClassOf = isBaseClassOf;
})(ApiExportedMixin || (ApiExportedMixin = {}));
//# sourceMappingURL=ApiExportedMixin.js.map