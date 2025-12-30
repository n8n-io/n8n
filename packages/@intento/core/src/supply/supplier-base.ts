import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import type { SupplyErrorBase } from 'supply/supply-error-base';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import { CoreError, type IFunctions } from 'types/*';
import { Delay } from 'utils/*';

/**
 * Base class for data suppliers with retry logic and n8n execution tracking.
 *
 * Provides standardized supply operations with exponential backoff retries, automatic
 * request cloning, and full integration with n8n's execution UI. Each retry attempt is
 * tracked separately in execution data for debugging and monitoring.
 *
 * **Retry Strategy:**
 * - Exponential backoff delays configured via ExecutionContext
 * - Each attempt clones request to avoid state pollution
 * - First successful response returns immediately
 * - All attempts logged to n8n execution panel
 *
 * **Error Handling:**
 * - TimeoutError: Throws with configuration guidance
 * - CoreError: Throws with original message
 * - Unexpected errors: Wraps as BUG with context
 * - Supply errors: Returns final error after exhausting retries
 *
 * @template TI - Request type extending SupplyRequestBase
 * @template TS - Success response type extending SupplyResponseBase
 * @template TE - Error response type extending SupplyErrorBase
 *
 * @example
 * ```typescript
 * class TranslationSupplier extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {
 *   protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
 *     const response = await this.api.translate(request.text, request.from, request.to, signal);
 *     if (response.ok) return new TranslationResponse(request, response.data);
 *     return new TranslationError(request, response.status, response.message);
 *   }
 * }
 * ```
 */
