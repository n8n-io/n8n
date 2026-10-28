import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import { PublicApiRateLimitConfig } from '@n8n/config';
import type { Settings, SettingsRepository } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';

import {
	PUBLIC_API_RATE_LIMIT_SETTINGS_KEY,
	PublicApiRateLimitSettingsService,
} from '../public-api-rate-limit-settings.service';

const codeDefaults = { ...new PublicApiRateLimitConfig() };
const { enabled: _enabled, ...limitDefaults } = codeDefaults;

const stored = {
	...codeDefaults,
	enabled: true,
	globalReadLimit: 50,
	endpointWriteLimit: 5,
};

const actor = {
	id: 'user-1',
	email: 'owner@example.com',
	firstName: 'Ada',
	lastName: 'Owner',
	role: { slug: 'global:owner' },
};

describe('PublicApiRateLimitSettingsService', () => {
	const logger = mock<Logger>();
	const settingsRepository = mock<SettingsRepository>();
	const eventService = mock<EventService>();
	const publisher = mock<Publisher>();
	let config: PublicApiRateLimitConfig;
	let service: PublicApiRateLimitSettingsService;

	const createService = ({ isMultiMain = false }: { isMultiMain?: boolean } = {}) =>
		new PublicApiRateLimitSettingsService(
			{ publicApi: { rateLimit: config } } as GlobalConfig,
			mock<InstanceSettings>({ isMultiMain }),
			settingsRepository,
			eventService,
			publisher,
			logger,
		);

	const storeRow = (value: string) =>
		settingsRepository.findByKey.mockResolvedValue(
			mock<Settings>({ key: PUBLIC_API_RATE_LIMIT_SETTINGS_KEY, value }),
		);

	beforeEach(() => {
		settingsRepository.findByKey.mockResolvedValue(null);
		config = { ...codeDefaults };
		publisher.publishCommand.mockResolvedValue(undefined);
		service = createService();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe('getSettings', () => {
		it('returns the config values and the code defaults when nothing is stored', async () => {
			expect(await service.getSettings()).toEqual({
				...codeDefaults,
				defaults: limitDefaults,
				envManagedFields: [],
			});
		});

		it('returns the stored values', async () => {
			storeRow(JSON.stringify(stored));

			expect(await service.getSettings()).toMatchObject(stored);
		});

		it('uses the env var value over the stored value and locks its field', async () => {
			storeRow(JSON.stringify(stored));
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', '7');
			config.globalReadLimit = 7;

			const settings = await service.getSettings();

			expect(settings.globalReadLimit).toBe(7);
			expect(settings.endpointWriteLimit).toBe(5);
			expect(settings.envManagedFields).toEqual(['globalReadLimit']);
		});

		it('locks a field that a _FILE env var sets', async () => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_ENABLED_FILE', '/run/secrets/enabled');

			expect((await service.getSettings()).envManagedFields).toEqual(['enabled']);
		});

		it.each([' ', '""', "' '"])('does not lock a field whose env var is %j', async (value) => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', value);

			expect((await service.getSettings()).envManagedFields).toEqual([]);
		});

		it('returns the code defaults as defaults, not the env var values', async () => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_GLOBAL_READ_LIMIT', '7');
			config.globalReadLimit = 7;

			expect((await service.getSettings()).defaults).toEqual(limitDefaults);
		});

		it.each([
			{ case: 'invalid JSON', value: '{not json' },
			{ case: 'an invalid value', value: JSON.stringify({ ...stored, globalReadLimit: -1 }) },
		])('logs a warning and uses the defaults when the stored row has $case', async ({ value }) => {
			storeRow(value);

			expect(await service.getSettings()).toMatchObject(codeDefaults);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});
	});

	describe('saveSettings', () => {
		it('stores the settings and returns them', async () => {
			const result = await service.saveSettings(stored, actor);

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				PUBLIC_API_RATE_LIMIT_SETTINGS_KEY,
				JSON.stringify(stored),
				false,
				{},
			);
			expect(result).toMatchObject(stored);
		});

		it('stores the env var value for a field that an env var sets', async () => {
			vi.stubEnv('N8N_PUBLIC_API_RATE_LIMIT_ENABLED', 'false');
			config.enabled = false;

			await service.saveSettings(stored, actor);

			const [, value] = settingsRepository.upsertByKey.mock.calls[0];
			expect(JSON.parse(value)).toEqual({ ...stored, enabled: false });
		});

		it('keeps the limits when rate limiting is turned off', async () => {
			await service.saveSettings({ ...stored, enabled: false }, actor);

			const [, value] = settingsRepository.upsertByKey.mock.calls[0];
			expect(JSON.parse(value)).toEqual({ ...stored, enabled: false });
		});

		it('rejects turning rate limiting on with every limit at 0', async () => {
			const noLimits = {
				...stored,
				globalReadLimit: 0,
				globalWriteLimit: 0,
				endpointReadLimit: 0,
				endpointWriteLimit: 0,
			};

			await expect(service.saveSettings(noLimits, actor)).rejects.toThrow(BadRequestError);
			expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
		});

		it('emits a policy event with only the user fields when rate limiting is turned on', async () => {
			const user = { ...actor, password: 'password-hash' };

			await service.saveSettings(stored, user);

			expect(eventService.emit).toHaveBeenCalledWith('instance-policies-updated', {
				user: actor,
				settingName: 'public_api_rate_limit',
				value: true,
			});
		});

		it('does not emit a policy event when only the limits change', async () => {
			storeRow(JSON.stringify(stored));

			await service.saveSettings({ ...stored, globalReadLimit: 20 }, actor);

			expect(eventService.emit).not.toHaveBeenCalled();
		});
	});

	describe('load', () => {
		it('makes the stored values the values that the limiter reads', async () => {
			storeRow(JSON.stringify(stored));

			expect(service.settings).toEqual(codeDefaults);
			await service.load();

			expect(service.settings).toEqual(stored);
		});
	});

	describe('applying a saved change', () => {
		it('makes the saved values the values that the limiter reads, without a reload', async () => {
			await service.saveSettings(stored, actor);

			expect(service.settings).toEqual(stored);
		});

		it('tells the other mains to reload the settings on multi-main', async () => {
			service = createService({ isMultiMain: true });

			await service.saveSettings(stored, actor);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-public-api-rate-limit-settings',
			});
		});

		it('does not publish a command on a single main', async () => {
			await service.saveSettings(stored, actor);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('reloads the stored values when another main saves a change', async () => {
			storeRow(JSON.stringify(stored));

			await service.handleSettingsChanged();

			expect(service.settings).toEqual(stored);
		});
	});
});
