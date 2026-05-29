import {
	instanceAiSandboxProviderSchema,
	isInstanceAiSandboxProvider,
	type InstanceAiSandboxProvider,
} from '@n8n/api-types';

/** Fallback provider when none is configured or a persisted/env value is unrecognized. */
export const DEFAULT_SANDBOX_PROVIDER: InstanceAiSandboxProvider = 'n8n-sandbox';

/** Comma-separated provider list, derived from the schema so it can't drift. */
const SUPPORTED_SANDBOX_PROVIDERS = instanceAiSandboxProviderSchema.options.join(', ');

export const N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'N8N_SANDBOX_SERVICE_URL is required when Instance AI sandbox provider is n8n-sandbox.';

export function unsupportedSandboxProviderMessage(provider: string): string {
	return `Unsupported Instance AI sandbox provider "${provider}". Supported providers: ${SUPPORTED_SANDBOX_PROVIDERS}.`;
}

/** Coerce a raw config/env value to a supported provider, falling back to the default. */
export function normalizeSandboxProvider(value: string | undefined): InstanceAiSandboxProvider {
	return value && isInstanceAiSandboxProvider(value) ? value : DEFAULT_SANDBOX_PROVIDER;
}
