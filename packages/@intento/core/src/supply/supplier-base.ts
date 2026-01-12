import { type IntentoConnectionType } from 'n8n-workflow';

import { ContextFactory, ExecutionContext } from 'context/*';
import { SupplyError } from 'supply/supply-error';
import type { SupplyRequestBase } from 'supply/supply-request-base';
import { SupplyResponseBase } from 'supply/supply-response-base';
import { Tracer } from 'tracing/*';
import type { IDescriptor, IFunctions } from 'types/*';
import { Delay } from 'utils/delay';

/**
 * Base class for supply operation implementations with automatic retry logic and error handling.
 *
 * Orchestrates data supply operations with configurable retry behavior, timeout enforcement,
 * and comprehensive error categorization (timeout, abort, retriable, non-retriable).
 * Subclasses implement the execute() method for actual data fetching logic.
 */
export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly executionContext: ExecutionContext;
	protected readonly tracer: Tracer;
	readonly descriptor: IDescriptor;

	constructor(descriptor: IDescriptor, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.descriptor = descriptor;
		this.executionContext = ContextFactory.read<ExecutionContext>(ExecutionContext, functions, this.tracer);
	}

	/**
	 * Executes supply operation with automatic retry logic until success or max attempts reached.
	 *
	 * Retries only retriable errors. Returns immediately on success or non-retriable errors.
	 * Each attempt includes input/output logging and exponential backoff with jitter.
	 *
	 * @param signal - Abort signal for cancellation, combined with timeout from ExecutionContext
	 * @returns Successful response or final error after all retry attempts exhausted
	 */
	async supplyWithRetries(request: TI, signal: AbortSignal): Promise<TS | SupplyError> {
		const cancellationSignal = this.executionContext.createAbortSignal(signal);

		let result: TS | SupplyError = new SupplyError(request, 500, 'No data supply attempts executed (maxAttempts is 0)', false);
		for (let attempt = 0; attempt < this.executionContext.maxAttempts; attempt++) {
			result = await this.supply(request, cancellationSignal, attempt);
			if (result instanceof SupplyResponseBase) return result;
			if (!result.isRetriable) return result;
		}
		return result;
	}

	/**
	 * Executes single supply attempt with delay, abort checking, and error conversion.
	 *
	 * @param attempt - Zero-based attempt number (0 = first attempt, no delay)
	 * @returns Successful response or SupplyError with appropriate HTTP status and retriability flag
	 */
	async supply(request: TI, signal: AbortSignal, attempt: number = 0): Promise<TS | SupplyError> {
		const runIndex = this.startSupply(request, attempt);
		let result: TS | SupplyError;
		try {
			signal.throwIfAborted();
			const wait = this.executionContext.calculateDelay(attempt);
			await Delay.apply(wait, signal);
			result = await this.execute(request, signal);
		} catch (error) {
			result = this.onError(request, error as Error);
		}
		this.completeSupply(runIndex, result, attempt);
		return result;
	}

	/**
	 * Performs the actual data supply operation. Must be implemented by subclasses.
	 *
	 * @param signal - Abort signal to check for cancellation during execution
	 * @returns Successful response or SupplyError with appropriate HTTP status and retriability flag
	 */
	protected abstract execute(request: TI, signal: AbortSignal): Promise<TS | SupplyError>;

	/**
	 * Logs supply attempt start and registers input data with n8n execution tracking.
	 *
	 * @returns Run index for correlating input with output in completeSupply()
	 */
	private startSupply(request: TI, attempt: number): number {
		const message = `${this.descriptor.symbol} Supplying data (attempt ${attempt + 1})...`;
		this.tracer.debug(message, request.asLogMetadata());
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	/**
	 * Logs supply attempt completion and registers output data with n8n execution tracking.
	 *
	 * Success logs at debug level, retriable errors at info (may retry), non-retriable at warn (final).
	 *
	 * @param index - Run index from startSupply() for correlating input/output
	 */
	private completeSupply(index: number, result: TS | SupplyError, attempt: number): void {
		if (result instanceof SupplyResponseBase) {
			const message = `${this.descriptor.symbol} Data supply successfully completed (attempt ${attempt + 1})`;
			this.tracer.debug(message, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		if (result.isRetriable) {
			const message = `${this.descriptor.symbol} Data supply failed with retriable error (attempt ${attempt + 1})`;
			this.tracer.info(message, result.asLogMetadata());
		} else {
			const message = `${this.descriptor.symbol} Data supply failed with non-retriable error (attempt ${attempt + 1})`;
			this.tracer.warn(message, result.asLogMetadata());
		}
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}

	/**
	 * Converts uncaught errors into categorized SupplyError instances with appropriate HTTP status codes.
	 *
	 * All errors marked non-retriable as they represent infrastructure/cancellation issues.
	 *
	 * @returns SupplyError with 408 (timeout), 499 (abort), or 500 (unexpected)
	 */
	protected onError(request: TI, error: Error): SupplyError {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			const reason = `${this.descriptor.symbol} Execution timed out. Consider increasing the timeout limit.`;
			const result = new SupplyError(request, 408, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		if (error instanceof DOMException && error.name === 'AbortError') {
			const reason = `${this.descriptor.symbol} Execution was aborted.`;
			const result = new SupplyError(request, 499, reason, false);
			this.tracer.warn(reason, result.asLogMetadata());
			return result;
		}
		const reason = `${this.descriptor.symbol} Unexpected error: ${error.message}`;
		const result = new SupplyError(request, 500, reason, false);
		const meta = { result: result.asLogMetadata(), source: error };
		this.tracer.error(reason, meta);
		return result;
	}
}
