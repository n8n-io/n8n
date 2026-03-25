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
 */

import { isIPv4, isIPv6 } from 'net';
import { StatusObject } from './call-interface';
import { ChannelOptions } from './channel-options';
import { LogVerbosity, Status } from './constants';
import { Metadata } from './metadata';
import { registerResolver, Resolver, ResolverListener } from './resolver';
import { Endpoint, SubchannelAddress } from './subchannel-address';
import { GrpcUri, splitHostPort, uriToString } from './uri-parser';
import * as logging from './logging';

const TRACER_NAME = 'ip_resolver';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

const IPV4_SCHEME = 'ipv4';
const IPV6_SCHEME = 'ipv6';

/**
 * The default TCP port to connect to if not explicitly specified in the target.
 */
const DEFAULT_PORT = 443;

class IpResolver implements Resolver {
  private endpoints: Endpoint[] = [];
  private error: StatusObject | null = null;
  private hasReturnedResult = false;
  constructor(
    target: GrpcUri,
    private listener: ResolverListener,
    channelOptions: ChannelOptions
  ) {
    trace('Resolver constructed for target ' + uriToString(target));
    const addresses: SubchannelAddress[] = [];
    if (!(target.scheme === IPV4_SCHEME || target.scheme === IPV6_SCHEME)) {
      this.error = {
        code: Status.UNAVAILABLE,
        details: `Unrecognized scheme ${target.scheme} in IP resolver`,
        metadata: new Metadata(),
      };
      return;
    }
    const pathList = target.path.split(',');
    for (const path of pathList) {
      const hostPort = splitHostPort(path);
      if (hostPort === null) {
        this.error = {
          code: Status.UNAVAILABLE,
          details: `Failed to parse ${target.scheme} address ${path}`,
          metadata: new Metadata(),
        };
        return;
      }
      if (
        (target.scheme === IPV4_SCHEME && !isIPv4(hostPort.host)) ||
        (target.scheme === IPV6_SCHEME && !isIPv6(hostPort.host))
      ) {
        this.error = {
          code: Status.UNAVAILABLE,
          details: `Failed to parse ${target.scheme} address ${path}`,
          metadata: new Metadata(),
        };
        return;
      }
      addresses.push({
        host: hostPort.host,
        port: hostPort.port ?? DEFAULT_PORT,
      });
    }
    this.endpoints = addresses.map(address => ({ addresses: [address] }));
    trace('Parsed ' + target.scheme + ' address list ' + addresses);
  }
  updateResolution(): void {
    if (!this.hasReturnedResult) {
      this.hasReturnedResult = true;
      process.nextTick(() => {
        if (this.error) {
          this.listener.onError(this.error);
        } else {
          this.listener.onSuccessfulResolution(
            this.endpoints,
            null,
            null,
            null,
            {}
          );
        }
      });
    }
  }
  destroy(): void {
    this.hasReturnedResult = false;
  }

  static getDefaultAuthority(target: GrpcUri): string {
    return target.path.split(',')[0];
  }
}

export function setup() {
  registerResolver(IPV4_SCHEME, IpResolver);
  registerResolver(IPV6_SCHEME, IpResolver);
}
