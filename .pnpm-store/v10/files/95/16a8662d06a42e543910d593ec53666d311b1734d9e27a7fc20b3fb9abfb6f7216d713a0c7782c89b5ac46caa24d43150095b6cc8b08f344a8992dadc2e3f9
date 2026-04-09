// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { ApiDeclaredItem } from './ApiDeclaredItem';
import { ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiOptionalMixin } from '../mixins/ApiOptionalMixin';
import { ApiReadonlyMixin } from '../mixins/ApiReadonlyMixin';
/**
 * The abstract base class for {@link ApiProperty} and {@link ApiPropertySignature}.
 *
 * @public
 */
export class ApiPropertyItem extends ApiNameMixin(ApiReleaseTagMixin(ApiOptionalMixin(ApiReadonlyMixin(ApiDeclaredItem)))) {
    constructor(options) {
        super(options);
        this.propertyTypeExcerpt = this.buildExcerpt(options.propertyTypeTokenRange);
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.propertyTypeTokenRange = jsonObject.propertyTypeTokenRange;
    }
    /**
     * Returns true if this property should be documented as an event.
     *
     * @remarks
     * The `@eventProperty` TSDoc modifier can be added to readonly properties to indicate that they return an
     * event object that event handlers can be attached to.  The event-handling API is implementation-defined, but
     * typically the return type would be a class with members such as `addHandler()` and `removeHandler()`.
     * The documentation should display such properties under an "Events" heading instead of the
     * usual "Properties" heading.
     */
    get isEventProperty() {
        if (this.tsdocComment) {
            return this.tsdocComment.modifierTagSet.isEventProperty();
        }
        return false;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.propertyTypeTokenRange = this.propertyTypeExcerpt.tokenRange;
    }
}
//# sourceMappingURL=ApiPropertyItem.js.map