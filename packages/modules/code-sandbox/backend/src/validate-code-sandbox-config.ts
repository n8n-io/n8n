import type { CodeSandboxConfig } from '@n8n/config';
import { z } from 'zod/v4';

import { InvalidCodeSandboxConfigError } from './errors/invalid-code-sandbox-config.error';

/**
 * Fails startup when the sandbox settings are invalid. There is no fallback
 * to task runners, so a bad config must not wait until the first Code node runs.
 */
export function validateCodeSandboxConfig(config: CodeSandboxConfig) {
	const codeSandboxConfigSchema = z.object({
		url: z.url({
			protocol: /^https?$/,
			error: 'Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL.',
		}),
		apiKey: z.string().min(1, 'Set `N8N_CODE_SANDBOX_API_KEY`.'),
	});

	const result = codeSandboxConfigSchema.safeParse(config);
	if (!result.success) {
		throw new InvalidCodeSandboxConfigError(result.error.issues.map((issue) => issue.message));
	}
}
