"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicAuth = void 0;
const js_base64_1 = require("js-base64");
const BASIC_AUTH_HEADER_PREFIX = /^Basic /i;
exports.BasicAuth = {
    toAuthorizationHeader: (basicAuth) => {
        if (basicAuth == null) {
            return undefined;
        }
        const token = js_base64_1.Base64.encode(`${basicAuth.username}:${basicAuth.password}`);
        return `Basic ${token}`;
    },
    fromAuthorizationHeader: (header) => {
        const credentials = header.replace(BASIC_AUTH_HEADER_PREFIX, "");
        const decoded = js_base64_1.Base64.decode(credentials);
        const [username, password] = decoded.split(":", 2);
        if (username == null || password == null) {
            throw new Error("Invalid basic auth");
        }
        return {
            username,
            password,
        };
    },
};