export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase, TE extends SupplyErrorBase> {
	/**
	 * n8n connection type for tracking execution data.
	 *
	 * Used to route execution data to correct connection in n8n UI.
	 */
	protected readonly connection: IntentoConnectionType;

	/**
	 * n8n execution functions for workflow integration.
	 *
	 * Provides access to node context, credentials, and execution tracking.
	 */
	protected readonly functions: IFunctions;

	/**
	 * Tracer for structured logging with node context.
	 *
	 * Automatically enriches logs with node name and traceable object metadata.
	 */
	protected readonly tracer: Tracer;

	/**
	 * Execution context with retry and timeout configuration.
	 *
	 * Provides maxAttempts, timeout settings, and delay calculation for retries.
	 */
	protected readonly context: ExecutionContext;

	/**
	 * Supplier name for logging and debugging.
	 *
	 * Appears in log messages and helps identify supply source in multi-supplier scenarios.
	 */
	readonly name: string;

	/**
	 * Creates supplier with n8n integration and execution context.
	 *
	 * Initializes tracer for logging and reads ExecutionContext for retry configuration.
	 * Context must be properly decorated with @mapTo before supplier instantiation.
	 *
	 * @param name - Supplier identifier for logging (e.g., 'OpenAI', 'Google Translate')
	 * @param connection - n8n connection type for execution data routing
	 * @param functions - n8n execution functions for workflow integration
	 *
	 * @throws CoreError if ExecutionContext cannot be read from functions metadata
	 */
	constructor(name: string, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.context = ContextFactory.read(ExecutionContext, functions, this.tracer);

		this.name = name;
	}

	/**
	 * Executes supply operation with exponential backoff retries until success or max attempts.
	 *
	 * Each attempt:
	 * 1. Waits exponential backoff delay (0ms for first attempt)
	 * 2. Clones request to avoid state pollution
	 * 3. Calls abstract supply() method
	 * 4. Tracks result in n8n execution data
	 * 5. Returns immediately on success, continues on error
	 *
	 * **Cancellation:** Respects AbortSignal during delays and supply() execution.
	 * Supply implementation must check signal and throw if aborted.
	 *
	 * **Execution Tracking:** Each attempt creates separate entry in n8n execution panel
	 * with request/response data for debugging.
	 *
	 * @param request - Supply request with all required data
	 * @param signal - Optional abort signal for cancellation (timeout or user abort)
	 * @returns First successful response OR final error after exhausting maxAttempts
	 *
	 * @throws NodeOperationError if unexpected error occurs during attempt
	 * @throws DOMException (TimeoutError) if operation times out
	 */
	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		this.tracer.debug(`🚚 [${this.name}] Supplying data ...`, request.asLogMetadata());

		const cancellationSignal = this.context.createAbortSignal(signal);
		let result: TS | TE | undefined;

		for (let attempt = 0; attempt < this.context.maxAttempts; attempt++) {
			result = await this.executeAttempt(attempt, request, cancellationSignal);
			// Return immediately on first successful response
			if (result instanceof SupplyResponseBase) return result;
		}

		// NOTE: Defensive check for loop logic errors - should never trigger since maxAttempts >= 1
		if (!result) this.tracer.errorAndThrow(`🐞 [BUG] at '${this.tracer.nodeName}'. No supply attempts were made.`);

		this.tracer.warn(`🚚 [${this.name}] failed all supply attempts`, request.asLogMetadata());
		return result;
	}

	/**
	 * Executes single supply operation to fetch or generate data.
	 *
	 * Subclasses implement actual supply logic: API calls, data transformations, etc.
	 * Implementation must handle AbortSignal to support timeout and cancellation.
	 *
	 * **Return Contract:**
	 * - Return TS (success response) for successful operations
	 * - Return TE (error response) for recoverable failures (wrong input, API errors)
	 * - Throw only for unexpected errors (network failures, programming bugs)
	 *
	 * **Request Cloning:** Receives cloned request on each retry to prevent state pollution.
	 * Original request remains unchanged for correlation logging.
	 *
	 * @param request - Cloned supply request with all required data
	 * @param signal - Abort signal for timeout/cancellation - implementation must check and throw if aborted
	 * @returns Success response (TS) or recoverable error (TE)
	 *
	 * @throws Error for unexpected failures (wrapped as NodeOperationError by framework)
	 */
	protected abstract supply(request: TI, signal?: AbortSignal): Promise<TS | TE>;

	/**
	 * Executes single supply attempt with delay, execution tracking, and error handling.
	 *
	 * Orchestrates attempt lifecycle:
	 * 1. Logs attempt start and creates execution data entry
	 * 2. Applies exponential backoff delay (respects abort signal)
	 * 3. Clones request and calls supply() method
	 * 4. Records result in n8n execution data
	 * 5. Returns result for retry decision OR throws for unexpected errors
	 *
	 * **Error Categories:**
	 * - TimeoutError: User-facing error with configuration guidance
	 * - Unexpected errors: Wrapped with BUG marker and context
	 * - Supply errors (TE): Returned normally for retry loop decision
	 *
	 * @param attempt - Zero-based attempt number for delay calculation and logging
	 * @param request - Original request (cloned before passing to supply())
	 * @param signal - Abort signal passed through to delay and supply()
	 * @returns Supply result (success or error response)
	 *
	 * @throws NodeOperationError for unexpected errors with execution tracking
	 * @throws DOMException (TimeoutError) when operation times out
	 */
	private async executeAttempt(attempt: number, request: TI, signal?: AbortSignal): Promise<TS | TE> {
		const runIndex = this.startAttempt(request, attempt);
		try {
			const delay = this.context.calculateDelay(attempt);
			await Delay.apply(delay, signal);
			const result = await this.supply(request.clone(), signal);
			this.completeAttempt(runIndex, result, attempt);
			return result;
		} catch (error) {
			// Special handling for timeout errors with user-facing guidance
			if (error instanceof DOMException && error.name === 'TimeoutError') this.timeoutAndThrow(runIndex, error);
			// All other errors treated as unexpected and wrapped with context
			this.failAndThrow(runIndex, attempt, error as Error);
		}
	}

	/**
	 * Initializes execution tracking for supply attempt.
	 *
	 * Creates entry in n8n execution panel with request data, enabling users to inspect
	 * what was sent for each retry. Logs attempt number for correlation.
	 *
	 * @param request - Supply request to track in execution data
	 * @param attempt - Zero-based attempt number for logging
	 * @returns Run index for tracking this attempt's output data
	 */
	private startAttempt(request: TI, attempt: number): number {
		this.tracer.debug(`🚚 [${this.name}] Starting supply attempt ${attempt + 1}...`, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, request.asExecutionData());
		return runIndex.index;
	}

	/**
	 * Records supply attempt result in n8n execution data and logs outcome.
	 *
	 * **Success (TS):** Logs debug message and stores response data in execution panel.
	 * Success stops retry loop in supplyWithRetries.
	 *
	 * **Error (TE):** Logs info message and stores error as NodeOperationError for n8n error UI.
	 * Error response allows retry loop to continue to next attempt.
	 *
	 * @param index - Run index from startAttempt() for tracking this attempt
	 * @param result - Supply result (success response or error response)
	 * @param attempt - Zero-based attempt number for logging
	 */
	private completeAttempt(index: number, result: TS | TE, attempt: number): void {
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`🚚 [${this.name}] supplied data successfully on attempt ${attempt + 1}`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, result.asExecutionData());
			return;
		}
		this.tracer.info(`🚚 [${this.name}] failed supply attempt ${attempt + 1}`, result.asLogMetadata());
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}

	/**
	 * Handles unexpected errors during supply execution.
	 *
	 * Wraps errors as NodeOperationError, records in execution data, and throws to halt workflow.
	 *
	 * **Error Classification:**
	 * - CoreError: Expected framework errors, propagate original message
	 * - Other errors: Unexpected bugs, wrap with 🐞 [BUG] marker for visibility
	 *
	 * **Execution Tracking:** Records error in n8n execution panel before throwing,
	 * ensuring error is visible even if workflow halts.
	 *
	 * @param index - Run index for tracking this attempt's error
	 * @param attempt - Zero-based attempt number for error context
	 * @param error - Unexpected error that occurred during supply
	 * @throws NodeOperationError with error message and execution context
	 */
	private failAndThrow(index: number, attempt: number, error: Error): never {
		const node = this.tracer.nodeName;
		const message = error instanceof CoreError ? error.message : `🐞 [BUG] Unexpected error at ${node}: ${error.message}`;
		const nodeError = new NodeOperationError(this.functions.getNode(), message);
		this.functions.addOutputData(this.connection, index, nodeError);
		this.tracer.errorAndThrow(message, { attempt, error });
	}

	/**
	 * Handles timeout errors with user-facing guidance.
	 *
	 * Provides actionable error message directing users to timeout configuration settings.
	 * Records error in execution data before throwing to preserve error context.
	 *
	 * Unlike failAndThrow(), preserves original TimeoutError to maintain error type
	 * for caller handling (e.g., different retry logic for timeouts).
	 *
	 * @param index - Run index for tracking timeout error in execution data
	 * @param error - DOMException with name='TimeoutError' from AbortSignal timeout
	 * @throws DOMException (original TimeoutError) after recording in execution data
	 */
	private timeoutAndThrow(index: number, error: DOMException): never {
		const message = '⚙️ Supply is timed out. Ensure that timeout settings are properly configured.';
		const nodeError = new NodeOperationError(this.functions.getNode(), message);
		this.functions.addOutputData(this.connection, index, nodeError);
		throw error;
	}
}
