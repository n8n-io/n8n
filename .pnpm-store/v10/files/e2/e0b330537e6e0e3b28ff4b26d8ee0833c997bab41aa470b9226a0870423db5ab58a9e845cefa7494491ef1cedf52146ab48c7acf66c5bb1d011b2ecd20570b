"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_REGIONS = exports.DOMAINS = exports.DEFAULT_REGION = void 0;
exports.getDomains = getDomains;
exports.setRedoclyDomain = setRedoclyDomain;
exports.getRedoclyDomain = getRedoclyDomain;
exports.isRedoclyRegistryURL = isRedoclyRegistryURL;
let redoclyDomain = 'redocly.com';
exports.DEFAULT_REGION = 'us';
exports.DOMAINS = getDomains();
exports.AVAILABLE_REGIONS = Object.keys(exports.DOMAINS);
function getDomains() {
    const domains = {
        us: 'redocly.com',
        eu: 'eu.redocly.com',
    };
    // FIXME: temporary fix for our lab environments
    const domain = redoclyDomain;
    if (domain?.endsWith('.redocly.host')) {
        domains[domain.split('.')[0]] = domain;
    }
    if (domain === 'redoc.online') {
        domains[domain] = domain;
    }
    return domains;
}
function setRedoclyDomain(domain) {
    redoclyDomain = domain;
}
function getRedoclyDomain() {
    return redoclyDomain;
}
function isRedoclyRegistryURL(link) {
    const domain = getRedoclyDomain() || exports.DOMAINS[exports.DEFAULT_REGION];
    const legacyDomain = domain === 'redocly.com' ? 'redoc.ly' : domain;
    if (!link.startsWith(`https://api.${domain}/registry/`) &&
        !link.startsWith(`https://api.${legacyDomain}/registry/`)) {
        return false;
    }
    return true;
}
