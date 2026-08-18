import type { InstanceAiAdminSettingsResponse, InstanceAiProviderConnection } from '@n8n/api-types';

import { buildSetupSnapshot } from '../instanceAiSetup.telemetry';

const baseSettings = {
	enabled: true,
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
	envManaged: {
		model: { provider: false, apiKey: false, baseUrl: false, model: false },
		sandbox: { provider: false, serviceUrl: false, apiKey: false },
		search: { provider: false, apiKey: false, url: false },
	},
} as unknown as InstanceAiAdminSettingsResponse;

const modelCredentials: InstanceAiProviderConnection[] = [
	{ id: 'model-cred', name: 'Anthropic key', type: 'anthropicApi' },
];
const serviceCredentials: InstanceAiProviderConnection[] = [
	{ id: 'search-cred', name: 'SearXNG', type: 'searXngApi' },
];

describe('buildSetupSnapshot', () => {
	it('reports UI-configured components with providers from credential types', () => {
		const snapshot = buildSetupSnapshot(
			{
				...baseSettings,
				modelCredentialId: 'model-cred',
				modelName: 'claude-sonnet-4',
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaCredentialId: 'day-cred',
				searchCredentialId: 'search-cred',
			},
			modelCredentials,
			serviceCredentials,
		);

		expect(snapshot).toEqual({
			model_source: 'ui',
			model_provider: 'anthropic',
			model_name: 'claude-sonnet-4',
			sandbox_source: 'ui',
			sandbox_type: 'daytona',
			web_search_source: 'ui',
			web_search_provider: 'searxng',
		});
	});

	it('reports env-configured components, with the search provider from env flags', () => {
		const snapshot = buildSetupSnapshot(
			{
				...baseSettings,
				modelEnvConfigured: true,
				modelName: 'gpt-4',
				sandboxEnabled: true,
				sandboxEnvConfigured: true,
				searchEnvConfigured: true,
				envManaged: {
					...baseSettings.envManaged,
					search: { provider: true, apiKey: true, url: false },
				},
			},
			[],
			[],
		);

		expect(snapshot).toEqual({
			model_source: 'env',
			model_provider: null,
			model_name: 'gpt-4',
			sandbox_source: 'env',
			sandbox_type: 'n8n-sandbox',
			web_search_source: 'env',
			web_search_provider: 'brave',
		});
	});

	it('reports unconfigured components as none and a disabled search decision', () => {
		const snapshot = buildSetupSnapshot({ ...baseSettings, searchDisabled: true }, [], []);

		expect(snapshot).toEqual({
			model_source: 'none',
			model_provider: null,
			model_name: null,
			sandbox_source: 'none',
			sandbox_type: null,
			web_search_source: 'disabled',
			web_search_provider: null,
		});
	});
});
