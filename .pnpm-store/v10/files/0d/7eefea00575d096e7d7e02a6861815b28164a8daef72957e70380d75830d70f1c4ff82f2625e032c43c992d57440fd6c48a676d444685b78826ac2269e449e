"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domains_1 = require("../domains");
const domains_2 = require("../domains");
describe('getDomain()', () => {
    afterEach(() => {
        delete process.env.REDOCLY_DOMAIN;
    });
    it('should return the domain from environment variable', () => {
        process.env.REDOCLY_DOMAIN = 'test-domain';
        expect((0, domains_1.getDomain)()).toBe('test-domain');
    });
    it('should return the default domain if no domain provided', () => {
        process.env.REDOCLY_DOMAIN = '';
        expect((0, domains_1.getDomain)()).toBe('https://app.cloud.redocly.com');
    });
});
describe('getReuniteUrl()', () => {
    it('should return US API URL when US region specified', () => {
        expect((0, domains_2.getReuniteUrl)('us')).toBe('https://app.cloud.redocly.com/api');
    });
    it('should return EU API URL when EU region specified', () => {
        expect((0, domains_2.getReuniteUrl)('eu')).toBe('https://app.cloud.eu.redocly.com/api');
    });
    it('should return custom domain API URL when custom domain specified', () => {
        const customDomain = 'https://custom.domain.com';
        expect((0, domains_2.getReuniteUrl)(customDomain)).toBe('https://custom.domain.com/api');
    });
    it('should return US API URL when no region specified', () => {
        expect((0, domains_2.getReuniteUrl)()).toBe('https://app.cloud.redocly.com/api');
    });
});
