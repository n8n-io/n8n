import type { SupplyError, IFunctions } from 'intento-core';
import { ContextFactory, Delay } from 'intento-core';
import { SplitContext } from 'intento-segmentation';
import type { IntentoConnectionType } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { DelayContext } from 'context/*';
import { DryRunContext } from 'suppliers/dry-run/dry-run-context';
import { DryRunDescriptor } from 'suppliers/dry-run/dry-run-descriptor';
import type { TranslationRequest } from 'supply/*';
import { TranslationResponse, TranslationSupplierBase } from 'supply/*';
import type { ITranslation } from 'types/*';

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

	protected async translate(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationResponse | SupplyError> {
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
		this.tracer.debug(`🧪 [${this.descriptor.name}] Passing through original text without translation.`);
		const translations: ITranslation[] = request.segments.map((segment) => ({
			segmentPosition: segment.segmentPosition,
			textPosition: segment.textPosition,
			text: segment.text,
			detectedLanguage: request.from,
		}));
		this.tracer.info(`🧪 [${this.descriptor.name}] Passed through ${translations.length} segment(s) without translation.`);
		return new TranslationResponse(request, translations);
	}

	private replaceTranslation(request: TranslationRequest): TranslationResponse {
		const replaceBy = this.dryRunContext.replacePattern!;
		const replaceTo = this.dryRunContext.replaceTo!;
		this.tracer.debug(`🧪 [${this.descriptor.name}] Replacing text using pattern ${replaceBy} to ${replaceTo}.`);

		const match = replaceBy.match(/^\/(.+)\/([gimusy]*)$/);
		const pattern = new RegExp(match![1], match![2]);

		const translations: ITranslation[] = request.segments.map((segment) => {
			const text = segment.text.replace(pattern, replaceTo);
			return {
				segmentPosition: segment.segmentPosition,
				textPosition: segment.textPosition,
				text,
				detectedLanguage: request.from,
			};
		});

		this.tracer.info(`🧪 [${this.descriptor.name}] Replaced text in ${translations.length} segment(s).`);
		return new TranslationResponse(request, translations);
	}

	private overrideTranslation(request: TranslationRequest): TranslationResponse {
		this.tracer.debug(`🧪 [${this.descriptor.name}] Overriding translation with predefined text.`);
		const override = this.dryRunContext.override!;

		const translations: ITranslation[] = request.segments.map((segment) => ({
			segmentPosition: segment.segmentPosition,
			textPosition: segment.textPosition,
			text: override,
			detectedLanguage: request.from,
		}));

		this.tracer.info(`🧪 [${this.descriptor.name}] Overrode translation in ${translations.length} segment(s).`);
		return new TranslationResponse(request, translations);
	}

	private failTranslation(): never {
		this.tracer.info(`🧪 [${this.descriptor.name}] Failed translation with predefined error.`);
		throw new NodeApiError(this.functions.getNode(), {
			httpCode: this.dryRunContext.errorCode!,
			message: `🧪 [${this.descriptor.name}] Simulated translation failure: ${this.dryRunContext.errorMessage}`,
		});
	}
}
