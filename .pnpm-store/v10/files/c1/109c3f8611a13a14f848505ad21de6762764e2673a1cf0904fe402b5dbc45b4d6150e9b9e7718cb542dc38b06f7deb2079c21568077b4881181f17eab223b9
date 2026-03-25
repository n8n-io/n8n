"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const domains_1 = require("../domains");
describe('getDomain()', () => {
    it('should return the domain from environment variable', () => {
        process.env.REDOCLY_DOMAIN = 'test-domain';
        expect((0, domains_1.getDomain)()).toBe('test-domain');
    });
    it('should return the default domain if no domain provided', () => {
        process.env.REDOCLY_DOMAIN = '';
        expect((0, domains_1.getDomain)()).toBe('https://app.cloud.redocly.com');
    });
});
