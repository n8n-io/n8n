"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanonicalQuery = void 0;
const util_uri_escape_1 = require("@smithy/util-uri-escape");
const constants_1 = require("./constants");
const getCanonicalQuery = ({ query = {} }) => {
    const keys = [];
    const serialized = {};
    for (const key of Object.keys(query).sort()) {
        if (key.toLowerCase() === constants_1.SIGNATURE_HEADER) {
            continue;
        }
        keys.push(key);
        const value = query[key];
        if (typeof value === "string") {
            serialized[key] = `${(0, util_uri_escape_1.escapeUri)(key)}=${(0, util_uri_escape_1.escapeUri)(value)}`;
        }
        else if (Array.isArray(value)) {
            serialized[key] = value
                .slice(0)
                .sort()
                .reduce((encoded, value) => encoded.concat([`${(0, util_uri_escape_1.escapeUri)(key)}=${(0, util_uri_escape_1.escapeUri)(value)}`]), [])
                .join("&");
        }
    }
    return keys
        .map((key) => serialized[key])
        .filter((serialized) => serialized)
        .join("&");
};
exports.getCanonicalQuery = getCanonicalQuery;
