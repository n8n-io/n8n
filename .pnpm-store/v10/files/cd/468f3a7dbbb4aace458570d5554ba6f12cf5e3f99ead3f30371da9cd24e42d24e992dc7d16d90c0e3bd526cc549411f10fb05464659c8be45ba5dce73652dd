"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPropertyItem = void 0;
const ApiDeclaredItem_1 = require("./ApiDeclaredItem");
const ApiReleaseTagMixin_1 = require("../mixins/ApiReleaseTagMixin");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const ApiOptionalMixin_1 = require("../mixins/ApiOptionalMixin");
const ApiReadonlyMixin_1 = require("../mixins/ApiReadonlyMixin");
/**
 * The abstract base class for {@link ApiProperty} and {@link ApiPropertySignature}.
 *
 * @public
 */
class ApiPropertyItem extends (0, ApiNameMixin_1.ApiNameMixin)((0, ApiReleaseTagMixin_1.ApiReleaseTagMixin)((0, ApiOptionalMixin_1.ApiOptionalMixin)((0, ApiReadonlyMixin_1.ApiReadonlyMixin)(ApiDeclaredItem_1.ApiDeclaredItem)))) {
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
exports.ApiPropertyItem = ApiPropertyItem;
//# sourceMappingURL=ApiPropertyItem.js.map