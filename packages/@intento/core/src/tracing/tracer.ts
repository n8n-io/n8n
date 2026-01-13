import type { INode, Logger, LogMetadata } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { IDescriptor, IFunctions } from 'types/*';
import { Pipeline } from 'utils/*';

/**
 * Distributed tracing and logging utility for n8n workflow execution.
 *
 * Provides structured logging with consistent metadata (traceId, workflowId, executionId)
 * across agent and supplier operations. Manages traceId lifecycle: extracts from pipeline,
 * generates when missing, and persists in workflow custom data for correlation.
 *
 * Frozen after construction to prevent accidental modification during execution.
 */
export class Tracer {
	private readonly functions: IFunctions;
	private readonly log: Logger;

	readonly symbol: string;
	readonly node: INode;
	readonly traceId: string;
	readonly workflowId: string;
	readonly executionId: string;

	/**
	 * Initializes tracer with workflow context and resolves traceId.
	 *
	 * Extracts traceId from: 1) custom data (if exists), 2) pipeline outputs, 3) generates new UUID.
	 * Stores resolved traceId in workflow custom data for downstream nodes.
	 * All properties frozen after construction to ensure immutability during execution.
	 *
	 * @param descriptor - Agent/supplier metadata for log symbol identification
	 * @param functions - n8n execution context providing logger, workflow, and execution metadata
	 */
	constructor(descriptor: IDescriptor, functions: IFunctions) {
		this.log = functions.logger;
		this.functions = functions;

		this.symbol = descriptor.symbol;
		this.node = functions.getNode();
		// NOTE: Non-null assertion safe - workflow ID always present during node execution
		this.workflowId = functions.getWorkflow().id!;
		this.executionId = functions.getExecutionId();
		this.traceId = this.getTraceId();

		// NOTE: Freeze prevents accidental mutation during execution
		Object.freeze(this);
	}

	/**
	 * Logs debug message with workflow execution metadata.
	 *
	 * @param message - Debug message to log
	 * @param extension - Optional additional metadata to merge with base context
	 */
	debug(message: string, extension?: LogMetadata): void {
		this.log.debug(`${this.symbol} ${message}`, this.getLogMetadata(extension));
	}

	/**
	 * Logs info message with workflow execution metadata.
	 *
	 * @param message - Info message to log
	 * @param extension - Optional additional metadata to merge with base context
	 */
	info(message: string, extension?: LogMetadata): void {
		this.log.info(`${this.symbol} ${message}`, this.getLogMetadata(extension));
	}

	/**
	 * Logs warning message with workflow execution metadata.
	 *
	 * @param message - Warning message to log
	 * @param extension - Optional additional metadata to merge with base context
	 */
	warn(message: string, extension?: LogMetadata): void {
		this.log.warn(`${this.symbol} ${message}`, this.getLogMetadata(extension));
	}

	/**
	 * Logs error message with workflow execution metadata.
	 *
	 * @param message - Error message to log
	 * @param extension - Optional additional metadata to merge with base context
	 */
	error(message: string, extension?: LogMetadata): void {
		this.log.error(`${this.symbol} ${message}`, this.getLogMetadata(extension));
	}

