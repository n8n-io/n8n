import type { INode, Logger, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IFunctions } from 'types/*';
import { Pipeline } from 'utils/*';

/**
 * Distributed tracing utility for correlating logs across n8n workflow execution.
 *
 * Generates or extracts a unique traceId that persists throughout workflow execution,
 * enabling correlation of logs across multiple nodes and workflow boundaries. TraceId
 * propagates through execution pipeline and workflow custom data.
 *
 * **TraceId lifecycle:**
 * 1. Check workflow customData for existing traceId (persists across node executions)
 * 2. If not found, extract from upstream node outputs in pipeline
 * 3. If not found, generate new UUID and store in customData
 * 4. All log methods automatically enrich with traceId metadata
 *
 * **Thread-safety:** Frozen after construction to prevent concurrent modification
 *
 * @example
 * ```typescript
 * const tracer = new Tracer(this);
 * tracer.info('Processing request', { userId: '123' });
 * // → Logs with automatic metadata: { traceId, nodeName, workflowId, executionId, userId }
 * ```
 */
export class Tracer {
	private readonly node: INode;

	readonly log: Logger;

	readonly traceId: string;

	readonly workflowId: string;

	readonly executionId: string;

	/**
	 * Creates immutable tracer instance with traceId resolved from workflow context.
	 *
	 * Extracts node, workflow, and execution metadata from n8n functions, then resolves
	 * traceId via three-tier strategy: customData → pipeline → generate new.
	 *
	 * @param functions - n8n functions providing access to workflow context and logger
	 */
	constructor(functions: IFunctions) {
		this.log = functions.logger;
		this.node = functions.getNode();
		// NOTE: Non-null assertion justified - workflow must be saved before execution starts
		// Unsaved workflows cannot be executed in production, only in editor preview mode
		this.workflowId = functions.getWorkflow().id!;
		this.executionId = functions.getExecutionId();

		this.traceId = Tracer.getTraceId(functions, this.log);

		Object.freeze(this);
	}

	/**
	 * Logs debug message with automatic traceId, node, workflow, and execution metadata.
	 *
	 * @param message - Human-readable log message
	 * @param extension - Optional additional metadata to include in log entry
	 */
	debug(message: string, extension?: LogMetadata): void {
		this.log.debug(message, this.getLogMetadata(extension));
	}

	/** Logs info message with automatic metadata enrichment. */
	info(message: string, extension?: LogMetadata): void {
		this.log.info(message, this.getLogMetadata(extension));
	}

	/** Logs warning message with automatic metadata enrichment. */
	warn(message: string, extension?: LogMetadata): void {
		this.log.warn(message, this.getLogMetadata(extension));
	}

