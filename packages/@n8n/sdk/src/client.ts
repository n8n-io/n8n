import { createProxy, type ExecutionCaller } from './proxy';

/**
 * Options accepted by {@link createClient}.
 */
export interface CreateClientOptions {
	/** Base URL of the target n8n Hub instance (no trailing slash). */
	baseUrl: string;
	/** Bearer token used to authenticate against the Hub. */
	token: string;
	/**
	 * Identifies the SDK consumer to the Hub. Surfaces in the executions UI's
	 * `caller` column. Defaults to `{ kind: 'sdk', name: '@n8n/sdk' }` so SDK
	 * runs are always attributable; override `name`/`clientId` to identify the
	 * specific app embedding the SDK.
	 */
	caller?: ExecutionCaller;
}

export type { ExecutionCaller } from './proxy';

/**
 * Result of executing a node via `POST /rest/executions/node`.
 *
 * Mirrors the response shape produced by `ExecuteNodeService`. For
 * `status === 'success'` the `output` field carries the normalized JSON
 * output: either the bare item (when the node emitted a single result) or
 * the raw array (for multi-item outputs).
 */
export interface ExecutionResult<T = unknown> {
	/** Identifier of the recorded execution. */
	executionId: string;
	/** Final status of the execution. */
	status: 'success' | 'error' | 'dry_run';
	/** Normalized output, when `status === 'success'`. */
	output?: T;
	/** Error details, when `status === 'error'`. */
	error?: { message: string; stack?: string };
	/** Direct link to the execution in the n8n UI. */
	executionUrl: string;
}

/**
 * Typed client surface exposed by the n8n SDK.
 *
 * The runtime is a JavaScript `Proxy` that materializes
 * `n8n.<service>.<operation>(args)` calls lazily; statically the shape is
 * an indexable record because the generated `.d.ts` files (Task 4.3) will
 * later narrow it to the actual catalog of services and operations.
 */
export type N8nClient = Record<string, unknown>;

/**
 * Creates a new typed n8n SDK client.
 *
 * @throws If `baseUrl` or `token` is missing — both are required to talk
 *   to the Hub.
 */
export function createClient(options: CreateClientOptions): N8nClient {
	if (!options.token) throw new Error('token is required');
	if (!options.baseUrl) throw new Error('baseUrl is required');
	return createProxy(options);
}
