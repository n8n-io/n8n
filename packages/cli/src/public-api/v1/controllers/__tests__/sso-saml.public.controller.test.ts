import type { SamlPreferences, UpdateSamlConfigurationPublicDto } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { SamlService } from '@/modules/sso-saml/saml.service.ee';

import { SamlSsoPublicController } from '../sso-saml.public.controller';

vi.mock('../sso-saml.mapper', () => ({
	toSamlPreferencesUpdate: vi.fn((body: unknown) => body),
	toSamlConfigurationResponse: vi.fn((prefs: unknown) => prefs),
}));

describe('SamlSsoPublicController', () => {
	const samlService = mock<SamlService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		ssoManagedByEnv: false,
	});
	const eventService = mock<EventService>();
	const controller = new SamlSsoPublicController(
		samlService,
		instanceSettingsLoaderConfig,
		eventService,
	);

	const stored = { loginEnabled: false, loginLabel: 'SSO', metadata: '<old/>' } as SamlPreferences;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// The public route stores through the same service as the settings page, so
	// `publicApi` is what tells the two surfaces apart in the audit trail.
	it('updateSamlConfiguration emits sso-settings-updated with publicApi true', async () => {
		const snapshots = [stored, { ...stored, metadata: '<new/>', loginEnabled: true }];
		Object.defineProperty(samlService, 'samlPreferences', {
			get: () => snapshots.shift(),
			configurable: true,
		});
		const request = mock<AuthenticatedRequest>({
			user: { id: '123', role: { slug: 'global:owner' } },
		});

		await controller.updateSamlConfiguration(request, mock(), {
			metadata: '<new/>',
			loginEnabled: true,
		} as UpdateSamlConfigurationPublicDto);

		expect(samlService.setSamlPreferences).toHaveBeenCalledWith({
			metadata: '<new/>',
			loginEnabled: true,
		});
		expect(eventService.emit).toHaveBeenCalledWith('sso-settings-updated', {
			user: request.user,
			protocol: 'saml',
			loginEnabled: true,
			fieldsChanged: ['loginEnabled', 'metadata'],
			publicApi: true,
		});
	});
});
