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
import { propagation, } from '@opentelemetry/api';
import { isTracingSuppressed } from '../../trace/suppress-tracing';
import { BAGGAGE_HEADER, BAGGAGE_ITEMS_SEPARATOR, BAGGAGE_MAX_NAME_VALUE_PAIRS, BAGGAGE_MAX_PER_NAME_VALUE_PAIRS, } from '../constants';
import { getKeyPairs, parsePairKeyValue, serializeKeyPairs } from '../utils';
/**
 * Propagates {@link Baggage} through Context format propagation.
 *
 * Based on the Baggage specification:
 * https://w3c.github.io/baggage/
 */
export class W3CBaggagePropagator {
    inject(context, carrier, setter) {
        const baggage = propagation.getBaggage(context);
        if (!baggage || isTracingSuppressed(context))
            return;
        const keyPairs = getKeyPairs(baggage)
            .filter((pair) => {
            return pair.length <= BAGGAGE_MAX_PER_NAME_VALUE_PAIRS;
        })
            .slice(0, BAGGAGE_MAX_NAME_VALUE_PAIRS);
        const headerValue = serializeKeyPairs(keyPairs);
        if (headerValue.length > 0) {
            setter.set(carrier, BAGGAGE_HEADER, headerValue);
        }
    }
    extract(context, carrier, getter) {
        const headerValue = getter.get(carrier, BAGGAGE_HEADER);
        const baggageString = Array.isArray(headerValue)
            ? headerValue.join(BAGGAGE_ITEMS_SEPARATOR)
            : headerValue;
        if (!baggageString)
            return context;
        const baggage = {};
        if (baggageString.length === 0) {
            return context;
        }
        const pairs = baggageString.split(BAGGAGE_ITEMS_SEPARATOR);
        pairs.forEach(entry => {
            const keyPair = parsePairKeyValue(entry);
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
        return propagation.setBaggage(context, propagation.createBaggage(baggage));
    }
    fields() {
        return [BAGGAGE_HEADER];
    }
}
//# sourceMappingURL=W3CBaggagePropagator.js.map