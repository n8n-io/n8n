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
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCIDR = parseCIDR;
exports.mapProxyName = mapProxyName;
exports.getProxiedConnection = getProxiedConnection;
const logging_1 = require("./logging");
const constants_1 = require("./constants");
const net_1 = require("net");
const http = require("http");
const logging = require("./logging");
const subchannel_address_1 = require("./subchannel-address");
const uri_parser_1 = require("./uri-parser");
const url_1 = require("url");
const resolver_dns_1 = require("./resolver-dns");
const TRACER_NAME = 'proxy';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
function getProxyInfo() {
    let proxyEnv = '';
    let envVar = '';
    /* Prefer using 'grpc_proxy'. Fallback on 'http_proxy' if it is not set.
     * Also prefer using 'https_proxy' with fallback on 'http_proxy'. The
     * fallback behavior can be removed if there's a demand for it.
     */
    if (process.env.grpc_proxy) {
        envVar = 'grpc_proxy';
        proxyEnv = process.env.grpc_proxy;
    }
    else if (process.env.https_proxy) {
        envVar = 'https_proxy';
        proxyEnv = process.env.https_proxy;
    }
    else if (process.env.http_proxy) {
        envVar = 'http_proxy';
        proxyEnv = process.env.http_proxy;
    }
    else {
        return {};
    }
    let proxyUrl;
    try {
        proxyUrl = new url_1.URL(proxyEnv);
    }
    catch (e) {
        (0, logging_1.log)(constants_1.LogVerbosity.ERROR, `cannot parse value of "${envVar}" env var`);
        return {};
    }
    if (proxyUrl.protocol !== 'http:') {
        (0, logging_1.log)(constants_1.LogVerbosity.ERROR, `"${proxyUrl.protocol}" scheme not supported in proxy URI`);
        return {};
    }
    let userCred = null;
    if (proxyUrl.username) {
        if (proxyUrl.password) {
            (0, logging_1.log)(constants_1.LogVerbosity.INFO, 'userinfo found in proxy URI');
            userCred = decodeURIComponent(`${proxyUrl.username}:${proxyUrl.password}`);
        }
        else {
            userCred = proxyUrl.username;
        }
    }
    const hostname = proxyUrl.hostname;
    let port = proxyUrl.port;
    /* The proxy URL uses the scheme "http:", which has a default port number of
     * 80. We need to set that explicitly here if it is omitted because otherwise
     * it will use gRPC's default port 443. */
    if (port === '') {
        port = '80';
    }
    const result = {
        address: `${hostname}:${port}`,
    };
    if (userCred) {
        result.creds = userCred;
    }
    trace('Proxy server ' + result.address + ' set by environment variable ' + envVar);
    return result;
}
function getNoProxyHostList() {
    /* Prefer using 'no_grpc_proxy'. Fallback on 'no_proxy' if it is not set. */
    let noProxyStr = process.env.no_grpc_proxy;
    let envVar = 'no_grpc_proxy';
    if (!noProxyStr) {
        noProxyStr = process.env.no_proxy;
        envVar = 'no_proxy';
    }
    if (noProxyStr) {
        trace('No proxy server list set by environment variable ' + envVar);
        return noProxyStr.split(',');
    }
    else {
        return [];
    }
}
/*
 * The groups correspond to CIDR parts as follows:
 * 1. ip
 * 2. prefixLength
 */
function parseCIDR(cidrString) {
    const splitRange = cidrString.split('/');
    if (splitRange.length !== 2) {
        return null;
    }
    const prefixLength = parseInt(splitRange[1], 10);
    if (!(0, net_1.isIPv4)(splitRange[0]) || Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
        return null;
    }
    return {
        ip: ipToInt(splitRange[0]),
        prefixLength: prefixLength
    };
}
function ipToInt(ip) {
    return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}
