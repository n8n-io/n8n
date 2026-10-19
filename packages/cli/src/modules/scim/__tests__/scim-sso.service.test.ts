import type { ModuleRegistry } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { EventService } from '@n8n/backend-services';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import * as ssoHelpers from '@/sso.ee/sso-helpers';

import type { ScimSettingsService } from '../scim-settings.service';
import { ScimSsoService } from '../scim-sso.service';

describe('ScimSsoService', () => {
	let eventService: EventService;
	let scimSettingsService: Mocked<ScimSettingsService>;
	let moduleRegistry: Mocked<ModuleRegistry>;
	let logger: ReturnType<typeof mockLogger>;
	let service: ScimSsoService;

	const ssoOn = (on: boolean) =>
		vi.spyOn(ssoHelpers, 'isSamlOrOidcLoginEnabled').mockReturnValue(on);

	/**
	 * Calls the registered listener directly, because `emit` does not wait for
	 * an async listener.
	 */
	const emitSsoOff = async (protocol: 'saml' | 'oidc') => {
		const listeners = eventService.listeners('sso-login-disabled');
		expect(listeners).toHaveLength(1);
		const [listener] = listeners;
		await (listener({ protocol, scimWasEnabled: true }) as Promise<void>);
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		eventService = new EventService();
		scimSettingsService = mock<ScimSettingsService>();
		moduleRegistry = mock<ModuleRegistry>();
		logger = mockLogger();
		service = new ScimSsoService(logger, eventService, scimSettingsService, moduleRegistry);
	});

	it.each([true, false])('reports single sign-on as %s from the shared helper', (on) => {
		ssoOn(on);

		expect(service.isSsoEnabled()).toBe(on);
	});

	describe('on sso-login-disabled', () => {
		beforeEach(async () => {
			ssoOn(true);
			await service.init();
		});

		it.each(['saml', 'oidc'] as const)(
			'turns SCIM off when %s sign-in turns off, and refreshes the settings',
			async (protocol) => {
				scimSettingsService.isEnabled.mockResolvedValue(true);

				await emitSsoOff(protocol);

				expect(scimSettingsService.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
				expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
				expect(logger.info).toHaveBeenCalledWith(
					`SCIM provisioning turned off, because ${protocol.toUpperCase()} single sign-on turned off. The SCIM token and the SCIM settings are kept.`,
				);
			},
		);

		it('does nothing when SCIM is already off', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(false);

			await emitSsoOff('saml');

			expect(scimSettingsService.setEnabled).not.toHaveBeenCalled();
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('logs a failure and does not throw', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimSettingsService.setEnabled.mockRejectedValue(new Error('db down'));

			await emitSsoOff('oidc');

			expect(logger.error).toHaveBeenCalledWith(
				'SCIM: Failed to turn off SCIM provisioning without single sign-on',
				expect.anything(),
			);
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		});

		it('keeps SCIM off when the settings refresh fails', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			moduleRegistry.refreshModuleSettings.mockRejectedValue(new Error('db down'));

			await emitSsoOff('saml');

			expect(scimSettingsService.setEnabled).toHaveBeenCalledWith(false);
			expect(logger.warn).toHaveBeenCalledWith(
				'SCIM: Failed to refresh the module settings',
				expect.anything(),
			);
		});

		it('registers the listener once', async () => {
			await service.init();

			expect(eventService.listenerCount('sso-login-disabled')).toBe(1);
		});
	});

	describe('at startup', () => {
		it('turns SCIM off when SCIM is on and single sign-on is off', async () => {
			ssoOn(false);
			scimSettingsService.isEnabled.mockResolvedValue(true);

			await service.init();

			expect(scimSettingsService.setEnabled).toHaveBeenCalledExactlyOnceWith(false);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(logger.info).toHaveBeenCalledWith(
				'SCIM provisioning turned off, because single sign-on is off at startup. The SCIM token and the SCIM settings are kept.',
			);
		});

		it('keeps SCIM on when single sign-on is on', async () => {
			ssoOn(true);
			scimSettingsService.isEnabled.mockResolvedValue(true);

			await service.init();

			expect(scimSettingsService.setEnabled).not.toHaveBeenCalled();
		});

		it('writes nothing when SCIM is off', async () => {
			ssoOn(false);
			scimSettingsService.isEnabled.mockResolvedValue(false);

			await service.init();

			expect(scimSettingsService.setEnabled).not.toHaveBeenCalled();
		});

		it('does not fail the startup when the check fails', async () => {
			ssoOn(false);
			scimSettingsService.isEnabled.mockRejectedValue(new Error('db down'));

			await expect(service.init()).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalled();
		});
	});

	// Single sign-on on never turns SCIM on, so the service listens only for
	// single sign-on turning off.
	it('listens only for single sign-on turning off', async () => {
		ssoOn(true);

		await service.init();

		expect(eventService.eventNames()).toEqual(['sso-login-disabled']);
	});
});
