/*
 * Copyright 2019 gRPC authors.
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

import {
  Resolver,
  ResolverListener,
  registerResolver,
  registerDefaultScheme,
} from './resolver';
import { promises as dns } from 'dns';
import { extractAndSelectServiceConfig, ServiceConfig } from './service-config';
import { Status } from './constants';
import { StatusObject, StatusOr, statusOrFromError, statusOrFromValue } from './call-interface';
import { Metadata } from './metadata';
import * as logging from './logging';
import { LogVerbosity } from './constants';
import { Endpoint, TcpSubchannelAddress } from './subchannel-address';
import { GrpcUri, uriToString, splitHostPort } from './uri-parser';
import { isIPv6, isIPv4 } from 'net';
import { ChannelOptions } from './channel-options';
import { BackoffOptions, BackoffTimeout } from './backoff-timeout';
import { GRPC_NODE_USE_ALTERNATIVE_RESOLVER } from './environment';

const TRACER_NAME = 'dns_resolver';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

/**
 * The default TCP port to connect to if not explicitly specified in the target.
 */
export const DEFAULT_PORT = 443;

const DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS = 30_000;

/**
 * Resolver implementation that handles DNS names and IP addresses.
 */
class DnsResolver implements Resolver {
  private readonly ipResult: Endpoint[] | null;
  private readonly dnsHostname: string | null;
  private readonly port: number | null;
  /**
   * Minimum time between resolutions, measured as the time between starting
   * successive resolution requests. Only applies to successful resolutions.
   * Failures are handled by the backoff timer.
   */
  private readonly minTimeBetweenResolutionsMs: number;
  private pendingLookupPromise: Promise<TcpSubchannelAddress[]> | null = null;
  private pendingTxtPromise: Promise<string[][]> | null = null;
  private latestLookupResult: StatusOr<Endpoint[]> | null = null;
  private latestServiceConfigResult: StatusOr<ServiceConfig> | null = null;
  private percentage: number;
  private defaultResolutionError: StatusObject;
  private backoff: BackoffTimeout;
  private continueResolving = false;
  private nextResolutionTimer: NodeJS.Timeout;
  private isNextResolutionTimerRunning = false;
  private isServiceConfigEnabled = true;
  private returnedIpResult = false;
  private alternativeResolver = new dns.Resolver();

  constructor(
    private target: GrpcUri,
    private listener: ResolverListener,
    channelOptions: ChannelOptions
  ) {
    trace('Resolver constructed for target ' + uriToString(target));
    if (target.authority) {
      this.alternativeResolver.setServers([target.authority]);
    }
    const hostPort = splitHostPort(target.path);
    if (hostPort === null) {
      this.ipResult = null;
      this.dnsHostname = null;
      this.port = null;
    } else {
      if (isIPv4(hostPort.host) || isIPv6(hostPort.host)) {
        this.ipResult = [
          {
            addresses: [
              {
                host: hostPort.host,
                port: hostPort.port ?? DEFAULT_PORT,
              },
            ],
          },
        ];
        this.dnsHostname = null;
        this.port = null;
      } else {
        this.ipResult = null;
        this.dnsHostname = hostPort.host;
        this.port = hostPort.port ?? DEFAULT_PORT;
      }
    }
    this.percentage = Math.random() * 100;

    if (channelOptions['grpc.service_config_disable_resolution'] === 1) {
      this.isServiceConfigEnabled = false;
    }

    this.defaultResolutionError = {
      code: Status.UNAVAILABLE,
      details: `Name resolution failed for target ${uriToString(this.target)}`,
      metadata: new Metadata(),
    };

    const backoffOptions: BackoffOptions = {
      initialDelay: channelOptions['grpc.initial_reconnect_backoff_ms'],
      maxDelay: channelOptions['grpc.max_reconnect_backoff_ms'],
    };

    this.backoff = new BackoffTimeout(() => {
      if (this.continueResolving) {
        this.startResolutionWithBackoff();
      }
    }, backoffOptions);
    this.backoff.unref();

    this.minTimeBetweenResolutionsMs =
      channelOptions['grpc.dns_min_time_between_resolutions_ms'] ??
      DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS;
    this.nextResolutionTimer = setTimeout(() => {}, 0);
    clearTimeout(this.nextResolutionTimer);
  }