function isIpInCIDR(cidr, serverHost) {
    const ip = cidr.ip;
    const mask = -1 << (32 - cidr.prefixLength);
    const hostIP = ipToInt(serverHost);
    return (hostIP & mask) === (ip & mask);
}
function hostMatchesNoProxyList(serverHost) {
    for (const host of getNoProxyHostList()) {
        const parsedCIDR = parseCIDR(host);
        // host is a CIDR and serverHost is an IP address
        if ((0, net_1.isIPv4)(serverHost) && parsedCIDR && isIpInCIDR(parsedCIDR, serverHost)) {
            return true;
        }
        else if (serverHost.endsWith(host)) {
            // host is a single IP or a domain name suffix
            return true;
        }
    }
    return false;
}
function mapProxyName(target, options) {
    var _a;
    const noProxyResult = {
        target: target,
        extraOptions: {},
    };
    if (((_a = options['grpc.enable_http_proxy']) !== null && _a !== void 0 ? _a : 1) === 0) {
        return noProxyResult;
    }
    if (target.scheme === 'unix') {
        return noProxyResult;
    }
    const proxyInfo = getProxyInfo();
    if (!proxyInfo.address) {
        return noProxyResult;
    }
    const hostPort = (0, uri_parser_1.splitHostPort)(target.path);
    if (!hostPort) {
        return noProxyResult;
    }
    const serverHost = hostPort.host;
    if (hostMatchesNoProxyList(serverHost)) {
        trace('Not using proxy for target in no_proxy list: ' + (0, uri_parser_1.uriToString)(target));
        return noProxyResult;
    }
    const extraOptions = {
        'grpc.http_connect_target': (0, uri_parser_1.uriToString)(target),
    };
    if (proxyInfo.creds) {
        extraOptions['grpc.http_connect_creds'] = proxyInfo.creds;
    }
    return {
        target: {
            scheme: 'dns',
            path: proxyInfo.address,
        },
        extraOptions: extraOptions,
    };
}
function getProxiedConnection(address, channelOptions) {
    var _a;
    if (!('grpc.http_connect_target' in channelOptions)) {
        return Promise.resolve(null);
    }
    const realTarget = channelOptions['grpc.http_connect_target'];
    const parsedTarget = (0, uri_parser_1.parseUri)(realTarget);
    if (parsedTarget === null) {
        return Promise.resolve(null);
    }
    const splitHostPost = (0, uri_parser_1.splitHostPort)(parsedTarget.path);
    if (splitHostPost === null) {
        return Promise.resolve(null);
    }
    const hostPort = `${splitHostPost.host}:${(_a = splitHostPost.port) !== null && _a !== void 0 ? _a : resolver_dns_1.DEFAULT_PORT}`;
    const options = {
        method: 'CONNECT',
        path: hostPort,
    };
    const headers = {
        Host: hostPort,
    };
    // Connect to the subchannel address as a proxy
    if ((0, subchannel_address_1.isTcpSubchannelAddress)(address)) {
        options.host = address.host;
        options.port = address.port;
    }
    else {
        options.socketPath = address.path;
    }
    if ('grpc.http_connect_creds' in channelOptions) {
        headers['Proxy-Authorization'] =
            'Basic ' +
                Buffer.from(channelOptions['grpc.http_connect_creds']).toString('base64');
    }
    options.headers = headers;
    const proxyAddressString = (0, subchannel_address_1.subchannelAddressToString)(address);
    trace('Using proxy ' + proxyAddressString + ' to connect to ' + options.path);
    return new Promise((resolve, reject) => {
        const request = http.request(options);
        request.once('connect', (res, socket, head) => {
            request.removeAllListeners();
            socket.removeAllListeners();
            if (res.statusCode === 200) {
                trace('Successfully connected to ' +
                    options.path +
                    ' through proxy ' +
                    proxyAddressString);
                // The HTTP client may have already read a few bytes of the proxied
                // connection. If that's the case, put them back into the socket.
                // See https://github.com/grpc/grpc-node/issues/2744.
                if (head.length > 0) {
                    socket.unshift(head);
                }
                trace('Successfully established a plaintext connection to ' +
                    options.path +
                    ' through proxy ' +
                    proxyAddressString);
                resolve(socket);
            }
            else {
                (0, logging_1.log)(constants_1.LogVerbosity.ERROR, 'Failed to connect to ' +
                    options.path +
                    ' through proxy ' +
                    proxyAddressString +
                    ' with status ' +
                    res.statusCode);
                reject();
            }
        });
        request.once('error', err => {
            request.removeAllListeners();
            (0, logging_1.log)(constants_1.LogVerbosity.ERROR, 'Failed to connect to proxy ' +
                proxyAddressString +
                ' with error ' +
                err.message);
            reject();
        });
        request.end();
    });
}
//# sourceMappingURL=http_proxy.js.map