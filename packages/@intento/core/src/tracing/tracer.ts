import type { INode, Logger, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IFunctions } from 'types/*';
import { Pipeline } from 'utils/*';

/**
 * Provides structured logging with distributed tracing support for n8n workflow nodes.
 *
 * Automatically extracts or generates a traceId that persists across pipeline execution,
 * enabling request correlation across multiple nodes. All log methods include execution
 * context (traceId, nodeId, workflowId, executionId) for observability.
 */
export class Tracer {
	readonly node: INode;
	readonly log: Logger;
	readonly traceId: string;
	readonly workflowId: string;
	readonly executionId: string;

	/**
	 * Creates a tracer instance with automatic traceId resolution.
	 *
	 * TraceId resolution strategy:
	 * 1. Check execution customData for existing traceId
	 * 2. Extract from pipeline data (all upstream nodes)
	 * 3. Generate new UUID if not found
	 *
	 * The resolved traceId is stored in customData for downstream nodes.
	 *
	 * @param functions - n8n execution context providing workflow, node, and execution metadata
	 */
	constructor(functions: IFunctions) {
		this.log = functions.logger;
		this.node = functions.getNode();
		this.workflowId = functions.getWorkflow().id!;
		this.executionId = functions.getExecutionId();
		this.traceId = Tracer.getTraceId(functions, this.log);
		Object.freeze(this);
	}

	/**
	 * Logs debug-level message with execution context metadata.
	 *
	 * @param message - Log message
	 * @param extension - Optional additional metadata to merge with execution context
	 */
	debug(message: string, extension?: LogMetadata): void {
		this.log.debug(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs info-level message with execution context metadata.
	 *
	 * @param message - Log message
	 * @param extension - Optional additional metadata to merge with execution context
	 */
	info(message: string, extension?: LogMetadata): void {
		this.log.info(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs warning-level message with execution context metadata.
	 *
	 * @param message - Log message
	 * @param extension - Optional additional metadata to merge with execution context
	 */
	warn(message: string, extension?: LogMetadata): void {
		this.log.warn(message, this.getLogMetadata(extension));
	}

	/**
	 * Logs error-level message with execution context metadata.
	 *
	 * @param message - Log message
	 * @param extension - Optional additional metadata to merge with execution context
	 */
	error(message: string, extension?: LogMetadata): void {
		this.log.error(message, this.getLogMetadata(extension));
	}

	/**
	 * Reports a developer bug and throws NodeOperationError to halt execution.
	 *
	 * Use this for bugs that should be caught during development (decorator misuse,
	 * invalid configuration, incorrect API usage), not for runtime errors like network
	 * failures or invalid user input.
	 *
	 * All error messages are prefixed with 🐞 [BUG] for easy identification in logs.
	 *
	 * @param where - Location identifier (function/method name) for debugging
	 * @param error - Error object or message describing the bug
	 * @param extension - Optional additional metadata to merge with execution context
	 * @throws NodeOperationError always - execution cannot continue after bug detection
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
	 * Resolves or generates a traceId for distributed tracing.
	 *
	 * Resolution order:
	 * 1. Check customData for existing traceId (fast path for chained nodes)
	 * 2. Extract from pipeline input data (for first node after external trigger)
	 * 3. Generate new UUID (for workflow start)
	 *
	 * @param functions - n8n execution context
	 * @param log - Logger instance for tracing the resolution process
	 * @returns Resolved or generated traceId
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

		// NOTE: Multiple traceIds indicate parallel branches or joins - we use the first one to maintain a single trace
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

		// NOTE: Store traceId in customData so downstream nodes can retrieve it without re-scanning pipeline
		log.debug('🧭 [Tracer] Remembering traceId in custom data...', logMeta);
		this.rememberTraceId(functions, traceId);
		return traceId;
	}

	/**
	 * Extracts unique traceIds from all pipeline input data.
	 *
	 * Scans all input items across all pipeline branches, looking for `json.traceId` fields.
	 * Returns deduplicated array of found traceIds.
	 *
	 * @param functions - n8n execution context
	 * @returns Array of unique traceIds found in pipeline data
	 */
	private static getFromPipeline(functions: IFunctions): string[] {
		const pipeline = Pipeline.readPipeline(functions);
		const traceIds: string[] = [];

		// NOTE: Pipeline structure is { [nodeName]: [items] }, we scan all items from all upstream nodes
		for (const [, values] of Object.entries(pipeline)) {
			for (const body of values as Array<Record<string, Record<string, unknown>>>) {
				if (body.json?.traceId && typeof body.json.traceId === 'string') {
					traceIds.push(body.json.traceId);
				}
			}
		}

		return Array.from(new Set(traceIds));
	}

	/**
	 * Retrieves traceId from execution customData if present.
	 *
	 * CustomData is a Map-like object that persists across node executions within a single workflow run.
	 *
	 * @param functions - n8n execution context
	 * @returns TraceId string if found and valid, undefined otherwise
	 */
	private static getCustomData(functions: IFunctions): string | undefined {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: customData may not be available in all execution contexts (e.g., test environments)
		if (!customData || typeof customData.get !== 'function') return undefined;

		const traceId = customData.get('traceId');
		return typeof traceId === 'string' ? traceId : undefined;
	}

	/**
	 * Stores traceId in execution customData for downstream node access.
	 *
	 * Fails silently if customData is unavailable (e.g., in test environments).
	 *
	 * @param functions - n8n execution context
	 * @param traceId - TraceId to store
	 */
	private static rememberTraceId(functions: IFunctions, traceId: string): void {
		const data = functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: customData may not be available in all execution contexts (e.g., test environments)
		if (!customData || typeof customData.set !== 'function') return;

		customData.set('traceId', traceId);
	}
}
