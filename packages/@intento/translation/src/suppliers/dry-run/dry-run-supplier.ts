import { ContextFactory, Delay, type IFunctions } from 'intento-core';
import { NodeApiError, type IntentoConnectionType } from 'n8n-workflow';

import { DelayContext, SplitContext } from 'context/*';
import { DryRunContext } from 'suppliers/dry-run/dry-run-context';
import { DryRunDescriptor } from 'suppliers/dry-run/dry-run-descriptor';
import type { TranslationRequest, TranslationError } from 'supply/*';
import { TranslationResponse, TranslationSupplierBase } from 'supply/*';

export class DryRunSupplier extends TranslationSupplierBase {
	private readonly delayContext: DelayContext;
	private readonly dryRunContext: DryRunContext;
	private readonly splitContext: SplitContext;

	constructor(connection: IntentoConnectionType, functions: IFunctions) {
		super(DryRunDescriptor, connection, functions);

		this.delayContext = ContextFactory.read<DelayContext>(DelayContext, this.functions, this.tracer);
		this.dryRunContext = ContextFactory.read<DryRunContext>(DryRunContext, this.functions, this.tracer);
		this.splitContext = ContextFactory.read<SplitContext>(SplitContext, this.functions, this.tracer);
		this.descriptor.batchLimit = this.splitContext.batchSize;
		this.descriptor.segmentLimit = this.splitContext.segmentSize;

		Object.freeze(this);
	}

	protected async supply(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | TranslationError> {
		signal?.throwIfAborted();

		const delayMs = this.delayContext.calculateDelay();
		await Delay.apply(delayMs, signal);

		switch (this.dryRunContext.mode) {
			case 'pass':
				return this.passTranslation(request);
			case 'replace':
				return this.replaceTranslation(request);
			case 'override':
				return this.overrideTranslation(request);
			case 'fail':
				return this.failTranslation();
		}
	}

	private passTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.info(`🧪 [${this.descriptor.name}] Passing through original text without translation.`);
		return new TranslationResponse(request, request.text, request.from);
	}

	private replaceTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.info(
			`🧪 [${this.descriptor.name}] Replacing text using pattern ${this.dryRunContext.replacePattern} to ${this.dryRunContext.replaceTo}.`,
		);
		const match = this.dryRunContext.replacePattern!.match(/^\/(.+)\/([gimusy]*)$/);
		const pattern = new RegExp(match![1], match![2]);
		if (!Array.isArray(request.text)) {
			const replacedText = request.text.replace(pattern, this.dryRunContext.replaceTo!);
			return new TranslationResponse(request, replacedText, request.from);
		}
		const replacedTexts = request.text.map((segment) => segment.replace(pattern, this.dryRunContext.replaceTo!));
		return new TranslationResponse(request, replacedTexts, request.from);
	}

	private overrideTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.info(`🧪 [${this.descriptor.name}] Overriding translation with predefined text.`);
		if (!Array.isArray(request.text)) {
			return new TranslationResponse(request, this.dryRunContext.override!, request.from);
		}
		const overriddenTexts = request.text.map(() => this.dryRunContext.override!);
		return new TranslationResponse(request, overriddenTexts, request.from);
	}

	private failTranslation(): never {
		this.tracer.info(`🧪 [${this.descriptor.name}] Failing translation with predefined error.`);
		throw new NodeApiError(this.functions.getNode(), {
			httpCode: this.dryRunContext.errorCode!,
			message: `🧪 [${this.descriptor.name}] Simulated translation failure: ${this.dryRunContext.errorMessage}`,
		});
	}
}
