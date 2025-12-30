import { DelayContext, DryRunContext } from 'context/*';
import { ContextFactory, Delay, type IFunctions } from 'intento-core';
import type { IntentoConnectionType } from 'n8n-workflow';
import type { TranslationRequest } from 'supply/*';
import { TranslationResponse, TranslationSupplierBase, TranslationError } from 'supply/*';

export class DryRunSupplier extends TranslationSupplierBase {
	private readonly delayContext: DelayContext;
	private readonly dryRunContext: DryRunContext;

	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super('dry-run-supplier', connection, functions);

		this.delayContext = ContextFactory.read<DelayContext>(DelayContext, this.functions, this.tracer);
		this.dryRunContext = ContextFactory.read<DryRunContext>(DryRunContext, this.functions, this.tracer);

		Object.freeze(this.delayContext);
	}

	protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
		signal?.throwIfAborted();
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
