import type { InstanceAiAdminSettingsResponse } from '@n8n/api-types';

import { deriveInstanceAiConfiguration } from './useInstanceAiConfiguration';

function createSettings(
	overrides: Partial<InstanceAiAdminSettingsResponse> = {},
): InstanceAiAdminSettingsResponse {
	return {
		enabled: true,
		permissions: {} as InstanceAiAdminSettingsResponse['permissions'],
		mcpAccessEnabled: false,
		sandboxEnabled: false,
		sandboxProvider: 'n8n-sandbox',
		daytonaCredentialId: null,
		n8nSandboxCredentialId: null,
		searchCredentialId: null,
		modelCredentialId: null,
		modelName: null,
		modelEnvConfigured: false,
		sandboxEnvConfigured: false,
		searchEnvConfigured: false,
		searchDisabled: false,
		n8nSandboxServiceUrl: null,
		envManaged: {
			model: { provider: false, apiKey: false, baseUrl: false, model: false },
			sandbox: { provider: false, serviceUrl: false, apiKey: false },
			search: { provider: false, apiKey: false, url: false },
		},
		localGatewayDisabled: false,
		browserUseEnabled: true,
		...overrides,
	};
}

describe('deriveInstanceAiConfiguration', () => {
	it('keeps setup incomplete until web search is explicitly decided', () => {
		const settings = createSettings({
			modelCredentialId: 'model-1',
			modelName: 'gpt-5.4',
			sandboxEnabled: true,
			n8nSandboxCredentialId: 'sandbox-1',
		});

		const undecided = deriveInstanceAiConfiguration(settings, [], []);
		expect(undecided.setupCompleted).toBe(false);
		expect(undecided.searchState).toBe('notset');

		const disabled = deriveInstanceAiConfiguration({ ...settings, searchDisabled: true }, [], []);
		expect(disabled.setupCompleted).toBe(true);
		expect(disabled.searchState).toBe('disabled');
	});

	it('accepts env-managed services without exposing configuration details', () => {
		const configuration = deriveInstanceAiConfiguration(
			createSettings({
				modelEnvConfigured: true,
				sandboxEnabled: true,
				sandboxEnvConfigured: true,
				searchEnvConfigured: true,
			}),
			[],
			[],
		);

		expect(configuration).toMatchObject({
			modelConfigured: true,
			sandboxConfigured: true,
			searchState: 'env',
			setupCompleted: true,
		});
	});

	it('does not treat a configured sandbox connection as ready while sandboxing is disabled', () => {
		const configuration = deriveInstanceAiConfiguration(
			createSettings({ n8nSandboxCredentialId: 'sandbox-1' }),
			[],
			[],
		);

		expect(configuration.sandboxConfigured).toBe(false);
	});
});
