"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilteringAttributesProcessor = exports.NoopAttributesProcessor = exports.AttributesProcessor = void 0;
/**
 * The {@link AttributesProcessor} is responsible for customizing which
 * attribute(s) are to be reported as metrics dimension(s) and adding
 * additional dimension(s) from the {@link Context}.
 */
class AttributesProcessor {
    static Noop() {
        return NOOP;
    }
}
exports.AttributesProcessor = AttributesProcessor;
class NoopAttributesProcessor extends AttributesProcessor {
    process(incoming, _context) {
        return incoming;
    }
}
exports.NoopAttributesProcessor = NoopAttributesProcessor;
/**
 * {@link AttributesProcessor} that filters by allowed attribute names and drops any names that are not in the
 * allow list.
 */
class FilteringAttributesProcessor extends AttributesProcessor {
    constructor(_allowedAttributeNames) {
        super();
        this._allowedAttributeNames = _allowedAttributeNames;
    }
    process(incoming, _context) {
        const filteredAttributes = {};
        Object.keys(incoming)
            .filter(attributeName => this._allowedAttributeNames.includes(attributeName))
            .forEach(attributeName => (filteredAttributes[attributeName] = incoming[attributeName]));
        return filteredAttributes;
    }
}
exports.FilteringAttributesProcessor = FilteringAttributesProcessor;
const NOOP = new NoopAttributesProcessor();
//# sourceMappingURL=AttributesProcessor.js.map