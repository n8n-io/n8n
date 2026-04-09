// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { StringChecks } from '../parser/StringChecks';
import { Standardization } from '../details/Standardization';
/**
 * Determines the type of syntax for a TSDocTagDefinition
 */
export var TSDocTagSyntaxKind;
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
})(TSDocTagSyntaxKind || (TSDocTagSyntaxKind = {}));
/**
 * Defines a TSDoc tag that will be understood by the TSDocParser.
 */
export class TSDocTagDefinition {
    constructor(parameters) {
        StringChecks.validateTSDocTagName(parameters.tagName);
        this.tagName = parameters.tagName;
        this.tagNameWithUpperCase = parameters.tagName.toUpperCase();
        this.syntaxKind = parameters.syntaxKind;
        this.standardization =
            parameters.standardization || Standardization.None;
        this.allowMultiple = !!parameters.allowMultiple;
    }
    /**
     * Throws an exception if `tagName` is not a valid TSDoc tag name.
     */
    static validateTSDocTagName(tagName) {
        StringChecks.validateTSDocTagName(tagName);
    }
}
//# sourceMappingURL=TSDocTagDefinition.js.map