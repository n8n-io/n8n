import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { Publisher } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AiPreferenceRepository, Settings, SettingsRepository } from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';

import {
	AI_PREFERENCES_ENABLED_KEY,
	AiPreferenceSettingsService,
} from '../ai-preference-settings.service';

describe('AiPreferenceSettingsService', () => {
	const settingsRepository = mock<SettingsRepository>();
	const aiPreferenceRepository = mock<AiPreferenceRepository>();
	const moduleSettings = new Map<string, Record<string, unknown>>();
	const moduleRegistry = { settings: moduleSettings } as unknown as ModuleRegistry;
	const license = mock<License>();
	const publisher = mock<Publisher>();
	const logger = mock<Logger>();

	const createService = () =>
		new AiPreferenceSettingsService(
			settingsRepository,
			aiPreferenceRepository,
			moduleRegistry,
			license,
			publisher,
			mock<InstanceSettingsLoaderConfig>({ preferencesManagedByEnv: false }),
			logger,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		moduleSettings.clear();
		moduleSettings.set('mcp', { mcpAccessEnabled: true });
		license.isEnterprisePlan.mockReturnValue(false);
	});

	describe('isEnabled', () => {
		it.each([
			['on while the switch and MCP access are on', true, { mcp: true }, true],
			['on while the switch and n8n Assistant are on', true, { assistant: true }, true],
			['off while both consumers are off', true, {}, false],
			['off while the switch is off', false, { assistant: true, mcp: true }, false],
		])(
			'is %s',
			async (_, switchOn, consumers: { assistant?: boolean; mcp?: boolean }, expected) => {
				moduleSettings.set('instance-ai', { enabled: consumers.assistant === true });
				moduleSettings.set('mcp', { mcpAccessEnabled: consumers.mcp === true });
				const service = createService();
				await service.setEnabled(switchOn);

				expect(service.isEnabled).toBe(expected);
			},
		);

		it.each([
			[false, true],
			[true, false],
		])('treats the enterprise plan %s as a default switch of %s', (enterprise, expected) => {
			license.isEnterprisePlan.mockReturnValue(enterprise);

			expect(createService().isSwitchOn).toBe(expected);
		});
	});

	describe('setEnabled', () => {
		it('saves the value and tells the other mains to reload', async () => {
			const service = createService();

			await service.setEnabled(false);

			expect(settingsRepository.upsertByKey).toHaveBeenCalledWith(
				AI_PREFERENCES_ENABLED_KEY,
				'false',
				false,
				{},
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'reload-ai-preference-settings',
			});
			expect(service.isSwitchOn).toBe(false);
		});

		it('keeps the saved value when the other mains cannot be told', async () => {
			publisher.publishCommand.mockRejectedValue(new Error('redis down'));
			const service = createService();

			await expect(service.setEnabled(false)).resolves.toBeUndefined();

			expect(service.isSwitchOn).toBe(false);
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('reload', () => {
		it('reads the value another main saved', async () => {
			const service = createService();
			settingsRepository.findByKey.mockResolvedValue(mock<Settings>({ value: 'false' }));

			await service.reload();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(AI_PREFERENCES_ENABLED_KEY);
			expect(service.isSwitchOn).toBe(false);
		});

		it('falls back to the plan default when nothing is saved', async () => {
			const service = createService();
			await service.setEnabled(false);
			settingsRepository.findByKey.mockResolvedValue(null);

			await service.reload();

			expect(service.isSwitchOn).toBe(true);
		});

		it.each(['reload-ai-preference-settings', 'pubsub-reconnected'])('runs on %s', (eventName) => {
			const handlers = Container.get(PubSubMetadata)
				.getHandlers()
				.filter(
					({ eventName: name, eventHandlerClass }) =>
						name === eventName && eventHandlerClass.name === 'AiPreferenceSettingsService',
				);

			expect(handlers.map(({ methodName }) => methodName)).toEqual(['reload']);
		});
	});
});
