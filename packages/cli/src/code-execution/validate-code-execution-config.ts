import type { CodeExecutionConfig } from '@n8n/config';
import { z } from 'zod/v4';

import { InvalidCodeExecutionConfigError } from './errors/invalid-code-execution-config.error';

/**
 * Fails startup when the sandbox backend is selected without valid settings.
 * There is no fallback to task runners, so a bad config must not wait until
 * the first Code node runs.
 */
export function validateCodeExecutionConfig({ backend, sandbox }: CodeExecutionConfig) {
	if (backend !== 'sandbox') return;

	const codeSandboxConfigSchema = z.object({
		url: z.url({
			protocol: /^https?$/,
			error: 'Set `N8N_CODE_SANDBOX_URL` to a valid http or https URL.',
		}),
		apiKey: z.string().min(1, 'Set `N8N_CODE_SANDBOX_API_KEY`.'),
	});

	const result = codeSandboxConfigSchema.safeParse(sandbox);
	if (!result.success) {
		throw new InvalidCodeExecutionConfigError(result.error.issues.map((issue) => issue.message));
	}
}
