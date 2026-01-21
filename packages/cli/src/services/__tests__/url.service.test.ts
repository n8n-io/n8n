import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { PathResolvingService } from '../path-resolving.service';
import { UrlService } from '../url.service';

describe('UrlService', () => {
	beforeEach(() => {
		delete process.env.WEBHOOK_URL;
	});

	afterEach(() => {
		delete process.env.WEBHOOK_URL;
	});

	const createConfig = (overrides: Partial<GlobalConfig> = {}): GlobalConfig => {
		const defaults = {
			host: 'localhost',
			port: 5678,
			protocol: 'http' as const,
			editorBaseUrl: '',
			webhookUrl: '',
		};
		return {
			...mock<GlobalConfig>(),
			...defaults,
			...overrides,
		} as GlobalConfig;
	};

	const createPathResolvingService = (basePath: string = '/') =>
		mock<PathResolvingService>({
			getBasePath: () => basePath,
		});

	describe('basePath', () => {
		it('should return "/" for default configuration', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/'));
			expect(urlService.basePath).toBe('/');
		});

		it('should return normalized basePath when N8N_BASE_PATH is set', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/custom-path'));
			expect(urlService.basePath).toBe('/custom-path');
		});

		it('should combine basePath and path', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/prefix/app'));
			expect(urlService.basePath).toBe('/prefix/app');
		});
	});

	describe('baseUrl', () => {
		it('should generate base URL with default configuration', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/'));
			expect(urlService.baseUrl).toBe('http://localhost:5678/');
		});

		it('should include basePath in base URL', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/custom-path'));
			expect(urlService.baseUrl).toBe('http://localhost:5678/custom-path');
		});

		it('should include combined basePath and path in base URL', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/prefix/app'));
			expect(urlService.baseUrl).toBe('http://localhost:5678/prefix/app');
		});

		it('should omit port for default HTTP port', () => {
			const urlService = new UrlService(
				createConfig({ protocol: 'http', port: 80 }),
				createPathResolvingService('/custom-path'),
			);
			expect(urlService.baseUrl).toBe('http://localhost/custom-path');
		});

		it('should omit port for default HTTPS port', () => {
			const urlService = new UrlService(
				createConfig({ protocol: 'https', port: 443 }),
				createPathResolvingService('/custom-path'),
			);
			expect(urlService.baseUrl).toBe('https://localhost/custom-path');
		});
	});

	describe('getWebhookBaseUrl', () => {
		it('should return baseUrl when WEBHOOK_URL is not set', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/custom-path'));
			expect(urlService.getWebhookBaseUrl()).toBe('http://localhost:5678/custom-path/');
		});

		it('should override with WEBHOOK_URL when set', () => {
			process.env.WEBHOOK_URL = 'https://webhook.example.com/';
			const urlService = new UrlService(createConfig(), createPathResolvingService('/custom-path'));
			expect(urlService.getWebhookBaseUrl()).toBe('https://webhook.example.com/');
		});

		it('should add trailing slash to WEBHOOK_URL if missing', () => {
			process.env.WEBHOOK_URL = 'https://webhook.example.com';
			const urlService = new UrlService(createConfig(), createPathResolvingService('/'));
			expect(urlService.getWebhookBaseUrl()).toBe('https://webhook.example.com/');
		});

		it('should prefer N8N_WEBHOOK_URL over the deprecated WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = 'https://old.example.com/';
			const urlService = new UrlService(
				createConfig({ webhookUrl: 'https://new.example.com/' }),
				createPathResolvingService('/'),
			);
			expect(urlService.getWebhookBaseUrl()).toBe('https://new.example.com/');
		});

		it('should fall back to WEBHOOK_URL when N8N_WEBHOOK_URL is unset', () => {
			process.env.WEBHOOK_URL = 'https://old.example.com/';
			const urlService = new UrlService(createConfig(), createPathResolvingService('/'));
			expect(urlService.getWebhookBaseUrl()).toBe('https://old.example.com/');
		});
	});

	describe('getInstanceBaseUrl', () => {
		it('should set URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(
				createConfig({
					editorBaseUrl: 'https://example.com/',
				}),
				createPathResolvingService('/'),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should set URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = 'https://example.com/';
			const urlService = new UrlService(
				createConfig({ editorBaseUrl: '', webhookUrl: '' }),
				createPathResolvingService('/'),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from N8N_EDITOR_BASE_URL', () => {
			process.env.WEBHOOK_URL = undefined;
			const urlService = new UrlService(
				createConfig({
					editorBaseUrl: '"https://example.com"',
				}),
				createPathResolvingService('/'),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should trim quotes when setting URL from WEBHOOK_URL', () => {
			process.env.WEBHOOK_URL = '"https://example.com/"';
			const urlService = new UrlService(
				createConfig({ editorBaseUrl: '', webhookUrl: '' }),
				createPathResolvingService('/'),
			);
			expect(urlService.getInstanceBaseUrl()).toBe('https://example.com');
		});

		it('should include basePath when falling back to baseUrl', () => {
			const urlService = new UrlService(createConfig(), createPathResolvingService('/custom-path'));
			expect(urlService.getInstanceBaseUrl()).toBe('http://localhost:5678/custom-path');
		});
	});

	describe('getTestWebhookBaseUrl', () => {
		it('should use N8N_WEBHOOK_URL even when the editor base URL is set', () => {
			const urlService = new UrlService(
				createConfig({
					editorBaseUrl: 'https://editor.example.com/',
					webhookUrl: 'https://hooks.example.com/',
				}),
				createPathResolvingService('/'),
			);
			expect(urlService.getTestWebhookBaseUrl()).toBe('https://hooks.example.com/');
		});

		it('should fall back to the editor base URL when N8N_WEBHOOK_URL is unset', () => {
			const urlService = new UrlService(
				createConfig({ editorBaseUrl: 'https://editor.example.com/' }),
				createPathResolvingService('/'),
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
					webhookUrl: '',
					endpoints: { rest: 'rest' },
				}),
				createPathResolvingService('/'),
			);
			expect(urlService.getInstanceJwksUri()).toBe(
				'https://example.com/rest/.well-known/jwks.json',
			);
		});
	});
});
