import type { Settings, SettingsRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { McpSettingsService } from '../mcp.settings.service';

describe('McpSettingsService', () => {
	let service: McpSettingsService;
	let findByKey: jest.Mock<Promise<Settings | null>, [string]>;
	let upsert: jest.Mock;
	let settingsRepository: SettingsRepository;
	const cacheService = mock<CacheService>();

	beforeEach(() => {
		jest.clearAllMocks();
		findByKey = jest.fn<Promise<Settings | null>, [string]>();
		upsert = jest.fn();
		settingsRepository = { findByKey, upsert } as unknown as SettingsRepository;

		service = new McpSettingsService(settingsRepository, cacheService);
	});

	describe('getEnabled', () => {
		test('returns false by default when no setting exists', async () => {
			findByKey.mockResolvedValue(null);

			await expect(service.getEnabled()).resolves.toBe(false);
			expect(findByKey).toHaveBeenCalledWith('mcp.access.enabled');
		});

		test('returns true when setting value is "true"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(true);
		});

		test('returns false when setting value is "false"', async () => {
			findByKey.mockResolvedValue(
				mock<Settings>({ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true }),
			);

			await expect(service.getEnabled()).resolves.toBe(false);
		});
	});

	describe('setEnabled', () => {
		test('upserts setting with "true"', async () => {
			await service.setEnabled(true);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'true', loadOnStartup: true },
				['key'],
			);
		});

		test('upserts setting with "false"', async () => {
			await service.setEnabled(false);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.access.enabled', value: 'false', loadOnStartup: true },
				['key'],
			);
		});
	});

	describe('getAllowedRedirectUris', () => {
		test('returns empty array by default when no setting exists', async () => {
			findByKey.mockResolvedValue(null);
			cacheService.get.mockResolvedValue(undefined);

			await expect(service.getAllowedRedirectUris()).resolves.toEqual([]);
			expect(findByKey).toHaveBeenCalledWith('mcp.oauth.allowedRedirectUris');
		});

		test('returns URIs from cache when available', async () => {
			cacheService.get.mockResolvedValue(JSON.stringify(['https://example.com/callback']));

			await expect(service.getAllowedRedirectUris()).resolves.toEqual([
				'https://example.com/callback',
			]);
			expect(findByKey).not.toHaveBeenCalled();
		});

		test('returns URIs from database when cache is empty', async () => {
			cacheService.get.mockResolvedValue(undefined);
			findByKey.mockResolvedValue(
				mock<Settings>({
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify(['https://example.com/callback', 'http://localhost:3000/callback']),
					loadOnStartup: true,
				}),
			);

			await expect(service.getAllowedRedirectUris()).resolves.toEqual([
				'https://example.com/callback',
				'http://localhost:3000/callback',
			]);
			expect(cacheService.set).toHaveBeenCalledWith(
				'mcp.oauth.allowedRedirectUris',
				JSON.stringify(['https://example.com/callback', 'http://localhost:3000/callback']),
			);
		});
	});

	describe('setAllowedRedirectUris', () => {
		test('stores valid URIs', async () => {
			const validUris = ['https://example.com/callback', 'http://localhost:3000/callback'];

			await service.setAllowedRedirectUris(validUris);

			expect(upsert).toHaveBeenCalledWith(
				{
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify(validUris),
					loadOnStartup: true,
				},
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith(
				'mcp.oauth.allowedRedirectUris',
				JSON.stringify(validUris),
			);
		});

		test('filters out empty strings', async () => {
			const urisWithEmpty = [
				'https://example.com/callback',
				'',
				'  ',
				'http://localhost:3000/callback',
			];
			const expectedUris = ['https://example.com/callback', 'http://localhost:3000/callback'];

			await service.setAllowedRedirectUris(urisWithEmpty);

			expect(upsert).toHaveBeenCalledWith(
				{
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify(expectedUris),
					loadOnStartup: true,
				},
				['key'],
			);
		});

		test('trims whitespace from URIs', async () => {
			const urisWithWhitespace = [
				'  https://example.com/callback  ',
				'\thttp://localhost:3000/callback\n',
			];
			const expectedUris = ['https://example.com/callback', 'http://localhost:3000/callback'];

			await service.setAllowedRedirectUris(urisWithWhitespace);

			expect(upsert).toHaveBeenCalledWith(
				{
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify(expectedUris),
					loadOnStartup: true,
				},
				['key'],
			);
		});

		test('accepts empty array', async () => {
			await service.setAllowedRedirectUris([]);

			expect(upsert).toHaveBeenCalledWith(
				{
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify([]),
					loadOnStartup: true,
				},
				['key'],
			);
		});

		test('rejects invalid URL format', async () => {
			const invalidUris = ['not-a-url'];

			await expect(service.setAllowedRedirectUris(invalidUris)).rejects.toThrow('Invalid URL');
		});

		test('rejects non-http/https protocols', async () => {
			const invalidUris = ['ftp://example.com/callback'];

			await expect(service.setAllowedRedirectUris(invalidUris)).rejects.toThrow('Invalid protocol');
		});

		test('requires HTTPS in production for non-localhost', async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const httpUri = ['http://example.com/callback'];

			await expect(service.setAllowedRedirectUris(httpUri)).rejects.toThrow('HTTPS required');

			process.env.NODE_ENV = originalEnv;
		});

		test('allows localhost HTTP in production', async () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = 'production';

			const localhostUris = ['http://localhost:3000/callback', 'http://127.0.0.1:3000/callback'];

			await service.setAllowedRedirectUris(localhostUris);

			expect(upsert).toHaveBeenCalledWith(
				{
					key: 'mcp.oauth.allowedRedirectUris',
					value: JSON.stringify(localhostUris),
					loadOnStartup: true,
				},
				['key'],
			);

			process.env.NODE_ENV = originalEnv;
		});
	});
});
