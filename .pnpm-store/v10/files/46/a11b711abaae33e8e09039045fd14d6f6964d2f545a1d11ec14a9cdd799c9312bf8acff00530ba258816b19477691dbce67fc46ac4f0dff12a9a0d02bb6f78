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
exports.W3CBaggagePropagator = void 0;
const api_1 = require("@opentelemetry/api");
const suppress_tracing_1 = require("../../trace/suppress-tracing");
const constants_1 = require("../constants");
const utils_1 = require("../utils");
/**
 * Propagates {@link Baggage} through Context format propagation.
 *
 * Based on the Baggage specification:
 * https://w3c.github.io/baggage/
 */
class W3CBaggagePropagator {
    inject(context, carrier, setter) {
        const baggage = api_1.propagation.getBaggage(context);
        if (!baggage || (0, suppress_tracing_1.isTracingSuppressed)(context))
            return;
        const keyPairs = (0, utils_1.getKeyPairs)(baggage)
            .filter((pair) => {
            return pair.length <= constants_1.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
        })
            .slice(0, constants_1.BAGGAGE_MAX_NAME_VALUE_PAIRS);
        const headerValue = (0, utils_1.serializeKeyPairs)(keyPairs);
        if (headerValue.length > 0) {
            setter.set(carrier, constants_1.BAGGAGE_HEADER, headerValue);
        }
    }
    extract(context, carrier, getter) {
        const headerValue = getter.get(carrier, constants_1.BAGGAGE_HEADER);
        const baggageString = Array.isArray(headerValue)
            ? headerValue.join(constants_1.BAGGAGE_ITEMS_SEPARATOR)
            : headerValue;
        if (!baggageString)
            return context;
        const baggage = {};
        if (baggageString.length === 0) {
            return context;
        }
        const pairs = baggageString.split(constants_1.BAGGAGE_ITEMS_SEPARATOR);
        pairs.forEach(entry => {
            const keyPair = (0, utils_1.parsePairKeyValue)(entry);
            if (keyPair) {
                const baggageEntry = { value: keyPair.value };
                if (keyPair.metadata) {
                    baggageEntry.metadata = keyPair.metadata;
                }
                baggage[keyPair.key] = baggageEntry;
            }
        });
        if (Object.entries(baggage).length === 0) {
            return context;
        }
        return api_1.propagation.setBaggage(context, api_1.propagation.createBaggage(baggage));
    }
    fields() {
        return [constants_1.BAGGAGE_HEADER];
    }
}
exports.W3CBaggagePropagator = W3CBaggagePropagator;
//# sourceMappingURL=W3CBaggagePropagator.js.map