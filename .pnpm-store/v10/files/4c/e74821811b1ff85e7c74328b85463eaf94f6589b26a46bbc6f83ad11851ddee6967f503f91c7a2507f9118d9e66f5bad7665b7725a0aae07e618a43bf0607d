"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomain = getDomain;
const DEFAULT_DOMAIN = 'https://app.cloud.redocly.com';
function getDomain() {
    const domain = process.env.REDOCLY_DOMAIN;
    if (domain) {
        return domain;
    }
    return DEFAULT_DOMAIN;
}
