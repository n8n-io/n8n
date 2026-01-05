import { ContextFactory, Delay, type IFunctions } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';

import { DelayContext, DryRunContext } from 'context/*';
import type { TranslationRequest } from 'supply/*';
import { TranslationResponse, TranslationSupplierBase, TranslationError } from 'supply/*';

/**
 * Test supplier for simulating translation behavior without external API calls.
 *
 * Supports three modes:
 * - pass: Returns original text unchanged (simulates identity translation)
 * - override: Returns predefined text (for fixed test scenarios)
 * - fail: Returns error with custom code/message (for error handling tests)
 *
 * Respects delay configuration to simulate API latency and rate limiting.
 */
export class DryRunSupplier extends TranslationSupplierBase {
	/** Delay configuration for simulating API latency */
	private readonly delayContext: DelayContext;
	/** Dry run mode configuration for response behavior */
	private readonly dryRunContext: DryRunContext;

	/**
	 * Creates dry run supplier with test configuration.
	 *
	 * @param connection - Intento connection (unused but required for supplier interface)
	 * @param functions - n8n execution functions for reading node parameters
	 */
	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super('dry-run-supplier', connection, functions);

		this.delayContext = ContextFactory.read<DelayContext>(DelayContext, this.functions, this.tracer);
		this.dryRunContext = ContextFactory.read<DryRunContext>(DryRunContext, this.functions, this.tracer);

		Object.freeze(this);
	}

	/**
	 * Simulates translation based on dry run mode configuration.
	 *
	 * NOTE: Always applies configured delay first to simulate API latency.
	 *
	 * @param request - Translation request to process
	 * @param signal - Optional abort signal for cancellation
	 * @returns Response or error based on dry run mode
	 */
	protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
		signal?.throwIfAborted();

		// Apply delay to simulate API latency and rate limiting
		const delayMs = this.delayContext.calculateDelay();
		await Delay.apply(delayMs, signal);

		switch (this.dryRunContext.mode) {
			case 'pass':
				this.tracer.info(`🧪 [${this.name}] Passing through original text without translation.`);
				return new TranslationResponse(request, request.text, request.from);
			case 'override':
				this.tracer.info(`🧪 [${this.name}] Overriding translation with predefined text.`);
				return new TranslationResponse(request, this.dryRunContext.override!, request.from);
			case 'fail':
				this.tracer.info(`🧪 [${this.name}] Simulating translation error as per dry-run configuration.`);
				return new TranslationError(request, this.dryRunContext.errorCode!, this.dryRunContext.errorMessage!);
		}
	}
}
