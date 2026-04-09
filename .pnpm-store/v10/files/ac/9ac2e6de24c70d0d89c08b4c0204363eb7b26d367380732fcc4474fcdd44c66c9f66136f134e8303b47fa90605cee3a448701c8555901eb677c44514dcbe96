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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildResponseCookies = buildResponseCookies;
const setCookie = __importStar(require("set-cookie-parser"));
function buildResponseCookies(headers) {
    const cookies = [];
    // Handle both plain objects and Headers instance
    const setCookies = headers instanceof Headers
        ? headers.getSetCookie() // For Headers object
        : headers['set-cookie']; // For plain objects
    if (setCookies) {
        for (const headerValue of setCookies) {
            let parsed;
            try {
                parsed = setCookie.parse(headerValue);
            }
            catch {
                continue;
            }
            for (const cookie of parsed) {
                const { name, value, path, domain, expires, httpOnly, secure } = cookie;
                const harCookie = {
                    name,
                    value,
                    httpOnly: httpOnly || false,
                    secure: secure || false,
                };
                if (path) {
                    harCookie.path = path;
                }
                if (domain) {
                    harCookie.domain = domain;
                }
                if (expires) {
                    harCookie.expires = expires.toISOString();
                }
                cookies.push(harCookie);
            }
        }
    }
    return cookies;
}
//# sourceMappingURL=build-response-cookies.js.map