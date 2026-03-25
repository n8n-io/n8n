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
import { DocNodeKind, DocNode } from './DocNode';
import { StringChecks } from '../parser/StringChecks';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Kinds of TSDoc selectors.
 */
export var SelectorKind;
(function (SelectorKind) {
    /**
     * Used in cases where the parser encounters a string that is incorrect but
     * valid enough that a DocMemberSelector node was created.
     */
    SelectorKind["Error"] = "error";
    /**
     * System selectors are always all lower-case and belong to a set of predefined label names.
     */
    SelectorKind["System"] = "system";
    /**
     * Index selectors are integer numbers.  They provide an alternative way of referencing
     * overloaded functions, based on the order in which the declarations appear in
     * a source file.
     *
     * @remarks
     * Warning:  Index selectors are not recommended; they are intended to provide a temporary
     * workaround for situations where an external library neglected to declare a `{@label}` tag
     * and cannot be easily fixed.
     */
    SelectorKind["Index"] = "index";
    /**
     * Label selectors refer to labels created using the `{@label}` TSDoc tag.
     * The labels are always comprised of upper-case letters or numbers separated by underscores,
     * and the first character cannot be a number.
     */
    SelectorKind["Label"] = "label";
})(SelectorKind || (SelectorKind = {}));
/**
 */
var DocMemberSelector = /** @class */ (function (_super) {
    __extends(DocMemberSelector, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocMemberSelector(parameters) {
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            _this._selectorExcerpt = new DocExcerpt({
                configuration: _this.configuration,
                excerptKind: ExcerptKind.MemberSelector,
                content: parameters.selectorExcerpt
            });
            _this._selector = parameters.selectorExcerpt.toString();
        }
        else {
            _this._selector = parameters.selector;
        }
        _this._selectorKind = SelectorKind.Error;
        _this._errorMessage = undefined;
        // The logic below will always either (1) assign selectorKind or (2) else assign an errorMessage
        if (_this._selector.length === 0) {
            _this._errorMessage = 'The selector cannot be an empty string';
        }
        else if (DocMemberSelector._likeIndexSelectorRegExp.test(_this._selector)) {
            // It looks like an index selector
            if (DocMemberSelector._indexSelectorRegExp.test(_this._selector)) {
                _this._selectorKind = SelectorKind.Index;
            }
            else {
                _this._errorMessage = 'If the selector begins with a number, it must be a positive integer value';
            }
        }
        else if (DocMemberSelector._likeLabelSelectorRegExp.test(_this._selector)) {
            // It looks like a label selector
            if (DocMemberSelector._labelSelectorRegExp.test(_this._selector)) {
                _this._selectorKind = SelectorKind.Label;
            }
            else {
                _this._errorMessage =
                    'A label selector must be comprised of upper case letters, numbers,' +
                        ' and underscores and must not start with a number';
            }
        }
        else {
            if (StringChecks.isSystemSelector(_this._selector)) {
                _this._selectorKind = SelectorKind.System;
            }
            else if (DocMemberSelector._likeSystemSelectorRegExp.test(_this._selector)) {
                // It looks like a system selector, but is not
                _this._errorMessage =
                    "The selector ".concat(JSON.stringify(_this._selector)) +
                        " is not a recognized TSDoc system selector name";
            }
            else {
                // It doesn't look like anything we recognize
                _this._errorMessage = 'Invalid syntax for selector';
            }
        }
        return _this;
    }
    Object.defineProperty(DocMemberSelector.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.MemberSelector;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberSelector.prototype, "selector", {
        /**
         * The text representation of the selector.
         *
         * @remarks
         * For system selectors, it will be a predefined lower case name.
         * For label selectors, it will be an upper case name defined using the `{@label}` tag.
         * For index selectors, it will be a positive integer.
         */
        get: function () {
            return this._selector;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberSelector.prototype, "selectorKind", {
        /**
         * Indicates the kind of selector.
         */
        get: function () {
            return this._selectorKind;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocMemberSelector.prototype, "errorMessage", {
        /**
         * If the `selectorKind` is `SelectorKind.Error`, this string will be defined and provide
         * more detail about why the string was not valid.
         */
        get: function () {
            return this._errorMessage;
        },
        enumerable: false,
        configurable: true
    });
    /** @override */
    DocMemberSelector.prototype.onGetChildNodes = function () {
        return [this._selectorExcerpt];
    };
    DocMemberSelector._likeIndexSelectorRegExp = /^[0-9]/;
    DocMemberSelector._indexSelectorRegExp = /^[1-9][0-9]*$/;
    DocMemberSelector._likeLabelSelectorRegExp = /^[A-Z_]/u;
    DocMemberSelector._labelSelectorRegExp = /^[A-Z_][A-Z0-9_]+$/;
    DocMemberSelector._likeSystemSelectorRegExp = /^[a-z]+$/u;
    return DocMemberSelector;
}(DocNode));
export { DocMemberSelector };
//# sourceMappingURL=DocMemberSelector.js.map