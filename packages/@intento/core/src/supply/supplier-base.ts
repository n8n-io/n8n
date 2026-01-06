import type { IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import type { SupplyErrorBase } from 'supply/supply-error-base';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import type { IFunctions } from 'types/*';
import { Delay } from 'utils/*';

/**
 * Abstract base class for supply chain operations with automatic retry logic and error handling.
 *
 * Manages request/response lifecycle with configurable retry attempts, exponential backoff,
 * and integration with n8n's execution context for input/output tracking.
 *
 * @template TI - Request type extending SupplyRequestBase
 * @template TS - Success response type extending SupplyResponseBase
 * @template TE - Error response type extending SupplyErrorBase
 */
export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase, TE extends SupplyErrorBase> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly tracer: Tracer;
	protected readonly context: ExecutionContext;
	readonly name: string;

	/**
	 * Initializes supplier with connection, n8n functions, and execution context.
	 *
	 * @param name - Supplier identifier for logging and tracing
	 * @param connection - n8n connection type for input/output data tracking
	 * @param functions - n8n workflow functions for node execution context
	 */
	constructor(name: string, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.context = ContextFactory.read(ExecutionContext, functions, this.tracer);

		this.name = name;
	}

	/**
	 * Executes supply request with automatic retry logic and error handling.
	 *
	 * Attempts are made up to context.maxAttempts times with exponential backoff.
	 * Returns success response on first successful attempt, or error response if all attempts fail
	 * or a non-retriable error occurs.
	 *
	 * @param request - Supply request containing operation parameters
	 * @param signal - Optional AbortSignal for cancellation support
	 * @returns Success response or error response (never throws)
	 */
	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		this.tracer.debug(`🚚 [${this.name}] Supplying data ...`, request.asLogMetadata());

		const cancellationSignal = this.context.createAbortSignal(signal);
		let result: TS | TE | undefined;

		for (let attempt = 0; attempt < this.context.maxAttempts; attempt++) {
			result = await this.executeAttempt(attempt, request, cancellationSignal);
			if (result instanceof SupplyResponseBase) return result;
			// NOTE: Stop retrying if error is marked as non-retriable (e.g., validation errors, auth failures)
			if (!result.isRetriable) return result;
		}
		if (result) return result;
		// NOTE: Should never reach here if maxAttempts > 0; indicates configuration or logic error
		this.tracer.bugDetected(SupplierBase.name, 'No supply attempts were made.', request.asLogMetadata());
	}

	/**
	 * Executes single supply operation (must be implemented by subclass).
	 *
	 * @param request - Supply request containing operation parameters
	 * @param signal - Optional AbortSignal for cancellation support
	 * @returns Success response or error response (never throws)
	 */
	protected abstract supply(request: TI, signal?: AbortSignal): Promise<TS | TE>;

	/**
	 * Converts caught exception into typed error response (must be implemented by subclass).
	 *
	 * @param request - Original supply request for error context
	 * @param error - Caught exception during supply operation
	 * @returns Typed error response with retriability and diagnostic information
	 */
	protected abstract onError(request: TI, error: Error): TE;

	/**
	 * Executes single supply attempt with delay, input/output tracking, and error handling.
	 *
	 * @param attempt - Zero-based attempt number for delay calculation and logging
	 * @param request - Supply request (cloned to prevent mutation across retries)
	 * @param signal - Optional AbortSignal for cancellation support
	 * @returns Success response or error response
	 */
	private async executeAttempt(attempt: number, request: TI, signal?: AbortSignal): Promise<TS | TE> {
		const runIndex = this.startAttempt(request, attempt);
		try {
			// NOTE: Apply exponential backoff delay before attempt (first attempt has 0 delay)
			const delay = this.context.calculateDelay(attempt);
			await Delay.apply(delay, signal);
			// NOTE: Clone request to prevent mutation across retry attempts
			const result = await this.supply(request.clone(), signal);
			this.completeAttempt(runIndex, result, attempt);
			return result;
		} catch (error) {
			const supplyError = this.onError(request, error as Error);
			this.completeAttempt(runIndex, supplyError, attempt);
			return supplyError;
		}
	}

	/**
	 * Logs attempt start and registers input data with n8n for execution tracking.
	 *
	 * @param request - Supply request to log and track
	 * @param attempt - Zero-based attempt number for logging
	 * @returns n8n run index for matching output data
	 */
	private startAttempt(request: TI, attempt: number): number {
		this.tracer.debug(`🚚 [${this.name}] Starting supply attempt ${attempt + 1}...`, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	/**
	 * Logs attempt completion and registers output data or error with n8n for execution tracking.
	 *
	 * Success responses are added as output data. Retriable errors are logged as info (will retry),
	 * non-retriable errors as warnings (terminal failure).
	 *
	 * @param index - n8n run index from startAttempt for matching input/output
	 * @param result - Success or error response from attempt
	 * @param attempt - Zero-based attempt number for logging
	 */
	private completeAttempt(index: number, result: TS | TE, attempt: number): void {
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`🚚 [${this.name}] supplied data successfully on attempt ${attempt + 1}`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		if (result.isRetriable) {
			this.tracer.info(`🚚 [${this.name}] failed supply on attempt ${attempt + 1}`, result.asLogMetadata());
		} else {
			this.tracer.warn(`🚚 [${this.name}] failed supply on attempt ${attempt + 1} with non-retriable error`, result.asLogMetadata());
		}
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}
}
