import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { UrlService } from '../url.service';

describe('UrlService', () => {
	beforeEach(() => {
		delete process.env.WEBHOOK_URL;
	});

	describe('getInstanceBaseUrl', () => {
		it('should set URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: 'https://example.com/',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should set URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = 'https://example.com/';
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: '',
					webhookUrl: '',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: '"https://example.com"',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = '"https://example.com/"';
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: '',
					webhookUrl: '',
				}),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});
	});

	describe('getWebhookBaseUrl', () => {
		it('should prefer N8N_WEBHOOK_URL over the deprecated WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = 'https://old.example.com/';
			const urlService = new UrlService(
				mock<GlobalConfig>({ editorBaseUrl: '', webhookUrl: 'https://new.example.com/' }),
			);
			expect(urlService.getWebhookBaseUrl()).toBe('https://new.example.com/');
		});

		it('should fall back to WEBHOOK_URL when N8N_WEBHOOK_URL is unset', () => {
			process.env.WEBHOOK_URL = 'https://old.example.com/';
			const urlService = new UrlService(mock<GlobalConfig>({ editorBaseUrl: '', webhookUrl: '' }));
			expect(urlService.getWebhookBaseUrl()).toBe('https://old.example.com/');
		});
	});

	describe('getTestWebhookBaseUrl', () => {
		it('should use N8N_WEBHOOK_URL even when the editor base URL is set', () => {
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: 'https://editor.example.com/',
					webhookUrl: 'https://hooks.example.com/',
				}),
			);
			expect(urlService.getTestWebhookBaseUrl()).toBe('https://hooks.example.com/');
		});

		it('should fall back to the editor base URL when N8N_WEBHOOK_URL is unset', () => {
			const urlService = new UrlService(
				mock<GlobalConfig>({ editorBaseUrl: 'https://editor.example.com/', webhookUrl: '' }),
			);
			expect(urlService.getTestWebhookBaseUrl()).toBe('https://editor.example.com/');
		});
	});

	describe('getInstanceJwksUri', () => {
		it('appends the REST endpoint and JWKS path to the instance base URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(
				mock<GlobalConfig>({
					editorBaseUrl: 'https://example.com/',
					endpoints: { rest: 'rest' },
				}),
			);
			expect(urlService.getInstanceJwksUri()).toBe(
				'https://example.com/rest/.well-known/jwks.json',
			);
		});
	});
});
