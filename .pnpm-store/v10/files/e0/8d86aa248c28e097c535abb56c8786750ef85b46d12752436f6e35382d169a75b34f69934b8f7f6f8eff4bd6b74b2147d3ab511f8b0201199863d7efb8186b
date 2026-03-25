// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { StandardTags } from '../details/StandardTags';
import { TSDocValidationConfiguration } from './TSDocValidationConfiguration';
import { DocNodeManager } from './DocNodeManager';
import { BuiltInDocNodes } from '../nodes/BuiltInDocNodes';
import { allTsdocMessageIds, allTsdocMessageIdsSet } from '../parser/TSDocMessageId';
/**
 * Configuration for the TSDocParser.
 */
var TSDocConfiguration = /** @class */ (function () {
    function TSDocConfiguration() {
        this._tagDefinitions = [];
        this._tagDefinitionsByName = new Map();
        this._supportedTagDefinitions = new Set();
        this._validation = new TSDocValidationConfiguration();
        this._docNodeManager = new DocNodeManager();
        this._supportedHtmlElements = new Set();
        this.clear(false);
        // Register the built-in node kinds
        BuiltInDocNodes.register(this);
    }
    /**
     * Resets the `TSDocConfiguration` object to its initial empty state.
     * @param noStandardTags - The `TSDocConfiguration` constructor normally adds definitions for the
     * standard TSDoc tags.  Set `noStandardTags` to true for a completely empty `tagDefinitions` collection.
     */
    TSDocConfiguration.prototype.clear = function (noStandardTags) {
        if (noStandardTags === void 0) { noStandardTags = false; }
        this._tagDefinitions.length = 0;
        this._tagDefinitionsByName.clear();
        this._supportedTagDefinitions.clear();
        this._validation.ignoreUndefinedTags = false;
        this._validation.reportUnsupportedTags = false;
        this._validation.reportUnsupportedHtmlElements = false;
        this._supportedHtmlElements.clear();
        if (!noStandardTags) {
            // Define all the standard tags
            this.addTagDefinitions(StandardTags.allDefinitions);
        }
    };
    Object.defineProperty(TSDocConfiguration.prototype, "tagDefinitions", {
        /**
         * The TSDoc tags that are defined in this configuration.
         *
         * @remarks
         * The subset of "supported" tags is tracked by {@link TSDocConfiguration.supportedTagDefinitions}.
         */
        get: function () {
            return this._tagDefinitions;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TSDocConfiguration.prototype, "supportedTagDefinitions", {
        /**
         * Returns the subset of {@link TSDocConfiguration.tagDefinitions}
         * that are supported in this configuration.
         *
         * @remarks
         * This property is only used when
         * {@link TSDocValidationConfiguration.reportUnsupportedTags} is enabled.
         */
        get: function () {
            var _this = this;
            return this.tagDefinitions.filter(function (x) { return _this.isTagSupported(x); });
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TSDocConfiguration.prototype, "validation", {
        /**
         * Enable/disable validation checks performed by the parser.
         */
        get: function () {
            return this._validation;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TSDocConfiguration.prototype, "supportedHtmlElements", {
        /**
         * The HTML element names that are supported in this configuration. Used in conjunction with the `reportUnsupportedHtmlElements` setting.
         */
        get: function () {
            return Array.from(this._supportedHtmlElements.values());
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(TSDocConfiguration.prototype, "docNodeManager", {
        /**
         * Register custom DocNode subclasses.
         */
        get: function () {
            return this._docNodeManager;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Return the tag that was defined with the specified name, or undefined
     * if not found.
     */
    TSDocConfiguration.prototype.tryGetTagDefinition = function (tagName) {
        return this._tagDefinitionsByName.get(tagName.toUpperCase());
    };
    /**
     * Return the tag that was defined with the specified name, or undefined
     * if not found.
     */
    TSDocConfiguration.prototype.tryGetTagDefinitionWithUpperCase = function (alreadyUpperCaseTagName) {
        return this._tagDefinitionsByName.get(alreadyUpperCaseTagName);
    };
    /**
     * Define a new TSDoc tag to be recognized by the TSDocParser, and mark it as unsupported.
     * Use {@link TSDocConfiguration.setSupportForTag} to mark it as supported.
     *
     * @remarks
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     */
    TSDocConfiguration.prototype.addTagDefinition = function (tagDefinition) {
        var existingDefinition = this._tagDefinitionsByName.get(tagDefinition.tagNameWithUpperCase);
        if (existingDefinition === tagDefinition) {
            return;
        }
        if (existingDefinition) {
            throw new Error("A tag is already defined using the name ".concat(existingDefinition.tagName));
        }
        this._tagDefinitions.push(tagDefinition);
        this._tagDefinitionsByName.set(tagDefinition.tagNameWithUpperCase, tagDefinition);
    };
    /**
     * Calls {@link TSDocConfiguration.addTagDefinition} for a list of definitions,
     * and optionally marks them as supported.
     * @param tagDefinitions - the definitions to be added
     * @param supported - if specified, calls the {@link TSDocConfiguration.setSupportForTag}
     *    method to mark the definitions as supported or unsupported
     */
    TSDocConfiguration.prototype.addTagDefinitions = function (tagDefinitions, supported) {
        for (var _i = 0, tagDefinitions_1 = tagDefinitions; _i < tagDefinitions_1.length; _i++) {
            var tagDefinition = tagDefinitions_1[_i];
            this.addTagDefinition(tagDefinition);
            if (supported !== undefined) {
                this.setSupportForTag(tagDefinition, supported);
            }
        }
    };
    /**
     * Returns true if the tag is supported in this configuration.
     */
    TSDocConfiguration.prototype.isTagSupported = function (tagDefinition) {
        this._requireTagToBeDefined(tagDefinition);
        return this._supportedTagDefinitions.has(tagDefinition);
    };
    /**
     * Specifies whether the tag definition is supported in this configuration.
     * The parser may issue warnings for unsupported tags.
     *
     * @remarks
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     *
     * This function automatically sets {@link TSDocValidationConfiguration.reportUnsupportedTags}
     * to true.
     */
    TSDocConfiguration.prototype.setSupportForTag = function (tagDefinition, supported) {
        this._requireTagToBeDefined(tagDefinition);
        if (supported) {
            this._supportedTagDefinitions.add(tagDefinition);
        }
        else {
            this._supportedTagDefinitions.delete(tagDefinition);
        }
        this.validation.reportUnsupportedTags = true;
    };
    /**
     * Specifies whether the tag definition is supported in this configuration.
     * This operation sets {@link TSDocValidationConfiguration.reportUnsupportedTags} to `true`.
     *
     * @remarks
     * The parser may issue warnings for unsupported tags.
     * If a tag is "defined" this means that the parser recognizes it and understands its syntax.
     * Whereas if a tag is "supported", this means it is defined AND the application implements the tag.
     */
    TSDocConfiguration.prototype.setSupportForTags = function (tagDefinitions, supported) {
        for (var _i = 0, tagDefinitions_2 = tagDefinitions; _i < tagDefinitions_2.length; _i++) {
            var tagDefinition = tagDefinitions_2[_i];
            this.setSupportForTag(tagDefinition, supported);
        }
    };
    /**
     * Assigns the `supportedHtmlElements` property, replacing any previous elements.
     * This operation sets {@link TSDocValidationConfiguration.reportUnsupportedHtmlElements} to `true`.
     */
    TSDocConfiguration.prototype.setSupportedHtmlElements = function (htmlTags) {
        this._supportedHtmlElements.clear();
        this._validation.reportUnsupportedHtmlElements = true;
        for (var _i = 0, htmlTags_1 = htmlTags; _i < htmlTags_1.length; _i++) {
            var htmlTag = htmlTags_1[_i];
            this._supportedHtmlElements.add(htmlTag);
        }
    };
    /**
     * Returns true if the html element is supported in this configuration.
     */
    TSDocConfiguration.prototype.isHtmlElementSupported = function (htmlTag) {
        return this._supportedHtmlElements.has(htmlTag);
    };
    /**
     * Returns true if the specified {@link TSDocMessageId} string is implemented by this release of the TSDoc parser.
     * This can be used to detect misspelled identifiers.
     *
     * @privateRemarks
     *
     * Why this API is associated with TSDocConfiguration:  In the future, if we enable support for custom extensions
     * of the TSDoc parser, we may provide a way to register custom message identifiers.
     */
    TSDocConfiguration.prototype.isKnownMessageId = function (messageId) {
        return allTsdocMessageIdsSet.has(messageId);
    };
    Object.defineProperty(TSDocConfiguration.prototype, "allTsdocMessageIds", {
        /**
         * Returns the list of {@link TSDocMessageId} strings that are implemented by this release of the TSDoc parser.
         *
         * @privateRemarks
         *
         * Why this API is associated with TSDocConfiguration:  In the future, if we enable support for custom extensions
         * of the TSDoc parser, we may provide a way to register custom message identifiers.
         */
        get: function () {
            return allTsdocMessageIds;
        },
        enumerable: false,
        configurable: true
    });
    TSDocConfiguration.prototype._requireTagToBeDefined = function (tagDefinition) {
        var matching = this._tagDefinitionsByName.get(tagDefinition.tagNameWithUpperCase);
        if (matching) {
            if (matching === tagDefinition) {
                return;
            }
        }
        throw new Error('The specified TSDocTagDefinition is not defined for this TSDocConfiguration');
    };
    return TSDocConfiguration;
}());
export { TSDocConfiguration };
//# sourceMappingURL=TSDocConfiguration.js.map