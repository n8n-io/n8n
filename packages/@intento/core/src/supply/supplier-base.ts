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
 * Base class for supply providers with automatic retry, timeout handling, and n8n execution tracking.
 *
 * Orchestrates the retry loop with exponential backoff, tracks each attempt in n8n's execution UI,
 * and handles timeouts gracefully. Exits early on non-retryable errors (4xx client errors).
 * Subclasses implement the actual supply logic and error conversion.
 *
 * @example
 * ```typescript
 * class TranslationSupplier extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {
 *   protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
 *     try {
 *       const result = await this.api.translate(request.text, request.from, request.to, { signal });
 *       return new TranslationResponse(request, result.translatedText);
 *     } catch (error) {
 *       return new TranslationError(request, error.code, error.message);
 *     }
 *   }
 *
 *   protected onTimeOut(request: TranslationRequest): TranslationError {
 *     return new TranslationError(request, 408, 'Request timeout');
 *   }
 * }
 * ```
 */
export abstract class SupplierBase<TI extends SupplyRequestBase, TS extends SupplyResponseBase, TE extends SupplyErrorBase> {
	protected readonly connection: IntentoConnectionType;
	protected readonly functions: IFunctions;
	protected readonly tracer: Tracer;
	protected readonly context: ExecutionContext;
	readonly name: string;

	constructor(name: string, connection: IntentoConnectionType, functions: IFunctions) {
		this.connection = connection;
		this.functions = functions;
		this.tracer = new Tracer(functions);
		this.context = ContextFactory.read(ExecutionContext, functions, this.tracer);

		this.name = name;
	}

	/**
	 * Executes supply with automatic retry and exponential backoff.
	 *
	 * Retries up to `context.maxAttempts` times for retryable errors (429, 5xx). Exits early on
	 * success or non-retryable errors (4xx client errors). Each attempt is tracked in n8n's execution UI.
	 *
	 * @param request - Supply request to execute
	 * @param signal - Optional abort signal for cancellation
	 * @returns Successful response or error (retryable after max attempts, or non-retryable immediately)
	 */
	async supplyWithRetries(request: TI, signal?: AbortSignal): Promise<TS | TE> {
		this.tracer.debug(`🚚 [${this.name}] Supplying data ...`, request.asLogMetadata());

		const cancellationSignal = this.context.createAbortSignal(signal);
		let result: TS | TE | undefined;

		for (let attempt = 0; attempt < this.context.maxAttempts; attempt++) {
			result = await this.executeAttempt(attempt, request, cancellationSignal);
			// NOTE: Exit early on success or non-retryable errors (4xx); continue loop for retryable errors (429, 5xx)
			if (result instanceof SupplyResponseBase) return result;
			if (!result.isRetryable()) return result;
		}
		if (result) return result;
		this.tracer.errorAndThrow(`🐞 [BUG] at '${this.tracer.nodeName}'. No supply attempts were made.`);
	}

	/**
	 * Executes the supply operation with the given request.
	 *
	 * Must handle all expected errors and return TE instead of throwing.
	 * Only throw for unexpected developer errors (CoreError).
	 *
	 * @param request - Supply request to execute
	 * @param signal - Abort signal for cancellation and timeout
	 * @returns Successful response or error (never throws expected errors)
	 */
	protected abstract supply(request: TI, signal?: AbortSignal): Promise<TS | TE>;

	/**
	 * Creates an error object when supply operation times out.
	 *
	 * @param request - The request that timed out
	 * @returns Error object representing timeout condition
	 */
	protected abstract onTimeOut(request: TI): TE;

	private async executeAttempt(attempt: number, request: TI, signal?: AbortSignal): Promise<TS | TE> {
		const runIndex = this.startAttempt(request, attempt);
		try {
			// NOTE: Apply exponential backoff delay before attempt (first attempt has 0 delay)
			const delay = this.context.calculateDelay(attempt);
			await Delay.apply(delay, signal);
			// NOTE: Clone request to ensure immutability across retry attempts
			const result = await this.supply(request.clone(), signal);
			this.completeAttempt(runIndex, result, attempt);
			return result;
		} catch (error) {
			// NOTE: TimeoutError is expected; convert to TE. All other errors are unexpected bugs.
			if (!(error instanceof DOMException && error.name === 'TimeoutError')) this.failAndThrow(runIndex, attempt, error as Error);
			const timeoutError = this.onTimeOut(request);
			this.completeAttempt(runIndex, timeoutError, attempt);
			return timeoutError;
		}
	}

	private startAttempt(request: TI, attempt: number): number {
		this.tracer.debug(`🚚 [${this.name}] Starting supply attempt ${attempt + 1}...`, request.asLogMetadata());
		// NOTE: addInputData() returns runIndex used to correlate output data in n8n execution UI
		const runIndex = this.functions.addInputData(this.connection, [[{ json: request.asDataObject() }]]);
		return runIndex.index;
	}

	private completeAttempt(index: number, result: TS | TE, attempt: number): void {
		if (result instanceof SupplyResponseBase) {
			this.tracer.debug(`🚚 [${this.name}] supplied data successfully on attempt ${attempt + 1}`, result.asLogMetadata());
			this.functions.addOutputData(this.connection, index, [[{ json: result.asDataObject() }]]);
			return;
		}
		this.tracer.info(`🚚 [${this.name}] failed supply attempt ${attempt + 1}`, result.asLogMetadata());
		// NOTE: Convert error to NodeOperationError for n8n execution UI error display
		this.functions.addOutputData(this.connection, index, result.asError(this.functions.getNode()));
	}

	private failAndThrow(index: number, attempt: number, error: Error): never {
		const node = this.tracer.nodeName;
		// NOTE: CoreError = developer error with clear message; other errors = unexpected bugs needing investigation
		const message = error instanceof CoreError ? error.message : `🐞 [BUG] Unexpected error at ${node}: ${error.message}`;
		const nodeError = new NodeOperationError(this.functions.getNode(), message);
		this.functions.addOutputData(this.connection, index, nodeError);
		this.tracer.errorAndThrow(message, { attempt, error });
	}
}
