"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PORT = void 0;
exports.setup = setup;
const resolver_1 = require("./resolver");
const dns_1 = require("dns");
const service_config_1 = require("./service-config");
const constants_1 = require("./constants");
const metadata_1 = require("./metadata");
const logging = require("./logging");
const constants_2 = require("./constants");
const uri_parser_1 = require("./uri-parser");
const net_1 = require("net");
const backoff_timeout_1 = require("./backoff-timeout");
const environment_1 = require("./environment");
const TRACER_NAME = 'dns_resolver';
function trace(text) {
    logging.trace(constants_2.LogVerbosity.DEBUG, TRACER_NAME, text);
}
/**
 * The default TCP port to connect to if not explicitly specified in the target.
 */
exports.DEFAULT_PORT = 443;
const DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS = 30000;
/**
 * Resolver implementation that handles DNS names and IP addresses.
 */
class DnsResolver {
    constructor(target, listener, channelOptions) {
        var _a, _b, _c;
        this.target = target;
        this.listener = listener;
        this.pendingLookupPromise = null;
        this.pendingTxtPromise = null;
        this.latestLookupResult = null;
        this.latestServiceConfig = null;
        this.latestServiceConfigError = null;
        this.continueResolving = false;
        this.isNextResolutionTimerRunning = false;
        this.isServiceConfigEnabled = true;
        this.returnedIpResult = false;
        this.alternativeResolver = new dns_1.promises.Resolver();
        trace('Resolver constructed for target ' + (0, uri_parser_1.uriToString)(target));
        if (target.authority) {
            this.alternativeResolver.setServers([target.authority]);
        }
        const hostPort = (0, uri_parser_1.splitHostPort)(target.path);
        if (hostPort === null) {
            this.ipResult = null;
            this.dnsHostname = null;
            this.port = null;
        }
        else {
            if ((0, net_1.isIPv4)(hostPort.host) || (0, net_1.isIPv6)(hostPort.host)) {
                this.ipResult = [
                    {
                        addresses: [
                            {
                                host: hostPort.host,
                                port: (_a = hostPort.port) !== null && _a !== void 0 ? _a : exports.DEFAULT_PORT,
                            },
                        ],
                    },
                ];
                this.dnsHostname = null;
                this.port = null;
            }
            else {
                this.ipResult = null;
                this.dnsHostname = hostPort.host;
                this.port = (_b = hostPort.port) !== null && _b !== void 0 ? _b : exports.DEFAULT_PORT;
            }
        }
        this.percentage = Math.random() * 100;
        if (channelOptions['grpc.service_config_disable_resolution'] === 1) {
            this.isServiceConfigEnabled = false;
        }
        this.defaultResolutionError = {
            code: constants_1.Status.UNAVAILABLE,
            details: `Name resolution failed for target ${(0, uri_parser_1.uriToString)(this.target)}`,
            metadata: new metadata_1.Metadata(),
        };
        const backoffOptions = {
            initialDelay: channelOptions['grpc.initial_reconnect_backoff_ms'],
            maxDelay: channelOptions['grpc.max_reconnect_backoff_ms'],
        };
        this.backoff = new backoff_timeout_1.BackoffTimeout(() => {
            if (this.continueResolving) {
                this.startResolutionWithBackoff();
            }
        }, backoffOptions);
        this.backoff.unref();
        this.minTimeBetweenResolutionsMs =
            (_c = channelOptions['grpc.dns_min_time_between_resolutions_ms']) !== null && _c !== void 0 ? _c : DEFAULT_MIN_TIME_BETWEEN_RESOLUTIONS_MS;
        this.nextResolutionTimer = setTimeout(() => { }, 0);
        clearTimeout(this.nextResolutionTimer);
    }
    /**
     * If the target is an IP address, just provide that address as a result.
     * Otherwise, initiate A, AAAA, and TXT lookups
     */
    startResolution() {
        if (this.ipResult !== null) {
            if (!this.returnedIpResult) {
                trace('Returning IP address for target ' + (0, uri_parser_1.uriToString)(this.target));
                setImmediate(() => {
                    this.listener.onSuccessfulResolution(this.ipResult, null, null, null, {});
                });
                this.returnedIpResult = true;
            }
            this.backoff.stop();
            this.backoff.reset();
            this.stopNextResolutionTimer();
            return;
        }
        if (this.dnsHostname === null) {
            trace('Failed to parse DNS address ' + (0, uri_parser_1.uriToString)(this.target));
            setImmediate(() => {
                this.listener.onError({
                    code: constants_1.Status.UNAVAILABLE,
                    details: `Failed to parse DNS address ${(0, uri_parser_1.uriToString)(this.target)}`,
                    metadata: new metadata_1.Metadata(),
                });
            });
            this.stopNextResolutionTimer();
        }
        else {
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
            const hostname = this.dnsHostname;
            this.pendingLookupPromise = this.lookup(hostname);
            this.pendingLookupPromise.then(addressList => {
                if (this.pendingLookupPromise === null) {
                    return;
                }
                this.pendingLookupPromise = null;
                this.backoff.reset();
                this.backoff.stop();
                this.latestLookupResult = addressList.map(address => ({
                    addresses: [address],
                }));
                const allAddressesString = '[' +
                    addressList.map(addr => addr.host + ':' + addr.port).join(',') +
                    ']';
                trace('Resolved addresses for target ' +
                    (0, uri_parser_1.uriToString)(this.target) +
                    ': ' +
                    allAddressesString);
                if (this.latestLookupResult.length === 0) {
                    this.listener.onError(this.defaultResolutionError);
                    return;
                }
                /* If the TXT lookup has not yet finished, both of the last two
                 * arguments will be null, which is the equivalent of getting an
                 * empty TXT response. When the TXT lookup does finish, its handler
                 * can update the service config by using the same address list */
                this.listener.onSuccessfulResolution(this.latestLookupResult, this.latestServiceConfig, this.latestServiceConfigError, null, {});
            }, err => {
                if (this.pendingLookupPromise === null) {
                    return;
                }
                trace('Resolution error for target ' +
                    (0, uri_parser_1.uriToString)(this.target) +
                    ': ' +
                    err.message);
                this.pendingLookupPromise = null;
                this.stopNextResolutionTimer();
                this.listener.onError(this.defaultResolutionError);
            });
            /* If there already is a still-pending TXT resolution, we can just use
             * that result when it comes in */
            if (this.isServiceConfigEnabled && this.pendingTxtPromise === null) {
                /* We handle the TXT query promise differently than the others because
                 * the name resolution attempt as a whole is a success even if the TXT
                 * lookup fails */
                this.pendingTxtPromise = this.resolveTxt(hostname);
                this.pendingTxtPromise.then(txtRecord => {
                    if (this.pendingTxtPromise === null) {
                        return;
                    }
                    this.pendingTxtPromise = null;
                    try {
                        this.latestServiceConfig = (0, service_config_1.extractAndSelectServiceConfig)(txtRecord, this.percentage);
                    }
                    catch (err) {
                        this.latestServiceConfigError = {
                            code: constants_1.Status.UNAVAILABLE,
                            details: `Parsing service config failed with error ${err.message}`,
                            metadata: new metadata_1.Metadata(),
                        };
                    }
                    if (this.latestLookupResult !== null) {
                        /* We rely here on the assumption that calling this function with
                         * identical parameters will be essentialy idempotent, and calling
                         * it with the same address list and a different service config
                         * should result in a fast and seamless switchover. */
                        this.listener.onSuccessfulResolution(this.latestLookupResult, this.latestServiceConfig, this.latestServiceConfigError, null, {});
                    }
                }, err => {
                    /* If TXT lookup fails we should do nothing, which means that we
                     * continue to use the result of the most recent successful lookup,
                     * or the default null config object if there has never been a
                     * successful lookup. We do not set the latestServiceConfigError
                     * here because that is specifically used for response validation
                     * errors. We still need to handle this error so that it does not
                     * bubble up as an unhandled promise rejection. */
                });
            }
        }
    }
    async lookup(hostname) {
        if (environment_1.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
            trace('Using alternative DNS resolver.');
            const records = await Promise.allSettled([
                this.alternativeResolver.resolve4(hostname),
                this.alternativeResolver.resolve6(hostname),
            ]);
            if (records.every(result => result.status === 'rejected')) {
                throw new Error(records[0].reason);
            }
            return records
                .reduce((acc, result) => {
                return result.status === 'fulfilled'
                    ? [...acc, ...result.value]
                    : acc;
            }, [])
                .map(addr => ({
                host: addr,
                port: +this.port,
            }));
        }
        /* We lookup both address families here and then split them up later
         * because when looking up a single family, dns.lookup outputs an error
         * if the name exists but there are no records for that family, and that
         * error is indistinguishable from other kinds of errors */
        const addressList = await dns_1.promises.lookup(hostname, { all: true });
        return addressList.map(addr => ({ host: addr.address, port: +this.port }));
    }
    async resolveTxt(hostname) {
        if (environment_1.GRPC_NODE_USE_ALTERNATIVE_RESOLVER) {
            trace('Using alternative DNS resolver.');
            return this.alternativeResolver.resolveTxt(hostname);
        }
        return dns_1.promises.resolveTxt(hostname);
    }
    startNextResolutionTimer() {
        var _a, _b;
        clearTimeout(this.nextResolutionTimer);
        this.nextResolutionTimer = setTimeout(() => {
            this.stopNextResolutionTimer();
            if (this.continueResolving) {
                this.startResolutionWithBackoff();
            }
        }, this.minTimeBetweenResolutionsMs);
        (_b = (_a = this.nextResolutionTimer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
        this.isNextResolutionTimerRunning = true;
    }
    stopNextResolutionTimer() {
        clearTimeout(this.nextResolutionTimer);
        this.isNextResolutionTimerRunning = false;
    }
    startResolutionWithBackoff() {
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
                    trace('resolution update delayed by "min time between resolutions" rate limit');
                }
                else {
                    trace('resolution update delayed by backoff timer until ' +
                        this.backoff.getEndTime().toISOString());
                }
                this.continueResolving = true;
            }
            else {
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
        this.latestServiceConfig = null;
        this.latestServiceConfigError = null;
        this.returnedIpResult = false;
    }
    /**
     * Get the default authority for the given target. For IP targets, that is
     * the IP address. For DNS targets, it is the hostname.
     * @param target
     */
    static getDefaultAuthority(target) {
        return target.path;
    }
}
/**
 * Set up the DNS resolver class by registering it as the handler for the
 * "dns:" prefix and as the default resolver.
 */
function setup() {
    (0, resolver_1.registerResolver)('dns', DnsResolver);
    (0, resolver_1.registerDefaultScheme)('dns');
}
//# sourceMappingURL=resolver-dns.js.map