	/** Logs error message with automatic metadata enrichment. */
	error(message: string, extension?: LogMetadata): void {
		this.log.error(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs developer error and throws NodeOperationError to halt workflow execution.
	 *
	 * Use exclusively for bugs in implementation code (decorator usage, configuration errors,
	 * invalid state) that should be caught during development. Do NOT use for runtime
	 * validation failures or user input errors - those should use specific error types.
	 *
	 * **Error severity:** 🐞 [BUG] prefix indicates developer error requiring code fix
	 *
	 * @param where - Location identifier (class/method name) for debugging
	 * @param error - Error object or message describing the bug
	 * @param extension - Optional context data to help diagnose root cause
	 * @throws NodeOperationError always (terminates workflow execution)
	 */
	bugDetected(where: string, error: Error | string, extension?: LogMetadata): never {
		const message = `🐞 [BUG] at '${where}'. Node ${this.node.name} thrown error: ${typeof error === 'string' ? error : error.message}`;
		const meta = {
			where,
			...(typeof error === 'string' ? { message: error } : { error }),
			...(extension ?? {}),
		};
		this.log.error(message, meta);
		throw new NodeOperationError(this.node, message);
	}

	/**
	 * Merges standard trace metadata with caller-provided extension data.
	 *
	 * Standard metadata includes traceId, node name, workflow ID, and execution ID.
	 * Extension data takes precedence in case of key conflicts (allows override).
	 *
	 * @param extension - Optional additional metadata to merge with standard fields
	 * @returns Combined metadata object for structured logging
	 */
	private getLogMetadata(extension?: LogMetadata): LogMetadata {
		return {
			traceId: this.traceId,
			nodeName: this.node.name,
			workflowId: this.workflowId,
			executionId: this.executionId,
			...(extension ?? {}),
		};
	}

	/**
	 * Resolves or generates traceId using three-tier strategy for distributed tracing.
	 *
	 * **Resolution order:**
	 * 1. **CustomData** - Check workflow execution customData (persists across nodes)
	 * 2. **Pipeline** - Extract from upstream node outputs (workflow chain propagation)
	 * 3. **Generate** - Create new UUID if no existing traceId found
	 *
	 * After resolution, stores traceId in customData for downstream node access.
	 * Multiple traceIds in pipeline trigger warning and use first found.
	 *
	 * @param functions - n8n functions for accessing workflow context
	 * @param log - Logger for debug messages during resolution
	 * @returns TraceId string (either existing or newly generated UUID)
	 */
	private static getTraceId(functions: IFunctions, log: Logger): string {
		const logMeta = {
			nodeName: functions.getNode().name,
			workflowId: functions.getWorkflow().id!,
			executionId: functions.getExecutionId(),
		};
		log.debug('🧭 [Tracer] Getting traceId ...', logMeta);

		log.debug('🧭 [Tracer] Checking custom data for traceId ...', logMeta);
		let traceId = this.getCustomData(functions);
		if (traceId) {
			log.debug(`🧭 [Tracer] Found traceId in custom data: ${traceId}`, logMeta);
			return traceId;
		}

		log.debug('🧭 [Tracer] Extracting traceIds from pipeline ...', logMeta);
		const uniqueIds: string[] = this.getFromPipeline(functions);

		switch (uniqueIds.length) {
			case 0: {
				traceId = crypto.randomUUID();
				log.debug(`🧭 [Tracer] No traceId found in pipeline. Generated new traceId: ${traceId}`, logMeta);
				break;
			}
			case 1:
				traceId = uniqueIds[0];
				log.debug(`🧭 [Tracer] Found single traceId in pipeline: ${traceId}`, logMeta);
				break;
			default: {
				traceId = uniqueIds[0];
				const meta = { traceIds: uniqueIds, ...logMeta };
				log.warn(`🧭 [Tracer] Multiple traceIds found in pipeline. Using the first one: ${traceId}`, meta);
				break;
			}
		}

		log.debug('🧭 [Tracer] Remembering traceId in custom data...', logMeta);
		this.rememberTraceId(functions, traceId);
		return traceId;
	}

	/**
	 * Extracts unique traceIds from all upstream node outputs in execution pipeline.
	 *
	 * Scans each node's output data for `json.traceId` fields and deduplicates via Set.
	 * Returns empty array if no traceIds found or pipeline is empty.
	 *
	 * @param functions - n8n functions for accessing execution pipeline
	 * @returns Array of unique traceId strings found in pipeline (may be empty)
	 */
	private static getFromPipeline(functions: IFunctions): string[] {
		const pipeline = Pipeline.readPipeline(functions);
		const traceIds: string[] = [];

		for (const [, values] of Object.entries(pipeline)) {
			// NOTE: Type cast justified - Pipeline.readPipeline returns INodeExecutionData[]
			// which has structure { json: Record<string, unknown>, ... }
			for (const body of values as Array<Record<string, Record<string, unknown>>>) {
				if (body.json?.traceId && typeof body.json.traceId === 'string') {
					traceIds.push(body.json.traceId);
				}
			}
		}

		return Array.from(new Set(traceIds));
	}

	/**
	 * Retrieves traceId from workflow execution customData if it exists.
	 *
	 * CustomData persists across all nodes in a workflow execution, providing
	 * shared state for cross-node coordination. Returns undefined if customData
	 * is unavailable or traceId is not stored.
	 *
	 * @param functions - n8n functions for accessing workflow data proxy
	 * @returns Stored traceId string, or undefined if not found
	 */
	private static getCustomData(functions: IFunctions): string | undefined {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: CustomData is a Map-like object with .get()/.set() methods
		// Defensive check ensures method exists before calling (handles missing customData)
		if (!customData || typeof customData.get !== 'function') return undefined;

		const traceId = customData.get('traceId');
		return typeof traceId === 'string' ? traceId : undefined;
	}

	/**
	 * Stores traceId in workflow execution customData for downstream node access.
	 *
	 * Enables traceId propagation across all nodes in workflow execution by persisting
	 * in shared customData storage. Silently ignores if customData unavailable (e.g.,
	 * in test environments or editor preview mode).
	 *
	 * @param functions - n8n functions for accessing workflow data proxy
	 * @param traceId - TraceId string to store for future node access
	 */
	private static rememberTraceId(functions: IFunctions, traceId: string): void {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: Silent failure is intentional - customData may be unavailable in test/preview modes
		// TraceId still functions via pipeline propagation, customData is optimization
		if (!customData || typeof customData.set !== 'function') return;

		customData.set('traceId', traceId);
	}
}
