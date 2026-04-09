/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
/**
 * The {@link AttributesProcessor} is responsible for customizing which
 * attribute(s) are to be reported as metrics dimension(s) and adding
 * additional dimension(s) from the {@link Context}.
 */
var AttributesProcessor = /** @class */ (function () {
    function AttributesProcessor() {
    }
    AttributesProcessor.Noop = function () {
        return NOOP;
    };
    return AttributesProcessor;
}());
export { AttributesProcessor };
var NoopAttributesProcessor = /** @class */ (function (_super) {
    __extends(NoopAttributesProcessor, _super);
    function NoopAttributesProcessor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoopAttributesProcessor.prototype.process = function (incoming, _context) {
        return incoming;
    };
    return NoopAttributesProcessor;
}(AttributesProcessor));
export { NoopAttributesProcessor };
/**
 * {@link AttributesProcessor} that filters by allowed attribute names and drops any names that are not in the
 * allow list.
 */
var FilteringAttributesProcessor = /** @class */ (function (_super) {
    __extends(FilteringAttributesProcessor, _super);
    function FilteringAttributesProcessor(_allowedAttributeNames) {
        var _this = _super.call(this) || this;
        _this._allowedAttributeNames = _allowedAttributeNames;
        return _this;
    }
    FilteringAttributesProcessor.prototype.process = function (incoming, _context) {
        var _this = this;
        var filteredAttributes = {};
        Object.keys(incoming)
            .filter(function (attributeName) {
            return _this._allowedAttributeNames.includes(attributeName);
        })
            .forEach(function (attributeName) {
            return (filteredAttributes[attributeName] = incoming[attributeName]);
        });
        return filteredAttributes;
    };
    return FilteringAttributesProcessor;
}(AttributesProcessor));
export { FilteringAttributesProcessor };
var NOOP = new NoopAttributesProcessor();
//# sourceMappingURL=AttributesProcessor.js.map