	/**
	 * Logs bug detection and throws NodeOperationError to halt execution.
	 *
	 * Used for developer errors that indicate incorrect code logic, not runtime failures.
	 * Logs error with full context before throwing to ensure bug is captured in logs.
	 *
	 * @param where - Class or method name where bug detected (for debugging)
	 * @param error - Bug description (what went wrong)
	 * @param extension - Optional additional metadata for bug context
	 * @throws NodeOperationError Always throws to halt workflow execution
	 */
	bugDetected(where: string, error: string, extension?: LogMetadata): never {
		const message = `Bug detected at '${where}': ${error}`;
		this.error(message, extension);
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
	 * Resolves traceId for workflow execution using 3-tier strategy.
	 *
	 * Resolution order: 1) custom data (cached from earlier nodes), 2) pipeline outputs,
	 * 3) generate new UUID. Caches resolved/generated traceId in custom data for reuse.
	 *
	 * @returns Resolved or newly generated traceId for this execution
	 */
	private getTraceId(): string {
		this.debug('Getting traceId ...');

		// NOTE: Check custom data first - fastest path for subsequent nodes
		let traceId = this.getCustomData();
		if (traceId) {
			this.info(`Found traceId in custom data: ${traceId}`);
			return traceId;
		}

		this.debug('Extracting traceIds from pipeline ...');
		const uniqueIds: string[] = this.getFromPipeline();

		// NOTE: Switch handles 3 cases: none (generate), one (use), multiple (use first + warn)
		switch (uniqueIds.length) {
			case 0: {
				traceId = crypto.randomUUID();
				this.warn(`No traceId found in pipeline. Generated new traceId: ${traceId}`);
				break;
			}
			case 1:
				traceId = uniqueIds[0];
				this.info(`Found single traceId in pipeline: ${traceId}`);
				break;
			default: {
				// NOTE: Use first traceId when multiple found - likely split/merge scenario
				traceId = uniqueIds[0];
				this.warn(`Multiple traceIds found in pipeline. Using the first one: ${traceId}`, { traceIds: uniqueIds });
				break;
			}
		}

		this.debug('Remembering traceId in custom data...', { traceId });
		this.rememberTraceId(traceId);
		return traceId;
	}

	/**
	 * Extracts unique traceIds from all upstream node outputs in pipeline.
	 *
	 * Scans pipeline for json.traceId fields, returns deduplicated array.
	 * Empty array indicates no upstream nodes set traceId (first node scenario).
	 *
	 * @returns Array of unique traceIds found in pipeline (empty if none)
	 */
	private getFromPipeline(): string[] {
		const pipeline = Pipeline.readPipeline(this.functions);
		const traceIds: string[] = [];

		// NOTE: Iterate all nodes in pipeline, checking each output item for traceId
		for (const [, values] of Object.entries(pipeline)) {
			for (const body of values as Array<Record<string, Record<string, unknown>>>) {
				// NOTE: Type guard ensures traceId is string before adding to array
				if (body.json?.traceId && typeof body.json.traceId === 'string') {
					traceIds.push(body.json.traceId);
				}
			}
		}

		// NOTE: Deduplicate traceIds - multiple nodes may output same traceId
		return Array.from(new Set(traceIds));
	}

	/**
	 * Retrieves traceId from workflow execution custom data cache.
	 *
	 * Custom data persists across all nodes in execution, enabling traceId reuse.
	 * Returns undefined if custom data unavailable or traceId not cached.
	 *
	 * @returns Cached traceId or undefined if not found
	 */
	private getCustomData(): string | undefined {
		const data = this.functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: Defensive check - customData may not be initialized or may be wrong type
		if (!customData || typeof customData.get !== 'function') return undefined;

		const traceId = customData.get('traceId');
		// NOTE: Type guard ensures traceId is string - could be set to any type
		return typeof traceId === 'string' ? traceId : undefined;
	}

	/**
	 * Stores traceId in workflow execution custom data for downstream nodes.
	 *
	 * Enables traceId reuse across all nodes in execution without passing through pipeline.
	 * Silently fails if custom data unavailable (non-critical operation).
	 *
	 * @param traceId - TraceId to cache for downstream nodes
	 */
	private rememberTraceId(traceId: string): void {
		const data = this.functions.getWorkflowDataProxy(0);
		const execution = data.$execution as Record<string, unknown>;
		const customData = execution.customData as Map<string, unknown> | undefined;

		// NOTE: Silently return if custom data unavailable - non-critical cache operation
		if (!customData || typeof customData.set !== 'function') return;

		customData.set('traceId', traceId);
	}
}
