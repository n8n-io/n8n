"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const ono_1 = require("@jsdevtools/ono");
const url = __importStar(require("../util/url.js"));
const errors_js_1 = require("../util/errors.js");
exports.default = {
    /**
     * The order that this resolver will run, in relation to other resolvers.
     */
    order: 200,
    /**
     * HTTP headers to send when downloading files.
     *
     * @example:
     * {
     *   "User-Agent": "JSON Schema $Ref Parser",
     *   Accept: "application/json"
     * }
     */
    headers: null,
    /**
     * HTTP request timeout (in milliseconds).
     */
    timeout: 60000, // 60 seconds
    /**
     * The maximum number of HTTP redirects to follow.
     * To disable automatic following of redirects, set this to zero.
     */
    redirects: 5,
    /**
     * The `withCredentials` option of XMLHttpRequest.
     * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
     */
    withCredentials: false,
    /**
     * Determines whether this resolver can read a given file reference.
     * Resolvers that return true will be tried in order, until one successfully resolves the file.
     * Resolvers that return false will not be given a chance to resolve the file.
     */
    canRead(file) {
        return url.isHttp(file.url);
    },
    /**
     * Reads the given URL and returns its raw contents as a Buffer.
     */
    read(file) {
        const u = url.parse(file.url);
        if (typeof window !== "undefined" && !u.protocol) {
            // Use the protocol of the current page
            u.protocol = url.parse(location.href).protocol;
        }
        return download(u, this);
    },
};
/**
 * Downloads the given file.
 * @returns
 * The promise resolves with the raw downloaded data, or rejects if there is an HTTP error.
 */
async function download(u, httpOptions, _redirects) {
    u = url.parse(u);
    const redirects = _redirects || [];
    redirects.push(u.href);
    try {
        const res = await get(u, httpOptions);
        if (res.status >= 400) {
            throw (0, ono_1.ono)({ status: res.status }, `HTTP ERROR ${res.status}`);
        }
        else if (res.status >= 300) {
            if (!Number.isNaN(httpOptions.redirects) && redirects.length > httpOptions.redirects) {
                throw new errors_js_1.ResolverError((0, ono_1.ono)({ status: res.status }, `Error downloading ${redirects[0]}. \nToo many redirects: \n  ${redirects.join(" \n  ")}`));
            }
            else if (!("location" in res.headers) || !res.headers.location) {
                throw (0, ono_1.ono)({ status: res.status }, `HTTP ${res.status} redirect with no location header`);
            }
            else {
                const redirectTo = url.resolve(u.href, res.headers.location);
                return download(redirectTo, httpOptions, redirects);
            }
        }
        else {
            if (res.body) {
                const buf = await res.arrayBuffer();
                return Buffer.from(buf);
            }
            return Buffer.alloc(0);
        }
    }
    catch (err) {
        throw new errors_js_1.ResolverError((0, ono_1.ono)(err, `Error downloading ${u.href}`), u.href);
    }
}
/**
 * Sends an HTTP GET request.
 * The promise resolves with the HTTP Response object.
 */
async function get(u, httpOptions) {
    let controller;
    let timeoutId;
    if (httpOptions.timeout) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), httpOptions.timeout);
    }
    const response = await fetch(u, {
        method: "GET",
        headers: httpOptions.headers || {},
        credentials: httpOptions.withCredentials ? "include" : "same-origin",
        signal: controller ? controller.signal : null,
    });
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    return response;
}
