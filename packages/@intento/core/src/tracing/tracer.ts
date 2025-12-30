import type { Logger, LogMetadata } from 'n8n-workflow';

import type { IFunctions } from 'types/*';
import { CoreError } from 'types/*';
import { Pipeline } from 'utils/*';

/**
 * Structured logger with distributed tracing support for n8n workflows.
 *
 * Provides consistent logging across intento-core with automatic context enrichment:
 * - Resolves or generates traceId for request correlation across workflow nodes
 * - Injects workflow metadata (node name, workflow ID, execution ID) into every log
 * - Offers standardized logging methods (debug, info, warn, error, errorAndThrow)
 *
 * **Distributed Tracing Strategy:**
 * TraceId propagates through workflow execution via two mechanisms:
 * 1. **customData cache**: Fast O(1) lookup for downstream nodes in same execution
 * 2. **Pipeline outputs**: Extraction from upstream node outputs (json.traceId field)
 *
 * This enables request correlation across:
 * - Sequential nodes in a workflow
 * - Split/merge scenarios with multiple paths
 * - Sub-workflow invocations
 * - Retry attempts in SupplierBase
 *
 * **Primary Use Cases:**
 * - SupplierBase: Logs retry attempts with attempt number, latency, request metadata
 * - ContextFactory: Logs parameter extraction and validation failures with context state
 * - TranslationAgent: Logs execution flow and supplier results
 * - Supply chain: Correlates requests/responses across multiple translation attempts
 *
 * **Instance Immutability:**
 * All properties are readonly and instance is frozen after construction to prevent
 * mid-execution modification of tracing context.
 *
 * @example
 * ```typescript
 * // In SupplierBase constructor
 * this.tracer = new Tracer(functions);
 * // → Resolves traceId from customData or pipeline
 * // → Extracts nodeName, workflowId, executionId from functions
 *
 * // Structured logging with automatic enrichment
 * tracer.debug('Starting supply attempt', { attempt: 1, requestId: 'abc-123' });
 * // Logs: { message, traceId, nodeName, workflowId, executionId, attempt, requestId }
 *
 * // Error with throw (creates CoreError with full context)
 * tracer.errorAndThrow('Supply failed', { attempt: 3, latencyMs: 5000 });
 * // → Logs error with full metadata
 * // → Throws CoreError with same metadata for upstream catching
 * ```
 *
 * @see {@link CoreError} for error objects created by errorAndThrow()
 * @see {@link SupplierBase} for primary consumer with retry logging
 * @see {@link ContextFactory} for parameter extraction logging
 */
export class Tracer {
	/** n8n logger instance for actual log output */
	readonly log: Logger;

	/** Unique ID for correlating logs across workflow nodes and retries */
	readonly traceId: string;

	/** Name of current n8n node (for identifying log source) */
	readonly nodeName: string;

	/** ID of workflow being executed */
	readonly workflowId: string;

	/** ID of specific workflow execution instance */
	readonly executionId: string;

	/**
	 * Creates immutable tracer with resolved traceId and workflow context.
	 *
	 * **TraceId Resolution:**
	 * 1. Checks execution customData cache (set by previous nodes)
	 * 2. Scans pipeline outputs for upstream traceIds
	 * 3. Generates new UUID if none found (first node)
	 * 4. Caches resolved/generated traceId in customData for downstream nodes
	 *
	 * **Context Extraction:**
	 * - nodeName: From functions.getNode().name
	 * - workflowId: From functions.getWorkflow().id
	 * - executionId: From functions.getExecutionId()
	 *
	 * Instance is frozen to prevent modification during execution.
	 *
	 * @param functions - n8n function context (IExecuteFunctions or ISupplyDataFunctions)
	 *
	 * @example
	 * ```typescript
	 * // In SupplierBase
	 * const tracer = new Tracer(functions);
	 * // → traceId resolved from customData or pipeline
	 * // → Context extracted: { nodeName: 'TranslationAgent', workflowId: '123', executionId: '456' }
	 * ```
	 */
	constructor(functions: IFunctions) {
		this.log = functions.logger;
		this.nodeName = functions.getNode().name;
		this.workflowId = functions.getWorkflow().id!;
		this.executionId = functions.getExecutionId();

		this.traceId = Tracer.getTraceId(functions, this.log);

		Object.freeze(this);
	}

