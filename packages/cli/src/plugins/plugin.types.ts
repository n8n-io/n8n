export interface PluginManagedField {
	/** The credential data field to inject into, e.g. `'apiKey'` */
	readonly credentialField: string;
	/** Sub-key within the plugin's storage namespace: stored as `plugins.{id}.{storageKey}` */
	readonly storageKey: string;
	/** Human-readable label shown in the settings UI, e.g. `'API Key'` */
	readonly label: string;
	/** Optional input placeholder shown in the settings UI */
	readonly placeholder?: string;
}

export interface PluginDescriptor {
	/** Unique identifier and settings storage key prefix, e.g. `'mergeDev'` */
	readonly id: string;
	/** Human-readable name used in UI and error messages, e.g. `'Merge.dev'` */
	readonly displayName: string;
	/** Short description shown in the settings UI */
	readonly description: string;
	/** The n8n credential type this plugin provides managed fields for, e.g. `'mergeDevApi'` */
	readonly credentialType: string;
	/** Credential data field that opts in to managed injection, e.g. `'useManagedApiKey'` */
	readonly managedToggleField: string;
	/** Fields this plugin injects into the credential at runtime */
	readonly managedFields: readonly PluginManagedField[];
}
