import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import config from '@/config';

import { UrlService } from '../url.service';

describe('UrlService', () => {
	beforeEach(() => {
		process.env.WEBHOOK_URL = undefined;
		config.load(config.default);
	});

	describe('getInstanceBaseUrl', () => {
		it('should set URL from N8N_EDITOR_BASE_URL', () => {
			config.set('editorBaseUrl', 'https://example.com/');
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(mock<GlobalConfig>());
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should set URL from WEBHOOK_URL', () => {
			config.set('editorBaseUrl', '');
			process.env.WEBHOOK_URL = 'https://example.com/';
			const urlService = new UrlService(mock<GlobalConfig>());
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from N8N_EDITOR_BASE_URL', () => {
			config.set('editorBaseUrl', '"https://example.com"');
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(mock<GlobalConfig>());
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from WEBHOOK_URL', () => {
			config.set('editorBaseUrl', '');
			process.env.WEBHOOK_URL = '"https://example.com/"';
			const urlService = new UrlService(mock<GlobalConfig>());
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
	});
});
