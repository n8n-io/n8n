import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

export const CODE_EXECUTION_BACKENDS = ['task-runners', 'sandbox'] as const;

export type CodeExecutionBackendType = (typeof CODE_EXECUTION_BACKENDS)[number];

export const isCodeExecutionBackend = (value: string): value is CodeExecutionBackendType =>
	CODE_EXECUTION_BACKENDS.some((backend) => backend === value);

// Only `execution` is supported for now. `workflow` and `project` come later.
const codeSandboxScopeSchema = z.enum(['execution']);

export type CodeSandboxScope = z.infer<typeof codeSandboxScopeSchema>;

@Config
export class CodeSandboxConfig {
	/**
	 * Base URL of the code sandbox service, for example `https://code-sandbox.example.com`.
	 * Required when `N8N_CODE_EXECUTION_BACKEND` is `sandbox`.
	 */
	@Env('N8N_CODE_SANDBOX_URL')
	url: string = '';

	/**
	 * API key n8n uses to authenticate with the code sandbox service. Required
	 * when `N8N_CODE_EXECUTION_BACKEND` is `sandbox`.
	 */
	@Env('N8N_CODE_SANDBOX_API_KEY')
	apiKey: string = '';

	/**
	 * Which tasks can share a sandbox. Currently the only allowed value is
	 * `execution`, which gives each execution its own sandboxes.
	 */
	@Env('N8N_CODE_SANDBOX_SCOPE', codeSandboxScopeSchema)
	scope: CodeSandboxScope = 'execution';
}

@Config
export class CodeExecutionConfig {
	/**
	 * Where n8n runs the code of Code nodes. One of `task-runners` or `sandbox`.
	 * When set to `sandbox`, you must also set `N8N_CODE_SANDBOX_URL` and
	 * `N8N_CODE_SANDBOX_API_KEY`. n8n doesn't start if the value is invalid.
	 */
	// Validated at startup, so a typo fails instead of falling back to task runners.
	@Env('N8N_CODE_EXECUTION_BACKEND')
	backend: string = 'task-runners';

	@Nested
	sandbox: CodeSandboxConfig;
}
