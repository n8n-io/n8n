import { isInstanceAiSandboxProvider, type InstanceAiSandboxProvider } from '@n8n/api-types';
import { OperationalError } from 'n8n-workflow';

/** Fallback provider when none is configured or a persisted/env value is unrecognized. */
export const DEFAULT_SANDBOX_PROVIDER: InstanceAiSandboxProvider = 'n8n-sandbox';

export const N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'N8N_SANDBOX_SERVICE_URL is required when Instance AI sandbox provider is n8n-sandbox.';

/** Coerce a raw config/env value to a supported provider, falling back to the default. */
export function normalizeSandboxProvider(value: string | undefined): InstanceAiSandboxProvider {
	return value && isInstanceAiSandboxProvider(value) ? value : DEFAULT_SANDBOX_PROVIDER;
}

/** Require a non-empty n8n sandbox service URL, raising a clear operator-facing error otherwise. */
export function requireN8nSandboxServiceUrl(value: string): string {
	const serviceUrl = value.trim();
	if (serviceUrl.length === 0) {
		throw new OperationalError(N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE);
	}
	return serviceUrl;
}
