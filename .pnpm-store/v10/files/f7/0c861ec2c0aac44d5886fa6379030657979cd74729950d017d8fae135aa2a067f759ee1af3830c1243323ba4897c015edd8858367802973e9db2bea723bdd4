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
import { baggageEntryMetadataFromString, } from '@opentelemetry/api';
import { BAGGAGE_ITEMS_SEPARATOR, BAGGAGE_PROPERTIES_SEPARATOR, BAGGAGE_KEY_PAIR_SEPARATOR, BAGGAGE_MAX_TOTAL_LENGTH, } from './constants';
export function serializeKeyPairs(keyPairs) {
    return keyPairs.reduce((hValue, current) => {
        const value = `${hValue}${hValue !== '' ? BAGGAGE_ITEMS_SEPARATOR : ''}${current}`;
        return value.length > BAGGAGE_MAX_TOTAL_LENGTH ? hValue : value;
    }, '');
}
export function getKeyPairs(baggage) {
    return baggage.getAllEntries().map(([key, value]) => {
        let entry = `${encodeURIComponent(key)}=${encodeURIComponent(value.value)}`;
        // include opaque metadata if provided
        // NOTE: we intentionally don't URI-encode the metadata - that responsibility falls on the metadata implementation
        if (value.metadata !== undefined) {
            entry += BAGGAGE_PROPERTIES_SEPARATOR + value.metadata.toString();
        }
        return entry;
    });
}
export function parsePairKeyValue(entry) {
    const valueProps = entry.split(BAGGAGE_PROPERTIES_SEPARATOR);
    if (valueProps.length <= 0)
        return;
    const keyPairPart = valueProps.shift();
    if (!keyPairPart)
        return;
    const separatorIndex = keyPairPart.indexOf(BAGGAGE_KEY_PAIR_SEPARATOR);
    if (separatorIndex <= 0)
        return;
    const key = decodeURIComponent(keyPairPart.substring(0, separatorIndex).trim());
    const value = decodeURIComponent(keyPairPart.substring(separatorIndex + 1).trim());
    let metadata;
    if (valueProps.length > 0) {
        metadata = baggageEntryMetadataFromString(valueProps.join(BAGGAGE_PROPERTIES_SEPARATOR));
    }
    return { key, value, metadata };
}
/**
 * Parse a string serialized in the baggage HTTP Format (without metadata):
 * https://github.com/w3c/baggage/blob/master/baggage/HTTP_HEADER_FORMAT.md
 */
export function parseKeyPairsIntoRecord(value) {
    if (typeof value !== 'string' || value.length === 0)
        return {};
    return value
        .split(BAGGAGE_ITEMS_SEPARATOR)
        .map(entry => {
        return parsePairKeyValue(entry);
    })
        .filter(keyPair => keyPair !== undefined && keyPair.value.length > 0)
        .reduce((headers, keyPair) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        headers[keyPair.key] = keyPair.value;
        return headers;
    }, {});
}
//# sourceMappingURL=utils.js.map