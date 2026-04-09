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
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = setup;
const net_1 = require("net");
const call_interface_1 = require("./call-interface");
const constants_1 = require("./constants");
const metadata_1 = require("./metadata");
const resolver_1 = require("./resolver");
const subchannel_address_1 = require("./subchannel-address");
const uri_parser_1 = require("./uri-parser");
const logging = require("./logging");
const TRACER_NAME = 'ip_resolver';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const IPV4_SCHEME = 'ipv4';
const IPV6_SCHEME = 'ipv6';
/**
 * The default TCP port to connect to if not explicitly specified in the target.
 */
const DEFAULT_PORT = 443;
class IpResolver {
    constructor(target, listener, channelOptions) {
        var _a;
        this.listener = listener;
        this.endpoints = [];
        this.error = null;
        this.hasReturnedResult = false;
        trace('Resolver constructed for target ' + (0, uri_parser_1.uriToString)(target));
        const addresses = [];
        if (!(target.scheme === IPV4_SCHEME || target.scheme === IPV6_SCHEME)) {
            this.error = {
                code: constants_1.Status.UNAVAILABLE,
                details: `Unrecognized scheme ${target.scheme} in IP resolver`,
                metadata: new metadata_1.Metadata(),
            };
            return;
        }
        const pathList = target.path.split(',');
        for (const path of pathList) {
            const hostPort = (0, uri_parser_1.splitHostPort)(path);
            if (hostPort === null) {
                this.error = {
                    code: constants_1.Status.UNAVAILABLE,
                    details: `Failed to parse ${target.scheme} address ${path}`,
                    metadata: new metadata_1.Metadata(),
                };
                return;
            }
            if ((target.scheme === IPV4_SCHEME && !(0, net_1.isIPv4)(hostPort.host)) ||
                (target.scheme === IPV6_SCHEME && !(0, net_1.isIPv6)(hostPort.host))) {
                this.error = {
                    code: constants_1.Status.UNAVAILABLE,
                    details: `Failed to parse ${target.scheme} address ${path}`,
                    metadata: new metadata_1.Metadata(),
                };
                return;
            }
            addresses.push({
                host: hostPort.host,
                port: (_a = hostPort.port) !== null && _a !== void 0 ? _a : DEFAULT_PORT,
            });
        }
        this.endpoints = addresses.map(address => ({ addresses: [address] }));
        trace('Parsed ' + target.scheme + ' address list ' + addresses.map(subchannel_address_1.subchannelAddressToString));
    }
    updateResolution() {
        if (!this.hasReturnedResult) {
            this.hasReturnedResult = true;
            process.nextTick(() => {
                if (this.error) {
                    this.listener((0, call_interface_1.statusOrFromError)(this.error), {}, null, '');
                }
                else {
                    this.listener((0, call_interface_1.statusOrFromValue)(this.endpoints), {}, null, '');
                }
            });
        }
    }
    destroy() {
        this.hasReturnedResult = false;
    }
    static getDefaultAuthority(target) {
        return target.path.split(',')[0];
    }
}
function setup() {
    (0, resolver_1.registerResolver)(IPV4_SCHEME, IpResolver);
    (0, resolver_1.registerResolver)(IPV6_SCHEME, IpResolver);
}
//# sourceMappingURL=resolver-ip.js.map