	/**
	 * Logs debug message with enriched metadata.
	 *
	 * Debug logs are typically disabled in production but invaluable during development
	 * for understanding execution flow and diagnosing issues.
	 *
	 * @param message - Human-readable log message (use emoji prefixes for visual scanning: 🧭 🔮 🚚 🤖)
	 * @param extension - Optional additional metadata to merge with base context
	 *
	 * @example
	 * ```typescript
	 * tracer.debug('🚚 Starting supply attempt', { attempt: 1, requestId: 'abc-123' });
	 * // Logs: { message, traceId, nodeName, workflowId, executionId, attempt, requestId }
	 * ```
	 */
	debug(message: string, extension?: LogMetadata): void {
		this.log.debug(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs info message with enriched metadata.
	 *
	 * Info logs are enabled in production for tracking normal execution flow,
	 * successful operations, and important state changes.
	 *
	 * @param message - Human-readable log message
	 * @param extension - Optional additional metadata to merge with base context
	 *
	 * @example
	 * ```typescript
	 * tracer.info('🧪 Simulating translation error', { errorType: 'timeout' });
	 * // Logs: { message, traceId, nodeName, workflowId, executionId, errorType }
	 * ```
	 */
	info(message: string, extension?: LogMetadata): void {
		this.log.info(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs warning message with enriched metadata.
	 *
	 * Warnings indicate recoverable issues that don't prevent execution but may
	 * require attention (e.g., multiple traceIds found, retrying after failure).
	 *
	 * @param message - Human-readable warning message
	 * @param extension - Optional additional metadata to merge with base context
	 *
	 * @example
	 * ```typescript
	 * tracer.warn('🚚 Supply attempt failed, retrying', { attempt: 2, error: 'timeout' });
	 * // Logs: { message, traceId, nodeName, workflowId, executionId, attempt, error }
	 * ```
	 */
	warn(message: string, extension?: LogMetadata): void {
		this.log.warn(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs error message with enriched metadata.
	 *
	 * Error logs indicate failures that prevent successful execution. Always include
	 * diagnostic metadata to help with debugging (attempt number, error details, etc.).
	 *
	 * @param message - Human-readable error message
	 * @param extension - Optional additional metadata to merge with base context
	 *
	 * @example
	 * ```typescript
	 * tracer.error('🤖 Translation failed', { attempt: 3, error: error.message });
	 * // Logs: { message, traceId, nodeName, workflowId, executionId, attempt, error }
	 * ```
	 */
	error(message: string, extension?: LogMetadata): void {
		this.log.error(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs error and throws CoreError with enriched metadata.
	 *
	 * **Dual Purpose:**
	 * 1. Logs error with full context for debugging
	 * 2. Throws CoreError with same metadata for programmatic error handling
	 *
	 * **Used by SupplierBase/ContextFactory** to fail fast on unrecoverable errors
	 * while preserving full diagnostic context in both logs and error object.
	 *
	 * **Error Discrimination Pattern:**
	 * CoreError instances indicate expected/known failures. Catching code can check
	 * `instanceof CoreError` to distinguish from unexpected bugs (generic Error).
	 *
	 * @param message - Human-readable error message (use 🐞 [BUG] prefix for developer errors)
	 * @param extension - Optional additional metadata to merge with base context
	 * @throws CoreError with message and enriched metadata
	 * @returns never (TypeScript control flow: function always throws)
	 *
	 * @example
	 * ```typescript
	 * // In SupplierBase after all retries fail
	 * tracer.errorAndThrow('🚚 All supply attempts failed', {
	 *   maxAttempts: 5,
	 *   finalError: error.message
	 * });
	 * // → Logs error with full metadata
	 * // → Throws CoreError { message, metadata: { traceId, nodeName, ..., maxAttempts, finalError } }
	 *
	 * // In ContextFactory when validation fails
	 * tracer.errorAndThrow('🐞 [BUG] Invalid context configuration', {
	 *   context: 'ExecutionContext',
	 *   reason: 'maxAttempts out of range'
	 * });
	 * ```
	 *
	 * @see {@link CoreError} for error discrimination pattern
	 */
	errorAndThrow(message: string, extension?: LogMetadata): never {
		this.error(message, extension);
		throw new CoreError(message, this.getLogMetadata(extension));
	}

	/**
	 * Merges base workflow context with optional extension metadata.
	 *
	 * **Always includes:**
	 * - traceId: For request correlation
	 * - nodeName: For identifying log source
	 * - workflowId: For workflow-level correlation
	 * - executionId: For execution-level correlation
	 *
	 * Extension metadata merged via spread to add domain-specific context
	 * (attempt numbers, request IDs, latency, error details, etc.).
	 *
	 * @param extension - Optional additional metadata to merge
	 * @returns Complete metadata object for logging
	 */
	private getLogMetadata(extension?: LogMetadata): LogMetadata {
		return {
			traceId: this.traceId,
			nodeName: this.nodeName,
			workflowId: this.workflowId,
			executionId: this.executionId,
			...(extension ?? {}),
		};
	}

	/**
	 * Resolves or generates traceId for distributed tracing across workflow nodes.
	 *
	 * **Resolution Strategy (priority order):**
	 * 1. **customData cache** - Check execution customData Map (O(1), already set by previous nodes)
	 * 2. **Pipeline scan** - Extract from upstream node outputs json.traceId (O(n), propagation)
	 * 3. **Generate UUID** - Create new traceId if none found (first node in workflow)
	 * 4. **Cache result** - Store in customData for downstream nodes (avoids re-scanning)
	 *
	 * **Edge Cases Handled:**
	 * - No upstream nodes: Generates new UUID (first node)
	 * - Single upstream traceId: Uses it (common path)
	 * - Multiple traceIds: Uses first, logs warning (split/merge scenario)
	 * - customData unavailable: Falls back to pipeline scan + skips caching
	 *
	 * **Assumptions:**
	 * - Upstream Intento nodes store traceId in output json.traceId field
	 * - customData is a Map<string, unknown> when available
	 * - n8n runtime provides $execution.customData in workflow proxy
	 *
	 * @param functions - n8n function context for workflow/execution access
	 * @param log - Logger for debug output during resolution
	 * @returns Resolved or newly generated traceId (always returns valid UUID string)
	 *
	 * @example
	 * ```typescript
	 * // First node in workflow (no upstream)
	 * const traceId = Tracer.getTraceId(functions, log);
	 * // → Generates new UUID: 'abc-123-...'
	 * // → Caches in customData
	 *
	 * // Second node (downstream from first)
	 * const traceId = Tracer.getTraceId(functions, log);
	 * // → Finds in customData: 'abc-123-...' (O(1) lookup)
	 *
	 * // Merge node (multiple upstream paths)
	 * const traceId = Tracer.getTraceId(functions, log);
	 * // → Finds ['abc-123', 'def-456'] in pipeline
	 * // → Uses first: 'abc-123'
	 * // → Logs warning about multiple traceIds
	 * ```
	 */
	private static getTraceId(functions: IFunctions, log: Logger): string {
		const logMeta = {
			nodeName: functions.getNode().name,
			workflowId: functions.getWorkflow().id!,
			executionId: functions.getExecutionId(),
		};
		log.debug('🧭 Getting traceId ...', logMeta);

		log.debug('🧭 Checking custom data for traceId ...', logMeta);
		// PERFORMANCE: Check custom data first (fastest, O(1) Map lookup)
		let traceId = this.getCustomData(functions);
		if (traceId) {
			log.debug(`🧭 Found traceId in custom data: ${traceId}`, logMeta);
			return traceId;
		}

		log.debug('🧭 Extracting traceIds from pipeline ...', logMeta);
		const uniqueIds: string[] = this.getFromPipeline(functions);

		switch (uniqueIds.length) {
			case 0: {
				// EDGE CASE: First node in workflow or no upstream nodes passed traceId
				traceId = crypto.randomUUID();
				log.debug(`🧭 No traceId found in pipeline. Generated new traceId: ${traceId}`);
				break;
			}
			case 1:
				// Common path: Single upstream traceId
				traceId = uniqueIds[0];
				log.debug(`🧭 Found single traceId in pipeline: ${traceId}`);
				break;
			default: {
				// EDGE CASE: Multiple upstream nodes with different traceIds (split/merge scenario)
				// Using first ID maintains consistency, but log warning for visibility
				traceId = uniqueIds[0];
				const meta = { traceIds: uniqueIds, ...logMeta };
				log.warn(`🧭 Multiple traceIds found in pipeline. Using the first one: ${traceId}`, meta);
				break;
			}
		}

		log.debug('🧭 Remembering traceId in custom data...', logMeta);
		// Cache for downstream nodes to avoid pipeline re-scanning
		this.rememberTraceId(functions, traceId);
		return traceId;
	}

	/**
	 * Extracts traceIds from pipeline outputs of upstream nodes.
	 *
	 * Scans all upstream node outputs for json.traceId field. Returns deduplicated
	 * array of found traceIds (handles merge scenarios where multiple paths have
	 * same traceId).
	 *
	 * **Assumptions:**
	 * - Pipeline structure: Record<nodeName, Array<{json: Record}>>
	 * - Upstream Intento nodes store traceId in json.traceId field
	 * - TraceId is always a string when present
	 *
	 * @param functions - n8n function context for pipeline access
	 * @returns Deduplicated array of traceIds found in pipeline (empty if none)
	 */
	private static getFromPipeline(functions: IFunctions): string[] {
		const pipeline = Pipeline.readPipeline(functions);
		const traceIds: string[] = [];

		for (const [, values] of Object.entries(pipeline)) {
			// Type assertion justified: n8n runtime guarantees pipeline structure
			// Each node output is array of items with json property
			for (const body of values as Array<Record<string, Record<string, unknown>>>) {
				// ASSUMPTION: traceId stored in json.traceId by upstream Intento nodes
				if (body.json?.traceId && typeof body.json.traceId === 'string') {
					traceIds.push(body.json.traceId);
				}
			}
		}

		// Deduplicate IDs using Set (handles merge nodes with same upstream traceId)
		return Array.from(new Set(traceIds));
	}

	/**
	 * Retrieves traceId from execution customData cache.
	 *
	 * CustomData is a Map stored on $execution object by n8n runtime. Provides
	 * fast O(1) lookup for values cached by previous nodes in same execution.
	 *
	 * @param functions - n8n function context for customData access
	 * @returns TraceId string if found and valid, undefined otherwise
	 */
	private static getCustomData(functions: IFunctions): string | undefined {
		const data = functions.getWorkflowDataProxy(0);
		// Type assertion justified: n8n runtime provides $execution object
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// EDGE CASE: customData might not exist in some execution contexts
		if (!customData || typeof customData.get !== 'function') return undefined;

		const traceId = customData.get('traceId');
		return typeof traceId === 'string' ? traceId : undefined;
	}

	/**
	 * Caches traceId in execution customData for downstream nodes.
	 *
	 * Storing in customData avoids expensive pipeline re-scanning by subsequent
	 * nodes in the same execution. Provides O(1) lookup instead of O(n) scan.
	 *
	 * Silently returns if customData unavailable (some execution contexts don't
	 * provide it). TraceId propagation still works via pipeline in these cases.
	 *
	 * @param functions - n8n function context for customData access
	 * @param traceId - TraceId to cache for downstream nodes
	 */
	private static rememberTraceId(functions: IFunctions, traceId: string): void {
		const data = functions.getWorkflowDataProxy(0);
		// Type assertion justified: n8n runtime provides $execution object
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// EDGE CASE: customData might not exist in some execution contexts
		if (!customData || typeof customData.set !== 'function') return undefined;

		// Cache traceId for faster access by downstream nodes (avoids pipeline re-scan)
		customData.set('traceId', traceId);
	}
}
