"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REUNITE_URLS = void 0;
exports.getDomain = getDomain;
exports.getReuniteUrl = getReuniteUrl;
exports.REUNITE_URLS = {
    us: 'https://app.cloud.redocly.com',
    eu: 'https://app.cloud.eu.redocly.com',
};
function getDomain() {
    return process.env.REDOCLY_DOMAIN || exports.REUNITE_URLS.us;
}
function getReuniteUrl(residency) {
    if (!residency)
        residency = 'us';
    let reuniteUrl = exports.REUNITE_URLS[residency];
    if (!reuniteUrl) {
        reuniteUrl = residency;
    }
    const url = new URL('/api', reuniteUrl).toString();
    return url;
}
