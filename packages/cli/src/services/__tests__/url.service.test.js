'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const url_service_1 = require('../url.service');
describe('UrlService', () => {
	beforeEach(() => {
		process.env.WEBHOOK_URL = undefined;
	});
	describe('getInstanceBaseUrl', () => {
		it('should set URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new url_service_1.UrlService(
				(0, jest_mock_extended_1.mock)({
					editorBaseUrl: 'https://example.com/',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
		it('should set URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = 'https://example.com/';
			const urlService = new url_service_1.UrlService(
				(0, jest_mock_extended_1.mock)({
					editorBaseUrl: '',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
		it('should trim quotes when setting URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new url_service_1.UrlService(
				(0, jest_mock_extended_1.mock)({
					editorBaseUrl: '"https://example.com"',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
		it('should trim quotes when setting URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = '"https://example.com/"';
			const urlService = new url_service_1.UrlService(
				(0, jest_mock_extended_1.mock)({
					editorBaseUrl: '',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
	});
});
//# sourceMappingURL=url.service.test.js.map
