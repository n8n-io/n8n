import type { PluginDescriptor } from './plugin.types';

export const PLUGIN_REGISTRY: readonly PluginDescriptor[] = [
	{
		id: 'mergeDev',
		displayName: 'Merge.dev',
		description: 'Power unified API integrations in your workflows via Merge.dev',
		credentialType: 'mergeDevApi',
		managedToggleField: 'useManagedApiKey',
		managedFields: [
			{
				credentialField: 'apiKey',
				storageKey: 'apiKey',
				label: 'API Key',
				placeholder: 'Enter your Merge.dev API key',
			},
		],
	},
];

export function getPluginByCredentialType(credentialType: string): PluginDescriptor | undefined {
	return PLUGIN_REGISTRY.find((p) => p.credentialType === credentialType);
}

export function getPluginById(id: string): PluginDescriptor | undefined {
	return PLUGIN_REGISTRY.find((p) => p.id === id);
}
