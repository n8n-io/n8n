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

import { isIP, isIPv6 } from 'net';

export interface TcpSubchannelAddress {
  port: number;
  host: string;
}

export interface IpcSubchannelAddress {
  path: string;
}
/**
 * This represents a single backend address to connect to. This interface is a
 * subset of net.SocketConnectOpts, i.e. the options described at
 * https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener.
 * Those are in turn a subset of the options that can be passed to http2.connect.
 */

export type SubchannelAddress = TcpSubchannelAddress | IpcSubchannelAddress;

export function isTcpSubchannelAddress(
  address: SubchannelAddress
): address is TcpSubchannelAddress {
  return 'port' in address;
}

export function subchannelAddressEqual(
  address1?: SubchannelAddress,
  address2?: SubchannelAddress
): boolean {
  if (!address1 && !address2) {
    return true;
  }
  if (!address1 || !address2) {
    return false;
  }
  if (isTcpSubchannelAddress(address1)) {
    return (
      isTcpSubchannelAddress(address2) &&
      address1.host === address2.host &&
      address1.port === address2.port
    );
  } else {
    return !isTcpSubchannelAddress(address2) && address1.path === address2.path;
  }
}

export function subchannelAddressToString(address: SubchannelAddress): string {
  if (isTcpSubchannelAddress(address)) {
    if (isIPv6(address.host)) {
      return '[' + address.host + ']:' + address.port;
    } else {
      return address.host + ':' + address.port;
    }
  } else {
    return address.path;
  }
}

const DEFAULT_PORT = 443;

export function stringToSubchannelAddress(
  addressString: string,
  port?: number
): SubchannelAddress {
  if (isIP(addressString)) {
    return {
      host: addressString,
      port: port ?? DEFAULT_PORT,
    };
  } else {
    return {
      path: addressString,
    };
  }
}

export interface Endpoint {
  addresses: SubchannelAddress[];
}

export function endpointEqual(endpoint1: Endpoint, endpoint2: Endpoint) {
  if (endpoint1.addresses.length !== endpoint2.addresses.length) {
    return false;
  }
  for (let i = 0; i < endpoint1.addresses.length; i++) {
    if (
      !subchannelAddressEqual(endpoint1.addresses[i], endpoint2.addresses[i])
    ) {
      return false;
    }
  }
  return true;
}

export function endpointToString(endpoint: Endpoint): string {
  return (
    '[' + endpoint.addresses.map(subchannelAddressToString).join(', ') + ']'
  );
}

export function endpointHasAddress(
  endpoint: Endpoint,
  expectedAddress: SubchannelAddress
): boolean {
  for (const address of endpoint.addresses) {
    if (subchannelAddressEqual(address, expectedAddress)) {
      return true;
    }
  }
  return false;
}

interface EndpointMapEntry<ValueType> {
  key: Endpoint;
  value: ValueType;
}

function endpointEqualUnordered(
  endpoint1: Endpoint,
  endpoint2: Endpoint
): boolean {
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

export class EndpointMap<ValueType> {
  private map: Set<EndpointMapEntry<ValueType>> = new Set();

  get size() {
    return this.map.size;
  }

  getForSubchannelAddress(address: SubchannelAddress): ValueType | undefined {
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
  deleteMissing(endpoints: Endpoint[]): ValueType[] {
    const removedValues: ValueType[] = [];
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

  get(endpoint: Endpoint): ValueType | undefined {
    for (const entry of this.map) {
      if (endpointEqualUnordered(endpoint, entry.key)) {
        return entry.value;
      }
    }
    return undefined;
  }

  set(endpoint: Endpoint, mapEntry: ValueType) {
    for (const entry of this.map) {
      if (endpointEqualUnordered(endpoint, entry.key)) {
        entry.value = mapEntry;
        return;
      }
    }
    this.map.add({ key: endpoint, value: mapEntry });
  }

  delete(endpoint: Endpoint) {
    for (const entry of this.map) {
      if (endpointEqualUnordered(endpoint, entry.key)) {
        this.map.delete(entry);
        return;
      }
    }
  }

  has(endpoint: Endpoint): boolean {
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

  *keys(): IterableIterator<Endpoint> {
    for (const entry of this.map) {
      yield entry.key;
    }
  }

  *values(): IterableIterator<ValueType> {
    for (const entry of this.map) {
      yield entry.value;
    }
  }

  *entries(): IterableIterator<[Endpoint, ValueType]> {
    for (const entry of this.map) {
      yield [entry.key, entry.value];
    }
  }
}
