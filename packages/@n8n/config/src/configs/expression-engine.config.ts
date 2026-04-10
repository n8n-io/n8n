import z from 'zod';

import { Config, Env } from '../decorators';

const expressionEngineSchema = z.enum(['legacy', 'vm']);

@Config
export class ExpressionEngineConfig {
	/**
	 * Which expression engine to use.
	 * - `legacy` runs expressions without isolation.
	 * - `vm` runs expressions in a V8 isolate.
	 *
	 * `vm` is currently **experimental**. Use at your own risk.
	 */
	@Env('N8N_EXPRESSION_ENGINE', expressionEngineSchema)
	engine: 'legacy' | 'vm' = 'legacy';

	/** Number of V8 isolates ready in the pool. */
	@Env('N8N_EXPRESSION_ENGINE_POOL_SIZE')
	poolSize: number = 1;

	/** Max number of AST-transformed expressions to cache. */
	@Env('N8N_EXPRESSION_ENGINE_MAX_CODE_CACHE_SIZE')
	maxCodeCacheSize: number = 1024;

	/**
	 * Execution timeout in milliseconds for each expression evaluation in the VM bridge.
	 */
	@Env('N8N_EXPRESSION_ENGINE_TIMEOUT')
	bridgeTimeout: number = 5000;

	/** Memory limit in MB for the V8 isolate used by the VM bridge. */
	@Env('N8N_EXPRESSION_ENGINE_MEMORY_LIMIT')
	bridgeMemoryLimit: number = 128;
}