  /**
   * If the target is an IP address, just provide that address as a result.
   * Otherwise, initiate A, AAAA, and TXT lookups
   */
  private startResolution() {
    if (this.ipResult !== null) {
      if (!this.returnedIpResult) {
        trace('Returning IP address for target ' + uriToString(this.target));
        setImmediate(() => {
          this.listener(
            statusOrFromValue(this.ipResult!),
            {},
            null,
            ''
          )
        });
        this.returnedIpResult = true;
      }
      this.backoff.stop();
      this.backoff.reset();
      this.stopNextResolutionTimer();
      return;
    }
    if (this.dnsHostname === null) {
      trace('Failed to parse DNS address ' + uriToString(this.target));
      setImmediate(() => {
        this.listener(
          statusOrFromError({
            code: Status.UNAVAILABLE,
            details: `Failed to parse DNS address ${uriToString(this.target)}`
          }),
          {},
          null,
          ''
        );
      });
      this.stopNextResolutionTimer();
    } else {
      if (this.pendingLookupPromise !== null) {
        return;
      }
      trace('Looking up DNS hostname ' + this.dnsHostname);
      /* We clear out latestLookupResult here to ensure that it contains the
       * latest result since the last time we started resolving. That way, the
       * TXT resolution handler can use it, but only if it finishes second. We
       * don't clear out any previous service config results because it's
       * better to use a service config that's slightly out of date than to
       * revert to an effectively blank one. */
      this.latestLookupResult = null;
      const hostname: string = this.dnsHostname;
      this.pendingLookupPromise = this.lookup(hostname);
      this.pendingLookupPromise.then(
        addressList => {
          if (this.pendingLookupPromise === null) {
            return;
          }
          this.pendingLookupPromise = null;
          this.latestLookupResult = statusOrFromValue(addressList.map(address => ({
            addresses: [address],
          })));
          const allAddressesString: string =
            '[' +
            addressList.map(addr => addr.host + ':' + addr.port).join(',') +
            ']';
          trace(
            'Resolved addresses for target ' +
              uriToString(this.target) +
              ': ' +
              allAddressesString
          );
          /* If the TXT lookup has not yet finished, both of the last two
           * arguments will be null, which is the equivalent of getting an
           * empty TXT response. When the TXT lookup does finish, its handler
           * can update the service config by using the same address list */
          const healthStatus = this.listener(
            this.latestLookupResult,
            {},
            this.latestServiceConfigResult,
            ''
          );
          this.handleHealthStatus(healthStatus);
        },
        err => {
          if (this.pendingLookupPromise === null) {
            return;
          }
          trace(
            'Resolution error for target ' +
              uriToString(this.target) +
              ': ' +
              (err as Error).message
          );
          this.pendingLookupPromise = null;
          this.stopNextResolutionTimer();
          this.listener(
            statusOrFromError(this.defaultResolutionError),
            {},
            this.latestServiceConfigResult,
            ''
          )
        }
      );
      /* If there already is a still-pending TXT resolution, we can just use
       * that result when it comes in */
      if (this.isServiceConfigEnabled && this.pendingTxtPromise === null) {
        /* We handle the TXT query promise differently than the others because
         * the name resolution attempt as a whole is a success even if the TXT
         * lookup fails */
        this.pendingTxtPromise = this.resolveTxt(hostname);
        this.pendingTxtPromise.then(
          txtRecord => {
            if (this.pendingTxtPromise === null) {
              return;
            }
            this.pendingTxtPromise = null;
            let serviceConfig: ServiceConfig | null;
            try {
              serviceConfig = extractAndSelectServiceConfig(
                txtRecord,
                this.percentage
              );
              if (serviceConfig) {
                this.latestServiceConfigResult = statusOrFromValue(serviceConfig);
              } else {
                this.latestServiceConfigResult = null;
              }
            } catch (err) {
              this.latestServiceConfigResult = statusOrFromError({
                code: Status.UNAVAILABLE,
                details: `Parsing service config failed with error ${
                  (err as Error).message
                }`
              });
            }
            if (this.latestLookupResult !== null) {
              /* We rely here on the assumption that calling this function with
               * identical parameters will be essentialy idempotent, and calling
               * it with the same address list and a different service config
               * should result in a fast and seamless switchover. */
              this.listener(
                this.latestLookupResult,
                {},
                this.latestServiceConfigResult,
                ''
              );
            }
          },
          err => {
            /* If TXT lookup fails we should do nothing, which means that we
             * continue to use the result of the most recent successful lookup,
             * or the default null config object if there has never been a
             * successful lookup. We do not set the latestServiceConfigError
             * here because that is specifically used for response validation
             * errors. We still need to handle this error so that it does not
             * bubble up as an unhandled promise rejection. */
          }
        );
      }
    }
  }

