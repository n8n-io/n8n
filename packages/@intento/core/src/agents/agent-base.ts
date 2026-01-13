import { type INodeExecutionData, type IExecuteFunctions, type IntentoConnectionType, NodeOperationError } from 'n8n-workflow';

import { AgentError } from 'agents/agent-error';
import type { AgentRequestBase } from 'agents/agent-request-base';
import { AgentResponseBase } from 'agents/agent-response-base';
import { Tracer } from 'tracing/*';
import type { IDescriptor } from 'types/*';

/**
 * Abstract base class for multi-step agent execution with error handling and tracing.
 *
 * Agents orchestrate multiple suppliers to complete complex workflows (e.g., segmentation + translation).
 * Subclasses implement execute() for business logic while base handles validation, errors, and n8n output.
 *
 * Error recovery: Converts all errors to AgentError with HTTP status codes (408 timeout, 499 abort, 500 unexpected).
 * Output format: Success returns AgentResponseBase as JSON, errors return via constructExecutionMetaData.
 *
 * @template TI - Request type extending AgentRequestBase with validation support
 * @template TS - Response type extending AgentResponseBase with latency tracking
 */
export abstract class AgentBase<TI extends AgentRequestBase, TS extends AgentResponseBase> {
	private _initialize: Promise<void> | null = null;
	protected descriptor: IDescriptor;
	protected tracer: Tracer;
	protected functions: IExecuteFunctions;

	/**
	 * Initializes agent with n8n context and creates dedicated tracer for observability.
	 *
	 * Called by subclass constructors to establish execution context.
	 * Tracer uses descriptor name for log prefixing (e.g., "[TranslationAgent]").
	 *
	 * @param descriptor - Agent metadata with name and version for tracing
	 * @param functions - n8n execution context for node parameters and connections
	 */
	protected constructor(descriptor: IDescriptor, functions: IExecuteFunctions) {
		this.descriptor = descriptor;
		this.functions = functions;
		this.tracer = new Tracer(descriptor, functions);
	}

	private async initializeOnce(signal: AbortSignal): Promise<void> {
		signal.throwIfAborted();
		this.tracer.debug('Initializing agent...');
		this._initialize ??= this.initialize(signal);
		await this._initialize;
		this.tracer.debug('Agent initialized.');
	}

	/**
	 * Initializes agent-specific resources before first execution.
	 *
	 * Called exactly once before first execute() via lazy initialization in initializeOnce().
	 * Use for expensive setup: loading suppliers, establishing connections, warming caches.
	 *
	 * IMPORTANT: Must be idempotent and thread-safe if called multiple times concurrently.
	 * Base class ensures single initialization even with concurrent run() calls.
	 *
	 * @param signal - Abort signal for cancellation (check before expensive operations)
	 * @throws {Error} When initialization fails (connection errors, missing suppliers, etc.)
	 */
	protected abstract initialize(signal: AbortSignal): Promise<void>;

	/**
	 * Executes agent workflow with comprehensive error handling and n8n output formatting.
	 *
	 * Execution flow:
	 * 1. Validate request and check abort signal
	 * 2. Execute subclass business logic (segmentation, translation, etc.)
	 * 3. Validate response before output
	 * 4. Convert errors to AgentError with HTTP status codes
	 * 5. Format output for n8n workflow execution
	 *
	 * Error recovery: All exceptions converted to AgentError (408 timeout, 499 abort, 500 unexpected).
	 * Output format: Success returns single-item array with response JSON, errors use constructExecutionMetaData.
	 *
	 * @param request - Validated agent request with unique ID for tracing
	 * @param signal - Abort signal for cancellation (checked before execution and during subclass logic)
	 * @returns n8n execution data with response JSON or error metadata
	 */
	async run(request: TI, signal: AbortSignal): Promise<INodeExecutionData[][]> {
		let response: TS | AgentError;

		this.traceStart(request);
		try {
			await this.initializeOnce(signal);

			// NOTE: Check abort before validation to fail fast on cancelled operations
			signal.throwIfAborted();

			request.throwIfInvalid();
			response = await this.execute(request, signal);

			// NOTE: Check abort again before response validation to catch cancellation during execute()
			signal.throwIfAborted();
			response.throwIfInvalid();
		} catch (error) {
			response = this.onError(request, error as Error);
		}
		this.traceCompletion(response);

		if (response instanceof AgentResponseBase) return [[{ json: response.asDataObject() }]];

		if (this.functions.continueOnFail()) {
			const error = { json: { error: response.asDataObject() } };
			const errorOutput = this.functions.helpers.constructExecutionMetaData([error], { itemData: { item: 0 } });
			return [errorOutput];
		}

		throw new NodeOperationError(this.functions.getNode(), response.reason);
	}

