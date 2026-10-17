import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const backendSchema = z.enum(['task-runners', 'sandbox']);
const scopeSchema = z.enum(['node', 'execution', 'workflow']);

export type CodeExecutionBackend = z.infer<typeof backendSchema>;
export type CodeSandboxScope = z.infer<typeof scopeSchema>;

/** Default slots per sandbox for each scope mode. */
const DEFAULT_SLOTS: Record<CodeSandboxScope, number> = { node: 1, execution: 2, workflow: 4 };

/**
 * Configuration of the code sandbox backend (spike). With
 * `N8N_CODE_EXECUTION_BACKEND=sandbox`, JavaScript Code tasks run in code
 * sandboxes of the sandbox service instead of task runners. Python keeps
 * using task runners.
 */
@Config
export class CodeSandboxConfig {
	@Env('N8N_CODE_EXECUTION_BACKEND', backendSchema)
	backend: CodeExecutionBackend = 'task-runners';

	/** The isolation scope: which tasks share a sandbox. */
	@Env('N8N_CODE_SANDBOX_SCOPE', scopeSchema)
	scope: CodeSandboxScope = 'execution';

	/** Release a sandbox after this idle time. */
	@Env('N8N_CODE_SANDBOX_IDLE_TIMEOUT_MS')
	idleTimeoutMs: number = 30_000;

	/** `workflow` scope only. Stop new tasks on a sandbox after this time. */
	@Env('N8N_CODE_SANDBOX_MAX_LIFETIME_MS')
	maxLifetimeMs: number = 60_000;

	/** Task slots per sandbox. 0 means the default of the scope mode. */
	@Env('N8N_CODE_SANDBOX_SLOTS')
	slotsOverride: number = 0;

	/** Maximum sandboxes for one scope key in one process. Draining ones do not count. */
	@Env('N8N_CODE_SANDBOX_MAX_PER_KEY')
	maxPerKey: number = 4;

	/** Each slot keeps a started worker process. */
	@Env('N8N_CODE_SANDBOX_SPARE_WORKERS')
	spareWorkers: boolean = true;

	/**
	 * Run all tasks of a sandbox in one shared worker process. The slots limit
	 * how many tasks run at the same time. The process, its module cache and
	 * changes to built-in objects stay between tasks.
	 */
	@Env('N8N_CODE_SANDBOX_REUSE_WORKERS')
	reuseWorkers: boolean = false;

	/** Memory limit per task. */
	@Env('N8N_CODE_SANDBOX_TASK_MEMORY_MB')
	taskMemoryMb: number = 512;

	/** Write timing records (`code_sandbox_task`, `code_sandbox_lease`). */
	@Env('N8N_CODE_SANDBOX_TIMINGS')
	timings: boolean = true;

	/** Also append the timing records to this file. Empty: stdout only. */
	@Env('N8N_CODE_SANDBOX_TIMINGS_PATH')
	timingsFile: string = '';

	/** The runtime of the code sandbox image. */
	@Env('N8N_CODE_SANDBOX_RUNTIME')
	runtime: string = 'n8n-js';

	/** Results larger than this are downloaded as `result.json` instead of inline. */
	@Env('N8N_CODE_SANDBOX_INLINE_RESULT_MAX_BYTES')
	inlineResultMaxBytes: number = 1024 * 1024;

	/** Same variables as Instance AI. */
	@Env('N8N_SANDBOX_SERVICE_URL')
	serviceUrl: string = '';

	@Env('N8N_SANDBOX_SERVICE_API_KEY')
	serviceApiKey: string = '';

	get enabled() {
		return this.backend === 'sandbox';
	}

	get slots() {
		return this.slotsOverride > 0 ? this.slotsOverride : DEFAULT_SLOTS[this.scope];
	}
}
