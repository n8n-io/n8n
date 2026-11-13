import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

export type CodeExecutionBackendType = 'task-runners' | 'sandbox';

export const CODE_EXECUTION_BACKENDS: readonly CodeExecutionBackendType[] = [
	'task-runners',
	'sandbox',
];

export const isCodeExecutionBackend = (value: string): value is CodeExecutionBackendType =>
	CODE_EXECUTION_BACKENDS.some((backend) => backend === value);

// Accepts any string, so an invalid backend fails the startup check instead of
// falling back to the default.
const unvalidatedBackendSchema = z.string();

// Only `execution` is supported for now. `workflow` and `project` come later.
const codeSandboxScopeSchema = z.enum(['execution']);

export type CodeSandboxScope = z.infer<typeof codeSandboxScopeSchema>;

@Config
export class CodeSandboxConfig {
	/**
	 * Experimental and not ready for production use. Base URL of the code sandbox
	 * service, for example `https://code-sandbox.example.com`. Required when
	 * `N8N_CODE_TASKS_BACKEND` is `sandbox`.
	 */
	@Env('N8N_CODE_SANDBOX_URL')
	url: string = '';

	/**
	 * Experimental and not ready for production use. API key n8n uses to
	 * authenticate with the code sandbox service. Required when
	 * `N8N_CODE_TASKS_BACKEND` is `sandbox`.
	 */
	@Env('N8N_CODE_SANDBOX_API_KEY')
	apiKey: string = '';

	/**
	 * Experimental and not ready for production use. Which tasks can share a
	 * sandbox. Currently the only allowed value is `execution`, which gives each
	 * execution its own sandboxes.
	 */
	@Env('N8N_CODE_SANDBOX_SCOPE', codeSandboxScopeSchema)
	scope: CodeSandboxScope = 'execution';
}

@Config
export class CodeExecutionConfig {
	/**
	 * Where n8n runs the code of Code nodes. One of `task-runners` or `sandbox`.
	 * The `sandbox` backend is experimental and isn't ready for production use.
	 * When set to `sandbox`, you must also set `N8N_CODE_SANDBOX_URL` and
	 * `N8N_CODE_SANDBOX_API_KEY`. n8n doesn't start if the value is invalid.
	 */
	@Env('N8N_CODE_TASKS_BACKEND', unvalidatedBackendSchema)
	backend: CodeExecutionBackendType = 'task-runners';

	@Nested
	sandbox: CodeSandboxConfig;
}
