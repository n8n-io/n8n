"use strict";
/*
 * Copyright 2021 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndpointMap = void 0;
exports.isTcpSubchannelAddress = isTcpSubchannelAddress;
exports.subchannelAddressEqual = subchannelAddressEqual;
exports.subchannelAddressToString = subchannelAddressToString;
exports.stringToSubchannelAddress = stringToSubchannelAddress;
exports.endpointEqual = endpointEqual;
exports.endpointToString = endpointToString;
exports.endpointHasAddress = endpointHasAddress;
const net_1 = require("net");
function isTcpSubchannelAddress(address) {
    return 'port' in address;
}
function subchannelAddressEqual(address1, address2) {
    if (!address1 && !address2) {
        return true;
    }
    if (!address1 || !address2) {
        return false;
    }
    if (isTcpSubchannelAddress(address1)) {
        return (isTcpSubchannelAddress(address2) &&
            address1.host === address2.host &&
            address1.port === address2.port);
    }
    else {
        return !isTcpSubchannelAddress(address2) && address1.path === address2.path;
    }
}
function subchannelAddressToString(address) {
    if (isTcpSubchannelAddress(address)) {
        if ((0, net_1.isIPv6)(address.host)) {
            return '[' + address.host + ']:' + address.port;
        }
        else {
            return address.host + ':' + address.port;
        }
    }
    else {
        return address.path;
    }
}
const DEFAULT_PORT = 443;
function stringToSubchannelAddress(addressString, port) {
    if ((0, net_1.isIP)(addressString)) {
        return {
            host: addressString,
            port: port !== null && port !== void 0 ? port : DEFAULT_PORT,
        };
    }
    else {
        return {
            path: addressString,
        };
    }
}
function endpointEqual(endpoint1, endpoint2) {
    if (endpoint1.addresses.length !== endpoint2.addresses.length) {
        return false;
    }
    for (let i = 0; i < endpoint1.addresses.length; i++) {
        if (!subchannelAddressEqual(endpoint1.addresses[i], endpoint2.addresses[i])) {
            return false;
        }
    }
    return true;
}
function endpointToString(endpoint) {
    return ('[' + endpoint.addresses.map(subchannelAddressToString).join(', ') + ']');
}
function endpointHasAddress(endpoint, expectedAddress) {
    for (const address of endpoint.addresses) {
        if (subchannelAddressEqual(address, expectedAddress)) {
            return true;
        }
    }
    return false;
}
function endpointEqualUnordered(endpoint1, endpoint2) {
    if (endpoint1.addresses.length !== endpoint2.addresses.length) {
        return false;
    }
    for (const address1 of endpoint1.addresses) {
        let matchFound = false;
        for (const address2 of endpoint2.addresses) {
            if (subchannelAddressEqual(address1, address2)) {
                matchFound = true;
                break;
            }
        }
        if (!matchFound) {
            return false;
        }
    }
    return true;
}
class EndpointMap {
    constructor() {
        this.map = new Set();
    }
    get size() {
        return this.map.size;
    }
    getForSubchannelAddress(address) {
        for (const entry of this.map) {
            if (endpointHasAddress(entry.key, address)) {
                return entry.value;
            }
        }
        return undefined;
    }
    /**
     * Delete any entries in this map with keys that are not in endpoints
     * @param endpoints
     */
    deleteMissing(endpoints) {
        const removedValues = [];
        for (const entry of this.map) {
            let foundEntry = false;
            for (const endpoint of endpoints) {
                if (endpointEqualUnordered(endpoint, entry.key)) {
                    foundEntry = true;
                }
            }
            if (!foundEntry) {
                removedValues.push(entry.value);
                this.map.delete(entry);
            }
        }
        return removedValues;
    }
    get(endpoint) {
        for (const entry of this.map) {
            if (endpointEqualUnordered(endpoint, entry.key)) {
                return entry.value;
            }
        }
        return undefined;
    }
    set(endpoint, mapEntry) {
        for (const entry of this.map) {
            if (endpointEqualUnordered(endpoint, entry.key)) {
                entry.value = mapEntry;
                return;
            }
        }
        this.map.add({ key: endpoint, value: mapEntry });
    }
    delete(endpoint) {
        for (const entry of this.map) {
            if (endpointEqualUnordered(endpoint, entry.key)) {
                this.map.delete(entry);
                return;
            }
        }
    }
    has(endpoint) {
        for (const entry of this.map) {
            if (endpointEqualUnordered(endpoint, entry.key)) {
                return true;
            }
        }
        return false;
    }
    clear() {
        this.map.clear();
    }
    *keys() {
        for (const entry of this.map) {
            yield entry.key;
        }
    }
    *values() {
        for (const entry of this.map) {
            yield entry.value;
        }
    }
    *entries() {
        for (const entry of this.map) {
            yield [entry.key, entry.value];
        }
    }
}
exports.EndpointMap = EndpointMap;
//# sourceMappingURL=subchannel-address.js.map