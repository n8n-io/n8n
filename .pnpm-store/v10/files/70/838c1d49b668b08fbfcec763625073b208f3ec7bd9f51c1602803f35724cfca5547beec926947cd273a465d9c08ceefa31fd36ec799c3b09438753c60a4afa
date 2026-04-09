"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSDocTagDefinition = exports.TSDocTagSyntaxKind = void 0;
const StringChecks_1 = require("../parser/StringChecks");
const Standardization_1 = require("../details/Standardization");
/**
 * Determines the type of syntax for a TSDocTagDefinition
 */
var TSDocTagSyntaxKind;
(function (TSDocTagSyntaxKind) {
    /**
     * The tag is intended to be an inline tag.  For example: `{@link}`.
     */
    TSDocTagSyntaxKind[TSDocTagSyntaxKind["InlineTag"] = 0] = "InlineTag";
    /**
     * The tag is intended to be a block tag that starts a new documentation
     * section.  For example: `@remarks`
     */
    TSDocTagSyntaxKind[TSDocTagSyntaxKind["BlockTag"] = 1] = "BlockTag";
    /**
     * The tag is intended to be a modifier tag whose presence indicates
     * an aspect of the associated API item.  For example: `@internal`
     */
    TSDocTagSyntaxKind[TSDocTagSyntaxKind["ModifierTag"] = 2] = "ModifierTag";
})(TSDocTagSyntaxKind || (exports.TSDocTagSyntaxKind = TSDocTagSyntaxKind = {}));
/**
 * Defines a TSDoc tag that will be understood by the TSDocParser.
 */
class TSDocTagDefinition {
    constructor(parameters) {
        StringChecks_1.StringChecks.validateTSDocTagName(parameters.tagName);
        this.tagName = parameters.tagName;
        this.tagNameWithUpperCase = parameters.tagName.toUpperCase();
        this.syntaxKind = parameters.syntaxKind;
        this.standardization =
            parameters.standardization || Standardization_1.Standardization.None;
        this.allowMultiple = !!parameters.allowMultiple;
    }
    /**
     * Throws an exception if `tagName` is not a valid TSDoc tag name.
     */
    static validateTSDocTagName(tagName) {
        StringChecks_1.StringChecks.validateTSDocTagName(tagName);
    }
}
exports.TSDocTagDefinition = TSDocTagDefinition;
//# sourceMappingURL=TSDocTagDefinition.js.map