	/**
	 * Executes agent-specific business logic (segmentation, translation, orchestration).
	 *
	 * Subclasses implement multi-step workflows:
	 * - TranslationAgent: split text → translate segments → merge results
	 * - Custom agents: compose suppliers for specific business requirements
	 *
	 * Must check signal.throwIfAborted() between async operations for cancellation support.
	 * Return AgentError instead of throwing for recoverable failures (supplier errors, validation issues).
	 *
	 * @param request - Validated agent request with business-specific parameters
	 * @param signal - Abort signal for cancellation between async operations
	 * @returns Agent response with results or AgentError for recoverable failures
	 */
	protected abstract execute(request: TI, signal: AbortSignal): Promise<TS | AgentError>;

	/**
	 * Converts execution errors to AgentError with HTTP status codes and logging.
	 *
	 * Error categorization:
	 * - TimeoutError (408): Signal timeout expired, suggest increasing timeout limit
	 * - AbortError (499): User/system cancelled execution
	 * - Other errors (500): Unexpected failures logged with full error details
	 *
	 * All errors logged via tracer for observability (warn for timeout/abort, error for unexpected).
	 *
	 * @param request - Original request for correlation ID and latency calculation
	 * @param error - Caught error from validation, execute(), or response validation
	 * @returns AgentError with appropriate HTTP status code and descriptive reason
	 */
	protected onError(request: TI, error: Error): AgentError {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = '⏰ Execution timed out. Consider increasing the timeout limit.';
			const result = new AgentError(request, 408, reason);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = '❌Execution was aborted.';
			const result = new AgentError(request, 499, reason);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		const reason = `⚠️ Configuration error. Please check the node configuration and try again. Details: ${error.message}`;
		const result = new AgentError(request, 500, reason);
		const meta = { ...result.asLogMetadata(), details: error };
		this.tracer.error(reason, meta);
		return result;
	}

	/**
	 * Logs agent execution start with request metadata for distributed tracing.
	 *
	 * @param request - Agent request with correlation ID and timestamp
	 */
	private traceStart(request: TI): void {
		this.tracer.debug('Executing agent...', request.asLogMetadata());
	}

	/**
	 * Logs agent execution completion with response metadata or error details.
	 *
	 * Log level: error for AgentError (with status code), info for successful responses.
	 *
	 * @param response - Agent response or error with latency and correlation ID
	 */
	private traceCompletion(response: TS | AgentError): void {
		if (response instanceof AgentError) {
			this.tracer.error('Agent execution failed', response.asLogMetadata());
			return;
		}
		this.tracer.info('Agent execution succeeded', response.asLogMetadata());
	}

	/**
	 * Retrieves supplier instances from n8n input connections with priority ordering.
	 *
	 * Supports single supplier or array of suppliers from n8n node connections.
	 * Priority ordering: n8n stores connections RTL, reversed to LTR (leftmost = highest priority).
	 *
	 * Empty result: Returns [] with warning if connection type not configured in workflow.
	 * This is valid - agent may use optional suppliers or fallback to defaults.
	 *
	 * @template T - Supplier type (e.g., TranslationSupplierBase, SegmentsSupplierBase)
	 * @param connectionType - n8n connection type identifier for supplier category
	 * @param signal - Abort signal checked before retrieving connections
	 * @returns Supplier array ordered by priority (leftmost first), or empty array if unconfigured
	 */
	async getSuppliers<T>(connectionType: IntentoConnectionType, signal: AbortSignal): Promise<T[]> {
		signal.throwIfAborted();

		this.tracer.debug(`Getting '${connectionType}' suppliers ...`);
		// NOTE: Index 0 retrieves data from first input item - agents typically process single item per execution
		const data = await this.functions.getInputConnectionData(connectionType, 0);

		if (Array.isArray(data)) {
			this.tracer.debug(`Retrieved ${data.length} suppliers for connection type '${connectionType}'`);
			// NOTE: n8n stores connections RTL, reverse to LTR so leftmost connection = highest priority
			return data.map((item) => item as T).reverse();
		}

		if (data) {
			this.tracer.debug(`Retrieved 1 supplier for connection type '${connectionType}'`);
			return [data as T];
		}

		this.tracer.warn(`No suppliers found for connection type '${connectionType}'`);
		return [];
	}
}