  /**
   * The ResolverListener returns a boolean indicating whether the LB policy
   * accepted the resolution result. A false result on an otherwise successful
   * resolution should be treated as a resolution failure.
   * @param healthStatus
   */
  private handleHealthStatus(healthStatus: boolean) {
    if (healthStatus) {
      this.backoff.stop();
      this.backoff.reset();
    } else {
      this.continueResolving = true;
    }
  }

  private async lookup(hostname: string): Promise<TcpSubchannelAddress[]> {
    if (GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
      trace('Using alternative DNS resolver.');

      const records = await Promise.allSettled([
        this.alternativeResolver.resolve4(hostname),
        this.alternativeResolver.resolve6(hostname),
      ]);

      if (records.every(result => result.status === 'rejected')) {
        throw new Error((records[0] as PromiseRejectedResult).reason);
      }

      return records
        .reduce<string[]>((acc, result) => {
          return result.status === 'fulfilled'
            ? [...acc, ...result.value]
            : acc;
        }, [])
        .map(addr => ({
          host: addr,
          port: +this.port!,
        }));
    }

    /* We lookup both address families here and then split them up later
     * because when looking up a single family, dns.lookup outputs an error
     * if the name exists but there are no records for that family, and that
     * error is indistinguishable from other kinds of errors */
    const addressList = await dns.lookup(hostname, { all: true });
    return addressList.map(addr => ({ host: addr.address, port: +this.port! }));
  }

  private async resolveTxt(hostname: string): Promise<string[][]> {
    if (GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
      trace('Using alternative DNS resolver.');
      return this.alternativeResolver.resolveTxt(hostname);
    }

    return dns.resolveTxt(hostname);
  }

  private startNextResolutionTimer() {
    clearTimeout(this.nextResolutionTimer);
    this.nextResolutionTimer = setTimeout(() => {
      this.stopNextResolutionTimer();
      if (this.continueResolving) {
        this.startResolutionWithBackoff();
      }
    }, this.minTimeBetweenResolutionsMs);
    this.nextResolutionTimer.unref?.();
    this.isNextResolutionTimerRunning = true;
  }

  private stopNextResolutionTimer() {
    clearTimeout(this.nextResolutionTimer);
    this.isNextResolutionTimerRunning = false;
  }

  private startResolutionWithBackoff() {
    if (this.pendingLookupPromise === null) {
      this.continueResolving = false;
      this.backoff.runOnce();
      this.startNextResolutionTimer();
      this.startResolution();
    }
  }

  updateResolution() {
    /* If there is a pending lookup, just let it finish. Otherwise, if the
     * nextResolutionTimer or backoff timer is running, set the
     * continueResolving flag to resolve when whichever of those timers
     * fires. Otherwise, start resolving immediately. */
    if (this.pendingLookupPromise === null) {
      if (this.isNextResolutionTimerRunning || this.backoff.isRunning()) {
        if (this.isNextResolutionTimerRunning) {
          trace(
            'resolution update delayed by "min time between resolutions" rate limit'
          );
        } else {
          trace(
            'resolution update delayed by backoff timer until ' +
              this.backoff.getEndTime().toISOString()
          );
        }
        this.continueResolving = true;
      } else {
        this.startResolutionWithBackoff();
      }
    }
  }

  /**
   * Reset the resolver to the same state it had when it was created. In-flight
   * DNS requests cannot be cancelled, but they are discarded and their results
   * will be ignored.
   */
  destroy() {
    this.continueResolving = false;
    this.backoff.reset();
    this.backoff.stop();
    this.stopNextResolutionTimer();
    this.pendingLookupPromise = null;
    this.pendingTxtPromise = null;
    this.latestLookupResult = null;
    this.latestServiceConfigResult = null;
    this.returnedIpResult = false;
  }

  /**
   * Get the default authority for the given target. For IP targets, that is
   * the IP address. For DNS targets, it is the hostname.
   * @param target
   */
  static getDefaultAuthority(target: GrpcUri): string {
    return target.path;
  }
}

/**
 * Set up the DNS resolver class by registering it as the handler for the
 * "dns:" prefix and as the default resolver.
 */
export function setup(): void {
  registerResolver('dns', DnsResolver);
  registerDefaultScheme('dns');
}

export interface DnsUrl {
  host: string;
  port?: string;
}
