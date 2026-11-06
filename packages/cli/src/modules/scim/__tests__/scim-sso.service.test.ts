import type { LicenseState, ModuleRegistry } from '@n8n/backend-common';
import type { CacheService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SettingsRepository } from '@n8n/db';
import { InternalServerError } from '@n8n/errors';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ScimSwitchReader } from '@/sso.ee/scim-switch-reader';
import * as ssoHelpers from '@/sso.ee/sso-helpers';

import type { ScimSettingsService } from '../scim-settings.service';
import { ScimSsoService } from '../scim-sso.service';

describe('ScimSsoService', () => {
	let scimSettingsService: Mocked<ScimSettingsService>;
	let moduleRegistry: Mocked<ModuleRegistry>;
	let logger: ReturnType<typeof mockLogger>;
	let scimSwitchReader: ScimSwitchReader;
	let settingsRepository: Mocked<SettingsRepository>;
	let service: ScimSsoService;

	const ssoOn = (on: boolean) =>
		vi.spyOn(ssoHelpers, 'isSamlOrOidcLoginEnabled').mockReturnValue(on);

	/** Turns SCIM off the way SSO code does when single sign-on turns off. */
	const emitSsoOff = async (protocol: 'saml' | 'oidc') => await scimSwitchReader.turnOff(protocol);

	beforeEach(() => {
		vi.restoreAllMocks();
		scimSettingsService = mock<ScimSettingsService>();
		moduleRegistry = mock<ModuleRegistry>();
		logger = mockLogger();
		scimSwitchReader = new ScimSwitchReader(
			mock<LicenseState>(),
			mock<SettingsRepository>(),
			mock<CacheService>(),
			mockLogger(),
		);
		settingsRepository = mock<SettingsRepository>();
		service = new ScimSsoService(
			logger,
			scimSettingsService,
			moduleRegistry,
			scimSwitchReader,
			settingsRepository,
		);
	});

	it.each([true, false])('reports single sign-on as %s from the shared helper', (on) => {
		ssoOn(on);

		expect(service.isSsoEnabled()).toBe(on);
	});

	// Another main can turn single sign-on off before this main reloads the
	// method, so the check under the SCIM switch lock also reads the saved one.
	describe('isSsoEnabledInTransaction', () => {
		const ctx = {};
		const savedMethod = (value: string | null) =>
			settingsRepository.findByKeyInContext.mockResolvedValue(
				value === null
					? null
					: ({ key: 'userManagement.authenticationMethod', value } as Awaited<
							ReturnType<SettingsRepository['findByKeyInContext']>
						>),
			);

		it.each(['saml', 'oidc'])('is true while %s is the saved method', async (method) => {
			ssoOn(true);
			savedMethod(method);

			expect(await service.isSsoEnabledInTransaction(ctx)).toBe(true);
			expect(settingsRepository.findByKeyInContext).toHaveBeenCalledWith(
				'userManagement.authenticationMethod',
				ctx,
			);
		});

		it.each(['email', 'ldap'])(
			'is false while %s is the saved method, also when memory says single sign-on is on',
			async (method) => {
				ssoOn(true);
				savedMethod(method);

				expect(await service.isSsoEnabledInTransaction(ctx)).toBe(false);
			},
		);

		it('uses the method in memory when no method is saved', async () => {
			ssoOn(true);
			savedMethod(null);

			expect(await service.isSsoEnabledInTransaction(ctx)).toBe(true);
		});

		it('is false without reading the database when memory says single sign-on is off', async () => {
			ssoOn(false);

			expect(await service.isSsoEnabledInTransaction(ctx)).toBe(false);
			expect(settingsRepository.findByKeyInContext).not.toHaveBeenCalled();
		});
	});

	describe('when SSO code turns single sign-on off', () => {
		beforeEach(async () => {
			ssoOn(true);
			await service.init();
		});

		// SSO code reads the switch through the reader, without an import of
		// the SCIM module.
		it.each([true, false])('lets SSO code read the SCIM switch as %s', async (enabled) => {
			scimSettingsService.isSavedEnabled.mockResolvedValue(enabled);

			expect(await scimSwitchReader.isEnabled()).toBe(enabled);
		});

		// The cache can say off while an enable that committed a moment before
		// says on. `sso-login-disabled` must report the switch that SCIM turns off.
		it('lets SSO code read the saved switch, not the cached one', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(false);
			scimSettingsService.isSavedEnabled.mockResolvedValue(true);

			expect(await scimSwitchReader.isEnabled()).toBe(true);
			expect(scimSettingsService.isEnabled).not.toHaveBeenCalled();
		});

		it.each(['saml', 'oidc'] as const)(
			'turns SCIM off when %s sign-in turns off, and refreshes the settings',
			async (protocol) => {
				scimSettingsService.turnOff.mockResolvedValue(true);

				await emitSsoOff(protocol);

				expect(scimSettingsService.turnOff).toHaveBeenCalledTimes(1);
				expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
				expect(logger.info).toHaveBeenCalledWith(
					`SCIM provisioning turned off, because ${protocol.toUpperCase()} single sign-on turned off. The SCIM token and the SCIM settings are kept.`,
				);
			},
		);

		// The cache can say off while an enable that committed a moment before
		// says on. Only the saved switch decides.
		it('does not read the cached switch', async () => {
			scimSettingsService.isEnabled.mockResolvedValue(false);
			scimSettingsService.turnOff.mockResolvedValue(true);

			await emitSsoOff('saml');

			expect(scimSettingsService.isEnabled).not.toHaveBeenCalled();
			expect(scimSettingsService.turnOff).toHaveBeenCalledTimes(1);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
		});

		it('does not refresh the settings when SCIM was already off', async () => {
			scimSettingsService.turnOff.mockResolvedValue(false);

			await emitSsoOff('saml');

			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
		});

		// A silent failure leaves SCIM on, and SCIM serves again when single
		// sign-on turns on again.
		it('logs a failure and throws an error that tells the admin to turn SCIM off', async () => {
			const cause = new Error('db down');
			scimSettingsService.turnOff.mockRejectedValue(cause);

			const error = await emitSsoOff('oidc').catch((e: unknown) => e);

			expect(error).toBeInstanceOf(InternalServerError);
			expect(error).toMatchObject({
				message:
					'SCIM provisioning did not turn off, so single sign-on did not turn off fully. Turn off SCIM provisioning in the SCIM settings. Then turn off single sign-on again.',
				cause,
			});
			expect(logger.error).toHaveBeenCalledWith(
				'SCIM: Failed to turn off SCIM provisioning without single sign-on',
				{ error: cause },
			);
			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
		});

		it('keeps SCIM off when the settings refresh fails', async () => {
			scimSettingsService.turnOff.mockResolvedValue(true);
			moduleRegistry.refreshModuleSettings.mockRejectedValue(new Error('db down'));

			await emitSsoOff('saml');

			expect(scimSettingsService.turnOff).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'SCIM: Failed to refresh the module settings',
				expect.anything(),
			);
		});

		it('turns SCIM off once when the module starts again', async () => {
			scimSettingsService.turnOff.mockResolvedValue(true);
			await service.init();

			await emitSsoOff('saml');

			expect(scimSettingsService.turnOff).toHaveBeenCalledTimes(1);
		});
	});

	describe('at startup', () => {
		it('turns SCIM off when SCIM is on and single sign-on is off', async () => {
			ssoOn(false);
			scimSettingsService.turnOff.mockResolvedValue(true);

			await service.init();

			expect(scimSettingsService.turnOff).toHaveBeenCalledTimes(1);
			expect(moduleRegistry.refreshModuleSettings).toHaveBeenCalledWith('scim');
			expect(logger.info).toHaveBeenCalledWith(
				'SCIM provisioning turned off, because single sign-on is off at startup. The SCIM token and the SCIM settings are kept.',
			);
		});

		it('keeps SCIM on when single sign-on is on', async () => {
			ssoOn(true);

			await service.init();

			expect(scimSettingsService.turnOff).not.toHaveBeenCalled();
		});

		it('does not refresh the settings when SCIM is off', async () => {
			ssoOn(false);
			scimSettingsService.turnOff.mockResolvedValue(false);

			await service.init();

			expect(moduleRegistry.refreshModuleSettings).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalled();
		});

		it('does not fail the startup when the check fails', async () => {
			ssoOn(false);
			scimSettingsService.turnOff.mockRejectedValue(new Error('db down'));

			await expect(service.init()).resolves.toBeUndefined();
			expect(logger.error).toHaveBeenCalled();
		});
	});
});
