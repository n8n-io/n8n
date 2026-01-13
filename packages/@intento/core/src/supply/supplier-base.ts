import { type IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import { SupplyError } from 'supply/supply-error';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import type { IDescriptor, IFunctions } from 'types/*';
import { Delay } from 'utils/*';

/**
 * Abstract base for suppliers that provide data with retry logic and error handling.
 *
 * Implements exponential backoff with jitter, timeout management, and n8n workflow integration.
 * Subclasses must implement execute() to define supplier-specific data retrieval logic.
 * Handles three error types: timeout (408), abort (499), and unexpected (500).
 *
 * @template TI - Supply request type extending SupplyRequestBase
 * @template TS - Supply response type extending SupplyResponseBase
 */
export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly executionContext: ExecutionContext;
	protected readonly tracer: Tracer;
	readonly descriptor: IDescriptor;

	/**
	 * Initializes supplier with workflow context and execution configuration.
	 *
	 * Creates Tracer for logging, reads ExecutionContext from node parameters for retry/timeout settings.
	 * All properties frozen after initialization to ensure immutability during execution.
	 *
	 * @param descriptor - Supplier metadata for tracing and identification
	 * @param connection - n8n connection type for input/output data routing
	 * @param functions - n8n execution context providing workflow access
	 */
	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(descriptor, functions);
		this.descriptor = descriptor;
		this.executionContext = ContextFactory.read<ExecutionContext>(ExecutionContext, functions, this.tracer);
	}

	/**
	 * Attempts data supply with automatic retry on retriable errors.
	 *
	 * Retry logic: 1) Success → return immediately, 2) Non-retriable error → return immediately,
	 * 3) Retriable error → retry up to maxAttempts. Each attempt includes exponential backoff delay.
	 * Combines parent signal with execution timeout to abort on either condition.
	 *
	 * @param request - Supply request with validation and metadata
	 * @param signal - Parent abort signal for cancellation (e.g., workflow abort)
	 * @returns Successful response or final error after exhausting retries
	 */
	async supplyWithRetries(request: TI, signal: AbortSignal): Promise<TS | SupplyError> {
		// NOTE: Combines parent cancellation signal with execution timeout - aborts on either condition
		const cancellationSignal = this.executionContext.createAbortSignal(signal);
		for (let attempt = 0; attempt < this.executionContext.maxAttempts; attempt++) {
			const result = await this.supply(request, cancellationSignal, attempt);
			// NOTE: Return immediately on success - no need to retry
			if (result instanceof SupplyResponseBase) return result;
			// NOTE: Return immediately on non-retriable error - retrying won't help
			if (!result.isRetriable) return result;
			// NOTE: Return on last attempt - no more retries available
			if (attempt === this.executionContext.maxAttempts - 1) return result;
		}
		// NOTE: Unreachable - loop always exits via return on last attempt, but TypeScript requires explicit throw
		this.tracer.bugDetected(this.constructor.name, 'Reached unreachable code in supplyWithRetries', request.asLogMetadata());
	}

	/**
	 * Executes single supply attempt with validation, delay, and error handling.
	 *
	 * Execution order: 1) Check abort signal, 2) Validate request, 3) Apply backoff delay,
	 * 4) Execute supplier logic, 5) Validate response. Any error converted to SupplyError.
	 * Always logs input/output to n8n workflow for visibility and debugging.
	 *
	 * @param request - Supply request to execute
	 * @param signal - Abort signal combining parent + timeout
	 * @param attempt - Zero-based attempt number for delay calculation (0 = first attempt, no delay)
	 * @returns Successful response or error (never throws)
	 */
	async supply(request: TI, signal: AbortSignal, attempt: number = 0): Promise<TS | SupplyError> {
		const runIndex = this.startSupply(request, attempt);
		let result: TS | SupplyError;
		try {
			// NOTE: Check abort first - fail fast if already cancelled
			signal.throwIfAborted();
			// NOTE: Validate request before execution - catch config errors early
			request.throwIfInvalid();

			// NOTE: Apply exponential backoff delay with jitter (0ms on first attempt)
			const wait = this.executionContext.calculateDelay(attempt);
			await Delay.apply(wait, signal);

			// NOTE: Execute supplier-specific logic - implemented by subclass
			result = await this.execute(request, signal);
			// NOTE: Validate response only if SupplyResponseBase - SupplyError already validated in constructor
			result.throwIfInvalid();
		} catch (error) {
			// NOTE: Convert all errors to SupplyError - ensures consistent error handling and retry logic
			result = this.onError(request, error as Error);
		}
		this.completeSupply(runIndex, result, attempt);
		return result;
	}

	/**
	 * Executes supplier-specific data retrieval logic.
	 *
	 * Subclasses must implement this to define how data is fetched (API call, DB query, etc.).
	 * Can return either successful response or SupplyError for graceful error handling.
	 * Must respect abort signal and throw/return error if cancelled.
	 *
	 * @param request - Validated supply request
	 * @param signal - Abort signal to respect for cancellation
	 * @returns Successful response or error describing failure
	 */
	protected abstract execute(request: TI, signal: AbortSignal): Promise<TS | SupplyError>;

	/**
	 * Logs supply attempt start and registers input data in n8n workflow.
	 *
	 * Uses 1-based attempt numbering in logs (attempt 1, 2, 3...) for user-friendly display.
	 * Returns runIndex for correlating output data with this specific attempt.
	 *
	 * @param request - Supply request to log and register
	 * @param attempt - Zero-based attempt number (0 = first attempt)
	 * @returns Run index for correlating output data
	 */
	private startSupply(request: TI, attempt: number): number {
		// NOTE: Display 1-based attempt number (attempt + 1) for user-friendly logs
		this.tracer.debug(`Supplying data (attempt ${attempt + 1})...`, request.asLogMetadata());
		// NOTE: Register input in n8n workflow for execution history and debugging
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	/**
	 * Logs supply completion and registers output data in n8n workflow.
	 *
	 * Success: Logs at debug level, adds JSON output.
	 * Retriable error: Logs at info level (may retry), adds NodeOperationError output.
	 * Non-retriable error: Logs at warn level (permanent failure), adds NodeOperationError output.
	 *
	 * @param index - Run index from startSupply for output correlation
	 * @param result - Supply result (success or error)
	 * @param attempt - Zero-based attempt number for logging
	 */
	private completeSupply(index: number, result: TS | SupplyError, attempt: number): void {
		// NOTE: Success path - log response and add to n8n workflow output
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`Data supply successfully completed (attempt ${attempt + 1})`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		// NOTE: Error path - log severity based on retry eligibility
		if (result.isRetriable) {
			// NOTE: Info level for retriable - may succeed on retry
			this.tracer.info(`Data supply failed with retriable error (attempt ${attempt + 1})`, result.asLogMetadata());
		} else {
			// NOTE: Warn level for non-retriable - permanent failure
			this.tracer.warn(`Data supply failed with non-retriable error (attempt ${attempt + 1})`, result.asLogMetadata());
		}
		// NOTE: Add NodeOperationError to n8n output - enables error handling nodes
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}

	/**
	 * Converts caught errors into SupplyError with appropriate HTTP status codes.
	 *
	 * Error categories:
	 * - TimeoutError (408): Execution exceeded timeout limit, non-retriable
	 * - AbortError (499): User/workflow cancelled execution, non-retriable
	 * - Unexpected (500): All other errors including network/validation, non-retriable
	 *
	 * All errors marked non-retriable by default - subclasses can override for custom retry logic.
	 *
	 * @param request - Original supply request for error context
	 * @param error - Caught error to convert
	 * @returns SupplyError with status code, reason, and retry flag
	 */
	protected onError(request: TI, error: Error): SupplyError {
		// NOTE: TimeoutError from AbortSignal.timeout() - execution exceeded configured limit
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = '⏰ Execution timed out. Consider increasing the timeout limit.';
			const result = new SupplyError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		// NOTE: AbortError from AbortSignal.abort() - user cancelled or workflow stopped
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = '❌ Execution was aborted.';
			const result = new SupplyError(request, 499, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		// NOTE: Catch-all for unexpected errors - network failures, validation errors, etc.
		const reason = `⚠️ Configuration error. Please check the node configuration and try again. Details: ${error.message}`;
		const result = new SupplyError(request, 500, reason, false);
		// NOTE: Include full error details in metadata for debugging
		const meta = { ...result.asLogMetadata(), details: error };
		this.tracer.error(reason, meta);
		return result;
	}
}
