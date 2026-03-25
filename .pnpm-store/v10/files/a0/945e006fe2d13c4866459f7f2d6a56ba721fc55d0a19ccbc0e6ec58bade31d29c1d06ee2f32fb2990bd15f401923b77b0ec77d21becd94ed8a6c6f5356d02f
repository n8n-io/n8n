"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModifierTagSet = void 0;
var TSDocTagDefinition_1 = require("../configuration/TSDocTagDefinition");
/**
 * Represents a set of modifier tags that were extracted from a doc comment.
 *
 * @remarks
 * TSDoc modifier tags are block tags that do not have any associated rich text content.
 * Instead, their presence or absence acts as an on/off switch, indicating some aspect
 * of the underlying API item.  For example, the `@internal` modifier indicates that a
 * signature is internal (i.e. not part of the public API contract).
 */
var ModifierTagSet = /** @class */ (function () {
    function ModifierTagSet() {
        this._nodes = [];
        // NOTE: To implement case insensitivity, the keys in this set are always upper-case.
        // This convention makes the normalization more obvious (and as a general practice handles
        // the Turkish "i" character correctly).
        this._nodesByName = new Map();
    }
    Object.defineProperty(ModifierTagSet.prototype, "nodes", {
        /**
         * The original block tag nodes that defined the modifiers in this set, excluding duplicates.
         */
        get: function () {
            return this._nodes;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Returns true if the set contains a DocBlockTag with the specified tag name.
     * Note that synonyms are not considered.  The comparison is case-insensitive.
     * @param modifierTagName - The name of the tag, including the `@` prefix  For example, `@internal`
     */
    ModifierTagSet.prototype.hasTagName = function (modifierTagName) {
        return this._nodesByName.has(modifierTagName.toUpperCase());
    };
    /**
     * Returns true if the set contains a DocBlockTag matching the specified tag definition.
     * Note that synonyms are not considered.  The comparison is case-insensitive.
     * The TSDocTagDefinition must be a modifier tag.
     * @param tagName - The name of the tag, including the `@` prefix  For example, `@internal`
     */
    ModifierTagSet.prototype.hasTag = function (modifierTagDefinition) {
        return !!this.tryGetTag(modifierTagDefinition);
    };
    /**
     * Returns a DocBlockTag matching the specified tag definition, or undefined if no such
     * tag was added to the set.  If there were multiple instances, returned object will be
     * the first one to be added.
     */
    ModifierTagSet.prototype.tryGetTag = function (modifierTagDefinition) {
        if (modifierTagDefinition.syntaxKind !== TSDocTagDefinition_1.TSDocTagSyntaxKind.ModifierTag) {
            throw new Error('The tag definition is not a modifier tag');
        }
        return this._nodesByName.get(modifierTagDefinition.tagNameWithUpperCase);
    };
    /**
     * Adds a new modifier tag to the set.  If a tag already exists with the same name,
     * then no change is made, and the return value is false.
     */
    ModifierTagSet.prototype.addTag = function (blockTag) {
        if (this._nodesByName.has(blockTag.tagNameWithUpperCase)) {
            return false;
        }
        this._nodesByName.set(blockTag.tagNameWithUpperCase, blockTag);
        this._nodes.push(blockTag);
        return true;
    };
    return ModifierTagSet;
}());
exports.ModifierTagSet = ModifierTagSet;
//# sourceMappingURL=ModifierTagSet.js.map