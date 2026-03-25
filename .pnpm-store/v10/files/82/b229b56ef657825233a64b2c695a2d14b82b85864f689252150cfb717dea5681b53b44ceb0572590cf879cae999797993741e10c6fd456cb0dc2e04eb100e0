"use strict";
/*
 * Copyright 2020 gRPC authors.
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
exports.parseUri = parseUri;
exports.splitHostPort = splitHostPort;
exports.combineHostPort = combineHostPort;
exports.uriToString = uriToString;
/*
 * The groups correspond to URI parts as follows:
 * 1. scheme
 * 2. authority
 * 3. path
 */
const URI_REGEX = /^(?:([A-Za-z0-9+.-]+):)?(?:\/\/([^/]*)\/)?(.+)$/;
function parseUri(uriString) {
    const parsedUri = URI_REGEX.exec(uriString);
    if (parsedUri === null) {
        return null;
    }
    return {
        scheme: parsedUri[1],
        authority: parsedUri[2],
        path: parsedUri[3],
    };
}
const NUMBER_REGEX = /^\d+$/;
function splitHostPort(path) {
    if (path.startsWith('[')) {
        const hostEnd = path.indexOf(']');
        if (hostEnd === -1) {
            return null;
        }
        const host = path.substring(1, hostEnd);
        /* Only an IPv6 address should be in bracketed notation, and an IPv6
         * address should have at least one colon */
        if (host.indexOf(':') === -1) {
            return null;
        }
        if (path.length > hostEnd + 1) {
            if (path[hostEnd + 1] === ':') {
                const portString = path.substring(hostEnd + 2);
                if (NUMBER_REGEX.test(portString)) {
                    return {
                        host: host,
                        port: +portString,
                    };
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        else {
            return {
                host,
            };
        }
    }
    else {
        const splitPath = path.split(':');
        /* Exactly one colon means that this is host:port. Zero colons means that
         * there is no port. And multiple colons means that this is a bare IPv6
         * address with no port */
        if (splitPath.length === 2) {
            if (NUMBER_REGEX.test(splitPath[1])) {
                return {
                    host: splitPath[0],
                    port: +splitPath[1],
                };
            }
            else {
                return null;
            }
        }
        else {
            return {
                host: path,
            };
        }
    }
}
function combineHostPort(hostPort) {
    if (hostPort.port === undefined) {
        return hostPort.host;
    }
    else {
        // Only an IPv6 host should include a colon
        if (hostPort.host.includes(':')) {
            return `[${hostPort.host}]:${hostPort.port}`;
        }
        else {
            return `${hostPort.host}:${hostPort.port}`;
        }
    }
}
function uriToString(uri) {
    let result = '';
    if (uri.scheme !== undefined) {
        result += uri.scheme + ':';
    }
    if (uri.authority !== undefined) {
        result += '//' + uri.authority + '/';
    }
    result += uri.path;
    return result;
}
//# sourceMappingURL=uri-parser.js.map