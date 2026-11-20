import type { OidcConfigDto, UpdateOidcConfigurationPublicDto } from '@n8n/api-types';
import type { EventService } from '@n8n/backend-services';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '@/modules/sso-oidc/constants';
import type { OidcService } from '@/modules/sso-oidc/oidc.service.ee';

import { SsoOidcPublicController } from '../sso-oidc.public.controller';

describe('SsoOidcPublicController', () => {
	const oidcService = mock<OidcService>();
	const instanceSettingsLoaderConfig = mock<InstanceSettingsLoaderConfig>({
		ssoManagedByEnv: false,
	});
	const eventService = mock<EventService>();
	const controller = new SsoOidcPublicController(
		oidcService,
		instanceSettingsLoaderConfig,
		eventService,
	);

	const stored: OidcConfigDto = {
		clientId: 'old-client',
		clientSecret: OIDC_CLIENT_SECRET_REDACTED_VALUE,
		discoveryEndpoint: 'https://idp.example.com/.well-known/openid-configuration',
		loginEnabled: false,
		prompt: 'select_account',
		authenticationContextClassReference: [],
		additionalScopes: '',
		emailVerifiedRequired: false,
		rpInitiatedLogoutEnabled: false,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('setOidcConfiguration emits sso-settings-updated with publicApi true and names the new secret', async () => {
		const saved = { ...stored, loginEnabled: true };
		oidcService.getRedactedConfig.mockReturnValueOnce(stored).mockReturnValueOnce(saved);
		oidcService.loadConfig.mockResolvedValueOnce({
			...saved,
			discoveryEndpoint: new URL(saved.discoveryEndpoint),
		});
		const request = mock<AuthenticatedRequest>({ user: { id: '123' } });
		const body = { ...saved, clientSecret: 'new-secret' } as UpdateOidcConfigurationPublicDto;

		const result = await controller.setOidcConfiguration(request, mock(), body);

		expect(oidcService.updateConfig).toHaveBeenCalledWith(body);
		expect(eventService.emit).toHaveBeenCalledWith('sso-settings-updated', {
			user: request.user,
			protocol: 'oidc',
			loginEnabled: true,
			fieldsChanged: ['loginEnabled', 'clientSecret'],
			publicApi: true,
		});
		expect(result.clientSecret).toBe(OIDC_CLIENT_SECRET_REDACTED_VALUE);
		const [, eventPayload] = eventService.emit.mock.calls[0];
		expect(JSON.stringify(eventPayload)).not.toContain('new-secret');
	});
});
