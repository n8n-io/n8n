"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardModifierTagSet = void 0;
var ModifierTagSet_1 = require("./ModifierTagSet");
var StandardTags_1 = require("./StandardTags");
/**
 * Extends the ModifierTagSet base class with getters for modifiers that
 * are part of the standardized core tags for TSDoc.
 */
var StandardModifierTagSet = /** @class */ (function (_super) {
    __extends(StandardModifierTagSet, _super);
    function StandardModifierTagSet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * Returns true if the `@alpha` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isAlpha = function () {
        return this.hasTag(StandardTags_1.StandardTags.alpha);
    };
    /**
     * Returns true if the `@beta` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isBeta = function () {
        return this.hasTag(StandardTags_1.StandardTags.beta);
    };
    /**
     * Returns true if the `@eventProperty` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isEventProperty = function () {
        return this.hasTag(StandardTags_1.StandardTags.eventProperty);
    };
    /**
     * Returns true if the `@experimental` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isExperimental = function () {
        return this.hasTag(StandardTags_1.StandardTags.experimental);
    };
    /**
     * Returns true if the `@internal` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isInternal = function () {
        return this.hasTag(StandardTags_1.StandardTags.internal);
    };
    /**
     * Returns true if the `@override` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isOverride = function () {
        return this.hasTag(StandardTags_1.StandardTags.override);
    };
    /**
     * Returns true if the `@packageDocumentation` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isPackageDocumentation = function () {
        return this.hasTag(StandardTags_1.StandardTags.packageDocumentation);
    };
    /**
     * Returns true if the `@public` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isPublic = function () {
        return this.hasTag(StandardTags_1.StandardTags.public);
    };
    /**
     * Returns true if the `@readonly` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isReadonly = function () {
        return this.hasTag(StandardTags_1.StandardTags.readonly);
    };
    /**
     * Returns true if the `@sealed` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isSealed = function () {
        return this.hasTag(StandardTags_1.StandardTags.sealed);
    };
    /**
     * Returns true if the `@virtual` modifier tag was specified.
     */
    StandardModifierTagSet.prototype.isVirtual = function () {
        return this.hasTag(StandardTags_1.StandardTags.virtual);
    };
    return StandardModifierTagSet;
}(ModifierTagSet_1.ModifierTagSet));
exports.StandardModifierTagSet = StandardModifierTagSet;
//# sourceMappingURL=StandardModifierTagSet.js.map