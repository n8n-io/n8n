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
import { DocNode, DocNodeKind } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents an HTML attribute inside a DocHtmlStartTag or DocHtmlEndTag.
 *
 * Example: `href="#"` inside `<a href="#" />`
 */
var DocHtmlAttribute = /** @class */ (function (_super) {
    __extends(DocHtmlAttribute, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocHtmlAttribute(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            _this._nameExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.HtmlAttribute_Name,
                content: parameters.nameExcerpt
            });
            if (parameters.spacingAfterNameExcerpt) {
                _this._spacingAfterNameExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterNameExcerpt
                });
            }
            _this._equalsExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.HtmlAttribute_Equals,
                content: parameters.equalsExcerpt
            });
            if (parameters.spacingAfterEqualsExcerpt) {
                _this._spacingAfterEqualsExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterEqualsExcerpt
                });
            }
            _this._valueExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.HtmlAttribute_Value,
                content: parameters.valueExcerpt
            });
            if (parameters.spacingAfterValueExcerpt) {
                _this._spacingAfterValueExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterValueExcerpt
                });
            }
        }
        else {
            _this._name = parameters.name;
            _this._spacingAfterName = parameters.spacingAfterName;
            _this._spacingAfterEquals = parameters.spacingAfterEquals;
            _this._value = parameters.value;
            _this._spacingAfterValue = parameters.spacingAfterValue;
        }
        return _this;
    }
    Object.defineProperty(DocHtmlAttribute.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.HtmlAttribute;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlAttribute.prototype, "name", {
        /**
         * The HTML attribute name.
         */
        get: function () {
            if (this._name === undefined) {
                this._name = this._nameExcerpt.content.toString();
            }
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlAttribute.prototype, "spacingAfterName", {
        /**
         * Explicit whitespace that a renderer should insert after the HTML attribute name.
         * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
         */
        get: function () {
            if (this._spacingAfterName === undefined) {
                if (this._spacingAfterNameExcerpt !== undefined) {
                    this._spacingAfterName = this._spacingAfterNameExcerpt.content.toString();
                }
            }
            return this._spacingAfterName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlAttribute.prototype, "spacingAfterEquals", {
        /**
         * Explicit whitespace that a renderer should insert after the "=".
         * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
         */
        get: function () {
            if (this._spacingAfterEquals === undefined) {
                if (this._spacingAfterEqualsExcerpt !== undefined) {
                    this._spacingAfterEquals = this._spacingAfterEqualsExcerpt.content.toString();
                }
            }
            return this._spacingAfterEquals;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlAttribute.prototype, "value", {
        /**
         * The HTML attribute value.
         */
        get: function () {
            if (this._value === undefined) {
                this._value = this._valueExcerpt.content.toString();
            }
            return this._value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocHtmlAttribute.prototype, "spacingAfterValue", {
        /**
         * Explicit whitespace that a renderer should insert after the HTML attribute name.
         * If undefined, then the renderer can use a formatting rule to generate appropriate spacing.
         */
        get: function () {
            if (this._spacingAfterValue === undefined) {
                if (this._spacingAfterValueExcerpt !== undefined) {
                    this._spacingAfterValue = this._spacingAfterValueExcerpt.content.toString();
                }
            }
            return this._spacingAfterValue;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocHtmlAttribute.prototype.onGetChildNodes = function () {
        return [
            this._nameExcerpt,
            this._spacingAfterNameExcerpt,
            this._equalsExcerpt,
            this._spacingAfterEqualsExcerpt,
            this._valueExcerpt,
            this._spacingAfterValueExcerpt
        ];
    };
    return DocHtmlAttribute;
}(DocNode));
export { DocHtmlAttribute };
//# sourceMappingURL=DocHtmlAttribute.js.map