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

import { log } from './logging';
import { LogVerbosity } from './constants';
import { isIPv4, Socket } from 'net';
import * as http from 'http';
import * as logging from './logging';
import {
  SubchannelAddress,
  isTcpSubchannelAddress,
  subchannelAddressToString,
} from './subchannel-address';
import { ChannelOptions } from './channel-options';
import { GrpcUri, parseUri, splitHostPort, uriToString } from './uri-parser';
import { URL } from 'url';
import { DEFAULT_PORT } from './resolver-dns';

const TRACER_NAME = 'proxy';

function trace(text: string): void {
  logging.trace(LogVerbosity.DEBUG, TRACER_NAME, text);
}

interface ProxyInfo {
  address?: string;
  creds?: string;
}

function getProxyInfo(): ProxyInfo {
  let proxyEnv = '';
  let envVar = '';
  /* Prefer using 'grpc_proxy'. Fallback on 'http_proxy' if it is not set.
   * Also prefer using 'https_proxy' with fallback on 'http_proxy'. The
   * fallback behavior can be removed if there's a demand for it.
   */
  if (process.env.grpc_proxy) {
    envVar = 'grpc_proxy';
    proxyEnv = process.env.grpc_proxy;
  } else if (process.env.https_proxy) {
    envVar = 'https_proxy';
    proxyEnv = process.env.https_proxy;
  } else if (process.env.http_proxy) {
    envVar = 'http_proxy';
    proxyEnv = process.env.http_proxy;
  } else {
    return {};
  }
  let proxyUrl: URL;
  try {
    proxyUrl = new URL(proxyEnv);
  } catch (e) {
    log(LogVerbosity.ERROR, `cannot parse value of "${envVar}" env var`);
    return {};
  }
  if (proxyUrl.protocol !== 'http:') {
    log(
      LogVerbosity.ERROR,
      `"${proxyUrl.protocol}" scheme not supported in proxy URI`
    );
    return {};
  }
  let userCred: string | null = null;
  if (proxyUrl.username) {
    if (proxyUrl.password) {
      log(LogVerbosity.INFO, 'userinfo found in proxy URI');
      userCred = decodeURIComponent(`${proxyUrl.username}:${proxyUrl.password}`);
    } else {
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
  const result: ProxyInfo = {
    address: `${hostname}:${port}`,
  };
  if (userCred) {
    result.creds = userCred;
  }
  trace(
    'Proxy server ' + result.address + ' set by environment variable ' + envVar
  );
  return result;
}

function getNoProxyHostList(): string[] {
  /* Prefer using 'no_grpc_proxy'. Fallback on 'no_proxy' if it is not set. */
  let noProxyStr: string | undefined = process.env.no_grpc_proxy;
  let envVar = 'no_grpc_proxy';
  if (!noProxyStr) {
    noProxyStr = process.env.no_proxy;
    envVar = 'no_proxy';
  }
  if (noProxyStr) {
    trace('No proxy server list set by environment variable ' + envVar);
    return noProxyStr.split(',');
  } else {
    return [];
  }
}

interface CIDRNotation {
  ip: number;
  prefixLength: number;
}

/*
 * The groups correspond to CIDR parts as follows:
 * 1. ip
 * 2. prefixLength
 */

export function parseCIDR(cidrString: string): CIDRNotation | null {
  const splitRange = cidrString.split('/');  
  if (splitRange.length !== 2) {  
    return null;  
  }  
  const prefixLength = parseInt(splitRange[1], 10);  
  if (!isIPv4(splitRange[0]) || Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {  
    return null;  
  }  
  return {  
    ip: ipToInt(splitRange[0]),  
    prefixLength: prefixLength  
  };
}

function ipToInt(ip: string) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

function isIpInCIDR(cidr: CIDRNotation, serverHost: string) {
  const ip = cidr.ip;
  const mask = -1 << (32 - cidr.prefixLength);
  const hostIP = ipToInt(serverHost);

  return (hostIP & mask) === (ip & mask);
}

function hostMatchesNoProxyList(serverHost: string): boolean {
  for (const host of getNoProxyHostList()) {
    const parsedCIDR = parseCIDR(host);
    // host is a CIDR and serverHost is an IP address
    if (isIPv4(serverHost) && parsedCIDR && isIpInCIDR(parsedCIDR, serverHost)) {
      return true;
    } else if (serverHost.endsWith(host)) {
      // host is a single IP or a domain name suffix
      return true;
    }
  }
  return false;
}

export interface ProxyMapResult {
  target: GrpcUri;
  extraOptions: ChannelOptions;
}

export function mapProxyName(
  target: GrpcUri,
  options: ChannelOptions
): ProxyMapResult {
  const noProxyResult: ProxyMapResult = {
    target: target,
    extraOptions: {},
  };
  if ((options['grpc.enable_http_proxy'] ?? 1) === 0) {
    return noProxyResult;
  }
  if (target.scheme === 'unix') {
    return noProxyResult;
  }
  const proxyInfo = getProxyInfo();
  if (!proxyInfo.address) {
    return noProxyResult;
  }
  const hostPort = splitHostPort(target.path);
  if (!hostPort) {
    return noProxyResult;
  }
  const serverHost = hostPort.host;
  if (hostMatchesNoProxyList(serverHost)) {
    trace('Not using proxy for target in no_proxy list: ' + uriToString(target));
    return noProxyResult;
  }
  const extraOptions: ChannelOptions = {
    'grpc.http_connect_target': uriToString(target),
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

export function getProxiedConnection(
  address: SubchannelAddress,
  channelOptions: ChannelOptions
): Promise<Socket | null> {
  if (!('grpc.http_connect_target' in channelOptions)) {
    return Promise.resolve(null);
  }
  const realTarget = channelOptions['grpc.http_connect_target'] as string;
  const parsedTarget = parseUri(realTarget);
  if (parsedTarget === null) {
    return Promise.resolve(null);
  }
  const splitHostPost = splitHostPort(parsedTarget.path);
  if (splitHostPost === null) {
    return Promise.resolve(null);
  }
  const hostPort = `${splitHostPost.host}:${
    splitHostPost.port ?? DEFAULT_PORT
  }`;
  const options: http.RequestOptions = {
    method: 'CONNECT',
    path: hostPort,
  };
  const headers: http.OutgoingHttpHeaders = {
    Host: hostPort,
  };
  // Connect to the subchannel address as a proxy
  if (isTcpSubchannelAddress(address)) {
    options.host = address.host;
    options.port = address.port;
  } else {
    options.socketPath = address.path;
  }
  if ('grpc.http_connect_creds' in channelOptions) {
    headers['Proxy-Authorization'] =
      'Basic ' +
      Buffer.from(channelOptions['grpc.http_connect_creds'] as string).toString(
        'base64'
      );
  }
  options.headers = headers;
  const proxyAddressString = subchannelAddressToString(address);
  trace('Using proxy ' + proxyAddressString + ' to connect to ' + options.path);
  return new Promise<Socket | null>((resolve, reject) => {
    const request = http.request(options);
    request.once('connect', (res, socket, head) => {
      request.removeAllListeners();
      socket.removeAllListeners();
      if (res.statusCode === 200) {
        trace(
          'Successfully connected to ' +
            options.path +
            ' through proxy ' +
            proxyAddressString
        );
        // The HTTP client may have already read a few bytes of the proxied
        // connection. If that's the case, put them back into the socket.
        // See https://github.com/grpc/grpc-node/issues/2744.
        if (head.length > 0) {
          socket.unshift(head);
        }
        trace(
          'Successfully established a plaintext connection to ' +
            options.path +
            ' through proxy ' +
            proxyAddressString
        );
        resolve(socket);
      } else {
        log(
          LogVerbosity.ERROR,
          'Failed to connect to ' +
            options.path +
            ' through proxy ' +
            proxyAddressString +
            ' with status ' +
            res.statusCode
        );
        reject();
      }
    });
    request.once('error', err => {
      request.removeAllListeners();
      log(
        LogVerbosity.ERROR,
        'Failed to connect to proxy ' +
          proxyAddressString +
          ' with error ' +
          err.message
      );
      reject();
    });
    request.end();
  });
}
