import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const codeExecutionBackendSchema = z.enum(['task-runners', 'sandbox']);

export type CodeExecutionBackendType = z.infer<typeof codeExecutionBackendSchema>;

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
	 * `N8N_CODE_SANDBOX_API_KEY`.
	 */
	@Env('N8N_CODE_TASKS_BACKEND', codeExecutionBackendSchema)
	backend: CodeExecutionBackendType = 'task-runners';

	@Nested
	sandbox: CodeSandboxConfig;
}
