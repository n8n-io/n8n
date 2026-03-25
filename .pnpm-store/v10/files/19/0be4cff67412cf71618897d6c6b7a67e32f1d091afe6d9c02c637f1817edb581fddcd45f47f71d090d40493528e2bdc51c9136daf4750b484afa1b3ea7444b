"use strict";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgent = exports.pool = void 0;
const http_1 = require("http");
const https_1 = require("https");
// eslint-disable-next-line node/no-deprecated-api
const url_1 = require("url");
exports.pool = new Map();
/**
 * Determines if a proxy should be considered based on the environment.
 *
 * @param uri The request uri
 * @returns {boolean}
 */
function shouldUseProxyForURI(uri) {
    const noProxyEnv = process.env.NO_PROXY || process.env.no_proxy;
    if (!noProxyEnv) {
        return true;
    }
    const givenURI = new URL(uri);
    for (const noProxyRaw of noProxyEnv.split(',')) {
        const noProxy = noProxyRaw.trim();
        if (noProxy === givenURI.origin || noProxy === givenURI.hostname) {
            return false;
        }
        else if (noProxy.startsWith('*.') || noProxy.startsWith('.')) {
            const noProxyWildcard = noProxy.replace(/^\*\./, '.');
            if (givenURI.hostname.endsWith(noProxyWildcard)) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Returns a custom request Agent if one is found, otherwise returns undefined
 * which will result in the global http(s) Agent being used.
 * @private
 * @param {string} uri The request uri
 * @param {Options} reqOpts The request options
 * @returns {HttpAnyAgent|undefined}
 */
function getAgent(uri, reqOpts) {
    const isHttp = uri.startsWith('http://');
    const proxy = reqOpts.proxy ||
        process.env.HTTP_PROXY ||
        process.env.http_proxy ||
        process.env.HTTPS_PROXY ||
        process.env.https_proxy;
    const poolOptions = Object.assign({}, reqOpts.pool);
    const manuallyProvidedProxy = !!reqOpts.proxy;
    const shouldUseProxy = manuallyProvidedProxy || shouldUseProxyForURI(uri);
    if (proxy && shouldUseProxy) {
        // tslint:disable-next-line variable-name
        const Agent = isHttp
            ? require('http-proxy-agent')
            : require('https-proxy-agent');
        const proxyOpts = { ...(0, url_1.parse)(proxy), ...poolOptions };
        return new Agent(proxyOpts);
    }
    let key = isHttp ? 'http' : 'https';
    if (reqOpts.forever) {
        key += ':forever';
        if (!exports.pool.has(key)) {
            // tslint:disable-next-line variable-name
            const Agent = isHttp ? http_1.Agent : https_1.Agent;
            exports.pool.set(key, new Agent({ ...poolOptions, keepAlive: true }));
        }
    }
    return exports.pool.get(key);
}
exports.getAgent = getAgent;
//# sourceMappingURL=agents.js.map