import {
	DEFAULT_SANDBOX_PROVIDER,
	normalizeSandboxProvider,
	type SandboxProvider,
} from '@n8n/ai-utilities/sandbox';
import { OperationalError } from 'n8n-workflow';

export { DEFAULT_SANDBOX_PROVIDER, normalizeSandboxProvider };
export type { SandboxProvider };

export const N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE =
	'N8N_SANDBOX_SERVICE_URL is required when Instance AI sandbox provider is n8n-sandbox.';

/** Require a non-empty n8n sandbox service URL, raising a clear operator-facing error otherwise. */
export function requireN8nSandboxServiceUrl(value: string): string {
	const serviceUrl = value.trim();
	if (serviceUrl.length === 0) {
		throw new OperationalError(N8N_SANDBOX_SERVICE_URL_REQUIRED_MESSAGE);
	}
	return serviceUrl;
}
